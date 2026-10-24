import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import type { DriveBackupFile } from "../../src/lib/google-drive-backup";
import { verificationProperties } from "../../src/lib/google-drive-backup-policy";
import type { RetentionStore } from "../../src/lib/google-drive-backup-retention";

/** Synthetic, complete 83-root graph: no customer/database content or Drive calls. */
export function retentionProfileFixture(serial: boolean) {
  const now = Date.now(), folderId = "synthetic";
  const name = (capture: number) => `S&PBACKUP-${new Date(capture).toISOString().slice(0, 19).replace("T", "_").replaceAll(":", "-")}.SQL`;
  const anchor: DriveBackupFile = { id: "anchor", name: name(now), size: "1", md5Checksum: "a".repeat(32), parents: [folderId] };
  anchor.appProperties = verificationProperties(anchor);
  const files = [anchor], content = new Map<string, Buffer>();
  for (let i = 0; i < 83; i++) {
    const sqlName = name(now - (100 + i) * 3600_000);
    const part = { index: 1, name: `${sqlName}.part-000001.gz`, fileId: `part-${i}`, sqlSize: 3,
      sqlSha256: "b".repeat(64), compressedSize: 23, compressedMd5: "c".repeat(32) };
    files.push({ id: part.fileId, name: part.name, size: "23", md5Checksum: part.compressedMd5, parents: [folderId] });
    const bytes = Buffer.from(JSON.stringify({ version: 1, format: "salt-peps-sql-parts", sqlFileName: sqlName,
      originalSize: 3, originalSha256: "b".repeat(64), parts: [part] }));
    const root = { id: `root-${i}`, name: `${sqlName}.manifest.json`, size: String(bytes.length),
      md5Checksum: createHash("md5").update(bytes).digest("hex"), parents: [folderId] };
    files.push(root); content.set(root.id, bytes);
  }
  let tail = Promise.resolve(), active = 0, peak = 0, reads = 0;
  const read = async (file: DriveBackupFile) => {
    active++; peak = Math.max(peak, active); reads++;
    try { await delay(40); return content.get(file.id)!; } finally { active--; }
  };
  const store: RetentionStore = {
    folderId, list: async () => files, get: async id => files.find(f => f.id === id) ?? null,
    read: file => {
      if (!serial) return read(file);
      const work = tail.then(() => read(file));
      tail = work.then(() => undefined, () => undefined); return work;
    },
    remove: async () => { throw new Error("Profile cannot delete"); },
    markDeleting: async () => { throw new Error("Profile cannot mark"); },
  };
  return { store, anchor, now, metrics: () => ({ reads, peak }) };
}
