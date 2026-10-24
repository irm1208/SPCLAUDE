import { createHash } from "node:crypto";
import type { DriveBackupFile } from "./google-drive-backup";
import { backupCaptureTime, BACKUP_RETENTION_MS, hasVerifiedBackupReceipt, inBackupFolder } from "./google-drive-backup-policy";
import { parseSqlBackupManifest, parseSqlBackupRootManifest, parseSqlBackupManifestSegment, SQL_BACKUP_PART_SIZE } from "./google-drive-backup-manifest";

export interface RetentionStore {
  folderId: string;
  list(): Promise<DriveBackupFile[]>;
  get(id: string): Promise<DriveBackupFile | null>;
  read(file: DriveBackupFile): Promise<Buffer>;
  remove(id: string): Promise<void>;
  markDeleting(id: string): Promise<void>;
}
interface Generation {
  root: DriveBackupFile;
  parts: DriveBackupFile[];
  segments: DriveBackupFile[];
  legacy: boolean;
}
export interface RetentionPlan {
  generations: Generation[];
  protectedIds: string[];
  skippedLegacy: boolean;
  cutoff: number;
}
const md5 = (bytes: Buffer) => createHash("md5").update(bytes).digest("hex");
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const same = (a: DriveBackupFile, b: DriveBackupFile, folder: string) =>
  inBackupFolder(a, folder) && inBackupFolder(b, folder) && a.id === b.id &&
  a.name === b.name && a.size === b.size && a.md5Checksum === b.md5Checksum;

async function checkedBytes(store: RetentionStore, file: DriveBackupFile): Promise<Buffer> {
  const size = Number(file.size);
  if (!Number.isSafeInteger(size) || size <= 0 || size > 4 * 1024 * 1024 || !file.md5Checksum) {
    throw new Error("Unverifiable backup manifest");
  }
  const bytes = await store.read(file);
  if (bytes.length !== size || md5(bytes) !== file.md5Checksum) throw new Error("Backup manifest checksum mismatch");
  return bytes;
}

async function legacyGeneration(
  store: RetentionStore, root: DriveBackupFile, files: Map<string, DriveBackupFile>, names: Map<string, number>,
): Promise<Generation> {
  const sqlName = root.name.slice(0, -".manifest.json".length);
  const value = JSON.parse((await checkedBytes(store, root)).toString("utf8"));
  const deleting = root.appProperties?.spRetentionDeleting === "1";
  const result: Generation = { root, parts: [], segments: [], legacy: true };
  const seen = new Set([root.id]);
  const reference = (id: string, name: string, size: number, checksum?: string) => {
    if (seen.has(id)) throw new Error("Repeated backup reference");
    seen.add(id);
    const file = files.get(id);
    if (!file && deleting) return null; // Only previously validated, marked deletion jobs may resume.
    if (!file || !inBackupFolder(file, store.folderId) || file.name !== name ||
        names.get(name) !== 1 || Number(file.size) !== size || !file.md5Checksum ||
        (checksum && file.md5Checksum !== checksum)) throw new Error("Unsafe backup reference");
    return file;
  };
  if (value.version === 1) {
    const manifest = parseSqlBackupManifest(value, sqlName);
    for (const part of manifest.parts) {
      const file = reference(part.fileId, part.name, part.compressedSize, part.compressedMd5);
      if (file) result.parts.push(file);
    }
  } else {
    const manifest = parseSqlBackupRootManifest(value, sqlName);
    for (const ref of manifest.segments) {
      const segment = reference(ref.fileId, ref.name, ref.size);
      if (!segment) continue; // Segments are deleted only after all their parts have gone.
      const bytes = await checkedBytes(store, segment);
      if (sha(bytes) !== ref.sha256) throw new Error("Backup segment checksum mismatch");
      const parsed = parseSqlBackupManifestSegment(JSON.parse(bytes.toString()), sqlName, ref.index);
      if (parsed.parts.length !== ref.partCount || parsed.parts[0]?.index !== ref.firstPartIndex) {
        throw new Error("Backup segment coverage mismatch");
      }
      result.segments.push(segment);
      for (const part of parsed.parts) {
        if (part.sqlSize !== Math.min(SQL_BACKUP_PART_SIZE, manifest.originalSize - (part.index - 1) * SQL_BACKUP_PART_SIZE)) {
          throw new Error("Backup part coverage mismatch");
        }
        const file = reference(part.fileId, part.name, part.compressedSize, part.compressedMd5);
        if (file) result.parts.push(file);
      }
    }
  }
  return result;
}

