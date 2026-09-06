import { afterEach, describe, expect, it, vi } from "vitest";
import { PassThrough } from "stream";
import {
  BACKUP_RETRY_DELAY_MS,
  createAndUploadEncryptedBackup,
  createDbBackupScheduler,
  FIRST_BACKUP_DELAY_MS,
  INTERVAL_MS,
  requireBackupEncryptionKey,
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
});