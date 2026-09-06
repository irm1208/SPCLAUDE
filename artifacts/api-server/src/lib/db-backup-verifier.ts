import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { chmod, mkdtemp, open, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { pool } from "@workspace/db";
import { decryptBackupToStream, parseBackupEncryptionKey } from "./backup-encryption";
import { startDisposablePostgres, type DisposablePostgres } from "./disposable-postgres";
import { getGoogleDriveBackupFolderId, type DriveBackupFile } from "./google-drive-backup";
import { validateRestoredDatabase, type RestoreValidationResult } from "./db-restore-validation";
import { writeLog } from "./audit-log";
import { createAlert } from "./create-alert";
import { sendAdminMessage } from "./telegram";

const VERIFY_LOCK_NAME = "salt-and-peps:database-backup-restore-verification";
const DRIVE_CONNECTOR = "google-drive";
const ENCRYPTED_SUFFIX = ".sql.gz.enc";
const LEGACY_SUFFIX = ".sql";

export interface BackupVerificationDependencies {
  acquireLock(): Promise<boolean>;
  releaseLock(): Promise<void>;
  listBackups(): Promise<DriveBackupFile[]>;
  allocateDownloadPath(): Promise<string>;
  download(backup: DriveBackupFile, path: string): Promise<void>;
  digest(path: string): Promise<string>;
  startPostgres(): Promise<DisposablePostgres>;
  activeKey(): Buffer;
  decrypt(path: string, key: Buffer): Promise<Readable>;
  legacySource(path: string): Promise<Readable>;
  restore(source: Readable, target: DisposablePostgres): Promise<void>;
  validate(target: DisposablePostgres): Promise<RestoreValidationResult>;
  audit(action: "backup_restore_verified" | "backup_restore_failed", message: string, metadata: Record<string, unknown>): Promise<void>;
  alert(category: string, requestId: string): Promise<void>;
  notifyAdmin(category: string, requestId: string): Promise<void>;
  removeDownload(path: string): Promise<void>;
}

function supported(backup: DriveBackupFile): boolean {
  const name = backup.name.toLowerCase();
  return name.endsWith(ENCRYPTED_SUFFIX) || name.endsWith(LEGACY_SUFFIX);
}

function newestSupported(backups: DriveBackupFile[]): DriveBackupFile {
  const backup = backups
    .filter(supported)
    .sort((left, right) => Date.parse(right.modifiedTime ?? "") - Date.parse(left.modifiedTime ?? ""))[0];
  if (!backup) throw new Error("No supported database backup is available");
  return backup;
}

function genericFailure(): Error {
  return new Error("backup verification failed");
}

async function cleanUp(
  dependencies: BackupVerificationDependencies,
  target: DisposablePostgres | undefined,
  downloadedPath: string | undefined,
): Promise<unknown> {
  const failures: unknown[] = [];
  if (target) {
    try { await target.stopAndRemove(); } catch (error) { failures.push(error); }
  }
  if (downloadedPath) {
    try { await dependencies.removeDownload(downloadedPath); } catch (error) { failures.push(error); }
  }
  return failures.length ? new AggregateError(failures, "backup verification cleanup failed") : undefined;
}

/** Runs one verification attempt using injectable side effects for orchestration tests. */
export async function runBackupVerification(
  dependencies: BackupVerificationDependencies,
): Promise<"verified" | "lock_contended"> {
  if (!await dependencies.acquireLock()) return "lock_contended";

  let target: DisposablePostgres | undefined;
  let downloadedPath: string | undefined;
  let failure: unknown;
  try {
    const backup = newestSupported(await dependencies.listBackups());
    downloadedPath = await dependencies.allocateDownloadPath();
    await dependencies.download(backup, downloadedPath);
    const sha256 = await dependencies.digest(downloadedPath);
    target = await dependencies.startPostgres();
    const source = backup.name.toLowerCase().endsWith(ENCRYPTED_SUFFIX)
      ? await dependencies.decrypt(downloadedPath, dependencies.activeKey())
      : await dependencies.legacySource(downloadedPath);
    await dependencies.restore(source, target);
    const validation = await dependencies.validate(target);
    if (validation.checks.some(check => !check.passed)) throw new Error("Restored database validation failed");
    await dependencies.audit("backup_restore_verified", "Database backup restore verified", {
      backupId: backup.id,
      sha256,
      tableCount: validation.tableCount,
      aggregateRowCount: validation.aggregateRowCount,
    });
  } catch (error) {
    failure = error;
  }

  const cleanupFailure = await cleanUp(dependencies, target, downloadedPath);
  if (!failure && cleanupFailure) failure = cleanupFailure;
  try {
    if (failure) {
      const requestId = randomUUID();
      await dependencies.audit("backup_restore_failed", "Database backup restore verification failed", { category: "backup_restore_failed", requestId }).catch(() => undefined);
      await dependencies.alert("backup_restore_failed", requestId).catch(() => undefined);
      await dependencies.notifyAdmin("backup_restore_failed", requestId).catch(() => undefined);
      throw genericFailure();
    }
    return "verified";
  } finally {
    await dependencies.releaseLock();
  }
}

async function digestFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  await pipeline(createReadStream(path), async function* (source) {
    for await (const chunk of source) {
      hash.update(chunk);
      yield chunk;
    }
  });
  return hash.digest("hex");
}

