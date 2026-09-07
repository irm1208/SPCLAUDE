/**
 * Scheduled database backup.
 *
 * Streams an encrypted pg_dump every six hours in production.
 * Uploads completed encrypted dumps to Google Drive and removes the local temporary file.
 * Local encrypted files are retained only when an upload fails, then pruned after 3 days.
 */

import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { promisify } from "util";
import { mkdir, readdir, unlink, stat } from "fs";
import { rename as renameFile } from "fs/promises";
import { Readable } from "stream";
import { tmpdir } from "os";
import { join } from "path";
import { pool } from "@workspace/db";
import {
  buildDriveBackupFileName,
  uploadBackupToGoogleDrive,
} from "./google-drive-backup";
import { buildPgDumpArgs } from "./db-backup-command";
import { encryptBackupStream, parseBackupEncryptionKey } from "./backup-encryption";
import { writeLog } from "./audit-log";
import { createAlert } from "./create-alert";
import { sendAdminMessage } from "./telegram";

const BACKUP_DIR = join(tmpdir(), "salt-and-peps-db-backups");
const KEEP_DAYS = 3;
export const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
export const FIRST_BACKUP_DELAY_MS = 10 * 60 * 1000; // Do not compete with application startup.
export const BACKUP_RETRY_DELAY_MS = 5 * 60 * 1000; // Retry lock contention without busy-looping.
const BACKUP_LOCK_NAME = "salt-and-peps:database-backup";
const BACKUP_FILE_PREFIX = "S&PBACKUP-";
const BACKUP_FILE_SUFFIX = ".sql.gz.enc";
const TERMINATION_GRACE_MS = 10_000;
const BACKUP_TIMESTAMP = "\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2}";
const RANDOM_UUID = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const PRUNABLE_ENCRYPTED_BACKUP_ARTIFACT = new RegExp(
  `^${BACKUP_FILE_PREFIX}${BACKUP_TIMESTAMP}${BACKUP_FILE_SUFFIX.replace(/\./g, "\\.")}(?:\\.partial|\\.partial\\.\\d+\\.${RANDOM_UUID}\\.partial)?$`,
);

let backupInProgress = false;

export type DbBackupResult =
  | "completed"
  | "failed"
  | "lock_contended"
  | "already_in_progress"
  | "not_configured";

export function backupRunResult(
  lockAcquired: boolean,
  attemptResult: "completed" | "failed",
): "completed" | "failed" | "lock_contended" {
  return lockAcquired ? attemptResult : "lock_contended";
}

/** Limits stale-file deletion to encrypted backup artifacts we create. */
export function isPrunableEncryptedBackupArtifact(fileName: string): boolean {
  return PRUNABLE_ENCRYPTED_BACKUP_ARTIFACT.test(fileName);
}

/** Deletes temporary backup files whose last-modified time is older than KEEP_DAYS days. */
async function pruneOldBackups(): Promise<void> {
  let files: string[];
  try {
    files = await promisify(readdir)(BACKUP_DIR);
  } catch {
    return; // directory doesn't exist yet — nothing to prune
  }

  const cutoffMs = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;

  for (const file of files) {
    if (!isPrunableEncryptedBackupArtifact(file)) continue;
    const filePath = join(BACKUP_DIR, file);
    try {
      const { mtimeMs } = await promisify(stat)(filePath);
      if (mtimeMs < cutoffMs) {
        await promisify(unlink)(filePath);
        console.log(`[db-backup] Pruned old backup: ${file}`);
      }
    } catch {
      // file may have been removed concurrently — ignore
    }
  }
}

export function requireBackupEncryptionKey(environment: NodeJS.ProcessEnv = process.env): Buffer {
  const encodedKey = environment.DB_BACKUP_ENCRYPTION_KEY;
  if (!encodedKey) {
    throw new Error("DB_BACKUP_ENCRYPTION_KEY must be set for encrypted database backups");
  }
  return parseBackupEncryptionKey(encodedKey);
}

interface PgDumpProcess {
  stdout: Readable;
  stderr: NodeJS.ReadableStream;
  once(event: "error", listener: (error: Error) => void): unknown;
  once(event: "close", listener: (code: number | null) => void): unknown;
  kill(signal: NodeJS.Signals): unknown;
}

export interface EncryptedBackupOptions {
  fileName: string;
  outputPath: string;
  environment: NodeJS.ProcessEnv;
  spawnPgDump: (databaseUrl: string) => PgDumpProcess;
  encrypt: (source: Readable, destinationPath: string, key: Buffer) => Promise<unknown>;
  upload: (filePath: string, fileName: string) => Promise<{ id: string }>;
  rename: (oldPath: string, newPath: string) => Promise<void>;
  unlink: (path: string) => Promise<void>;
  terminationGraceMs?: number;
}

