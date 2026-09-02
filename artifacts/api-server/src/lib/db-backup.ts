/**
 * Scheduled database backup.
 *
 * Runs a compressed pg_dump twice a day (every 12 hours) in production.
 * Uploads completed dumps to Google Drive and removes the local temporary file.
 * Local temporary files are retained only when an upload fails, then pruned after 3 days.
 */

import { spawn } from "child_process";
import { promisify } from "util";
import { mkdir, readdir, unlink, stat, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { tmpdir } from "os";
import { join } from "path";
import { pool } from "@workspace/db";
import {
  buildDriveBackupFileName,
  uploadBackupToGoogleDrive,
} from "./google-drive-backup";
import { buildPgDumpArgs } from "./db-backup-command";

const BACKUP_DIR = join(tmpdir(), "salt-and-peps-db-backups");
const KEEP_DAYS = 3;
const INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
const FIRST_BACKUP_DELAY_MS = 10 * 60 * 1000; // Do not compete with application startup.
const BACKUP_LOCK_NAME = "salt-and-peps:database-backup";
const BACKUP_FILE_PREFIX = "S&PBACKUP-";
const BACKUP_FILE_SUFFIX = ".SQL";

let backupInProgress = false;

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
    if (!file.startsWith(BACKUP_FILE_PREFIX) || !file.endsWith(BACKUP_FILE_SUFFIX)) continue;
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

async function createPlainDump(outputPath: string): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const pgDump = spawn(
    "pg_dump",
    buildPgDumpArgs(dbUrl),
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const stderr: Buffer[] = [];
  pgDump.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));

  const exitCode = new Promise<number>((resolve, reject) => {
    pgDump.once("error", reject);
    pgDump.once("close", (code) => resolve(code ?? 1));
  });

  try {
    await Promise.all([
      pipeline(pgDump.stdout, createWriteStream(outputPath)),
      exitCode.then((code) => {
        if (code !== 0) {
          const detail = Buffer.concat(stderr).toString("utf8").trim();
          throw new Error(`pg_dump exited with ${code}${detail ? `: ${detail}` : ""}`);
        }
      }),
    ]);
  } catch (error) {
    pgDump.kill("SIGTERM");
    throw error;
  }
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

/** Runs a single plain SQL dump, uploads it, and prunes temporary failures. */
export async function runDbBackup(): Promise<void> {
  if (backupInProgress) {
    console.log("[db-backup] A backup is already in progress — skipping");
    return;
  }
  if (!process.env.DATABASE_URL) {
    console.warn("[db-backup] DATABASE_URL not set — skipping backup");
    return;
  }

  backupInProgress = true;
  try {
    await withBackupLock(async () => {
      const fileName = buildDriveBackupFileName();
      const outputPath = join(BACKUP_DIR, fileName);
      try {
        await promisify(mkdir)(BACKUP_DIR, { recursive: true });
        await createPlainDump(outputPath);
        const { size } = await promisify(stat)(outputPath);
        console.log(`[db-backup] Plain SQL dump ready (${size} bytes): ${fileName}`);
        const uploaded = await uploadBackupToGoogleDrive(outputPath, fileName);
        await promisify(unlink)(outputPath);
        console.log(`[db-backup] Uploaded ${fileName} to Google Drive (file ${uploaded.id})`);
      } catch (err) {
        console.error("[db-backup] Backup/upload failed; temporary file retained:", err);
      } finally {
        await pruneOldBackups();
      }
    });
  } finally {
    backupInProgress = false;
  }
}

/**
 * Kicks off the backup schedule.
 * Development servers do not create backups. Production waits for startup
 * traffic to settle, then runs every 12 hours thereafter.
 */
export function startDbBackupSchedule(): void {
  if (process.env.NODE_ENV === "development") {
    console.log("[db-backup] Development mode — scheduled backups disabled");
    return;
  }
  console.log(
    "[db-backup] Schedule started — first run in 10 min, then every 12 h (plain SQL in Google Drive, retained indefinitely)",
  );
  setTimeout(() => void runDbBackup(), FIRST_BACKUP_DELAY_MS);
  setInterval(runDbBackup, INTERVAL_MS);
}
