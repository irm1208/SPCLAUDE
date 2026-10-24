import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ proxy: vi.fn(), upload: vi.fn() }));
vi.mock("@replit/connectors-sdk", () => ({ ReplitConnectors: class { proxy = mocks.proxy; } }));
vi.mock("./google-drive-single-sql", () => ({ uploadSingleSqlBackup: mocks.upload }));
import { uploadBackupToGoogleDrive } from "./google-drive-backup";
import { verificationProperties } from "./google-drive-backup-policy";
const verified = { id: "file", name: "S&PBACKUP-2026-10-24_13-00-00.SQL", size: "100", md5Checksum: "a".repeat(32), parents: ["folder"] };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.upload.mockResolvedValue(verified);
  mocks.proxy.mockImplementation(async (_: string, _path: string, init?: RequestInit) =>
    Response.json(init?.method === "PATCH" ? { id: "file" } : { ...verified, appProperties: verificationProperties(verified) }));
});
it("writes and rechecks durable verification only after the full uploader succeeds", async () => {
  const result = await uploadBackupToGoogleDrive("/private/SQL", verified.name);
  expect(result.appProperties?.spBackupMd5).toBe(verified.md5Checksum);
  expect(mocks.upload.mock.invocationCallOrder[0]).toBeLessThan(mocks.proxy.mock.invocationCallOrder[0]);
  expect(mocks.proxy.mock.calls[0][2].method).toBe("PATCH");
  expect(mocks.proxy.mock.calls[1][1]).toContain("appProperties");
});
it("never writes a verification receipt after a failed upload", async () => {
  mocks.upload.mockRejectedValue(new Error("checksum mismatch"));
  await expect(uploadBackupToGoogleDrive("/private/SQL", verified.name)).rejects.toThrow(/checksum/);
  expect(mocks.proxy).not.toHaveBeenCalled();
});
it("fails closed if recording the receipt fails", async () => {
  mocks.proxy.mockResolvedValue(new Response("private body", { status: 403 }));
  await expect(uploadBackupToGoogleDrive("/private/SQL", verified.name)).rejects.toThrow(/^Recording SQL backup verification failed \(HTTP 403\)$/);
});
it("rejects changed remote bytes after the verification receipt update", async () => {
  mocks.proxy.mockImplementation(async (_: string, _path: string, init?: RequestInit) =>
    Response.json(init?.method === "PATCH" ? {} : { ...verified, size: "101", appProperties: verificationProperties(verified) }));
  await expect(uploadBackupToGoogleDrive("/private/SQL", verified.name)).rejects.toThrow(/receipt mismatch/);
});
