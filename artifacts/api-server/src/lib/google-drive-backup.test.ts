import { describe, expect, it } from "vitest";
import {
  DRIVE_BACKUP_FILE_PREFIX,
  DRIVE_BACKUP_KEEP_COUNT,
  buildDriveBackupFileName,
  selectDriveBackupIdsToTrash,
} from "./google-drive-backup";

describe("Google Drive database backup helpers", () => {
  it("builds a stable UTC backup filename", () => {
    expect(buildDriveBackupFileName(new Date("2026-09-02T10:40:11.000Z"))).toBe(
      "salt-and-peps-db-2026-09-02_10-40-11.sql.gz",
    );
  });

  it("keeps the newest backup files and returns older IDs for trashing", () => {
    const files = Array.from({ length: DRIVE_BACKUP_KEEP_COUNT + 2 }, (_, index) => ({
      id: `file-${index}`,
      name: `${DRIVE_BACKUP_FILE_PREFIX}${index}.sql.gz`,
      modifiedTime: new Date(Date.UTC(2026, 8, 2, 10, 0, 0) - index * 60_000).toISOString(),
    }));

    expect(selectDriveBackupIdsToTrash(files)).toEqual([
      `file-${DRIVE_BACKUP_KEEP_COUNT}`,
      `file-${DRIVE_BACKUP_KEEP_COUNT + 1}`,
    ]);
  });

  it("does not trash files outside the backup naming pattern", () => {
    expect(
      selectDriveBackupIdsToTrash([
        { id: "keep", name: "notes.txt", modifiedTime: "2026-09-02T10:00:00.000Z" },
        { id: "backup", name: `${DRIVE_BACKUP_FILE_PREFIX}old.sql.gz`, modifiedTime: "2026-09-01T10:00:00.000Z" },
      ], 0),
    ).toEqual(["backup"]);
  });
});