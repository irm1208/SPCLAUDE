import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";
import type { wholesaleUpdateDto } from "../../lib/wholesale-updates";

const harness = vi.hoisted(() => ({
  rows: new Map<string, { key: string; value: string | null }>(),
  conflict: false,
  storeImage: vi.fn().mockResolvedValue("wholesale-updates/00000000-0000-0000-0000-000000000000.webp"),
  deleteImage: vi.fn().mockResolvedValue(undefined),
}));
type Row = { key: string; value: string | null };
type Predicate = (row: Row) => boolean;

vi.mock("drizzle-orm", () => ({
  eq: (column: keyof Row, value: unknown) => (row: Row) => row[column] === value,
  and: (...predicates: Predicate[]) => (row: Row) => predicates.every(p => p(row)),
  like: (_column: string, prefix: string) => (row: Row) => row.key.startsWith(prefix.slice(0, -1)),
}));
vi.mock("@workspace/db", () => ({
  siteConfigTable: { key: "key", value: "value" },
  db: {
    select: () => ({ from: () => ({ where: (predicate: Predicate) => {
      const rows = [...harness.rows.values()].filter(predicate);
      return { limit: async (n: number) => rows.slice(0, n), then: (resolve: (rows: Row[]) => unknown) => Promise.resolve(rows).then(resolve) };
    } }) }),
    insert: () => ({ values: async (row: Row) => { harness.rows.set(row.key, row); } }),
    update: () => ({ set: (changes: Partial<Row>) => ({ where: (predicate: Predicate) => ({
      returning: async () => {
        if (harness.conflict) return [];
        const rows = [...harness.rows.values()].filter(predicate);
        for (const row of rows) harness.rows.set(row.key, { ...row, ...changes });
        return rows;
      },
    }) }) }),
    delete: () => ({ where: (predicate: Predicate) => ({
      returning: async () => {
        if (harness.conflict) return [];
        const rows = [...harness.rows.values()].filter(predicate);
        for (const row of rows) harness.rows.delete(row.key);
        return rows;
      },
    }) }),
  },
}));
vi.mock("../../middleware/require-admin", () => ({
  requireAdmin: (req: express.Request, res: express.Response) => {
    if (req.headers["x-admin-secret"] === "test-admin") return true;
    res.status(401).json({ error: "Admin required" }); return false;
  },
}));
vi.mock("../../middleware/require-wholesale", () => ({
  requireWholesale: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.headers["x-test-member"] === "yes") next();
    else res.status(403).json({ error: "Wholesale access required" });
  },
}));
vi.mock("../../lib/audit-log", () => ({ writeLog: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../lib/wholesale-update-images", () => ({
  WHOLESALE_IMAGE_LIMIT: 5 * 1024 * 1024,
  storeWholesaleUpdateImage: harness.storeImage,
  deleteWholesaleUpdateImage: harness.deleteImage,
  downloadWholesaleUpdateImage: vi.fn().mockResolvedValue(Buffer.from("image bytes")),
}));

