import { Readable } from "node:stream";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DisposablePostgres } from "./disposable-postgres";
import {
  RESTORE_VERIFY_FIRST_DELAY_MS,
  RESTORE_VERIFY_INTERVAL_MS,
  runBackupVerification,
  runLatestBackupVerification,
  legacySqlSource,
  createVerificationAdvisoryLock,
  startDbBackupVerificationSchedule,
  type BackupVerificationDependencies,
} from "./db-backup-verifier";

const encryptedBackup = {
  id: "newest-encrypted",
  name: "S&PBACKUP-2026-09-06_12-00-00.sql.gz.enc",
  modifiedTime: "2026-09-06T12:00:00Z",
};

describe("backup restore verification scheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits one hour before the first run and one week between later runs", () => {
    expect(RESTORE_VERIFY_FIRST_DELAY_MS).toBe(60 * 60 * 1000);
    expect(RESTORE_VERIFY_INTERVAL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("does not automatically schedule verification in development", async () => {
    vi.useFakeTimers();
    const run = vi.fn().mockResolvedValue("verified");

    startDbBackupVerificationSchedule({
      environment: { NODE_ENV: "development" },
      run,
    });
    await vi.advanceTimersByTimeAsync(
      RESTORE_VERIFY_FIRST_DELAY_MS + RESTORE_VERIFY_INTERVAL_MS * 2,
    );

    expect(run).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reports a missing production key once and waits until the next weekly cadence", async () => {
    vi.useFakeTimers();
    const d = dependencies([]);
    const consoleError = vi.fn();
    const environment = {
      NODE_ENV: "production",
      DATABASE_URL: "postgres://private-production-details",
    };
    const run = () => runLatestBackupVerification({
      environment,
      dependencies: d,
      consoleError,
    });
    const schedule = startDbBackupVerificationSchedule({ environment, run });

    await vi.advanceTimersByTimeAsync(RESTORE_VERIFY_FIRST_DELAY_MS);

    expect(d.acquireLock).not.toHaveBeenCalled();
    expect(d.listBackups).not.toHaveBeenCalled();
    expect(d.startPostgres).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      "[db-backup-verifier] Backup restore verification is not configured",
    );
    expect(d.audit).toHaveBeenCalledOnce();
    expect(d.audit).toHaveBeenCalledWith(
      "backup_restore_failed",
      "Database backup restore verification is not configured",
      expect.objectContaining({ category: "backup_restore_not_configured" }),
    );
    expect(d.alert).toHaveBeenCalledOnce();
    expect(d.alert).toHaveBeenCalledWith("backup_restore_not_configured", expect.any(String));
    expect(d.notifyAdmin).toHaveBeenCalledOnce();
    expect(d.notifyAdmin).toHaveBeenCalledWith("backup_restore_not_configured", expect.any(String));
    expect(JSON.stringify([
      consoleError.mock.calls,
      (d.audit as any).mock.calls,
      (d.alert as any).mock.calls,
      (d.notifyAdmin as any).mock.calls,
    ])).not.toContain("private-production-details");

    await vi.advanceTimersByTimeAsync(RESTORE_VERIFY_INTERVAL_MS - 1);
    expect(d.audit).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(d.audit).toHaveBeenCalledTimes(2);
    expect(d.alert).toHaveBeenCalledTimes(2);
    expect(d.notifyAdmin).toHaveBeenCalledTimes(2);
    schedule.stop();
  });

  it("does not overlap local verification runs", async () => {
    vi.useFakeTimers();
    let finish!: (result: "verified") => void;
    const run = vi.fn(() => new Promise<"verified">((resolve) => {
      finish = resolve;
    }));
    const schedule = startDbBackupVerificationSchedule({
      environment: { NODE_ENV: "production" },
      run,
    });

    await vi.advanceTimersByTimeAsync(RESTORE_VERIFY_FIRST_DELAY_MS);
    await vi.advanceTimersByTimeAsync(RESTORE_VERIFY_INTERVAL_MS * 2);
    expect(run).toHaveBeenCalledTimes(1);

    finish("verified");
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(RESTORE_VERIFY_INTERVAL_MS);
    expect(run).toHaveBeenCalledTimes(2);
    schedule.stop();
  });

  it("handles advisory lock contention on the normal next interval", async () => {
    vi.useFakeTimers();
    const run = vi.fn().mockResolvedValue("lock_contended");
    const schedule = startDbBackupVerificationSchedule({
      environment: { NODE_ENV: "production" },
      run,
    });

    await vi.advanceTimersByTimeAsync(RESTORE_VERIFY_FIRST_DELAY_MS);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(RESTORE_VERIFY_INTERVAL_MS - 1);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(2);
    schedule.stop();
  });

  it("stop clears every timer and prevents scheduling after an in-flight run", async () => {
    vi.useFakeTimers();
    let finish!: (result: "verified") => void;
    const run = vi.fn(() => new Promise<"verified">((resolve) => {
      finish = resolve;
    }));
    const schedule = startDbBackupVerificationSchedule({
      environment: { NODE_ENV: "production" },
      run,
    });

    await vi.advanceTimersByTimeAsync(RESTORE_VERIFY_FIRST_DELAY_MS);
    schedule.stop();
    expect(vi.getTimerCount()).toBe(0);
    finish("verified");
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(RESTORE_VERIFY_INTERVAL_MS * 2);

    expect(run).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

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