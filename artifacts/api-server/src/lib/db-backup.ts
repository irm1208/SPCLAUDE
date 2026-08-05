/**
 * Scheduled database backup.
 *
 * Runs pg_dump twice a day (every 12 hours).
 * Keeps backups for 3 days (≤ 6 files at any time), then prunes anything older.
 * Files are stored in <project-root>/db-backups/ and named by UTC timestamp.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, readdir, unlink, stat } from "fs/promises";
import { join } from "path";

const execFileAsync = promisify(execFile);

const BACKUP_DIR = join(process.cwd(), "db-backups");
const KEEP_DAYS = 3;
const INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

/** Produces a filesystem-safe UTC timestamp string, e.g. 2026-08-05_14-30-00 */
function utcTimestamp(): string {
  return new Date()
    .toISOString()
    .replace("T", "_")
    .replace(/:/g, "-")
    .split(".")[0];
}

/** Deletes .sql files whose last-modified time is older than KEEP_DAYS days. */
async function pruneOldBackups(): Promise<void> {
  let files: string[];
  try {
    files = await readdir(BACKUP_DIR);
  } catch {
    return; // directory doesn't exist yet — nothing to prune
  }

  const cutoffMs = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;

  for (const file of files) {
    if (!file.startsWith("backup-") || !file.endsWith(".sql")) continue;
    const filePath = join(BACKUP_DIR, file);
    try {
      const { mtimeMs } = await stat(filePath);
      if (mtimeMs < cutoffMs) {
        await unlink(filePath);
        console.log(`[db-backup] Pruned old backup: ${file}`);
      }
    } catch {
      // file may have been removed concurrently — ignore
    }
  }
}

/** Runs a single pg_dump and then prunes old backups. */
export async function runDbBackup(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("[db-backup] DATABASE_URL not set — skipping backup");
    return;
  }

  const filename = `backup-${utcTimestamp()}.sql`;
  const outPath = join(BACKUP_DIR, filename);

  try {
    await mkdir(BACKUP_DIR, { recursive: true });

    await execFileAsync("pg_dump", [
      "--no-owner",
      "--no-privileges",
      `--file=${outPath}`,
      dbUrl,
    ]);

    console.log(`[db-backup] Backup written: ${filename}`);
  } catch (err) {
    console.error("[db-backup] pg_dump failed:", err);
    return; // don't prune if the dump itself failed
  }

  await pruneOldBackups();
}

/**
 * Kicks off the backup schedule.
 * Takes one backup immediately on startup, then every 12 hours thereafter.
 */
export function startDbBackupSchedule(): void {
  console.log("[db-backup] Schedule started — running now then every 12 h (keeping 3 days)");
  runDbBackup(); // first run immediately
  setInterval(runDbBackup, INTERVAL_MS);
}
