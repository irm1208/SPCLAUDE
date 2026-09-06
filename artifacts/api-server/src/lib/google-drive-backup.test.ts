import { describe, expect, it } from "vitest";
import {
  buildDriveTransportHeaders,
  DRIVE_BACKUP_MIME_TYPE,
  DRIVE_BACKUP_FILE_PREFIX,
  buildDriveBackupFileName,
  discoverLegacyBackupFiles,
  findMatchingDriveBackup,
  isRetryableDriveUploadStatus,
  isSupportedBackupName,
  migrationAction,
  selectNewestBackup,
} from "./google-drive-backup";
import { buildPgDumpArgs } from "./db-backup-command";

describe("Google Drive database backup helpers", () => {
  it("builds the requested stable UTC backup filename", () => {
    expect(buildDriveBackupFileName(new Date("2026-09-02T10:40:11.000Z"))).toBe(
      "S&PBACKUP-2026-09-02_10-40-11.sql.gz.enc",
    );
  });

  it("uses an opaque binary MIME type for encrypted backups", () => {
    expect(DRIVE_BACKUP_MIME_TYPE).toBe("application/octet-stream");
  });

  it("keeps the S&P backup prefix available to migration code", () => {
    expect(DRIVE_BACKUP_FILE_PREFIX).toBe("S&PBACKUP-");
  });

  it("matches a remote file only when both name and byte size match", () => {
    expect(
      findMatchingDriveBackup(
        [
          { id: "wrong-size", name: "backup.sql", size: "10" },
          { id: "right", name: "backup.sql", size: "11" },
        ],
        "backup.sql",
        11,
      ),
    ).toEqual({ id: "right", name: "backup.sql", size: "11" });
    expect(
      findMatchingDriveBackup(
        [{ id: "conflict", name: "backup.sql", size: "10" }],
        "backup.sql",
        11,
      ),
    ).toBeNull();
  });

  it("always passes no-owner and no-privileges to pg_dump", () => {
    expect(buildPgDumpArgs("postgres://example")).toEqual([
      "--no-owner",
      "--no-privileges",
      "postgres://example",
    ]);
  });

  it("discovers only SQL files for the historical migration", () => {
    expect(
      discoverLegacyBackupFiles([
        "/workspace/db-backups/backup.sql",
        "/workspace/db-backups/notes.txt",
        "/workspace/db-backups/backup.SQL",
      ]),
    ).toEqual([
      "/workspace/db-backups/backup.sql",
      "/workspace/db-backups/backup.SQL",
    ]);
  });

  it("chooses an idempotent migration action from remote name matches", () => {
    expect(migrationAction(11, [])).toBe("upload");
    expect(
      migrationAction(11, [{ id: "same", name: "backup.sql", size: "11" }]),
    ).toBe("already_migrated");
    expect(
      migrationAction(11, [{ id: "conflict", name: "backup.sql", size: "10" }]),
    ).toBe("conflict");
  });

  it("sends encrypted bytes without decoded gzip transport headers", () => {
    expect(buildDriveTransportHeaders(2_500)).toEqual({
      "Content-Type": "application/octet-stream",
      "Content-Length": "2500",
    });
  });

  it("recognizes encrypted backups and legacy SQL only for verification", () => {
    expect(isSupportedBackupName("S&PBACKUP-2026-09-02_10-40-11.sql.gz.enc")).toBe(true);
    expect(isSupportedBackupName("S&PBACKUP-2026-09-02_10-40-11.SQL")).toBe(true);
    expect(isSupportedBackupName("S&PBACKUP-2026-09-02_10-40-11.sql.gz")).toBe(false);
  });

  it("selects the newest non-trashed supported Drive backup", () => {
    expect(
      selectNewestBackup([
        {
          id: "trashed-newer",
          name: "S&PBACKUP-2026-09-04_10-40-11.sql.gz.enc",
          modifiedTime: "2026-09-04T10:40:11.000Z",
          trashed: true,
        },
        {
          id: "legacy",
          name: "S&PBACKUP-2026-09-02_10-40-11.SQL",
          modifiedTime: "2026-09-02T10:40:11.000Z",
        },
        {
          id: "encrypted-newest",
          name: "S&PBACKUP-2026-09-03_10-40-11.sql.gz.enc",
          modifiedTime: "2026-09-03T10:40:11.000Z",
        },
        {
          id: "unrelated",
          name: "notes.txt",
          modifiedTime: "2026-09-05T10:40:11.000Z",
        },
      ]),
    ).toMatchObject({ id: "encrypted-newest" });
  });

  it("retries only temporary connector and Drive upload failures", () => {
    expect([403, 408, 425, 429, 500, 502, 503, 504].every(isRetryableDriveUploadStatus))
      .toBe(true);
    expect([400, 401, 404, 409, 422].some(isRetryableDriveUploadStatus))
      .toBe(false);
  });
});