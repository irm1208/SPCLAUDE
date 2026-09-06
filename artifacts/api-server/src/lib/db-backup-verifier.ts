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
import { getGoogleDriveBackupFolderId, isSupportedBackupName, selectNewestBackup, type DriveBackupFile } from "./google-drive-backup";
import { validateRestoredDatabase, type RestoreValidationResult } from "./db-restore-validation";
import { writeLog } from "./audit-log";
import { createAlert } from "./create-alert";
import { sendAdminMessage } from "./telegram";

const VERIFY_LOCK_NAME = "salt-and-peps:database-backup-restore-verification";
const DRIVE_CONNECTOR = "google-drive";
const ENCRYPTED_SUFFIX = ".sql.gz.enc";
export const RESTORE_VERIFY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
export const RESTORE_VERIFY_FIRST_DELAY_MS = 60 * 60 * 1000;

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

function newestSupported(backups: DriveBackupFile[]): DriveBackupFile {
  const backup = selectNewestBackup(backups);
  if (!backup || !isSupportedBackupName(backup.name)) throw new Error("No supported database backup is available");
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

  try {
    if (failure) {
      const requestId = randomUUID();
      await dependencies.audit("backup_restore_failed", "Database backup restore verification failed", { category: "backup_restore_failed", requestId }).catch(() => undefined);
      await dependencies.alert("backup_restore_failed", requestId).catch(() => undefined);
      await dependencies.notifyAdmin("backup_restore_failed", requestId).catch(() => undefined);
    }
    const cleanupFailure = await cleanUp(dependencies, target, downloadedPath);
    if (cleanupFailure) {
      const requestId = randomUUID();
      await dependencies.audit("backup_restore_failed", "Database backup restore verification cleanup failed", { category: "backup_restore_cleanup_failed", requestId }).catch(() => undefined);
      await dependencies.alert("backup_restore_cleanup_failed", requestId).catch(() => undefined);
      await dependencies.notifyAdmin("backup_restore_cleanup_failed", requestId).catch(() => undefined);
      failure = cleanupFailure;
    }
    if (failure) throw genericFailure();
    return "verified";
  } finally {
    try {
      await dependencies.releaseLock();
    } catch {
      const requestId = randomUUID();
      await dependencies.audit("backup_restore_failed", "Database backup verification lock release failed", { category: "backup_restore_lock_release_failed", requestId }).catch(() => undefined);
      await dependencies.alert("backup_restore_lock_release_failed", requestId).catch(() => undefined);
      await dependencies.notifyAdmin("backup_restore_lock_release_failed", requestId).catch(() => undefined);
      throw new Error("backup verification lock release failed");
    }
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

export async function legacySqlSource(path: string): Promise<Readable> {
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

export function createVerificationAdvisoryLock(lockPool: {
  connect(): Promise<{ query<T>(sql: string, values?: unknown[]): Promise<{ rows: T[] }>; release(destroy?: boolean): void }>;
}): { acquire(): Promise<boolean>; release(): Promise<void> } {
  let held: Awaited<ReturnType<typeof lockPool.connect>> | undefined;
  return {
    async acquire() {
      const client = await lockPool.connect();
      try {
        const result = await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock(hashtext($1)) AS locked", [VERIFY_LOCK_NAME]);
        if (!result.rows[0]?.locked) {
          client.release();
          return false;
        }
        held = client;
        return true;
      } catch {
        try { client.release(true); } catch { /* already being destroyed */ }
        throw new Error("backup verification lock failed");
      }
    },
    async release() {
      const client = held;
      if (!client) return;
      held = undefined;
      try {
        const result = await client.query<{ unlocked: boolean }>("SELECT pg_advisory_unlock(hashtext($1)) AS unlocked", [VERIFY_LOCK_NAME]);
        if (!result.rows[0]?.unlocked) throw new Error("unlock failed");
        client.release();
      } catch {
        try { client.release(true); } catch { /* already being destroyed */ }
        throw new Error("backup verification lock release failed");
      }
    },
  };
}
const verificationLock = createVerificationAdvisoryLock(pool);

function defaultDependencies(): BackupVerificationDependencies {
  return {
    acquireLock: verificationLock.acquire,
    releaseLock: verificationLock.release,
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

export interface LatestBackupVerificationOptions {
  environment?: NodeJS.ProcessEnv;
  dependencies?: BackupVerificationDependencies;
  consoleError?: (message: string) => void;
}

export async function runLatestBackupVerification(
  options: LatestBackupVerificationOptions = {},
): Promise<"verified" | "lock_contended" | "not_configured"> {
  const environment = options.environment ?? process.env;
  const dependencies = options.dependencies ?? defaultDependencies();
  if (!environment.DB_BACKUP_ENCRYPTION_KEY) {
    if (environment.NODE_ENV === "production") {
      const category = "backup_restore_not_configured";
      const requestId = randomUUID();
      (options.consoleError ?? console.error)(
        "[db-backup-verifier] Backup restore verification is not configured",
      );
      await dependencies.audit(
        "backup_restore_failed",
        "Database backup restore verification is not configured",
        { category, requestId },
      ).catch(() => undefined);
      await dependencies.alert(category, requestId).catch(() => undefined);
      await dependencies.notifyAdmin(category, requestId).catch(() => undefined);
    }
    return "not_configured";
  }
  return runBackupVerification(dependencies);
}

export interface BackupVerificationScheduleOptions {
  environment?: NodeJS.ProcessEnv;
  run?: () => Promise<"verified" | "lock_contended" | "not_configured">;
}

/**
 * Schedules real restore verification in production. A recursive timeout keeps
 * the weekly delay between completed attempts and prevents local overlap.
 */
export function startDbBackupVerificationSchedule(
  options: BackupVerificationScheduleOptions = {},
): { stop(): void } {
  const environment = options.environment ?? process.env;
  const run = options.run ?? runLatestBackupVerification;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stop = (): void => {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  if (environment.NODE_ENV !== "production") {
    return { stop };
  }

  const schedule = (delay: number): void => {
    if (stopped) return;
    timer = setTimeout(async () => {
      timer = undefined;
      try {
        await run();
      } catch {
        console.error("[db-backup-verifier] Scheduled restore verification failed");
      } finally {
        schedule(RESTORE_VERIFY_INTERVAL_MS);
      }
    }, delay);
  };

  console.log("[db-backup-verifier] Schedule started — first restore verification in 1 h, then weekly");
  schedule(RESTORE_VERIFY_FIRST_DELAY_MS);
  return { stop };
}