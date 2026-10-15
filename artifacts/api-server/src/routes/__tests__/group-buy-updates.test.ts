import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";

const data = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  storeImage: vi.fn(), deleteImage: vi.fn(), failInsertAt: 0, insertCount: 0,
}));
type Row = Record<string, unknown>;
type Predicate = (row: Row) => boolean;
const canonical = (value: unknown) => String(value ?? "").replace(/^@/, "").toLowerCase();
vi.mock("drizzle-orm", () => ({
  eq: (column: string, value: unknown) => (row: Row) => row[column] === value,
  and: (...predicates: Predicate[]) => (row: Row) => predicates.every(predicate => predicate(row)),
  inArray: (column: string, values: unknown[]) => (row: Row) => values.includes(row[column]),
  isNull: (column: string) => (row: Row) => row[column] == null,
  like: (column: string, prefix: string) => (row: Row) => String(row[column]).startsWith(prefix.slice(0, -1).replace(/\\([\\%_])/g, "$1")),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => {
    const predicate = (row: Row) => canonical(row[String(values[0])]) === values[1];
    return Object.assign(predicate, { strings, values });
  },
}));
vi.mock("@workspace/db", () => {
  const group = { table: "groups", id: "id", organiserId: "organiserId" };
  const members = { table: "members", id: "id", groupBuyId: "groupBuyId", accountId: "accountId" };
  const orders = { table: "orders", id: "id", groupBuyId: "groupBuyId", telegramUsername: "telegramUsername", deletedAt: "deletedAt" };
  const config = { table: "config", key: "key", value: "value" };
  const rows = (table: { table: string }) => data.tables[table.table] ?? [];
  let queue = Promise.resolve();
  const database = {
    select: () => ({ from: (table: { table: string }) => ({ where: (predicate: Predicate) => {
      const found = rows(table).filter(predicate);
      const query = {
        limit: async (n: number) => found.slice(0, n),
        for: (_mode: string) => query,
        then: (resolve: (value: Row[]) => unknown) => Promise.resolve(found).then(resolve),
      };
      return query;
    } }) }),
    insert: (table: { table: string }) => ({ values: (value: Row) => {
      const insert = (upsert: boolean) => {
        if (++data.insertCount === data.failInsertAt) throw new Error("simulated database failure");
        const existing = rows(table).findIndex(row => row.key === value.key);
        if (existing >= 0 && upsert) rows(table)[existing] = { ...value };
        else if (existing >= 0) throw new Error("duplicate key");
        else rows(table).push({ ...value });
      };
      return { onConflictDoUpdate: async () => insert(true), then: (resolve: (value: unknown) => unknown) => { insert(false); return Promise.resolve().then(resolve); } };
    } }),
    update: (table: { table: string }) => ({ set: (changes: Row) => ({ where: async (predicate: Predicate) => {
      data.tables[table.table] = rows(table).map(row => predicate(row) ? { ...row, ...changes } : row);
    } }) }),
    delete: (table: { table: string }) => ({ where: async (predicate: Predicate) => {
      data.tables[table.table] = rows(table).filter(row => !predicate(row));
    } }),
    execute: async (query: { values: unknown[] }) => {
      const account = query.values[0];
      return { rows: data.tables.groups.filter(group =>
        canonical(group.organiserId) === account ||
        data.tables.members.some(row => row.groupBuyId === group.id && canonical(row.accountId) === account) ||
        data.tables.orders.some(row => row.groupBuyId === group.id && row.deletedAt === null && canonical(row.telegramUsername) === account)) };
    },
    transaction: async <T,>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      const previous = queue;
      let release!: () => void;
      queue = new Promise<void>(resolve => { release = resolve; });
      await previous;
      const snapshot = structuredClone(data.tables);
      try { return await fn(database); }
      catch (error) { data.tables = snapshot; throw error; }
      finally { release(); }
    },
  };
  return { db: database, groupBuysTable: group, accountGroupBuysTable: members, ordersTable: orders, siteConfigTable: config };
});
vi.mock("../../middleware/account-auth", () => ({
  requireAccount: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const name = req.headers["x-test-member"];
    if (!name) { res.status(401).json({ error: "Sign in" }); return; }
    req.account = { telegramUsername: String(name) } as express.Request["account"]; next();
  },
}));
vi.mock("../../middleware/require-organiser", () => ({
  requireOrganiser: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const name = req.headers["x-test-organiser"];
    if (!name) { res.status(401).json({ error: "Organiser required" }); return; }
    req.organiser = { telegramUsername: String(name), organiserStatus: "approved",
      isAdmin: !!req.headers["x-test-gb-session"], adminGbId: req.headers["x-test-gb-session"] as string | undefined };
    next();
  },
}));
vi.mock("../../middleware/require-admin", () => ({
  requireAdmin: (req: express.Request, res: express.Response) => {
    if (req.headers["x-test-admin"] === "yes") return true;
    res.status(401).json({ error: "Admin required" }); return false;
  },
}));
vi.mock("../../lib/audit-log", () => ({ writeLog: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../lib/wholesale-update-images", () => ({
  WHOLESALE_IMAGE_LIMIT: 5 * 1024 * 1024,
  storePageUpdateImage: data.storeImage, deleteWholesaleUpdateImage: data.deleteImage,
  downloadWholesaleUpdateImage: vi.fn().mockResolvedValue(Buffer.from("image bytes")),
}));
import router from "../group-buy-updates";
import type { groupBuyUpdates } from "../../lib/group-buy-updates";
type Detail = Awaited<ReturnType<typeof groupBuyUpdates>>;
type Update = Detail["updates"][number];
let server: Server;
let base: string;
const manager = { "x-test-organiser": "lead" };
const member = { "x-test-member": "member" };
const management = "/organiser/group-buys/GB1";
const getBody = async <T,>(response: Response): Promise<T> => await response.json() as T;
const request = (path: string, init?: RequestInit) => fetch(`${base}${path}`, init);
async function stage(value: string, expectedUpdatedAt: string | null = null, headers = manager, groupId = "GB1") {
  return request(`/organiser/group-buys/${groupId}/progress`, {
    method: "PUT", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ stage: value, expectedUpdatedAt }),
  });
}
async function save(id?: string, published = true, image = false, root = management, headers: Record<string, string> = manager) {
  const body = new FormData();
  body.set("title", "Shipping news"); body.set("note", "Vendor sent the parcel.\nMore news soon."); body.set("published", String(published));
  if (image) body.set("image", new Blob(["fake image"], { type: "image/png" }), "image.png");
  return request(`${root}/updates${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", headers, body });
}
beforeAll(async () => {
  const app = express(); app.use(express.json()); app.use(router);
  server = app.listen(0); await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server failed");
  base = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => {
  data.tables = {
    groups: [
      { id: "GB1", name: "Group one", organiserId: "lead", status: "active", closeDate: null, blockedAccounts: ["blocked"] },
      { id: "GB2", name: "Private group", organiserId: "other", status: "closed", closeDate: null, blockedAccounts: [] },
    ],
    members: [{ id: "m", groupBuyId: "GB1", accountId: "member" }, { id: "b", groupBuyId: "GB1", accountId: "blocked" }],
    orders: [{ id: "o", groupBuyId: "GB1", telegramUsername: "historical", deletedAt: null, paymentStatus: "confirmed", grandTotal: "100.00" }],
    config: [],
  };
  data.failInsertAt = 0; data.insertCount = 0;
  data.storeImage.mockReset().mockResolvedValue("group-buy-updates/00000000-0000-0000-0000-000000000001.webp");
  data.deleteImage.mockReset().mockResolvedValue(undefined);
});

describe("group-buy progress and announcements API", () => {
  it("requires authentication and isolates members and organisers to their own groups", async () => {
    expect((await request("/group-buys/GB1/updates")).status).toBe(401);
    expect((await request("/group-buys/GB2/updates", { headers: member })).status).toBe(403);
    expect((await save(undefined, true, true, "/organiser/group-buys/GB2")).status).toBe(403);
    expect(data.storeImage).not.toHaveBeenCalled();
    expect(data.tables.config).toEqual([]);
  });
  it("blocks banned members but permits historical order owners and the group organiser", async () => {
    expect((await request("/group-buys/GB1/updates", { headers: { "x-test-member": "blocked" } })).status).toBe(403);
    for (const username of ["historical", "@MEMBER", "lead"]) {
      expect((await request("/group-buys/GB1/updates", { headers: { "x-test-member": username } })).status).toBe(200);
    }
  });
  it("keeps draft notes/images private, publishes and hides them, and removes their storage image on delete", async () => {
    const created = await getBody<{ update: Update }>(await save(undefined, false, true));
    expect(created.update.kind).toBe("note");
    expect(data.storeImage).toHaveBeenCalledWith(expect.any(Buffer), "group-buy-updates");
    let detail = await getBody<Detail>(await request("/group-buys/GB1/updates", { headers: member }));
    expect(detail.updates).toEqual([]);
    const imagePath = `/group-buys/GB1/updates/${created.update.id}/image`;
    expect((await request(imagePath, { headers: member })).status).toBe(404);
    expect((await request(`${management}/updates/${created.update.id}/image`, { headers: manager })).status).toBe(200);
    await save(created.update.id, true);
    detail = await getBody<Detail>(await request("/group-buys/GB1/updates", { headers: member }));
    expect(detail.updates).toHaveLength(1);
    expect(detail.updates[0]).not.toHaveProperty("imageKey");
    expect((await request(imagePath, { headers: member })).status).toBe(200);
    await save(created.update.id, false);
    expect((await request(imagePath, { headers: member })).status).toBe(404);
    expect((await request(`${management}/updates/${created.update.id}`, { method: "DELETE", headers: manager })).status).toBe(200);
    expect(data.deleteImage).toHaveBeenCalledOnce();
  });
  it("sets a stage and adds a dated public history entry without changing any orders, payments or lifecycle status", async () => {
    const unchanged = structuredClone({ groups: data.tables.groups, orders: data.tables.orders });
    const response = await stage("ordered"); expect(response.status).toBe(200);
    const detail = await getBody<Detail>(response);
    expect(detail.stage).toBe("ordered"); expect(detail.stageUpdatedAt).toBeTruthy();
    expect(detail.updates[0]).toMatchObject({ kind: "status", stage: "ordered", published: true });
    expect(data.tables.groups).toEqual(unchanged.groups); expect(data.tables.orders).toEqual(unchanged.orders);
    expect(data.tables.config).toHaveLength(2);
  });
  it("allows only one of two simultaneous stale stage changes to win", async () => {
    const results = await Promise.all([stage("ordered"), stage("in_transit")]);
    expect(results.map(response => response.status).sort()).toEqual([200, 409]);
    expect(data.tables.config).toHaveLength(2);
  });
  it("supports changing progress again with its current version and does not duplicate an unchanged stage", async () => {
    const first = await getBody<Detail>(await stage("ordered"));
    const repeated = await getBody<Detail>(await stage("ordered", first.stageUpdatedAt));
    expect(repeated.updates).toHaveLength(1);
    const next = await getBody<Detail>(await stage("in_transit", first.stageUpdatedAt));
    expect(next.updates).toHaveLength(2); expect(next.stageUpdatedAt).not.toBe(first.stageUpdatedAt);
    expect((await stage("closed", first.stageUpdatedAt)).status).toBe(409);
  });
  it("rolls back the stage if writing its history fails", async () => {
    // Fail the history insert after the new current-stage row has been written.
    data.failInsertAt = 2;
    expect((await stage("ordered")).status).toBe(500);
    expect(data.tables.config).toEqual([]);
  });
  it("limits an admin-open organiser session to its selected group while allowing real Admin controls", async () => {
    const scoped = { "x-test-organiser": "admin", "x-test-gb-session": "GB1" };
    expect((await stage("ordered", null, scoped, "GB2")).status).toBe(403);
    expect((await stage("ordered", null, scoped)).status).toBe(200);
    const adminCreated = await save(undefined, true, false, "/admin/group-buys/GB2", { "x-test-admin": "yes" });
    expect(adminCreated.status).toBe(201);
  });
  it("returns a scoped bulk progress map without exposing other groups or blocked users", async () => {
    await stage("ordered");
    const summary = await getBody<{ progress: Record<string, { stage: string }> }>(await request("/group-buys/progress", { headers: member }));
    expect(summary.progress.GB1.stage).toBe("ordered"); expect(summary.progress.GB2).toBeUndefined();
    const blocked = await getBody<{ progress: object }>(await request("/group-buys/progress", { headers: { "x-test-member": "blocked" } }));
    expect(blocked.progress).toEqual({});
  });
  it("does not let an update ID be read or deleted through another group", async () => {
    const { update } = await getBody<{ update: Update }>(await save());
    expect((await request(`/admin/group-buys/GB2/updates/${update.id}`, { method: "DELETE", headers: { "x-test-admin": "yes" } })).status).toBe(404);
    expect(data.tables.config).toHaveLength(1);
  });
});
