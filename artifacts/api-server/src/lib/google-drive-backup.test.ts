import { describe, expect, it, vi } from "vitest";
import { mkdtemp, readdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const { proxy } = vi.hoisted(() => ({ proxy: vi.fn() }));

vi.mock("@replit/connectors-sdk", () => ({
  ReplitConnectors: class {
    proxy = proxy;
  },
}));

import {
  buildDriveTransportHeaders,
  DRIVE_BACKUP_MIME_TYPE,
  DRIVE_BACKUP_FILE_PREFIX,
  buildDriveBackupFileName,
  discoverLegacyBackupFiles,
  findMatchingDriveBackup,
  isRetryableDriveUploadStatus,
  isSupportedBackupName,
  downloadGoogleDriveBackup,
  listGoogleDriveBackups,
  migrationAction,
  selectNewestBackup,
  uploadBackupToGoogleDrive,
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

  it("lists every Drive backup page before selecting a supported backup", async () => {
    proxy.mockReset();
    proxy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ files: [{ id: "backup-folder" }] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [
              {
                id: "newest-unrelated",
                name: "notes.txt",
                modifiedTime: "2026-09-04T10:40:11.000Z",
              },
            ],
            nextPageToken: "page-two",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            files: [
              {
                id: "supported-on-page-two",
                name: "S&PBACKUP-2026-09-03_10-40-11.sql.gz.enc",
                modifiedTime: "2026-09-03T10:40:11.000Z",
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const files = await listGoogleDriveBackups();

    expect(selectNewestBackup(files)).toMatchObject({ id: "supported-on-page-two" });
    expect(proxy).toHaveBeenCalledTimes(3);
    expect(proxy.mock.calls[1]?.[1]).toContain("orderBy=modifiedTime+desc");
    expect(proxy.mock.calls[1]?.[1]).toContain("trashed+%3D+false");
    expect(proxy.mock.calls[2]?.[1]).toContain("pageToken=page-two");
  });

  it("uploads the encrypted file bytes with only binary transport headers", async () => {
    const directory = await mkdtemp(join(tmpdir(), "drive-backup-test-"));
    const encryptedPath = join(directory, "backup.sql.gz.enc");
    await writeFile(encryptedPath, "encrypted backup");
    proxy.mockReset();
    proxy.mockImplementation(async (_connector: string, path: string) => {
      if (path === "/upload/drive/v3/files?uploadType=resumable") {
        return new Response(null, {
          status: 200,
          headers: { location: "https://www.googleapis.com/upload/session" },
        });
      }
      if (path === "/upload/session") {
        return new Response(JSON.stringify({ id: "uploaded" }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          id: "uploaded",
          name: "S&PBACKUP-2026-09-02_10-40-11.sql.gz.enc",
          size: "16",
        }),
        { status: 200 },
      );
    });

    try {
      await uploadBackupToGoogleDrive(
        encryptedPath,
        "S&PBACKUP-2026-09-02_10-40-11.sql.gz.enc",
      );

      const uploadCall = proxy.mock.calls.find((call) => call[1] === "/upload/session");
      const uploadOptions = uploadCall?.[2] as {
        headers: Record<string, string>;
        body: Blob;
      };
      expect(uploadOptions.headers).toEqual({
        "Content-Type": "application/octet-stream",
        "Content-Length": "16",
      });
      expect(uploadOptions.headers).not.toHaveProperty("Content-Encoding");
      expect(uploadOptions.headers).not.toHaveProperty("Content-Range");
      expect(await uploadOptions.body.text()).toBe("encrypted backup");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("downloads atomically and removes partial files when streaming fails", async () => {
    const directory = await mkdtemp(join(tmpdir(), "drive-backup-test-"));
    const destination = join(directory, "backup.sql.gz.enc");
    await writeFile(destination, "old backup");
    proxy.mockReset();
    proxy.mockResolvedValueOnce(new Response("encrypted backup", { status: 200 }));

    try {
      await downloadGoogleDriveBackup("downloaded", destination);
      expect(await readFile(destination, "utf8")).toBe("encrypted backup");
      expect(proxy.mock.calls[0]?.[1]).toBe("/drive/v3/files/downloaded?alt=media");

      proxy.mockReset();
      proxy.mockResolvedValueOnce(
        new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new Error("network interrupted"));
            },
          }),
          { status: 200 },
        ),
      );
      await expect(downloadGoogleDriveBackup("failed", destination)).rejects.toThrow(
        "network interrupted",
      );
      expect(await readFile(destination, "utf8")).toBe("encrypted backup");
      expect((await readdir(directory)).filter((name) => name.endsWith(".partial"))).toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("retries only temporary connector and Drive upload failures", () => {
    expect([403, 408, 425, 429, 500, 502, 503, 504].every(isRetryableDriveUploadStatus))
      .toBe(true);
    expect([400, 401, 404, 409, 422].some(isRetryableDriveUploadStatus))
      .toBe(false);
  });
});