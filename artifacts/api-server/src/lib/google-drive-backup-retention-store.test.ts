import { beforeEach, expect, it, vi } from "vitest";
const { proxy } = vi.hoisted(() => ({ proxy: vi.fn() }));
vi.mock("@replit/connectors-sdk", () => ({ ReplitConnectors: class {
  createProxyFetch = () => (path: string, init: RequestInit) => proxy("google-drive", path, init);
} }));
import { createDriveRetentionStore, getDriveBackupStorageQuota } from "./google-drive-backup-retention-store";
const manifestTimes = () => ({ files: [1, 2, 3, 4].map(day => ({
  name: `backup-${day}.SQL.manifest.json`, createdTime: `2026-10-0${day}T00:00:00Z`,
})) });

beforeEach(() => { proxy.mockReset(); });
it("requests only aggregate quota via the existing signal-aware connector", async () => {
  proxy.mockResolvedValue(Response.json({ storageQuota: { limit: "100", usage: "50" } }));
  expect(await getDriveBackupStorageQuota()).toEqual({ limit: "100", usage: "50" });
  expect(proxy).toHaveBeenCalledWith("google-drive", "/drive/v3/about?fields=storageQuota(limit,usage)",
    expect.objectContaining({ signal: expect.any(AbortSignal) }));
});
it("does not expose quota provider error bodies or invent a missing limit", async () => {
  proxy.mockResolvedValueOnce(new Response("private", { status: 403 }))
    .mockResolvedValueOnce(Response.json({ storageQuota: { usage: "50" } }));
  await expect(getDriveBackupStorageQuota()).rejects.toThrow(/^Drive backup quota request failed \(HTTP 403\)$/);
  expect(await getDriveBackupStorageQuota()).toEqual({ usage: "50" });
});
it("bounds capacity inventory by capture-day prefixes without changing retention listings", async () => {
  proxy.mockImplementation(async () => Response.json({ files: [] }));
  await (await createDriveRetentionStore("folder", undefined, { capacityInventory: true })).list();
  const queries = proxy.mock.calls.map(call => new URL(call[1], "https://example.test").searchParams.get("q")!);
  expect(queries).toHaveLength(4);
  expect(new Set(queries).size).toBe(4);
  expect(queries.every(q => q.startsWith("'folder' in parents and trashed = false and name contains 'S&PBACKUP-"))).toBe(true);
  expect(queries.at(-1)).toContain(`name contains 'S&PBACKUP-${new Date().toISOString().slice(0, 10)}'`);
});
it("drains every capacity partition and rejects the whole inventory when one day fails", async () => {
  let active = 0, peak = 0;
  proxy.mockImplementation(async (_connector, path: string) => {
    const q = new URL(path, "https://example.test").searchParams.get("q")!;
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5)); active--;
    return q.includes(new Date().toISOString().slice(0, 10))
      ? Response.json({ incompleteSearch: true, files: [] })
      : Response.json({ files: [] });
  });
  const store = await createDriveRetentionStore("folder", undefined, { capacityInventory: true });
  await expect(store.list()).rejects.toThrow(/Incomplete/);
  expect(peak).toBe(4);
  expect(active).toBe(0);
});
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
  expect(proxy).toHaveBeenCalledWith("google-drive", "/drive/v3/files/old", expect.objectContaining({ method: "DELETE", signal: expect.any(AbortSignal) }));
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
it("reports aggregate request latency without exposing IDs or provider details", async () => {
  proxy.mockResolvedValueOnce(Response.json({ files: [] })).mockRejectedValueOnce(new Error("private"));
  const store = await createDriveRetentionStore("folder");
  await store.list();
  await expect(store.get("private-id")).rejects.toThrow();
  expect(store.metrics?.()).toEqual({
    requests: 2, requestMs: expect.any(Number), maxRequestMs: expect.any(Number),
  });
  const snapshot = store.metrics!();
  snapshot.requests = 999;
  expect(store.metrics!().requests).toBe(2);
});
it("cancels a stalled Drive request, including identity lookup, instead of holding the backup lock forever", async () => {
  proxy.mockImplementation(() => new Promise(() => undefined));
  const store = await createDriveRetentionStore("folder", undefined, { requestTimeoutMs: 10 });
  await expect(store.list()).rejects.toThrow(/timed out/);
  expect(proxy.mock.calls[0][2].signal.aborted).toBe(true);
});
it("keeps cancellation active while downloading a response body", async () => {
  proxy.mockImplementation(async (_connector, _path, init) => new Response(new ReadableStream({
    start(controller) {
      init.signal.addEventListener("abort", () => controller.error(new Error("Body timed out")), { once: true });
    },
  })));
  const store = await createDriveRetentionStore("folder", undefined, { requestTimeoutMs: 10 });
  await expect(store.read({ id: "manifest", name: "manifest", size: "1" })).rejects.toThrow(/timed out/);
});
it("does not send another inventory request after the overall cleanup deadline", async () => {
  const store = await createDriveRetentionStore("folder", undefined, { deadline: Date.now() - 1 });
  await expect(store.list()).rejects.toThrow(/budget exhausted/);
  expect(proxy).not.toHaveBeenCalled();
});
it("lists four disjoint, exhaustive creation-time ranges with bounded concurrency and all pages", async () => {
  let active = 0, peak = 0;
  const ranges: string[] = [];
  proxy.mockImplementation(async (_connector, path: string) => {
    const params = new URL(path, "https://example.test").searchParams;
    if (params.get("fields")?.includes("createdTime")) return Response.json(manifestTimes());
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 2)); active--;
    const q = params.get("q")!;
    if (params.get("pageToken")) return Response.json({ files: [{ id: "second-page" }] });
    ranges.push(q);
    return Response.json({ files: [{ id: q }], ...(q.includes("createdTime < '2026-10-02") ? { nextPageToken: "second" } : {}) });
  });
  const store = await createDriveRetentionStore("folder", undefined, { parallelInventory: true });
  const files = await store.list();
  expect(files).toHaveLength(5);
  expect(peak).toBe(4);
  expect(ranges).toEqual([
    "'folder' in parents and trashed = false and createdTime < '2026-10-02T00:00:00.000Z'",
    "'folder' in parents and trashed = false and createdTime >= '2026-10-02T00:00:00.000Z' and createdTime < '2026-10-03T00:00:00.000Z'",
    "'folder' in parents and trashed = false and createdTime >= '2026-10-03T00:00:00.000Z' and createdTime < '2026-10-04T00:00:00.000Z'",
    "'folder' in parents and trashed = false and createdTime >= '2026-10-04T00:00:00.000Z'",
  ]);
});
it("fails closed if creation-time inventory boundaries cannot be established", async () => {
  proxy.mockResolvedValue(Response.json({ files: [{}] }));
  const store = await createDriveRetentionStore("folder", undefined, { parallelInventory: true });
  await expect(store.list()).rejects.toThrow(/Incomplete backup inventory/);
});
it("waits for other inventory ranges to drain if any range fails", async () => {
  let active = 0;
  proxy.mockImplementation(async (_connector, path: string) => {
    const params = new URL(path, "https://example.test").searchParams;
    if (params.get("fields")?.includes("createdTime")) return Response.json(manifestTimes());
    if (params.get("q")!.includes("createdTime < '2026-10-02")) return Response.json({});
    active++;
    await new Promise(resolve => setTimeout(resolve, 10)); active--;
    return Response.json({ files: [] });
  });
  const store = await createDriveRetentionStore("folder", undefined, { parallelInventory: true });
  await expect(store.list()).rejects.toThrow(/Incomplete backup inventory/);
  expect(active).toBe(0);
});
it("refuses an inventory that Drive explicitly labels incomplete", async () => {
  proxy.mockResolvedValue(Response.json({ files: [], incompleteSearch: true }));
  await expect((await createDriveRetentionStore("folder")).list()).rejects.toThrow(/Incomplete backup inventory/);
});
