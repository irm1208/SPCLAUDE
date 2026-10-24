import { expect, it, vi } from "vitest";
import { assessBackupCapacity, deliverCapacityNotice, type CapacityNoticeState, type CapacityAssessment } from "./google-drive-backup-capacity";
import { verificationProperties } from "./google-drive-backup-policy";
import type { DriveBackupFile } from "./google-drive-backup";

const now = Date.parse("2026-10-24T12:30:00Z");
function backup(hoursAgo = 0, size = "100"): DriveBackupFile {
  const name = `S&PBACKUP-${new Date(now - hoursAgo * 3600000).toISOString().slice(0, 19).replace("T", "_").replaceAll(":", "-")}.SQL`;
  const file = { id: `private-${hoursAgo}`, name, size, md5Checksum: "a".repeat(32), parents: ["folder"] };
  return { ...file, appProperties: verificationProperties(file, now) };
}
const assess = (files: DriveBackupFile[], quota: unknown) => assessBackupCapacity(files, "folder", quota, now);
it("projects 72 measured copies plus upload headroom, not a fixed GB estimate", () => {
  expect(assess([backup()], { limit: "10000", usage: "2800" })).toMatchObject({
    status: "healthy", requiredFreeBytes: 7200n, freeBytes: 7200n, sampleBytes: 100n,
  });
  expect(assess([backup()], { limit: "10000", usage: "2801" }).status).toBe("low");
});
it("credits only retained verified copies and requires headroom even with 72 copies", () => {
  const files = Array.from({ length: 72 }, (_, i) => backup(i));
  expect(assess(files, { limit: "10000", usage: "9900" })).toMatchObject({ status: "healthy", requiredFreeBytes: 100n });
  expect(assess(files, { limit: "10000", usage: "9901" }).status).toBe("upload_blocked");
  expect(assess([backup(73), { ...backup(), appProperties: {} }, { ...backup(), parents: ["other"] }],
    { limit: "10000", usage: "2800" })).toMatchObject({ requiredFreeBytes: 7300n, status: "low" });
});
it("uses the largest recent verified size and does not count duplicate capture hours as hourly coverage", () => {
  expect(assess([backup(1), backup(0, "200")], { limit: "20000", usage: "0" }))
    .toMatchObject({ sampleBytes: 200n, requiredFreeBytes: 14300n });
  expect(assess([backup(), { ...backup(), id: "duplicate" }], { limit: "20000", usage: "0" }))
    .toMatchObject({ requiredFreeBytes: 7200n });
});
it("does not use future, trashed, mismatched or zero-byte receipts as measurements", () => {
  const files = [backup(-1), { ...backup(), trashed: true },
    { ...backup(), size: "0" }, { ...backup(), md5Checksum: "b".repeat(32) }];
  expect(assess(files, { limit: "10000", usage: "0" }).status).toBe("unknown");
});
it("reports missing, malformed, unlimited quota and missing verified measurements explicitly", () => {
  for (const quota of [null, {}, { usage: "0" }, { limit: "-1", usage: "0" },
    { limit: "10000" }, { limit: "10000", usage: 0 }, { limit: "NaN", usage: "0" }]) {
    expect(assess([backup()], quota).status).toBe("unknown");
  }
  expect(assess([], { limit: "10000", usage: "0" }).status).toBe("unknown");
});
it("uses exact byte arithmetic beyond JS safe integers and treats over-quota as no free space", () => {
  expect(assess([backup(0, "9007199254740993")], { limit: "999999999999999999", usage: "0" }))
    .toMatchObject({ sampleBytes: 9007199254740993n, requiredFreeBytes: 648518346341351496n });
  expect(assess([backup()], { limit: "100", usage: "101" }).status).toBe("upload_blocked");
});
it("never leaks private file names, IDs or provider errors in notices", () => {
  const result = assess([backup()], { limit: "100", usage: "100" });
  expect(result.message).toContain("72");
  expect(result.message).not.toMatch(/private-|S&PBACKUP|folder/);
});

function harness() {
  let state: CapacityNoticeState | null = null;
  const save = vi.fn(async (next: CapacityNoticeState) => { state = structuredClone(next); });
  const admin = vi.fn(async (_assessment: CapacityAssessment, _noticeId: string) => {});
  const telegram = vi.fn(async (_message: string) => true);
  return { save, admin, telegram, run: (assessment: ReturnType<typeof assess>) =>
    deliverCapacityNotice(assessment, state, { save, admin, telegram }), state: () => state };
}
it("deduplicates across persisted state, escalates, and sends exactly one recovery", async () => {
  const h = harness();
  const low = assess([backup()], { limit: "10000", usage: "2900" });
  await h.run(low); await h.run(low);
  expect(h.admin).toHaveBeenCalledTimes(1); expect(h.telegram).toHaveBeenCalledTimes(1);
  await h.run(assess([backup()], { limit: "100", usage: "100" }));
  expect(h.admin).toHaveBeenCalledTimes(2);
  const healthy = assess([backup()], { limit: "10000", usage: "0" });
  await h.run(healthy); await h.run(healthy);
  expect(h.admin).toHaveBeenCalledTimes(3);
  expect(h.admin.mock.calls[2][0]).toMatchObject({ status: "healthy", title: "Google Drive backup capacity restored" });
});
it("does not send an initial healthy notice; unknown is not recovery", async () => {
  const h = harness();
  await h.run(assess([backup()], { limit: "10000", usage: "0" }));
  expect(h.admin).not.toHaveBeenCalled();
  await h.run(assess([backup()], null)); await h.run(assess([backup()], null));
  expect(h.admin).toHaveBeenCalledTimes(1);
  expect(h.admin.mock.calls[0][0].status).toBe("unknown");
  await h.run(assess([backup()], { limit: "10000", usage: "0" }));
  expect(h.admin.mock.calls[1][0].status).toBe("healthy");
});
it("retries only failed channels without suppressing the other channel", async () => {
  const h = harness();
  h.admin.mockRejectedValueOnce(new Error("private"));
  const low = assess([backup()], { limit: "10000", usage: "2900" });
  await h.run(low); await h.run(low);
  expect(h.admin).toHaveBeenCalledTimes(2); expect(h.telegram).toHaveBeenCalledTimes(1);
  const other = harness(); other.telegram.mockResolvedValueOnce(false);
  await other.run(low); await other.run(low);
  expect(other.admin).toHaveBeenCalledTimes(1); expect(other.telegram).toHaveBeenCalledTimes(2);
});