export interface BackupAttemptOptions extends EncryptedBackupOptions {
  audit: (category: string, requestId: string) => Promise<void>;
  alert: (category: string, requestId: string) => Promise<void>;
  notifyAdmin: (category: string, requestId: string) => Promise<void>;
  consoleError: (message: string) => void;
}

/** Streams pg_dump into an encrypted temporary file before uploading it. */
export async function createAndUploadEncryptedBackup(options: EncryptedBackupOptions): Promise<void> {
  const encryptionKey = requireBackupEncryptionKey(options.environment);
  const databaseUrl = options.environment.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL not set");
  const partialPath = `${options.outputPath}.partial`;
  const pgDump = options.spawnPgDump(databaseUrl);
  const stderr: Buffer[] = [];
  pgDump.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
  let childClosed = false;
  const childClosedPromise = new Promise<number>((resolve) => {
    pgDump.once("close", (code) => {
      childClosed = true;
      resolve(code ?? 1);
    });
  });
  const childError = new Promise<never>((_resolve, reject) => {
    pgDump.once("error", reject);
  });
  const dumpCompleted = Promise.race([
    childClosedPromise.then((code) => {
      if (code !== 0) {
        const detail = Buffer.concat(stderr).toString("utf8").trim();
        throw new Error(`pg_dump exited with ${code}${detail ? `: ${detail}` : ""}`);
      }
    }),
    childError,
  ]);
  const encryptionCompleted = options.encrypt(pgDump.stdout, partialPath, encryptionKey);
  let encryptedFileReadyForUpload = false;
  try {
    await Promise.all([
      encryptionCompleted,
      dumpCompleted,
    ]);
    await options.rename(partialPath, options.outputPath);
    encryptedFileReadyForUpload = true;
    await options.upload(options.outputPath, options.fileName);
    await options.unlink(options.outputPath);
  } catch (error) {
    if (!childClosed) {
      pgDump.kill("SIGTERM");
      const graceMs = options.terminationGraceMs ?? TERMINATION_GRACE_MS;
      const graceExpired = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(true), graceMs);
        void childClosedPromise.then(() => {
          clearTimeout(timer);
          resolve(false);
        });
      });
      if (graceExpired && !childClosed) pgDump.kill("SIGKILL");
      await childClosedPromise;
    }
    await Promise.allSettled([encryptionCompleted, dumpCompleted]);
    if (!encryptedFileReadyForUpload) {
      await options.unlink(partialPath).catch(() => undefined);
      await options.unlink(options.outputPath).catch(() => undefined);
    }
    throw error;
  }
}

async function attemptFailureChannel(operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } catch {
    // Failure channels are independent; one unavailable channel must not block the others.
  }
}

/** Converts backup failures into a sanitized durable operational outcome. */
export async function runEncryptedBackupAttempt(
  options: BackupAttemptOptions,
): Promise<"completed" | "failed"> {
  try {
    await createAndUploadEncryptedBackup(options);
    return "completed";
  } catch {
    const category = "database_backup_failed";
    const requestId = randomUUID();
    options.consoleError("[db-backup] Encrypted backup attempt failed");
    await Promise.all([
      attemptFailureChannel(() => options.audit(category, requestId)),
      attemptFailureChannel(() => options.alert(category, requestId)),
      attemptFailureChannel(() => options.notifyAdmin(category, requestId)),
    ]);
    return "failed";
  }
}

function backupFailureDependencies(): Pick<
  BackupAttemptOptions,
  "audit" | "alert" | "notifyAdmin" | "consoleError"
> {
  return {
    audit: async (category, requestId) => {
      await writeLog(
        "error",
        "error",
        "database_backup_failed",
        "Encrypted database backup failed",
        { category, requestId },
      );
    },
    alert: async (category, requestId) => {
      await createAlert(
        "system",
        "high",
        "Encrypted database backup failed",
        `Category: ${category}; request ID: ${requestId}`,
      );
    },
    notifyAdmin: async (category, requestId) => {
      await sendAdminMessage(
        `Encrypted database backup failed. Category: ${category}; request ID: ${requestId}`,
      );
    },
    consoleError: (message) => console.error(message),
  };
}

