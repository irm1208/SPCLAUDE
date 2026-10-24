import type { DriveBackupFile } from "./google-drive-backup";

export const BACKUP_HOUR_MS = 60 * 60 * 1000;
export const BACKUP_RETENTION_MS = 72 * BACKUP_HOUR_MS;

/** Filenames contain capture time in UTC; Drive modifiedTime is not backup age. */
export function backupCaptureTime(name: string): number | null {
  const match = /^S&PBACKUP-(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})(?:\.SQL(?:\.manifest\.json)?|\.sql\.gz\.enc)$/.exec(name);
  if (!match) return null;
  const iso = `${match[1]}T${match[2]}:${match[3]}:${match[4]}.000Z`;
  const time = Date.parse(iso);
  return Number.isFinite(time) && new Date(time).toISOString() === iso ? time : null;
}

export function inBackupFolder(file: DriveBackupFile, folderId: string): boolean {
  return !!file.id && !file.trashed && file.parents?.length === 1 &&
    file.parents[0] === folderId && file.mimeType !== "application/vnd.google-apps.folder";
}

export function verificationProperties(file: DriveBackupFile, now = Date.now()): Record<string, string> {
  if (!file.id || !file.name.endsWith(".SQL") || backupCaptureTime(file.name) === null ||
      !/^[0-9a-f]{32}$/.test(file.md5Checksum ?? "") || !/^[1-9]\d*$/.test(file.size ?? "")) {
    throw new Error("Cannot record verification for an invalid SQL backup");
  }
  return { ...file.appProperties, spBackupMd5: file.md5Checksum!, spBackupSize: file.size!,
    spBackupVerifiedAt: new Date(now).toISOString() };
}

export function hasVerifiedBackupReceipt(file: DriveBackupFile): boolean {
  return !file.trashed && !!file.id && file.name.endsWith(".SQL") &&
    backupCaptureTime(file.name) !== null && /^[0-9a-f]{32}$/.test(file.md5Checksum ?? "") &&
    /^[1-9]\d*$/.test(file.size ?? "") &&
    file.appProperties?.spBackupMd5 === file.md5Checksum &&
    file.appProperties?.spBackupSize === file.size &&
    Number.isFinite(Date.parse(file.appProperties?.spBackupVerifiedAt ?? ""));
}

/** Called while holding the existing cross-instance backup advisory lock. */
export function hasBackupInCurrentHour(files: DriveBackupFile[], folderId: string, now = Date.now()): boolean {
  const start = Math.floor(now / BACKUP_HOUR_MS) * BACKUP_HOUR_MS;
  return files.some(file => {
    const time = backupCaptureTime(file.name);
    return inBackupFolder(file, folderId) && hasVerifiedBackupReceipt(file) &&
      time !== null && time >= start && time <= now;
  });
}
