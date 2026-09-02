import { readdir, stat, unlink } from "fs/promises";
import { basename, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import {
  discoverLegacyBackupFiles,
  findGoogleDriveBackupsByName,
  findMatchingDriveBackup,
  migrationAction,
  uploadBackupToGoogleDrive,
} from "../src/lib/google-drive-backup";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, "../../..");
const sourceDirectories = [
  resolve(workspaceRoot, "db-backups"),
  resolve(workspaceRoot, "artifacts/api-server/db-backups"),
];
const dryRun = process.argv.includes("--dry-run");

interface MigrationSummary {
  discoveredFiles: number;
  discoveredBytes: number;
  alreadyMigratedFiles: number;
  alreadyMigratedBytes: number;
  uploadedFiles: number;
  uploadedBytes: number;
  conflictFiles: number;
  failedFiles: number;
}

async function listSourceFiles(): Promise<string[]> {
  const candidates: string[] = [];
  for (const directory of sourceDirectories) {
    try {
      const entries = await readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) candidates.push(resolve(directory, entry.name));
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
    }
  }
  return discoverLegacyBackupFiles(candidates).sort();
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 ** 3)).toFixed(2)} GiB`;
}

async function main(): Promise<void> {
  const files = await listSourceFiles();
  const summary: MigrationSummary = {
    discoveredFiles: files.length,
    discoveredBytes: 0,
    alreadyMigratedFiles: 0,
    alreadyMigratedBytes: 0,
    uploadedFiles: 0,
    uploadedBytes: 0,
    conflictFiles: 0,
    failedFiles: 0,
  };

  const sourceStats = new Map<string, number>();
  for (const filePath of files) {
    const { size } = await stat(filePath);
    sourceStats.set(filePath, size);
    summary.discoveredBytes += size;
  }

  console.log(
    `[db-backup-migration] ${dryRun ? "DRY RUN — " : ""}discovered ${summary.discoveredFiles} SQL files (${formatBytes(summary.discoveredBytes)})`,
  );

  for (const [index, filePath] of files.entries()) {
    const fileName = basename(filePath);
    const expectedSize = sourceStats.get(filePath);
    if (expectedSize === undefined) continue;
    const prefix = `[db-backup-migration] [${index + 1}/${files.length}] ${fileName}`;

    try {
      const remoteFiles = await findGoogleDriveBackupsByName(fileName);
      const action = migrationAction(expectedSize, remoteFiles);

      if (action === "conflict") {
        summary.conflictFiles += 1;
        console.error(
          `${prefix}: conflict — Drive has the same name with a different byte size; local file retained`,
        );
        continue;
      }

      if (action === "already_migrated") {
        const matching = findMatchingDriveBackup(remoteFiles, fileName, expectedSize);
        if (!matching) {
          throw new Error("matching file disappeared during verification");
        }
        summary.alreadyMigratedFiles += 1;
        summary.alreadyMigratedBytes += expectedSize;
        if (dryRun) {
          console.log(`${prefix}: already_migrated (${expectedSize} bytes); would delete local file`);
        } else {
          await unlink(filePath);
          console.log(
            `${prefix}: already_migrated and verified as Drive file ${matching.id}; local file deleted`,
          );
        }
        continue;
      }

      if (dryRun) {
        console.log(`${prefix}: would_upload (${expectedSize} bytes)`);
        continue;
      }

      const uploaded = await uploadBackupToGoogleDrive(filePath, fileName);
      if (uploaded.name !== fileName || Number(uploaded.size) !== expectedSize) {
        throw new Error(
          `post-upload verification mismatch: expected ${expectedSize}, got ${uploaded.size ?? "unknown"}`,
        );
      }
      await unlink(filePath);
      summary.uploadedFiles += 1;
      summary.uploadedBytes += expectedSize;
      console.log(
        `${prefix}: uploaded_and_verified as Drive file ${uploaded.id}; local file deleted`,
      );
    } catch (error) {
      summary.failedFiles += 1;
      console.error(
        `${prefix}: failed_and_retained — ${(error as Error).message}`,
      );
    }
  }

  console.log("[db-backup-migration] Summary:", {
    ...summary,
    discoveredSize: formatBytes(summary.discoveredBytes),
    alreadyMigratedSize: formatBytes(summary.alreadyMigratedBytes),
    uploadedSize: formatBytes(summary.uploadedBytes),
    dryRun,
  });

  if (summary.conflictFiles > 0 || summary.failedFiles > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[db-backup-migration] Fatal error:", error);
  process.exitCode = 1;
});