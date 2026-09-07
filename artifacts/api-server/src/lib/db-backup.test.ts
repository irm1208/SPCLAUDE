import { afterEach, describe, expect, it, vi } from "vitest";
import { PassThrough } from "stream";
import {
  BACKUP_RETRY_DELAY_MS,
  backupRunResult,
  createAndUploadEncryptedBackup,
  createDbBackupScheduler,
  FIRST_BACKUP_DELAY_MS,
  INTERVAL_MS,
  isPrunableEncryptedBackupArtifact,
  requireBackupEncryptionKey,
  runEncryptedBackupAttempt,
  startDbBackupSchedule,
} from "./db-backup";
import type { DbBackupResult } from "./db-backup";

describe("database backup scheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses a six-hour recurring interval", () => {
    expect(INTERVAL_MS).toBe(6 * 60 * 60 * 1000);
  });

  it("never reports an acquired failed attempt as completed", () => {
    expect(backupRunResult(true, "failed")).toBe("failed");
    expect(backupRunResult(true, "completed")).toBe("completed");
    expect(backupRunResult(false, "completed")).toBe("lock_contended");
  });

  it("runs the first production attempt after ten minutes", async () => {
    vi.useFakeTimers();
    const runBackup = vi.fn<() => Promise<DbBackupResult>>().mockResolvedValue("completed");
    const scheduler = createDbBackupScheduler(runBackup);
    scheduler.start();

    await vi.advanceTimersByTimeAsync(FIRST_BACKUP_DELAY_MS - 1);
    expect(runBackup).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(runBackup).toHaveBeenCalledTimes(1);
  });

  it("runs recurring attempts every six hours", async () => {
    vi.useFakeTimers();
    const runBackup = vi.fn<() => Promise<DbBackupResult>>().mockResolvedValue("completed");
    const scheduler = createDbBackupScheduler(runBackup);
    scheduler.start();

    await vi.advanceTimersByTimeAsync(FIRST_BACKUP_DELAY_MS);
    await vi.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(runBackup).toHaveBeenCalledTimes(2);
  });

  it("retries a lock-contended attempt after the retry delay", async () => {
    vi.useFakeTimers();
    const runBackup = vi.fn<() => Promise<DbBackupResult>>()
      .mockResolvedValueOnce("lock_contended")
      .mockResolvedValueOnce("completed");
    const scheduler = createDbBackupScheduler(runBackup);
    scheduler.start();

    await vi.advanceTimersByTimeAsync(FIRST_BACKUP_DELAY_MS);
    expect(runBackup).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(BACKUP_RETRY_DELAY_MS - 1);
    expect(runBackup).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(runBackup).toHaveBeenCalledTimes(2);
  });

  it("keeps only one pending retry when multiple attempts see lock contention", async () => {
    vi.useFakeTimers();
    const runBackup = vi.fn<() => Promise<DbBackupResult>>()
      .mockResolvedValue("lock_contended");
    const scheduler = createDbBackupScheduler(runBackup);
    scheduler.start();

    await vi.advanceTimersByTimeAsync(FIRST_BACKUP_DELAY_MS);
    await vi.advanceTimersByTimeAsync(BACKUP_RETRY_DELAY_MS);
    expect(runBackup).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(2);
  });

  it("does not tightly retry failed backup attempts", async () => {
    vi.useFakeTimers();
    const runBackup = vi.fn<() => Promise<DbBackupResult>>().mockResolvedValue("failed");
    const scheduler = createDbBackupScheduler(runBackup);
    scheduler.start();

    await vi.advanceTimersByTimeAsync(FIRST_BACKUP_DELAY_MS + BACKUP_RETRY_DELAY_MS);
    expect(runBackup).toHaveBeenCalledTimes(1);
  });

  it("does not create overlapping backup work when a recurring callback fires during local work", async () => {
    vi.useFakeTimers();
    let resolveBackup!: (result: DbBackupResult) => void;
    const runBackup = vi.fn<() => Promise<DbBackupResult>>()
      .mockImplementationOnce(() => new Promise<DbBackupResult>(resolve => {
        resolveBackup = resolve;
      }))
      .mockResolvedValue("completed");
    const scheduler = createDbBackupScheduler(runBackup);
    scheduler.start();

    await vi.advanceTimersByTimeAsync(FIRST_BACKUP_DELAY_MS);
    await vi.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(runBackup).toHaveBeenCalledTimes(1);
    resolveBackup("completed");
    await vi.advanceTimersByTimeAsync(0);
    expect(runBackup).toHaveBeenCalledTimes(1);
  });

  it("stops all scheduled timers when stopped", async () => {
    vi.useFakeTimers();
    const runBackup = vi.fn<() => Promise<DbBackupResult>>().mockResolvedValue("completed");
    const scheduler = createDbBackupScheduler(runBackup);
    scheduler.start();
    scheduler.stop();

    await vi.advanceTimersByTimeAsync(FIRST_BACKUP_DELAY_MS + INTERVAL_MS);
    expect(runBackup).not.toHaveBeenCalled();
  });

  it("does not schedule backups in development mode", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    process.env.NODE_ENV = "development";

    try {
      startDbBackupSchedule();
      expect(setTimeoutSpy).not.toHaveBeenCalled();
      expect(setIntervalSpy).not.toHaveBeenCalled();
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
      setTimeoutSpy.mockRestore();
      setIntervalSpy.mockRestore();
    }
  });
});

