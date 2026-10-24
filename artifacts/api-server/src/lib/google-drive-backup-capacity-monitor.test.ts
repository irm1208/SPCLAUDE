import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  query: vi.fn(), store: vi.fn(), quota: vi.fn(), telegram: vi.fn(),
}));
vi.mock("@workspace/db", () => ({ pool: { query: mocks.query } }));
vi.mock("./google-drive-backup-retention-store", () => ({
  createDriveRetentionStore: mocks.store, getDriveBackupStorageQuota: mocks.quota,
}));
vi.mock("./telegram", () => ({ sendAdminMessage: mocks.telegram }));
import { checkDriveBackupCapacity } from "./google-drive-backup-capacity-monitor";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.query.mockResolvedValue({ rows: [] });
  mocks.store.mockResolvedValue({ folderId: "folder", list: async () => [] });
  mocks.quota.mockResolvedValue({ limit: "10000", usage: "0" });
  mocks.telegram.mockResolvedValue(true);
});
it("persists an explicit unknown warning without exposing provider errors", async () => {
  mocks.quota.mockRejectedValue(new Error("private-token-and-name"));
  await checkDriveBackupCapacity();
  const sql = mocks.query.mock.calls.find(([query]) => query.includes("INSERT INTO admin_alerts"));
  expect(sql).toBeDefined();
  expect(JSON.stringify(mocks.query.mock.calls)).not.toContain("private-token");
  expect(mocks.telegram.mock.calls[0][0]).toContain("cannot be checked");
});
it("reuses durable delivery state after a process restart", async () => {
  mocks.query.mockImplementation(async (query: string) => ({ rows: query.startsWith("SELECT") ? [{
    value: JSON.stringify({ status: "unknown", noticeId: "existing", adminDelivered: true, telegramDelivered: true }),
  }] : [] }));
  await checkDriveBackupCapacity();
  expect(mocks.telegram).not.toHaveBeenCalled();
  expect(mocks.query.mock.calls.some(([query]) => query.includes("INSERT INTO admin_alerts"))).toBe(false);
});
it("reuses the Admin episode identity if a crash left its acknowledgement pending", async () => {
  mocks.query.mockImplementation(async (query: string) => ({ rows: query.startsWith("SELECT") ? [{
    value: JSON.stringify({ status: "unknown", noticeId: "existing", adminDelivered: false, telegramDelivered: true }),
  }] : [] }));
  await checkDriveBackupCapacity();
  const insert = mocks.query.mock.calls.find(([query]) => query.includes("INSERT INTO admin_alerts"))!;
  expect(insert[0]).toContain("WHERE NOT EXISTS");
  expect(insert[1].at(-1)).toBe("backup-capacity:existing");
  expect(mocks.telegram).not.toHaveBeenCalled();
});
it("replaces corrupt state rather than silently suppressing warnings", async () => {
  mocks.query.mockImplementation(async (query: string) => ({ rows: query.startsWith("SELECT") ? [{ value: "not JSON" }] : [] }));
  await checkDriveBackupCapacity();
  expect(mocks.telegram).toHaveBeenCalledOnce();
});
it("sanitizes malformed durable state and never lets monitoring abort a backup", async () => {
  mocks.query.mockRejectedValue(new Error("private database details"));
  const log = vi.spyOn(console, "warn").mockImplementation(() => {});
  await expect(checkDriveBackupCapacity()).resolves.toBeUndefined();
  expect(log).toHaveBeenCalledWith("[db-backup] Capacity monitoring could not persist or deliver its state; will retry");
  log.mockRestore();
});
it("uses bounded capacity inventory and never calls retention mutations", async () => {
  await checkDriveBackupCapacity();
  expect(mocks.store).toHaveBeenCalledWith(undefined, undefined, expect.objectContaining({
    capacityInventory: true, requestTimeoutMs: expect.any(Number), deadline: expect.any(Number),
  }));
  expect(mocks.quota).toHaveBeenCalledWith(expect.objectContaining({ deadline: expect.any(Number) }));
  expect(mocks.query.mock.calls.every(([query]) => !/DELETE|UPDATE admin_alerts/.test(query))).toBe(true);
});
