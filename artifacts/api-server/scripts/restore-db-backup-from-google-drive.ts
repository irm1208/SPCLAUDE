import { link, lstat, realpath, unlink } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  downloadGoogleDriveSqlBackup,
  getGoogleDriveBackupFile,
} from "../src/lib/google-drive-backup";

async function validateOutputPath(outputArgument: string): Promise<string> {
  const lexicalPath = resolve(outputArgument);
  const realParent = await realpath(dirname(lexicalPath));
  const outputPath = resolve(realParent, basename(lexicalPath));
  if (outputPath === resolve("/")) throw new Error("Choose an explicit restore output file");
  if (realParent.split(/[\\/]/).some((part) =>
    ["artifacts", "db-backups", "node_modules"].includes(part),
  )) {
    throw new Error("Choose an output path outside ignored backup and artifact directories");
  }
  if (!basename(outputPath).endsWith(".SQL")) {
    throw new Error("Restore output must use the uppercase .SQL extension to avoid deployment ignore rules");
  }
  return outputPath;
}

async function main(): Promise<void> {
  const [, , manifestId, outputArgument, ...extra] = process.argv;
  if (!manifestId || !outputArgument || extra.length) {
    throw new Error(
      "Usage: pnpm --filter @workspace/api-server exec tsx scripts/restore-db-backup-from-google-drive.ts <manifest-file-id> <output.SQL>",
    );
  }
  const outputPath = await validateOutputPath(outputArgument);
  try {
    await lstat(outputPath);
    throw new Error("Restore output already exists; refusing to overwrite it");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const temporaryPath = joinOutputTemporary(outputPath);
  try {
    const manifest = await getGoogleDriveBackupFile(manifestId);
    if (!manifest.name.endsWith(".SQL.manifest.json")) {
      throw new Error("The selected Drive file is not a SQL backup manifest");
    }
    await downloadGoogleDriveSqlBackup(manifest, temporaryPath);
    // link() is exclusive: a path created concurrently is never replaced.
    await link(temporaryPath, outputPath);
    console.log(`Restored and verified SQL backup to ${outputPath}`);
  } finally {
    await unlink(temporaryPath).catch(() => undefined);
  }
}

function joinOutputTemporary(outputPath: string): string {
  return resolve(dirname(outputPath), `.${basename(outputPath)}.${process.pid}.${randomUUID()}.restore`);
}

const scriptPath = resolve(fileURLToPath(import.meta.url));
if (scriptPath === resolve(process.argv[1] ?? "")) {
  main().catch((error) => {
    console.error(`[db-backup-restore] ${error instanceof Error ? error.message : "restore failed"}`);
    process.exitCode = 1;
  });
}