import router from "../wholesale-updates";
let server: Server;
let base: string;
const admin = { "x-admin-secret": "test-admin" };
const member = { "x-test-member": "yes" };
async function readUpdate(response: Response) {
  return (await response.json() as { update: ReturnType<typeof wholesaleUpdateDto> }).update;
}
async function readUpdates(response: Response) {
  return (await response.json() as { updates: ReturnType<typeof wholesaleUpdateDto>[] }).updates;
}
async function save(id?: string, published = true, image = false, removeImage = false) {
  const body = new FormData();
  body.set("title", "Price update"); body.set("note", "Prices change on Monday.");
  body.set("published", String(published)); body.set("removeImage", String(removeImage));
  if (image) body.set("image", new Blob(["image"], { type: "image/png" }), "image.png");
  return fetch(`${base}/admin/wholesale-updates${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", headers: admin, body });
}
beforeAll(async () => {
  const app = express(); app.use(express.json()); app.use(router);
  server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind");
  base = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => { harness.rows.clear(); harness.conflict = false; vi.clearAllMocks(); });

describe("global wholesale updates API", () => {
  it("restricts posting to Admin and the customer feed to wholesale members", async () => {
    expect((await fetch(`${base}/admin/wholesale-updates`, { method: "POST" })).status).toBe(401);
    expect((await fetch(`${base}/wholesale/updates`)).status).toBe(403);
    expect(harness.rows.size).toBe(0);
  });
  it("creates, edits, hides, republishes and deletes a persisted update", async () => {
    const created = await save(); expect(created.status).toBe(201);
    const update = await readUpdate(created);
    let feed = await readUpdates(await fetch(`${base}/wholesale/updates`, { headers: member }));
    expect(feed[0].id).toBe(update.id);
    await save(update.id, false);
    feed = await readUpdates(await fetch(`${base}/wholesale/updates`, { headers: member }));
    expect(feed).toEqual([]);
    const drafts = await readUpdates(await fetch(`${base}/admin/wholesale-updates`, { headers: admin }));
    expect(drafts[0].published).toBe(false);
    await save(update.id, true);
    expect(await readUpdates(await fetch(`${base}/wholesale/updates`, { headers: member }))).toHaveLength(1);
    expect((await fetch(`${base}/admin/wholesale-updates/${update.id}`, { method: "DELETE", headers: admin })).status).toBe(200);
    expect(harness.rows.size).toBe(0);
  });
  it("keeps hidden images private, retains images on note edits, and supports explicit removal", async () => {
    const update = await readUpdate(await save(undefined, false, true));
    expect((await fetch(`${base}/wholesale/updates/${update.id}/image`, { headers: member })).status).toBe(404);
    expect((await fetch(`${base}/admin/wholesale-updates/${update.id}/image`, { headers: admin })).status).toBe(200);
    const retained = await readUpdate(await save(update.id, true));
    expect(retained.imageUrl).not.toBeNull();
    const image = await fetch(`${base}/wholesale/updates/${update.id}/image`, { headers: member });
    expect(image.status).toBe(200); expect(image.headers.get("content-type")).toContain("image/webp");
    await save(update.id, true, false, true);
    expect(harness.deleteImage).toHaveBeenCalledOnce();
    expect((await fetch(`${base}/wholesale/updates/${update.id}/image`, { headers: member })).status).toBe(404);
  });
  it("rejects invalid notes without writing and rejects image uploads above the size limit", async () => {
    const invalid = await fetch(`${base}/admin/wholesale-updates`, { method: "POST", headers: { ...admin, "content-type": "application/json" }, body: JSON.stringify({ note: "", published: true }) });
    expect(invalid.status).toBe(400);
    const body = new FormData(); body.set("note", "update"); body.set("published", "true");
    body.set("image", new Blob([new Uint8Array(5 * 1024 * 1024 + 1)]), "large.png");
    expect((await fetch(`${base}/admin/wholesale-updates`, { method: "POST", headers: admin, body })).status).toBe(413);
    expect(harness.rows.size).toBe(0);
  });
  it("rejects stale edits and cleans their new image without deleting the live image", async () => {
    const update = await readUpdate(await save());
    harness.conflict = true;
    expect((await save(update.id, true, true)).status).toBe(409);
    expect(harness.deleteImage).toHaveBeenCalledOnce();
    expect(harness.rows.size).toBe(1);
    expect((await fetch(`${base}/admin/wholesale-updates/${update.id}`, { method: "DELETE", headers: admin })).status).toBe(409);
    expect(harness.rows.size).toBe(1);
  });
  it("does not consume unrelated configuration or change order/payment records", async () => {
    harness.rows.set("wholesale_usdt_wallet", { key: "wholesale_usdt_wallet", value: "existing-wallet-setting" });
    await save();
    expect(await readUpdates(await fetch(`${base}/admin/wholesale-updates`, { headers: admin }))).toHaveLength(1);
    expect(harness.rows.get("wholesale_usdt_wallet")?.value).toBe("existing-wallet-setting");
  });
});
