import { describe, expect, it, vi } from "vitest";
import { randomBytes } from "crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { gunzipSync } from "zlib";

const { proxy } = vi.hoisted(() => ({ proxy: vi.fn() }));

vi.mock("@replit/connectors-sdk", () => ({
  ReplitConnectors: class {
    proxy = proxy;
  },
}));

import {
  buildDriveTransportHeaders,
  buildPlainDriveTransportHeaders,
  DRIVE_BACKUP_MIME_TYPE,
  DRIVE_BACKUP_FILE_PREFIX,
  buildDriveBackupFileName,
  buildPlainDriveBackupFileName,
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

  it("builds a stable UTC filename for new plain SQL backups", () => {
    expect(buildPlainDriveBackupFileName(new Date("2026-09-02T10:40:11.000Z"))).toBe(
      "S&PBACKUP-2026-09-02_10-40-11.SQL",
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

  it("describes a gzip transport whose decoded Drive object is plain SQL", () => {
    expect(buildPlainDriveTransportHeaders(660_000_000, 42_000_000)).toEqual({
      "Content-Type": "application/sql",
      "Content-Encoding": "gzip",
      "Content-Length": "42000000",
      "Content-Range": "bytes 0-659999999/660000000",
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

  it("uploads encrypted file bytes with a range based on encrypted length", async () => {
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
        "Content-Range": "bytes 0-15/16",
      });
      expect(uploadOptions.headers).not.toHaveProperty("Content-Encoding");
      expect(await uploadOptions.body.text()).toBe("encrypted backup");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("uploads plain SQL through gzip transport while Drive stores decoded SQL bytes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "drive-backup-test-"));
    const plainPath = join(directory, "backup.SQL");
    const plainSql = "-- PostgreSQL database dump\\nSELECT 1;\\n";
    let uploadedTransport: Buffer | null = null;
    await writeFile(plainPath, plainSql);
    proxy.mockReset();
    proxy.mockImplementation(async (_connector: string, path: string, options?: { body?: Blob }) => {
      if (path === "/upload/drive/v3/files?uploadType=resumable") {
        return new Response(null, {
          status: 200,
          headers: { location: "https://www.googleapis.com/upload/plain-session" },
        });
      }
      if (path === "/upload/plain-session") {
        uploadedTransport = Buffer.from(await options!.body!.arrayBuffer());
        return new Response(JSON.stringify({ id: "plain-uploaded" }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          id: "plain-uploaded",
          name: "S&PBACKUP-2026-09-02_10-40-11.SQL",
          size: String(Buffer.byteLength(plainSql)),
        }),
        { status: 200 },
      );
    });

    try {
      await uploadBackupToGoogleDrive(
        plainPath,
        "S&PBACKUP-2026-09-02_10-40-11.SQL",
      );

      const uploadCall = proxy.mock.calls.find((call) => call[1] === "/upload/plain-session");
      const uploadOptions = uploadCall?.[2] as {
        headers: Record<string, string>;
        body: Blob;
      };
      expect(uploadOptions.headers).toMatchObject({
        "Content-Type": "application/sql",
        "Content-Encoding": "gzip",
        "Content-Range": `bytes 0-${Buffer.byteLength(plainSql) - 1}/${Buffer.byteLength(plainSql)}`,
      });
      expect(
        gunzipSync(uploadedTransport!).toString("utf8"),
      ).toBe(plainSql);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("uploads large plain SQL as bounded gzip chunks with decoded SQL ranges", async () => {
    const directory = await mkdtemp(join(tmpdir(), "drive-backup-test-"));
    const plainPath = join(directory, "large-backup.SQL");
    const chunkSize = 4 * 1024 * 1024;
    const plainSql = randomBytes(chunkSize + 123);
    await writeFile(plainPath, plainSql);
    const uploadedChunks: Buffer[] = [];
    const requests: Array<{ headers: Record<string, string>; body: Buffer }> = [];
    let proxyCalls = 0;
    let committed = 0;
    proxy.mockReset();
    proxy.mockImplementation(async (
      _connector: string,
      path: string,
      options?: { headers?: Record<string, string>; body?: Blob },
    ) => {
      proxyCalls += 1;
      if (proxyCalls > 20) throw new Error(`Unexpected upload loop at ${path}`);
      if (path === "/upload/drive/v3/files?uploadType=resumable") {
        return new Response(null, {
          status: 200,
          headers: { location: "https://www.googleapis.com/upload/plain-chunked" },
        });
      }
      if (path === "/upload/plain-chunked") {
        const body = options?.body
          ? Buffer.from(await options.body.arrayBuffer())
          : Buffer.alloc(0);
        if (body.length) {
          requests.push({ headers: options!.headers!, body });
          const range = options!.headers!["Content-Range"].match(/^bytes (\d+)-(\d+)\/\d+$/);
          expect(range).not.toBeNull();
          const start = Number(range?.[1]);
          const end = Number(range?.[2]);
          expect(start).toBe(committed);
          const decoded = gunzipSync(body);
          uploadedChunks.push(decoded);
          committed = end + 1;
          if (uploadedChunks.length === 1) {
            throw new Error("connector lost the first chunk response");
          }
          if (committed === plainSql.length) {
            return new Response(JSON.stringify({ id: "large-plain-uploaded" }), { status: 200 });
          }
          return new Response(null, { status: 308, headers: { range: `bytes=0-${committed - 1}` } });
        } else {
          return new Response(
            null,
            { status: 308, headers: committed ? { range: `bytes=0-${committed - 1}` } : {} },
          );
        }
      }
      return new Response(JSON.stringify({
        id: "large-plain-uploaded",
        name: "S&PBACKUP-2026-09-02_10-40-11.SQL",
        size: String(plainSql.length),
      }), { status: 200 });
    });

    try {
      await expect(uploadBackupToGoogleDrive(
        plainPath,
        "S&PBACKUP-2026-09-02_10-40-11.SQL",
      )).resolves.toMatchObject({ id: "large-plain-uploaded" });

      expect(requests.length).toBeGreaterThan(2);
      expect(requests[0]?.headers["Content-Range"]).toBe(`bytes 0-${1024 * 1024 - 1}/${plainSql.length}`);
      for (let index = 1; index < requests.length; index += 1) {
        const previousRange = requests[index - 1]?.headers["Content-Range"].match(/^bytes (\d+)-(\d+)\//);
        const currentRange = requests[index]?.headers["Content-Range"].match(/^bytes (\d+)-(\d+)\//);
        expect(Number(currentRange?.[1])).toBe(Number(previousRange?.[2]) + 1);
      }
      const finalRange = requests.at(-1)?.headers["Content-Range"].match(/^bytes (\d+)-(\d+)\//);
      expect(Number(finalRange?.[2])).toBe(plainSql.length - 1);
      expect(requests.every((request) =>
        request.body.length < 2 * 1024 * 1024 &&
        request.headers["Content-Length"] === String(request.body.length),
      )).toBe(true);
      expect(Buffer.compare(Buffer.concat(uploadedChunks), plainSql)).toBe(0);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("shrinks a SQL chunk after a 413 and resumes at the same committed offset", async () => {
    const directory = await mkdtemp(join(tmpdir(), "drive-backup-test-"));
    const plainPath = join(directory, "adaptive-backup.SQL");
    const plainSql = randomBytes(1024 * 1024 + 17);
    const gatewayLimit = 512 * 1024;
    const transmittedSizes: number[] = [];
    const acceptedRanges: Array<{ start: number; end: number }> = [];
    const uploadedChunks: Buffer[] = [];
    let committed = 0;
    await writeFile(plainPath, plainSql);
    proxy.mockReset();
    proxy.mockImplementation(async (
      _connector: string,
      path: string,
      options?: { headers?: Record<string, string>; body?: Blob },
    ) => {
      if (path === "/upload/drive/v3/files?uploadType=resumable") {
        return new Response(null, {
          status: 200,
          headers: { location: "https://www.googleapis.com/upload/plain-adaptive" },
        });
      }
      if (path === "/upload/plain-adaptive") {
        if (!options?.body) {
          return new Response(
            null,
            { status: 308, headers: committed ? { range: `bytes=0-${committed - 1}` } : {} },
          );
        }
        const body = Buffer.from(await options.body.arrayBuffer());
        transmittedSizes.push(body.length);
        if (body.length > gatewayLimit) return new Response("gateway payload limit", { status: 413 });

        const match = options.headers?.["Content-Range"]?.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
        expect(match).not.toBeNull();
        const start = Number(match?.[1]);
        const end = Number(match?.[2]);
        expect(start).toBe(committed);
        acceptedRanges.push({ start, end });
        const decoded = gunzipSync(body);
        uploadedChunks.push(decoded);
        committed = end + 1;
        if (committed === plainSql.length) {
          return new Response(JSON.stringify({ id: "adaptive-uploaded" }), { status: 200 });
        }
        return new Response(null, { status: 308, headers: { range: `bytes=0-${committed - 1}` } });
      }
      return new Response(JSON.stringify({
        id: "adaptive-uploaded",
        name: "S&PBACKUP-2026-09-02_10-40-11.SQL",
        size: String(plainSql.length),
      }), { status: 200 });
    });

    try {
      await expect(uploadBackupToGoogleDrive(
        plainPath,
        "S&PBACKUP-2026-09-02_10-40-11.SQL",
      )).resolves.toMatchObject({ id: "adaptive-uploaded" });

      expect(transmittedSizes.some((size) => size > gatewayLimit)).toBe(true);
      expect(transmittedSizes.filter((size) => size > gatewayLimit)).toHaveLength(2);
      expect(transmittedSizes.filter((size) => size <= gatewayLimit).length).toBeGreaterThan(1);
      expect(acceptedRanges[0]?.start).toBe(0);
      for (let index = 1; index < acceptedRanges.length; index += 1) {
        expect(acceptedRanges[index]?.start).toBe(acceptedRanges[index - 1]!.end + 1);
      }
      expect(acceptedRanges.at(-1)?.end).toBe(plainSql.length - 1);
      expect(Buffer.compare(Buffer.concat(uploadedChunks), plainSql)).toBe(0);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("fails explicitly when the gateway rejects the minimum SQL chunk", async () => {
    const directory = await mkdtemp(join(tmpdir(), "drive-backup-test-"));
    const plainPath = join(directory, "minimum-backup.SQL");
    const plainSql = randomBytes(256 * 1024);
    const requestSizes: number[] = [];
    await writeFile(plainPath, plainSql);
    proxy.mockReset();
    proxy.mockImplementation(async (_connector: string, path: string, options?: { body?: Blob }) => {
      if (path === "/upload/drive/v3/files?uploadType=resumable") {
        return new Response(null, {
          status: 200,
          headers: { location: "https://www.googleapis.com/upload/plain-minimum" },
        });
      }
      if (path === "/upload/plain-minimum") {
        if (options?.body) {
          requestSizes.push((await options.body.arrayBuffer()).byteLength);
          return new Response("gateway payload limit", { status: 413 });
        }
        return new Response(null, { status: 308 });
      }
      return new Response("{}");
    });

    try {
      await expect(uploadBackupToGoogleDrive(
        plainPath,
        "S&PBACKUP-2026-09-02_10-40-11.SQL",
      )).rejects.toThrow("Google Drive rejected the minimum 256 KiB plain SQL upload chunk");
      expect(requestSizes).toHaveLength(1);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("recovers a plain SQL upload when the completion response is lost", async () => {
    const directory = await mkdtemp(join(tmpdir(), "drive-backup-test-"));
    const plainPath = join(directory, "backup.SQL");
    const plainSql = "SELECT 1;\n";
    await writeFile(plainPath, plainSql);
    let sessionCalls = 0;
    proxy.mockReset();
    proxy.mockImplementation(async (_connector: string, path: string, options?: { body?: Blob }) => {
      if (path === "/upload/drive/v3/files?uploadType=resumable") {
        return new Response(null, {
          status: 200,
          headers: { location: "https://www.googleapis.com/upload/plain-lost-response" },
        });
      }
      if (path === "/upload/plain-lost-response") {
        sessionCalls += 1;
        if (options?.body) throw new Error("connector lost completion response");
        return new Response(JSON.stringify({ id: "plain-uploaded" }), { status: 200 });
      }
      return new Response(JSON.stringify({
        id: "plain-uploaded",
        name: "S&PBACKUP-2026-09-02_10-40-11.SQL",
        size: String(Buffer.byteLength(plainSql)),
      }), { status: 200 });
    });

    try {
      await expect(uploadBackupToGoogleDrive(
        plainPath,
        "S&PBACKUP-2026-09-02_10-40-11.SQL",
      )).resolves.toMatchObject({ id: "plain-uploaded" });
      expect(sessionCalls).toBe(2);
      expect(
        proxy.mock.calls.filter((call) => call[1] === "/upload/drive/v3/files?uploadType=resumable"),
      ).toHaveLength(1);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("resumes a plain SQL upload at the committed decoded offset after a lost response", async () => {
    const directory = await mkdtemp(join(tmpdir(), "drive-backup-test-"));
    const plainPath = join(directory, "backup.SQL");
    const plainSql = "SELECT 123456789;\n";
    await writeFile(plainPath, plainSql);
    let sessionsStarted = 0;
    let interrupted = false;
    let resumedSql = "";
    proxy.mockReset();
    proxy.mockImplementation(async (_connector: string, path: string, options?: { body?: Blob }) => {
      if (path === "/upload/drive/v3/files?uploadType=resumable") {
        sessionsStarted += 1;
        return new Response(null, {
          status: 200,
          headers: { location: `https://www.googleapis.com/upload/plain-session-${sessionsStarted}` },
        });
      }
      if (path === "/upload/plain-session-1") {
        if (options?.body && !interrupted) {
          interrupted = true;
          throw new Error("connector interrupted upload");
        }
        if (options?.body) {
          resumedSql = gunzipSync(Buffer.from(await options.body.arrayBuffer())).toString();
          return new Response(JSON.stringify({ id: "plain-uploaded" }), { status: 200 });
        }
        return new Response(null, { status: 308, headers: { range: "bytes=0-4" } });
      }
      return new Response(JSON.stringify({
        id: "plain-uploaded",
        name: "S&PBACKUP-2026-09-02_10-40-11.SQL",
        size: String(Buffer.byteLength(plainSql)),
      }), { status: 200 });
    });

    try {
      await expect(uploadBackupToGoogleDrive(
        plainPath,
        "S&PBACKUP-2026-09-02_10-40-11.SQL",
      )).resolves.toMatchObject({ id: "plain-uploaded" });
      expect(sessionsStarted).toBe(1);
      const resumedRequest = proxy.mock.calls.filter((call) => call[1] === "/upload/plain-session-1")[2];
      const resumedOptions = resumedRequest?.[2] as { headers: Record<string, string>; body: Blob };
      expect(resumedOptions.headers["Content-Range"]).toBe(
        `bytes 5-${Buffer.byteLength(plainSql) - 1}/${Buffer.byteLength(plainSql)}`,
      );
      expect(resumedSql).toBe(plainSql.slice(5));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("recovers an upload completed despite a lost retryable response", async () => {
    const directory = await mkdtemp(join(tmpdir(), "drive-backup-test-"));
    const encryptedPath = join(directory, "backup.sql.gz.enc");
    await writeFile(encryptedPath, "encrypted backup");
    let sessionRequests = 0;
    proxy.mockReset();
    proxy.mockImplementation(async (_connector: string, path: string) => {
      if (path === "/upload/drive/v3/files?uploadType=resumable") {
        return new Response(null, {
          status: 200,
          headers: { location: "https://www.googleapis.com/upload/session" },
        });
      }
      if (path === "/upload/session") {
        sessionRequests += 1;
        if (sessionRequests === 1) return new Response("timeout", { status: 500 });
        if (sessionRequests === 2) return new Response(JSON.stringify({ id: "uploaded" }), { status: 200 });
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
      await uploadBackupToGoogleDrive(encryptedPath, "S&PBACKUP-2026-09-02_10-40-11.sql.gz.enc");

      const statusCall = proxy.mock.calls.filter((call) => call[1] === "/upload/session")[1];
      expect(statusCall?.[2]).toMatchObject({
        method: "PUT",
        headers: {
          "Content-Length": "0",
          "Content-Range": "bytes */16",
        },
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("recovers an upload completed after a retryable connector exception", async () => {
    const directory = await mkdtemp(join(tmpdir(), "drive-backup-test-"));
    const encryptedPath = join(directory, "backup.sql.gz.enc");
    await writeFile(encryptedPath, "encrypted backup");
    let sessionRequests = 0;
    proxy.mockReset();
    proxy.mockImplementation(async (_connector: string, path: string) => {
      if (path === "/upload/drive/v3/files?uploadType=resumable") {
        return new Response(null, {
          status: 200,
          headers: { location: "https://www.googleapis.com/upload/session" },
        });
      }
      if (path === "/upload/session") {
        sessionRequests += 1;
        if (sessionRequests === 1) throw new Error("connector timeout");
        if (sessionRequests === 2) return new Response(JSON.stringify({ id: "uploaded" }), { status: 200 });
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
      await expect(
        uploadBackupToGoogleDrive(encryptedPath, "S&PBACKUP-2026-09-02_10-40-11.sql.gz.enc"),
      ).resolves.toMatchObject({ id: "uploaded" });
      const statusCall = proxy.mock.calls.filter((call) => call[1] === "/upload/session")[1];
      expect(statusCall?.[2]).toMatchObject({
        method: "PUT",
        headers: {
          "Content-Length": "0",
          "Content-Range": "bytes */16",
        },
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("resumes only encrypted bytes not committed before a retryable failure", async () => {
    const directory = await mkdtemp(join(tmpdir(), "drive-backup-test-"));
    const encryptedPath = join(directory, "backup.sql.gz.enc");
    await writeFile(encryptedPath, "encrypted backup");
    let sessionRequests = 0;
    proxy.mockReset();
    proxy.mockImplementation(async (_connector: string, path: string) => {
      if (path === "/upload/drive/v3/files?uploadType=resumable") {
        return new Response(null, {
          status: 200,
          headers: { location: "https://www.googleapis.com/upload/session" },
        });
      }
      if (path === "/upload/session") {
        sessionRequests += 1;
        if (sessionRequests === 1) return new Response("timeout", { status: 500 });
        if (sessionRequests === 2) {
          return new Response(null, { status: 308, headers: { range: "bytes=0-7" } });
        }
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
      await uploadBackupToGoogleDrive(encryptedPath, "S&PBACKUP-2026-09-02_10-40-11.sql.gz.enc");

      const resumeCall = proxy.mock.calls.filter((call) => call[1] === "/upload/session")[2];
      const resumeOptions = resumeCall?.[2] as { headers: Record<string, string>; body: Blob };
      expect(resumeOptions.headers).toMatchObject({
        "Content-Length": "8",
        "Content-Range": "bytes 8-15/16",
      });
      expect(await resumeOptions.body.text()).toBe("d backup");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("retries from zero when Drive reports no committed encrypted bytes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "drive-backup-test-"));
    const encryptedPath = join(directory, "backup.sql.gz.enc");
    await writeFile(encryptedPath, "encrypted backup");
    let sessionRequests = 0;
    proxy.mockReset();
    proxy.mockImplementation(async (_connector: string, path: string) => {
      if (path === "/upload/drive/v3/files?uploadType=resumable") {
        return new Response(null, {
          status: 200,
          headers: { location: "https://www.googleapis.com/upload/session" },
        });
      }
      if (path === "/upload/session") {
        sessionRequests += 1;
        if (sessionRequests === 1) return new Response("timeout", { status: 500 });
        if (sessionRequests === 2) return new Response(null, { status: 308 });
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
      await uploadBackupToGoogleDrive(encryptedPath, "S&PBACKUP-2026-09-02_10-40-11.sql.gz.enc");

      const retryCall = proxy.mock.calls.filter((call) => call[1] === "/upload/session")[2];
      const retryOptions = retryCall?.[2] as { headers: Record<string, string>; body: Blob };
      expect(retryOptions.headers).toMatchObject({
        "Content-Length": "16",
        "Content-Range": "bytes 0-15/16",
      });
      expect(await retryOptions.body.text()).toBe("encrypted backup");
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