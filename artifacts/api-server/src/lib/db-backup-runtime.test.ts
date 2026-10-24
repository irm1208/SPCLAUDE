import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Readable } from "node:stream";
import { EventEmitter } from "node:events";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const mocks = vi.hoisted(() => ({
  upload: vi.fn(), list: vi.fn(), cleanup: vi.fn(), query: vi.fn(), spawn: vi.fn(),
  audit: vi.fn(), alert: vi.fn(), notify: vi.fn(),
  names: [] as string[],
}));
vi.mock("@workspace/db", () => ({ pool: { connect: async () => ({ query: mocks.query, release: vi.fn() }) } }));
vi.mock("./audit-log", () => ({ writeLog: mocks.audit }));
vi.mock("./create-alert", () => ({ createAlert: mocks.alert }));
vi.mock("./telegram", () => ({ sendAdminMessage: mocks.notify }));
vi.mock("child_process", () => ({ spawn: mocks.spawn }));
vi.mock("fs", async original => {
  const actual = await original<typeof import("fs")>();
  return { ...actual, readdir: (_: string, callback: (err: null, names: string[]) => void) => callback(null, mocks.names) };
});
vi.mock("./google-drive-backup", () => ({
  buildPlainDriveBackupFileName: () => "S&PBACKUP-2000-01-01_00-00-00.SQL",
  getGoogleDriveBackupFolderId: async () => "folder",
  uploadBackupToGoogleDrive: mocks.upload,
}));
vi.mock("./google-drive-backup-retention-store", () => ({
  createDriveRetentionStore: async () => ({ folderId: "folder", list: mocks.list }),
}));
vi.mock("./google-drive-backup-retention", () => ({ executeBackupRetention: mocks.cleanup, RETENTION_MAX_DURATION_MS: 180_000 }));
import { runDbBackup, runDbBackupRecovery } from "./db-backup";
import { verificationProperties } from "./google-drive-backup-policy";
const filePath = join(tmpdir(), "salt-and-peps-db-backups", "S&PBACKUP-2000-01-01_00-00-00.SQL");
let oldEnvironment: string | undefined, oldDatabase: string | undefined;
beforeEach(() => {
  oldEnvironment = process.env.NODE_ENV; oldDatabase = process.env.DATABASE_URL;
  process.env.NODE_ENV = "production"; process.env.DATABASE_URL = "test-only-placeholder";
  vi.clearAllMocks();
  mocks.names = [];
  mocks.query.mockResolvedValue({ rows: [{ locked: true }] });
  mocks.list.mockResolvedValue([]);
  mocks.upload.mockResolvedValue({ id: "verified" });
  mocks.cleanup.mockResolvedValue({ deletedFiles: 1, failures: 0, skippedLegacy: false });
  mocks.spawn.mockImplementation(() => {
    const child = Object.assign(new EventEmitter(), { stdout: Readable.from(["SELECT 1;\n"]), stderr: Readable.from([]), kill: vi.fn() });
    setImmediate(() => child.emit("close", 0)); return child;
  });
});
afterEach(async () => {
  if (oldEnvironment === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldEnvironment;
  if (oldDatabase === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = oldDatabase;
  await unlink(filePath).catch(() => undefined); await unlink(filePath + ".partial").catch(() => undefined);
});
it("runs retention only after a successful verified upload under the database lock", async () => {
  await expect(runDbBackup()).resolves.toBe("completed");
  expect(mocks.upload).toHaveBeenCalledOnce(); expect(mocks.cleanup).toHaveBeenCalledOnce();
  expect(mocks.query.mock.calls[0][0]).toContain("pg_try_advisory_lock");
  expect(mocks.upload.mock.invocationCallOrder[0]).toBeLessThan(mocks.cleanup.mock.invocationCallOrder[0]);
  expect(mocks.cleanup.mock.invocationCallOrder[0]).toBeLessThan(mocks.query.mock.invocationCallOrder.at(-1)!);
});
it("uses the paced writer for the production dump without changing uploaded SQL", async () => {
  const sql = "x".repeat(2 * 1024 * 1024);
  mocks.spawn.mockImplementationOnce(() => {
    const child = Object.assign(new EventEmitter(), { stdout: Readable.from([sql]), stderr: Readable.from([]), kill: vi.fn() });
    setImmediate(() => child.emit("close", 0)); return child;
  });
  const { readFile } = await import("node:fs/promises");
  mocks.upload.mockImplementationOnce(async () => {
    expect(await readFile(filePath, "utf8")).toBe(sql);
    return { id: "verified" };
  });
  const started = performance.now();
  await expect(runDbBackup()).resolves.toBe("completed");
  expect(performance.now() - started).toBeGreaterThanOrEqual(120);
});
it("does not delete any backup after upload failure", async () => {
  mocks.upload.mockRejectedValue(new Error("upload failed"));
  await expect(runDbBackup()).resolves.toBe("failed_new_backup");
  expect(mocks.cleanup).not.toHaveBeenCalled();
});
it("does not turn a successful verified upload into a backup failure when cleanup fails", async () => {
  mocks.cleanup.mockRejectedValue(new Error("delete unavailable"));
  await expect(runDbBackup()).resolves.toBe("completed");
  expect(mocks.alert).toHaveBeenCalledWith("system", "high", "Backup cleanup needs attention", expect.any(String));
});
it("skips another dump when durable receipts show this hour is already backed up", async () => {
  const now = new Date().toISOString().split(".")[0];
  const receipt = { id: "existing", name: `S&PBACKUP-${now.replace("T", "_").replaceAll(":", "-")}.SQL`, parents: ["folder"], size: "100", md5Checksum: "a".repeat(32) };
  mocks.list.mockResolvedValue([{ ...receipt, appProperties: verificationProperties(receipt) }]);
  await expect(runDbBackup()).resolves.toBe("completed");
  expect(mocks.spawn).not.toHaveBeenCalled(); expect(mocks.upload).not.toHaveBeenCalled();
});
it("never checks Drive or dumps data if another instance holds the advisory lock", async () => {
  mocks.query.mockResolvedValue({ rows: [{ locked: false }] });
  await expect(runDbBackup()).resolves.toBe("lock_contended");
  expect(mocks.list).not.toHaveBeenCalled(); expect(mocks.spawn).not.toHaveBeenCalled();
});
it("runs verified retention for recovered files without spawning another dump", async () => {
  await mkdir(join(tmpdir(), "salt-and-peps-db-backups"), { recursive: true });
  await writeFile(filePath, "SELECT 1;\n");
  mocks.names = ["S&PBACKUP-2000-01-01_00-00-00.SQL"];
  await expect(runDbBackupRecovery()).resolves.toBe("completed");
  expect(mocks.cleanup).toHaveBeenCalledOnce();
  expect(mocks.spawn).not.toHaveBeenCalled();
});
it("prevents overlapping dumps in the same process", async () => {
  let finish!: (file: { id: string }) => void;
  let started!: () => void;
  const ready = new Promise<void>(resolve => { started = resolve; });
  mocks.upload.mockImplementationOnce(() => { started(); return new Promise(resolve => { finish = resolve; }); });
  const first = runDbBackup(); await ready;
  await expect(runDbBackup()).resolves.toBe("already_in_progress");
  finish({ id: "verified" });
  await expect(first).resolves.toBe("completed");
  expect(mocks.spawn).toHaveBeenCalledOnce();
});
