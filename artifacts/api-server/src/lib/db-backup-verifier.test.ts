import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import type { DisposablePostgres } from "./disposable-postgres";
import {
  runBackupVerification,
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
        { id: "unsupported", name: "notes.txt", modifiedTime: "2026-09-07T12:00:00Z" },
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
    const result = await runBackupVerification(dependencies(events));

    expect(result).toBe("verified");
    expect(events).toEqual([
      "lock", "list", "download", "digest", "cluster", "decrypt", "psql", "validate",
      "audit:backup_restore_verified", "cleanup-cluster", "cleanup-download", "release-lock",
    ]);
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
});