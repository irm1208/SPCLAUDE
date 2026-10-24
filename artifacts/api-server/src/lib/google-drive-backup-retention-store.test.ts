import { beforeEach, expect, it, vi } from "vitest";
const { proxy } = vi.hoisted(() => ({ proxy: vi.fn() }));
vi.mock("@replit/connectors-sdk", () => ({ ReplitConnectors: class { proxy = proxy; } }));
import { createDriveRetentionStore } from "./google-drive-backup-retention-store";

beforeEach(() => proxy.mockReset());
it("reads every page in the configured folder with verification properties", async () => {
  proxy.mockResolvedValueOnce(Response.json({ files: [{ id: "one" }], nextPageToken: "two" }))
    .mockResolvedValueOnce(Response.json({ files: [{ id: "two" }] }));
  const store = await createDriveRetentionStore("folder");
  expect((await store.list()).map(f => f.id)).toEqual(["one", "two"]);
  expect(proxy.mock.calls[0][1]).toContain("appProperties");
  expect(proxy.mock.calls[0][1]).toContain("pageSize=1000");
  expect(proxy.mock.calls[1][1]).toContain("pageToken=two");
  expect(proxy.mock.calls[0][1]).toContain("folder");
});
it("refuses an incomplete or looping inventory instead of deleting from a partial list", async () => {
  proxy.mockImplementation(async () => Response.json({ files: [], nextPageToken: "same" }));
  await expect((await createDriveRetentionStore("folder")).list()).rejects.toThrow(/Repeated/);
});
it("never creates a folder during read-only discovery", async () => {
  proxy.mockResolvedValue(Response.json({ files: [] }));
  await expect(createDriveRetentionStore()).rejects.toThrow(/missing/);
  expect(proxy.mock.calls.every(call => !call[2]?.method)).toBe(true);
});
it("permanently deletes only the requested ID and handles an already absent object", async () => {
  proxy.mockResolvedValue(new Response(null, { status: 404 }));
  const store = await createDriveRetentionStore("folder");
  await store.remove("old");
  expect(proxy).toHaveBeenCalledWith("google-drive", "/drive/v3/files/old", { method: "DELETE" });
  expect(await store.get("old")).toBeNull();
});
it("persists a resumable legacy deletion marker without erasing existing properties", async () => {
  proxy.mockResolvedValueOnce(Response.json({ id: "old", appProperties: { kept: "yes" } }))
    .mockResolvedValueOnce(Response.json({ id: "old" }));
  await (await createDriveRetentionStore("folder")).markDeleting("old");
  expect(JSON.parse(proxy.mock.calls[1][2].body).appProperties).toEqual({ kept: "yes", spRetentionDeleting: "1" });
});
it("does not expose provider error bodies", async () => {
  proxy.mockResolvedValue(new Response("private provider details", { status: 403 }));
  await expect((await createDriveRetentionStore("folder")).remove("old")).rejects.toThrow(/^Drive backup retention request failed \(HTTP 403\)$/);
});
it("bounds downloaded manifests even if response size headers are inaccurate", async () => {
  proxy.mockResolvedValue(new Response(Buffer.alloc(4 * 1024 * 1024 + 1)));
  await expect((await createDriveRetentionStore("folder")).read({ id: "manifest", name: "manifest", size: "1" }))
    .rejects.toThrow(/safety bound/);
});
it("limits hourly duplicate detection to the current capture-hour prefix", async () => {
  proxy.mockResolvedValueOnce(Response.json({ files: [] }));
  await (await createDriveRetentionStore("folder", new Date("2026-10-24T13:30:00Z"))).list();
  expect(decodeURIComponent(proxy.mock.calls[0][1]).replaceAll("+", " ")).toContain("name contains 'S&PBACKUP-2026-10-24_13-'");
});
