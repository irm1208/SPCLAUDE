import { Readable } from "node:stream";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import type { DisposablePostgres } from "./disposable-postgres";
import {
  runBackupVerification,
  legacySqlSource,
  createVerificationAdvisoryLock,
  type BackupVerificationDependencies,
} from "./db-backup-verifier";

const encryptedBackup = {
  id: "newest-encrypted",
  name: "S&PBACKUP-2026-09-06_12-00-00.sql.gz.enc",
  modifiedTime: "2026-09-06T12:00:00Z",
};

function dependencies(events: string[]): BackupVerificationDependencies {
  const target = {
    port: 5432,
    database: "restore_verify_generated",
    psqlArgs: ["-h", "127.0.0.1", "-p", "5432", "-d", "restore_verify_generated"],
    stopAndRemove: vi.fn(async () => { events.push("cleanup-cluster"); }),
  } as unknown as DisposablePostgres;
  return {
    acquireLock: vi.fn(async () => { events.push("lock"); return true; }),
    releaseLock: vi.fn(async () => { events.push("release-lock"); }),
    listBackups: vi.fn(async () => {
      events.push("list");
      return [
        { id: "old-legacy", name: "S&PBACKUP-2026-09-05_12-00-00.SQL", modifiedTime: "2026-09-05T12:00:00Z" },
        encryptedBackup,
        { id: "unsupported", name: "notes.sql", modifiedTime: "2026-09-07T12:00:00Z" },
      ];
    }),
    allocateDownloadPath: vi.fn(async () => "/tmp/envelope"),
    download: vi.fn(async () => { events.push("download"); }),
    digest: vi.fn(async () => { events.push("digest"); return "digest"; }),
    startPostgres: vi.fn(async () => { events.push("cluster"); return target; }),
    activeKey: vi.fn(() => Buffer.alloc(32)),
    decrypt: vi.fn(async () => { events.push("decrypt"); return Readable.from(["SQL"]); }),
    legacySource: vi.fn(async () => { events.push("legacy"); return Readable.from(["SQL"]); }),
    restore: vi.fn(async () => { events.push("psql"); }),
    validate: vi.fn(async () => {
      events.push("validate");
      return { tableCount: 5, aggregateRowCount: 1, checks: [{ name: "all", passed: true }] };
    }),
    audit: vi.fn(async (action: string) => { events.push(`audit:${action}`); }),
    alert: vi.fn(async () => { events.push("alert"); }),
    notifyAdmin: vi.fn(async () => { events.push("notify"); }),
    removeDownload: vi.fn(async () => { events.push("cleanup-download"); }),
  };
}