async function legacySqlSource(path: string): Promise<Readable> {
  const file = await open(path, "r");
  const magic = Buffer.alloc(2);
  try { await file.read(magic, 0, 2, 0); } finally { await file.close(); }
  return magic[0] === 0x1f && magic[1] === 0x8b
    ? createReadStream(path).pipe(createGunzip())
    : createReadStream(path);
}

async function listDriveBackups(): Promise<DriveBackupFile[]> {
  const folderId = await getGoogleDriveBackupFolderId();
  const query = new URLSearchParams({
    q: `'${folderId.replaceAll("'", "\\'")}' in parents and trashed = false`,
    fields: "files(id,name,size,mimeType,modifiedTime,parents,trashed)",
    orderBy: "modifiedTime desc",
    pageSize: "100",
  });
  const response = await new ReplitConnectors().proxy(DRIVE_CONNECTOR, `/drive/v3/files?${query}`);
  if (!response.ok) throw new Error("Could not list database backups");
  return ((await response.json()) as { files?: DriveBackupFile[] }).files ?? [];
}

async function allocateDriveDownloadPath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "sp-backup-verify-download-"));
  await chmod(directory, 0o700);
  return join(directory, "backup");
}

async function downloadDriveBackup(backup: DriveBackupFile, path: string): Promise<void> {
  try {
    const response = await new ReplitConnectors().proxy(DRIVE_CONNECTOR, `/drive/v3/files/${encodeURIComponent(backup.id)}?alt=media`);
    if (!response.ok || !response.body) throw new Error("Could not download database backup");
    await pipeline(Readable.fromWeb(response.body as never), createWriteStream(path, { mode: 0o600 }));
  } catch (error) {
    throw error;
  }
}

async function acquireLock(): Promise<boolean> {
  const client = await pool.connect();
  const result = await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock(hashtext($1)) AS locked", [VERIFY_LOCK_NAME]);
  if (!result.rows[0]?.locked) client.release();
  else (acquireLock as unknown as { client?: typeof client }).client = client;
  return Boolean(result.rows[0]?.locked);
}

async function releaseLock(): Promise<void> {
  const holder = acquireLock as unknown as { client?: Awaited<ReturnType<typeof pool.connect>> };
  const client = holder.client;
  if (!client) return;
  holder.client = undefined;
  try { await client.query("SELECT pg_advisory_unlock(hashtext($1))", [VERIFY_LOCK_NAME]); } finally { client.release(); }
}

function defaultDependencies(): BackupVerificationDependencies {
  return {
    acquireLock,
    releaseLock,
    listBackups: listDriveBackups,
    allocateDownloadPath: allocateDriveDownloadPath,
    download: downloadDriveBackup,
    digest: digestFile,
    startPostgres: startDisposablePostgres,
    activeKey: () => parseBackupEncryptionKey(process.env.DB_BACKUP_ENCRYPTION_KEY ?? ""),
    decrypt: decryptBackupToStream,
    legacySource: legacySqlSource,
    restore: async (source, target) => target.restoreSql(source),
    validate: validateRestoredDatabase,
    audit: async (action, message, metadata) => writeLog("error", action.endsWith("failed") ? "error" : "info", action, message, metadata),
    alert: async (category, requestId) => createAlert("system", "high", "Database backup verification failed", `Category: ${category}; request ID: ${requestId}`),
    notifyAdmin: async (category, requestId) => { await sendAdminMessage(`Database backup verification failed. Category: ${category}; request ID: ${requestId}`); },
    removeDownload: async path => rm(join(path, ".."), { recursive: true, force: true }),
  };
}

export async function runLatestBackupVerification(): Promise<"verified" | "lock_contended" | "not_configured"> {
  if (!process.env.DB_BACKUP_ENCRYPTION_KEY) return "not_configured";
  return runBackupVerification(defaultDependencies());
}