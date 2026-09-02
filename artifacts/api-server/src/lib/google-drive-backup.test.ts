import { describe, expect, it } from "vitest";
import {
  buildDriveTransportHeaders,
  DRIVE_BACKUP_FILE_PREFIX,
  buildDriveBackupFileName,
  discoverLegacyBackupFiles,
  findMatchingDriveBackup,
  isRetryableDriveUploadStatus,
  migrationAction,
} from "./google-drive-backup";
import { buildPgDumpArgs } from "./db-backup-command";

describe("Google Drive database backup helpers", () => {
  it("builds the requested stable UTC backup filename", () => {
    expect(buildDriveBackupFileName(new Date("2026-09-02T10:40:11.000Z"))).toBe(
      "S&PBACKUP-2026-09-02_10-40-11.SQL",
    );
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

  it("describes a decoded full-file range while transporting gzip bytes", () => {
    expect(buildDriveTransportHeaders(10_000, 2_500)).toEqual({
      "Content-Type": "application/sql",
      "Content-Encoding": "gzip",
      "Content-Length": "2500",
      "Content-Range": "bytes 0-9999/10000",
    });
  });

  it("retries only temporary connector and Drive upload failures", () => {
    expect([403, 408, 425, 429, 500, 502, 503, 504].every(isRetryableDriveUploadStatus))
      .toBe(true);
    expect([400, 401, 404, 409, 422].some(isRetryableDriveUploadStatus))
      .toBe(false);
  });
});