describe("encrypted database backup production orchestration", () => {
  const key = Buffer.alloc(32, 1).toString("base64");

  function dumpProcess(exitCode = 0) {
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const process = {
      stdout,
      stderr,
      once: vi.fn((event: string, listener: (value?: number | Error) => void) => {
        if (event === "close") queueMicrotask(() => listener(exitCode));
        return process;
      }),
      kill: vi.fn(),
    };
    return { process, stdout };
  }

  it("rejects a missing production encryption key", () => {
    expect(() => requireBackupEncryptionKey({ NODE_ENV: "production" })).toThrow(/DB_BACKUP_ENCRYPTION_KEY/);
  });

  it("recognizes only constrained encrypted backup artifacts for stale pruning", () => {
    expect(isPrunableEncryptedBackupArtifact("S&PBACKUP-2026-09-02_10-40-11.sql.gz.enc")).toBe(true);
    expect(isPrunableEncryptedBackupArtifact("S&PBACKUP-2026-09-02_10-40-11.sql.gz.enc.partial")).toBe(true);
    expect(
      isPrunableEncryptedBackupArtifact(
        "S&PBACKUP-2026-09-02_10-40-11.sql.gz.enc.partial.1234.550e8400-e29b-41d4-a716-446655440000.partial",
      ),
    ).toBe(true);
    expect(isPrunableEncryptedBackupArtifact("S&PBACKUP-not-a-backup.sql.gz.enc.partial.1234.uuid.partial")).toBe(false);
    expect(isPrunableEncryptedBackupArtifact("S&PBACKUP-2026-09-02_10-40-11.sql.gz.enc.partial.1234.uuid.tmp")).toBe(false);
    expect(isPrunableEncryptedBackupArtifact("unrelated.sql.gz.enc.partial.1234.uuid.partial")).toBe(false);
  });

  it("returns a canonical 32-byte production encryption key", () => {
    expect(requireBackupEncryptionKey({
      NODE_ENV: "production",
      DB_BACKUP_ENCRYPTION_KEY: key,
    })).toEqual(Buffer.alloc(32, 1));
  });

  it.each(["not base64", Buffer.alloc(31).toString("base64"), `${key}\n`])(
    "rejects malformed production encryption key %j",
    (invalidKey) => {
      expect(() => requireBackupEncryptionKey({
        NODE_ENV: "production",
        DB_BACKUP_ENCRYPTION_KEY: invalidKey,
      })).toThrow(/DB_BACKUP_ENCRYPTION_KEY/);
    },
  );

  it("validates the encryption key before spawning pg_dump", async () => {
    const spawnPgDump = vi.fn();
    await expect(createAndUploadEncryptedBackup({
      fileName: "backup.sql.gz.enc",
      outputPath: "/tmp/backup.sql.gz.enc",
      environment: { NODE_ENV: "production", DATABASE_URL: "postgres://private" },
      spawnPgDump,
      encrypt: vi.fn(),
      upload: vi.fn(),
      rename: vi.fn(),
      unlink: vi.fn(),
    })).rejects.toThrow(/DB_BACKUP_ENCRYPTION_KEY/);
    expect(spawnPgDump).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", undefined],
    ["malformed", "SUPER_SECRET_INVALID_KEY"],
  ])("reports a sanitized non-completed outcome for a %s production encryption key", async (_case, invalidKey) => {
    const spawnPgDump = vi.fn();
    const upload = vi.fn();
    const audit = vi.fn(async () => { throw new Error("audit unavailable"); });
    const alert = vi.fn(async () => { throw new Error("alert unavailable"); });
    const notifyAdmin = vi.fn(async () => { throw new Error("notification unavailable"); });
    const consoleError = vi.fn();
    const databaseUrl = "postgres://secret-user:secret-password@private-host/database";

    const result = await runEncryptedBackupAttempt({
      fileName: "backup.sql.gz.enc",
      outputPath: "/tmp/backup.sql.gz.enc",
      environment: {
        NODE_ENV: "production",
        DATABASE_URL: databaseUrl,
        ...(invalidKey === undefined ? {} : { DB_BACKUP_ENCRYPTION_KEY: invalidKey }),
      },
      spawnPgDump,
      encrypt: vi.fn(),
      upload,
      rename: vi.fn(),
      unlink: vi.fn(),
      audit,
      alert,
      notifyAdmin,
      consoleError,
    });

    expect(result).toBe("failed");
    expect(spawnPgDump).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
    expect(audit).toHaveBeenCalledOnce();
    expect(alert).toHaveBeenCalledOnce();
    expect(notifyAdmin).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith("[db-backup] Encrypted backup attempt failed");
    const surfaced = JSON.stringify([
      consoleError.mock.calls,
      audit.mock.calls,
      alert.mock.calls,
      notifyAdmin.mock.calls,
    ]);
    expect(surfaced).not.toContain(invalidKey ?? "DB_BACKUP_ENCRYPTION_KEY");
    expect(surfaced).not.toContain(databaseUrl);
    expect(surfaced).not.toContain("secret-password");
  });

  it("streams pg_dump stdout into encryption and uploads only after both succeed", async () => {
    const { process, stdout } = dumpProcess();
    const events: string[] = [];
    const encrypt = vi.fn(async (source: PassThrough, path: string) => {
      events.push("encrypt");
      expect(source).toBe(stdout);
      expect(path).toBe("/tmp/backup.sql.gz.enc.partial");
    });
    const rename = vi.fn(async () => { events.push("rename"); });
    const upload = vi.fn(async () => { events.push("upload"); return { id: "drive-file" }; });
    const unlink = vi.fn(async () => { events.push("unlink"); });
    await createAndUploadEncryptedBackup({
      fileName: "backup.sql.gz.enc",
      outputPath: "/tmp/backup.sql.gz.enc",
      environment: { NODE_ENV: "production", DATABASE_URL: "postgres://private", DB_BACKUP_ENCRYPTION_KEY: key },
      spawnPgDump: vi.fn(() => process),
      encrypt,
      upload,
      rename,
      unlink,
    });
    expect(events).toEqual(["encrypt", "rename", "upload", "unlink"]);
    expect(upload).toHaveBeenCalledWith("/tmp/backup.sql.gz.enc", "backup.sql.gz.enc");
    expect(unlink).toHaveBeenCalledWith("/tmp/backup.sql.gz.enc");
  });

  it.each([
    ["encryption", 0, new Error("encryption failed")],
    ["pg_dump", 1, undefined],
  ] as const)("does not upload and cleans encrypted artifacts after failed %s", async (_name, code, encryptionError) => {
    const { process } = dumpProcess(code);
    const upload = vi.fn();
    const unlink = vi.fn(async () => undefined);
    await expect(createAndUploadEncryptedBackup({
      fileName: "backup.sql.gz.enc",
      outputPath: "/tmp/backup.sql.gz.enc",
      environment: { NODE_ENV: "production", DATABASE_URL: "postgres://private", DB_BACKUP_ENCRYPTION_KEY: key },
      spawnPgDump: vi.fn(() => process),
      encrypt: vi.fn(async () => {
        if (encryptionError) throw encryptionError;
      }),
      upload,
      rename: vi.fn(async () => undefined),
      unlink,
    })).rejects.toThrow();
    expect(upload).not.toHaveBeenCalled();
    expect(unlink).toHaveBeenCalledWith("/tmp/backup.sql.gz.enc.partial");
    expect(unlink).toHaveBeenCalledWith("/tmp/backup.sql.gz.enc");
  });

  it("waits for pending encryption before cleaning after pg_dump fails", async () => {
    const { process } = dumpProcess(1);
    let settleEncryption!: () => void;
    const encryption = new Promise<void>(resolve => {
      settleEncryption = resolve;
    });
    const events: string[] = [];
    const operation = createAndUploadEncryptedBackup({
      fileName: "backup.sql.gz.enc",
      outputPath: "/tmp/backup.sql.gz.enc",
      environment: { NODE_ENV: "production", DATABASE_URL: "postgres://private", DB_BACKUP_ENCRYPTION_KEY: key },
      spawnPgDump: vi.fn(() => process),
      encrypt: vi.fn(async () => {
        await encryption;
        events.push("encryption-settled");
      }),
      upload: vi.fn(),
      rename: vi.fn(),
      unlink: vi.fn(async (path: string) => { events.push(`unlink:${path}`); }),
    });

    await new Promise<void>(resolve => setImmediate(resolve));
    expect(events).toEqual([]);
    settleEncryption();
    await expect(operation).rejects.toThrow(/pg_dump exited/);
    expect(events).toEqual([
      "encryption-settled",
      "unlink:/tmp/backup.sql.gz.enc.partial",
      "unlink:/tmp/backup.sql.gz.enc",
    ]);
  });

  it("terminates a running child and waits for its close after encryption fails", async () => {
    let close!: (code: number | null) => void;
    const process = {
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      once: vi.fn((event: string, listener: (value?: number | Error) => void) => {
        if (event === "close") close = listener as (code: number | null) => void;
        return process;
      }),
      kill: vi.fn(),
    };
    const operation = createAndUploadEncryptedBackup({
      fileName: "backup.sql.gz.enc",
      outputPath: "/tmp/backup.sql.gz.enc",
      environment: { NODE_ENV: "production", DATABASE_URL: "postgres://private", DB_BACKUP_ENCRYPTION_KEY: key },
      spawnPgDump: vi.fn(() => process),
      encrypt: vi.fn(async () => { throw new Error("encryption failed"); }),
      upload: vi.fn(),
      rename: vi.fn(),
      unlink: vi.fn(async () => undefined),
      terminationGraceMs: 10,
    });

    await new Promise<void>(resolve => setImmediate(resolve));
    expect(process.kill).toHaveBeenCalledWith("SIGTERM");
    let settled = false;
    void operation.then(
      () => { settled = true; },
      () => { settled = true; },
    );
    await Promise.resolve();
    expect(settled).toBe(false);
    close(1);
    await expect(operation).rejects.toThrow(/encryption failed/);
    expect(process.kill).not.toHaveBeenCalledWith("SIGKILL");
  });

  it("escalates termination to SIGKILL after the configured grace period", async () => {
    vi.useFakeTimers();
    let close!: (code: number | null) => void;
    const process = {
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      once: vi.fn((event: string, listener: (value?: number | Error) => void) => {
        if (event === "close") close = listener as (code: number | null) => void;
        return process;
      }),
      kill: vi.fn(),
    };
    const operation = createAndUploadEncryptedBackup({
      fileName: "backup.sql.gz.enc",
      outputPath: "/tmp/backup.sql.gz.enc",
      environment: { NODE_ENV: "production", DATABASE_URL: "postgres://private", DB_BACKUP_ENCRYPTION_KEY: key },
      spawnPgDump: vi.fn(() => process),
      encrypt: vi.fn(async () => { throw new Error("encryption failed"); }),
      upload: vi.fn(),
      rename: vi.fn(),
      unlink: vi.fn(async () => undefined),
      terminationGraceMs: 10,
    });

    await vi.advanceTimersByTimeAsync(10);
    expect(process.kill).toHaveBeenNthCalledWith(1, "SIGTERM");
    expect(process.kill).toHaveBeenNthCalledWith(2, "SIGKILL");
    close(1);
    await expect(operation).rejects.toThrow(/encryption failed/);
  });
});