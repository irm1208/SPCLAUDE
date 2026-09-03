import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BACKUP_RETRY_DELAY_MS,
  createDbBackupScheduler,
  FIRST_BACKUP_DELAY_MS,
  INTERVAL_MS,
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