/** Read-only planning; an unreceipted anchor is allowed for prospective dry-run inventories only. */
export async function planBackupRetention(store: RetentionStore, verified: DriveBackupFile, now = Date.now()): Promise<RetentionPlan> {
  const inventory = await store.list();
  const files = new Map(inventory.map(file => [file.id, file]));
  if (files.size !== inventory.length || !files.get(verified.id) ||
      !same(files.get(verified.id)!, verified, store.folderId)) throw new Error("Verified backup is missing or changed");
  const names = new Map<string, number>();
  for (const file of inventory) names.set(file.name, (names.get(file.name) ?? 0) + 1);
  const protectedIds = new Set([verified.id]);
  const latest = inventory.filter(file => inBackupFolder(file, store.folderId) && hasVerifiedBackupReceipt(file))
    .sort((a, b) => backupCaptureTime(b.name)! - backupCaptureTime(a.name)!)[0];
  if (latest) protectedIds.add(latest.id);
  const cutoff = now - BACKUP_RETENTION_MS;
  const parsed: Generation[] = [];
  let skippedLegacy = false;
  for (const file of inventory) {
    if (!inBackupFolder(file, store.folderId) || backupCaptureTime(file.name) === null) continue;
    if (file.name.endsWith(".SQL.manifest.json")) {
      try {
        if (names.get(file.name) !== 1) throw new Error("Ambiguous backup generation");
        parsed.push(await legacyGeneration(store, file, files, names));
      } catch { skippedLegacy = true; }
    } else if (names.get(file.name) === 1 && /^[1-9]\d*$/.test(file.size ?? "") &&
        /^[0-9a-f]{32}$/.test(file.md5Checksum ?? "")) {
      parsed.push({ root: file, parts: [], segments: [], legacy: false });
    }
  }
  const members = (g: Generation) => [...g.parts, ...g.segments, g.root];
  // A recovery upload can be older than the newest historical copy, which
  // predates receipts. Conservatively preserve that complete generation too.
  const newestComplete = parsed.reduce<Generation | undefined>((latest, g) =>
    !latest || backupCaptureTime(g.root.name)! > backupCaptureTime(latest.root.name)! ? g : latest, undefined);
  if (newestComplete) protectedIds.add(newestComplete.root.id);
  for (const g of parsed) {
    if (backupCaptureTime(g.root.name)! >= cutoff || protectedIds.has(g.root.id)) {
      members(g).forEach(file => protectedIds.add(file.id));
    }
  }
  return {
    cutoff, skippedLegacy, protectedIds: [...protectedIds],
    // Unknown reference graphs may point to any object: don't guess what is safe.
    generations: parsed.filter(g => !skippedLegacy && backupCaptureTime(g.root.name)! < cutoff &&
      !members(g).some(file => protectedIds.has(file.id)))
      // Retire small whole-file generations first so a large legacy backlog cannot
      // keep newly expired hourly SQL copies outside the rolling retention window.
      .sort((a, b) => Number(a.legacy) - Number(b.legacy) ||
        backupCaptureTime(a.root.name)! - backupCaptureTime(b.root.name)!),
  };
}

/** Only invoked after an actual verified upload, while holding the backup advisory lock. */
export async function executeBackupRetention(
  store: RetentionStore, verified: DriveBackupFile, now = Date.now(),
  limits: { maxFiles?: number; maxDurationMs?: number } = {},
) {
  const current = await store.get(verified.id);
  if (!current || !same(current, verified, store.folderId) || !hasVerifiedBackupReceipt(current)) {
    throw new Error("Retention requires a current verified SQL upload receipt");
  }
  const plan = await planBackupRetention(store, current, now);
  let deletedFiles = 0, failures = 0;
  const deadline = Date.now() + (limits.maxDurationMs ?? 180_000);
  const maxFiles = limits.maxFiles ?? 1000;
  const result = (deferred: boolean) => ({
    deletedFiles, failures, deferred, skippedLegacy: plan.skippedLegacy, expiredGenerations: plan.generations.length,
  });
  for (const generation of plan.generations) {
    if (deletedFiles >= maxFiles || Date.now() >= deadline) return result(true);
    try {
      const anchor = await store.get(current.id);
      if (!anchor || !same(anchor, current, store.folderId) || !hasVerifiedBackupReceipt(anchor)) {
        throw new Error("Verified backup changed during retention");
      }
      const root = await store.get(generation.root.id);
      if (!root || !same(root, generation.root, store.folderId)) { failures++; continue; }
      if (generation.legacy && root.appProperties?.spRetentionDeleting !== "1") await store.markDeleting(root.id);
      // A failed phase leaves the root and remaining references available for a safe retry.
      for (const phase of [generation.parts, generation.segments, [generation.root]]) {
        for (let start = 0; start < phase.length;) {
          if (deletedFiles >= maxFiles || Date.now() >= deadline) return result(true);
          const batch = phase.slice(start, start + Math.min(4, maxFiles - deletedFiles));
          const results = await Promise.allSettled(batch.map(async file => {
            const fresh = await store.get(file.id);
            if (!fresh) return;
            if (!same(fresh, file, store.folderId) || plan.protectedIds.includes(file.id)) {
              throw new Error("Backup object changed before deletion");
            }
            await store.remove(file.id);
            deletedFiles++;
          }));
          if (results.some(result => result.status === "rejected")) throw new Error("Backup deletion interrupted");
          start += batch.length;
        }
      }
    } catch { failures++; }
  }
  return result(false);
}