describe("runBackupVerification", () => {
  it("restores the newest supported encrypted backup in its locked disposable target", async () => {
    const events: string[] = [];
    const d = dependencies(events);
    const result = await runBackupVerification(d);

    expect(result).toBe("verified");
    expect(events).toEqual([
      "lock", "list", "download", "digest", "cluster", "decrypt", "psql", "validate",
      "audit:backup_restore_verified", "cleanup-cluster", "cleanup-download", "release-lock",
    ]);
    expect(d.download).toHaveBeenCalledWith(encryptedBackup, "/tmp/envelope");
  });

  it.each([
    ["download", (d: BackupVerificationDependencies) => (d.download as any).mockRejectedValueOnce(new Error("postgres://production/secret"))],
    ["authentication", (d: BackupVerificationDependencies) => (d.decrypt as any).mockRejectedValueOnce(new Error("authentication SQL stderr"))],
    ["postgres startup", (d: BackupVerificationDependencies) => (d.startPostgres as any).mockRejectedValueOnce(new Error("startup failed"))],
    ["psql", (d: BackupVerificationDependencies) => (d.restore as any).mockRejectedValueOnce(new Error("SQL stderr private text"))],
    ["validation", (d: BackupVerificationDependencies) => (d.validate as any).mockResolvedValueOnce({ tableCount: 5, aggregateRowCount: 1, checks: [{ name: "core", passed: false }] })],
    ["audit", (d: BackupVerificationDependencies) => (d.audit as any).mockRejectedValueOnce(new Error("audit unavailable"))],
  ])("reports a sanitized failure when %s fails", async (_name, fail) => {
    const events: string[] = [];
    const d = dependencies(events);
    fail(d);

    await expect(runBackupVerification(d)).rejects.toThrow("backup verification failed");
    expect(d.audit).toHaveBeenCalledWith("backup_restore_failed", expect.any(String), expect.any(Object));
    expect(d.alert).toHaveBeenCalledWith("backup_restore_failed", expect.any(String));
    expect(d.notifyAdmin).toHaveBeenCalledWith("backup_restore_failed", expect.any(String));
    expect(JSON.stringify((d.audit as any).mock.calls)).not.toContain("postgres://production/secret");
    expect(JSON.stringify((d.audit as any).mock.calls)).not.toContain("SQL stderr private text");
    expect(events).toContain("cleanup-download");
    expect(events.indexOf("audit:backup_restore_failed")).toBeLessThan(events.indexOf("cleanup-download"));
    expect(events.at(-1)).toBe("release-lock");
  });

  it("surfaces and audits cleanup failures without skipping lock release", async () => {
    const events: string[] = [];
    const d = dependencies(events);
    (d.removeDownload as any).mockRejectedValueOnce(new Error("cannot unlink SQL stderr"));

    await expect(runBackupVerification(d)).rejects.toThrow("backup verification failed");
    expect(d.audit).toHaveBeenCalledWith("backup_restore_failed", expect.any(String), expect.any(Object));
    expect(d.alert).toHaveBeenCalled();
    expect(events.at(-1)).toBe("release-lock");
  });

  it("returns lock_contended without listing backups", async () => {
    const d = dependencies([]);
    (d.acquireLock as any).mockResolvedValueOnce(false);
    await expect(runBackupVerification(d)).resolves.toBe("lock_contended");
    expect(d.listBackups).not.toHaveBeenCalled();
    expect(d.releaseLock).not.toHaveBeenCalled();
  });

  it("uses the legacy SQL stream without modifying plain or gzip Drive media", async () => {
    const directory = await mkdtemp(join(tmpdir(), "verifier-legacy-"));
    try {
      for (const [name, bytes] of [["plain.SQL", Buffer.from("SELECT 1;")], ["gzip.SQL", gzipSync("SELECT 2;")]] as const) {
        const path = join(directory, name);
        await writeFile(path, bytes);
        const source = await legacySqlSource(path);
        const chunks: Buffer[] = [];
        for await (const chunk of source) chunks.push(Buffer.from(chunk));
        const restored = Buffer.concat(chunks).toString("utf8");
        expect(restored).toBe(name === "plain.SQL" ? "SELECT 1;" : "SELECT 2;");
        expect(await readFile(path)).toEqual(bytes);
      }
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it("reports target cleanup failure, still removes download, and releases lock", async () => {
    const events: string[] = [];
    const d = dependencies(events);
    ((await (d.startPostgres as any)()) as any).stopAndRemove.mockRejectedValueOnce(new Error("postgres://secret stderr"));
    await expect(runBackupVerification(d)).rejects.toThrow("backup verification failed");
    expect(events).toContain("cleanup-download");
    expect(events.at(-1)).toBe("release-lock");
    expect(d.audit).toHaveBeenCalledWith("backup_restore_failed", expect.any(String), expect.objectContaining({ category: "backup_restore_cleanup_failed" }));
    expect(JSON.stringify((d.audit as any).mock.calls)).not.toContain("postgres://secret");
  });

  it("routes a sanitized lock release failure after cleanup", async () => {
    const d = dependencies([]);
    (d.releaseLock as any).mockRejectedValueOnce(new Error("postgres://secret raw DB error"));
    await expect(runBackupVerification(d)).rejects.toThrow("backup verification lock release failed");
    expect(d.audit).toHaveBeenCalledWith("backup_restore_failed", expect.any(String), expect.objectContaining({
      category: "backup_restore_lock_release_failed",
    }));
    expect(JSON.stringify((d.audit as any).mock.calls)).not.toContain("postgres://secret");
  });
});

describe("verification advisory lock lifecycle", () => {
  it("releases a client exactly once when lock acquisition query rejects", async () => {
    const client = { query: vi.fn().mockRejectedValue(new Error("postgres://secret")), release: vi.fn() };
    const lock = createVerificationAdvisoryLock({ connect: async () => client } as any);
    await expect(lock.acquire()).rejects.toThrow("backup verification lock failed");
    expect(client.release).toHaveBeenCalledOnce();
    expect(client.release).toHaveBeenCalledWith(true);
  });

  it.each([
    ["unlock rejection", () => Promise.reject(new Error("raw DB stderr"))],
    ["unlock false", () => Promise.resolve({ rows: [{ unlocked: false }] })],
  ])("destroys the session on %s and exposes only a generic error", async (_case, unlock) => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ locked: true }] })
        .mockImplementationOnce(unlock),
      release: vi.fn(),
    };
    const lock = createVerificationAdvisoryLock({ connect: async () => client } as any);
    await lock.acquire();
    await expect(lock.release()).rejects.toThrow("backup verification lock release failed");
    expect(client.release).toHaveBeenCalledOnce();
    expect(client.release).toHaveBeenCalledWith(true);
  });
});