function spawnPgDump(databaseUrl: string): PgDumpProcess {
  const pgDump = spawn(
    "pg_dump",
    buildPgDumpArgs(databaseUrl),
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  if (!pgDump.stdout || !pgDump.stderr) {
    throw new Error("pg_dump did not provide stdout and stderr streams");
  }
  return pgDump as PgDumpProcess;
}

async function withBackupLock(task: () => Promise<void>): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock(hashtext($1)) AS locked",
      [BACKUP_LOCK_NAME],
    );
    if (!result.rows[0]?.locked) {
      console.log("[db-backup] Another instance is already running — skipping");
      return false;
    }

    try {
      await task();
    } finally {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [BACKUP_LOCK_NAME]);
    }
    return true;
  } finally {
    client.release();
  }
}

/** Runs a single encrypted SQL dump, uploads it, and prunes temporary failures. */
export async function runDbBackup(): Promise<DbBackupResult> {
  if (backupInProgress) {
    console.log("[db-backup] A backup is already in progress — skipping");
    return "already_in_progress";
  }
  if (!process.env.DATABASE_URL) {
    console.warn("[db-backup] DATABASE_URL not set — skipping backup");
    return "not_configured";
  }

  backupInProgress = true;
  try {
    let attemptResult: "completed" | "failed" = "failed";
    const acquired = await withBackupLock(async () => {
      const fileName = buildDriveBackupFileName();
      const outputPath = join(BACKUP_DIR, fileName);
      try {
        await promisify(mkdir)(BACKUP_DIR, { recursive: true });
        attemptResult = await runEncryptedBackupAttempt({
          fileName,
          outputPath,
          environment: process.env,
          spawnPgDump,
          encrypt: encryptBackupStream,
          upload: uploadBackupToGoogleDrive,
          rename: renameFile,
          unlink: (path) => promisify(unlink)(path),
          ...backupFailureDependencies(),
        });
        if (attemptResult === "completed") {
          console.log(`[db-backup] Uploaded encrypted backup ${fileName} to Google Drive`);
        }
      } catch {
        console.error("[db-backup] Encrypted backup attempt failed");
      } finally {
        await pruneOldBackups();
      }
    });
    return backupRunResult(acquired, attemptResult);
  } finally {
    backupInProgress = false;
  }
}

/**
 * Creates the timer orchestration for production database backups.
 * Lock-contended attempts are retried until one gets through.
 */
export function createDbBackupScheduler(
  runBackup: () => Promise<DbBackupResult>,
): {
  start: () => void;
  stop: () => void;
} {
  let started = false;
  let stopped = false;
  let inFlight = false;
  let firstBackupTimer: ReturnType<typeof setTimeout> | undefined;
  let intervalTimer: ReturnType<typeof setInterval> | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const scheduleRetry = (): void => {
    if (stopped || retryTimer !== undefined) return;
    console.log(`[db-backup] Backup held by another instance — retrying in ${BACKUP_RETRY_DELAY_MS / 60_000} min`);
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void execute("retry");
    }, BACKUP_RETRY_DELAY_MS);
  };

  const execute = async (source: "scheduled" | "retry"): Promise<void> => {
    if (stopped) return;
    if (inFlight) {
      if (source === "retry") scheduleRetry();
      return;
    }

    inFlight = true;
    try {
      const result = await runBackup();
      if (result === "lock_contended") {
        scheduleRetry();
      } else if (result === "completed" && retryTimer !== undefined) {
        clearTimeout(retryTimer);
        retryTimer = undefined;
      }
    } catch {
      console.error("[db-backup] Scheduled backup attempt failed");
    } finally {
      inFlight = false;
    }
  };

  return {
    start: () => {
      if (started) return;
      started = true;
      stopped = false;
      firstBackupTimer = setTimeout(() => {
        firstBackupTimer = undefined;
        void execute("scheduled");
      }, FIRST_BACKUP_DELAY_MS);
      intervalTimer = setInterval(() => {
        void execute("scheduled");
      }, INTERVAL_MS);
    },
    stop: () => {
      if (stopped) return;
      stopped = true;
      if (firstBackupTimer !== undefined) clearTimeout(firstBackupTimer);
      if (intervalTimer !== undefined) clearInterval(intervalTimer);
      if (retryTimer !== undefined) clearTimeout(retryTimer);
      firstBackupTimer = undefined;
      intervalTimer = undefined;
      retryTimer = undefined;
    },
  };
}

/**
 * Kicks off the backup schedule.
 * Development servers do not create backups. Production waits for startup
 * traffic to settle, then runs every 6 hours thereafter.
 */
export function startDbBackupSchedule(): void {
  if (process.env.NODE_ENV === "development") {
    console.log("[db-backup] Development mode — scheduled backups disabled");
    return;
  }
  console.log(
    "[db-backup] Schedule started — first run in 10 min, then every 6 h (encrypted backups in Google Drive; lock contention is retried)",
  );
  createDbBackupScheduler(runDbBackup).start();
}
