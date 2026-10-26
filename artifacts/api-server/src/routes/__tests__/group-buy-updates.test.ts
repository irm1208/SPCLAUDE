import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";

const data = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  storeImage: vi.fn(), deleteImage: vi.fn(), failInsertAt: 0, insertCount: 0,
  notify: vi.fn(),
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
    if (strings.join("").includes("NOT IN ('cancelled'")) {
      return (row: Row) => !["cancelled", "canceled", "draft"].includes(String(row.status).trim().toLowerCase());
    }
    if (strings.join("").includes("<> 'refunded'")) {
      return (row: Row) => String(row.paymentStatus).trim().toLowerCase() !== "refunded";
    }
    if (strings.join("").includes("gb_update_delivery:")) {
      return (row: Row) => String(row.key).startsWith("gb_update_delivery:")
        && JSON.parse(String(row.value)).pending.length > 0
        && JSON.parse(String(row.value)).availableAt <= Number(values.at(-1));
    }
    const predicate = (row: Row) => canonical(row[String(values[0])]) === values[1];
    return Object.assign(predicate, { strings, values });
  },
}));
vi.mock("@workspace/db", () => {
  const group = { table: "groups", id: "id", organiserId: "organiserId" };
  const members = { table: "members", id: "id", groupBuyId: "groupBuyId", accountId: "accountId" };
  const orders = { table: "orders", id: "id", groupBuyId: "groupBuyId", telegramUsername: "telegramUsername", deletedAt: "deletedAt", status: "status", paymentStatus: "paymentStatus", amountDue: "amountDue" };
  const items = { table: "items", orderId: "orderId", quantity: "quantity", isOos: "isOos", productId: "productId", productName: "productName" };
  const catalogue = { table: "catalogue", groupBuyId: "groupBuyId", productId: "productId" };
  const products = { table: "products", id: "id", name: "name", mgSize: "mgSize" };
  const config = { table: "config", key: "key", value: "value" };
  const rows = (table: { table: string }) => data.tables[table.table] ?? [];
  let queue = Promise.resolve();
  const database = {
    select: (fields?: Record<string, string>) => ({ from: (table: { table: string }) => ({
      innerJoin: (_joined: unknown, _on: unknown) => ({
        where: (predicate: Predicate) => {
          const joined: Row[] = table === catalogue
            ? rows(catalogue).map(link => ({ ...link,
              name: rows(products).find(p => p.id === link.productId)?.name,
              mgSize: rows(products).find(p => p.id === link.productId)?.mgSize }))
            : rows(table).flatMap(order => rows(items).filter(item => item.orderId === order.id).map(item => ({ ...order, ...item })));
          const filtered = joined.filter(predicate);
          return {
          then: (resolve: (value: Row[]) => unknown) => Promise.resolve(filtered.map(row =>
            Object.fromEntries(Object.entries(fields ?? {}).map(([key, column]) => [key, row[column]])))).then(resolve),
          groupBy: async () => {
            const totals = new Map<string, Row>();
            for (const row of filtered) {
              const key = `${row.groupBuyId}:${row.productId ?? "default"}`;
              const total = totals.get(key) ?? {
                groupBuyId: row.groupBuyId, productId: row.productId ?? "default", name: row.productName ?? "Product",
                orderedKits: 0, paidKits: 0,
              };
              total.orderedKits = Number(total.orderedKits) + Number(row.quantity);
              if (String(row.paymentStatus).trim().toLowerCase() === "confirmed" && Number(row.amountDue ?? 0) <= 0) {
                total.paidKits = Number(total.paidKits) + Number(row.quantity);
              }
              totals.set(key, total);
            }
            return [...totals.values()];
          },
        }; },
      }),
      where: (predicate: Predicate) => {
      const found = rows(table).filter(predicate).map(row => fields
        ? Object.fromEntries(Object.entries(fields).map(([name, column]) => [name, row[column]])) : row);
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
      return { onConflictDoNothing: async () => { if (!rows(table).some(row => row.key === value.key)) insert(false); },
        onConflictDoUpdate: async () => insert(true), then: (resolve: (value: unknown) => unknown) => { insert(false); return Promise.resolve().then(resolve); } };
    } }),
    update: (table: { table: string }) => ({ set: (changes: Row) => ({ where: (predicate: Predicate) => {
      const apply = () => {
        const changed = rows(table).filter(predicate).map(row => ({ ...row, ...changes }));
        data.tables[table.table] = rows(table).map(row => predicate(row) ? { ...row, ...changes } : row);
        return changed;
      };
      return { returning: async () => apply(), then: (resolve: (value: unknown) => unknown) => Promise.resolve(apply()).then(resolve) };
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
  return { db: database, groupBuysTable: group, accountGroupBuysTable: members, ordersTable: orders,
    orderLineItemsTable: items, siteConfigTable: config, groupBuyProductsTable: catalogue, productsTable: products };
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
vi.mock("../../lib/telegram", () => ({ notifyUserFull: data.notify }));
vi.mock("../../lib/scheduler-registry", () => ({ registerScheduler: vi.fn() }));
vi.mock("../../lib/wholesale-update-images", () => ({
  WHOLESALE_IMAGE_LIMIT: 5 * 1024 * 1024,
  storePageUpdateImage: data.storeImage, deleteWholesaleUpdateImage: data.deleteImage,
  downloadWholesaleUpdateImage: vi.fn().mockResolvedValue(Buffer.from("image bytes")),
}));
import router from "../group-buy-updates";
import type { groupBuyUpdates } from "../../lib/group-buy-updates";
import { drainGroupBuyUpdateNotifications } from "../../lib/group-buy-update-notifications";
type Detail = Awaited<ReturnType<typeof groupBuyUpdates>>;
type Update = Detail["updates"][number];
let server: Server;
let base: string;
const manager = { "x-test-organiser": "lead" };
const member = { "x-test-member": "member" };
const management = "/organiser/group-buys/GB1";
const getBody = async <T,>(response: Response): Promise<T> => await response.json() as T;
const request = (path: string, init?: RequestInit) => fetch(`${base}${path}`, init);
async function stage(value: string, expectedUpdatedAt: string | null = null, headers = manager, groupId = "GB1", sendTelegramAlert = true) {
  return request(`/organiser/group-buys/${groupId}/progress`, {
    method: "PUT", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ stage: value, expectedUpdatedAt, sendTelegramAlert }),
  });
}
async function save(id?: string, published = true, image = false, root = management, headers: Record<string, string> = manager, sendTelegramAlert = true) {
  const body = new FormData();
  body.set("title", "Shipping news"); body.set("note", "Vendor sent the parcel.\nMore news soon."); body.set("published", String(published));
  body.set("sendTelegramAlert", String(sendTelegramAlert));
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
    config: [], items: [],
  };
  data.failInsertAt = 0; data.insertCount = 0;
  data.notify.mockReset().mockResolvedValue({ ok: true });
  data.storeImage.mockReset().mockResolvedValue("group-buy-updates/00000000-0000-0000-0000-000000000001.webp");
  data.deleteImage.mockReset().mockResolvedValue(undefined);
});

describe("group-buy progress and announcements API", () => {
  const moq = (body: Record<string, unknown> = {}, headers: Record<string, string> = manager, root = management) =>
    request(`${root}/moq`, {
      method: "PUT", headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ enabled: true, targetKits: 100, showToMembers: false, expectedUpdatedAt: null, ...body }),
    });
  it("MOQ management requires owner/admin authentication and validates the target", async () => {
    expect((await moq({}, {})).status).toBe(401);
    expect((await moq({}, { "x-test-organiser": "other" })).status).toBe(403);
    expect((await moq({}, member)).status).toBe(401);
    expect((await moq({}, { "x-test-organiser": "admin", "x-test-gb-session": "GB2" })).status).toBe(403);
    expect((await moq({ targetKits: 0 })).status).toBe(400);
    expect((await moq({ targetKits: 0.25 })).status).toBe(400);
    expect(data.tables.config).toEqual([]);
    expect((await moq({}, { "x-test-admin": "yes" }, "/admin/group-buys/GB1")).status).toBe(200);
  });
  it("counts paid/unpaid half kits from active orders only, scoped to this group buy", async () => {
    const fixtures = [
      ["paid", "Submitted", "confirmed", null, "GB1", 60, false],
      ["unpaid", "Submitted", "unpaid", null, "GB1", 5.5, false],
      ["shipped", "Shipped", "test_confirmed", null, "GB1", 1, false],
      ["cancelled", "Cancelled", "confirmed", null, "GB1", 90, false],
      ["refunded", "Submitted", "refunded", null, "GB1", 90, false],
      ["deleted", "Submitted", "unpaid", "2026-01-01", "GB1", 90, false],
      ["draft", "draft", "unpaid", null, "GB1", 90, false],
      ["other", "Submitted", "confirmed", null, "GB2", 90, false],
      ["oos", "Submitted", "confirmed", null, "GB1", 90, true],
    ];
    for (const [id, status, paymentStatus, deletedAt, groupBuyId, quantity, isOos] of fixtures) {
      data.tables.orders.push({ id, status, paymentStatus, deletedAt, groupBuyId });
      data.tables.items.push({ orderId: id, quantity, isOos });
    }
    const unchanged = structuredClone(data.tables.orders);
    const response = await moq();
    expect(response.status).toBe(200);
    const detail = await getBody<Detail>(response);
    expect(detail.moq).toMatchObject({ enabled: true, orderedKits: 66.5, targetKits: 100, remainingKits: 33.5, met: false });
    expect(data.tables.orders).toEqual(unchanged);
    const loaded = await getBody<Detail>(await request(`${management}/updates`, { headers: manager }));
    expect(loaded.moq).toEqual(detail.moq);
    data.tables.items[0].quantity = 100;
    const updated = await getBody<Detail>(await request(`${management}/updates`, { headers: manager }));
    expect(updated.moq).toMatchObject({ orderedKits: 106.5, remainingKits: 0, met: true });
  });
  it("keeps MOQ private until member visibility is enabled and removes it when disabled", async () => {
    const first = await getBody<Detail>(await moq());
    expect((await getBody<Detail>(await request("/group-buys/GB1/updates", { headers: member }))).moq).toBeNull();
    let summary = await getBody<{ progress: Record<string, { moq: unknown }> }>(
      await request("/group-buys/progress", { headers: member }));
    expect(summary.progress.GB1.moq).toBeNull();
    const publicConfig = await getBody<Detail>(await moq({ showToMembers: true, expectedUpdatedAt: first.moq!.updatedAt }));
    expect((await getBody<Detail>(await request("/group-buys/GB1/updates", { headers: member }))).moq).toMatchObject({ targetKits: 100, orderedKits: 0 });
    summary = await getBody(await request("/group-buys/progress", { headers: member }));
    expect(summary.progress.GB1.moq).toMatchObject({ targetKits: 100 });
    await moq({ enabled: false, showToMembers: true, expectedUpdatedAt: publicConfig.moq!.updatedAt });
    expect((await getBody<Detail>(await request("/group-buys/GB1/updates", { headers: member }))).moq).toBeNull();
    expect((await request("/group-buys/GB1/updates", { headers: { "x-test-member": "blocked" } })).status).toBe(403);
  });
  it("serializes concurrent MOQ saves and rejects stale changes without modifying payments", async () => {
    const before = structuredClone(data.tables.orders);
    const responses = await Promise.all([moq({ targetKits: 100 }), moq({ targetKits: 200 })]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    expect(data.tables.orders).toEqual(before);
    expect(data.tables.config.filter(row => row.key === "gb_moq:GB1")).toHaveLength(1);
  });
  it("persists product-only targets and modes, includes zero-order products, and isolates other groups", async () => {
    data.tables.catalogue = [
      { groupBuyId: "GB1", productId: "hgh36" }, { groupBuyId: "GB1", productId: "hgh24" },
      { groupBuyId: "GB2", productId: "other" },
    ];
    data.tables.products = [
      { id: "hgh36", name: "HGH 36IU" }, { id: "hgh24", name: "HGH 24IU" }, { id: "other", name: "Private product" },
    ];
    const fixtures = [
      ["paid", "confirmed", 20, 0], ["unpaid", "unpaid", 10.5, 0],
      ["balance", "confirmed", 5, 1], ["test", "test_confirmed", 2, 0],
    ];
    for (const [id, paymentStatus, quantity, amountDue] of fixtures) {
      data.tables.orders.push({ id, paymentStatus, amountDue, groupBuyId: "GB1", status: "Submitted", deletedAt: null });
      data.tables.items.push({ orderId: id, productId: "hgh36", productName: "HGH 36IU", quantity, isOos: false });
    }
    const original = structuredClone(data.tables.orders);
    const productTargets = [{ productId: "hgh36", targetKits: 30 }, { productId: "hgh24", targetKits: 50 }];
    const savedResponse = await moq({ targetKits: null, showToMembers: true, countMode: "both", productTargets });
    expect(savedResponse.status).toBe(200);
    const saved = await getBody<Detail>(savedResponse);
    expect(saved.moq).toMatchObject({ countMode: "both", productTargets, targetKits: null, orderedKits: 37.5, paidKits: 20 });
    expect(saved.moq!.products).toEqual(expect.arrayContaining([
      { productId: "hgh36", name: "HGH 36IU", targetKits: 30, orderedKits: 37.5, paidKits: 20 },
      { productId: "hgh24", name: "HGH 24IU", targetKits: 50, orderedKits: 0, paidKits: 0 },
    ]));
    const memberView = await getBody<Detail>(await request("/group-buys/GB1/updates", { headers: member }));
    expect(memberView.moq).toEqual(saved.moq);
    expect(memberView.moq!.products).toHaveLength(2);
    const summary = await getBody<{ progress: Record<string, { moq: unknown }> }>(
      await request("/group-buys/progress", { headers: member }));
    expect(summary.progress.GB1.moq).toEqual(saved.moq);
    const changed = await getBody<Detail>(await moq({
      targetKits: null, showToMembers: true, countMode: "paid", productTargets,
      expectedUpdatedAt: saved.moq!.updatedAt,
    }));
    expect(changed.moq?.countMode).toBe("paid");
    expect((await moq({
      targetKits: null, productTargets: [{ productId: "other", targetKits: 50 }],
      expectedUpdatedAt: changed.moq!.updatedAt,
    })).status).toBe(400);
    expect(data.tables.orders).toEqual(original);
    const reloaded = await getBody<Detail>(await request(`${management}/updates`, { headers: manager }));
    expect(reloaded.moq).toEqual(changed.moq);
  });
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
    expect(data.tables.config.filter(row => !String(row.key).startsWith("gb_update_delivery:"))).toHaveLength(2);
  });
  it("allows only one of two simultaneous stale stage changes to win", async () => {
    const results = await Promise.all([stage("ordered"), stage("in_transit")]);
    expect(results.map(response => response.status).sort()).toEqual([200, 409]);
    expect(data.tables.config.filter(row => !String(row.key).startsWith("gb_update_delivery:"))).toHaveLength(2);
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
    expect(data.tables.config.filter(row => !String(row.key).startsWith("gb_update_delivery:"))).toHaveLength(1);
  });
});

describe("private Telegram group-buy updates", () => {
  const jobs = () => data.tables.config.filter(row => String(row.key).startsWith("gb_update_delivery:"));
  it("lets organisers and Admin publish on the website without sending alerts", async () => {
    await save(undefined, true, false, management, manager, false);
    await save(undefined, true, false, "/admin/group-buys/GB2", { "x-test-admin": "yes" }, false);
    await stage("ordered", null, manager, "GB1", false);
    const response = await request("/admin/group-buys/GB2/progress", {
      method: "PUT", headers: { "x-test-admin": "yes", "content-type": "application/json" },
      body: JSON.stringify({ stage: "ordered", expectedUpdatedAt: null, sendTelegramAlert: false }),
    });
    expect(response.status).toBe(200);
    expect(jobs()).toHaveLength(0);
    await drainGroupBuyUpdateNotifications();
    expect(data.notify).not.toHaveBeenCalled();
  });
  it("defaults missing alert choices to off and rejects invalid choices", async () => {
    const body = new FormData();
    body.set("note", "Website only"); body.set("published", "true");
    expect((await request(`${management}/updates`, { method: "POST", headers: manager, body })).status).toBe(201);
    const opts = { method: "PUT", headers: { ...manager, "content-type": "application/json" } };
    expect((await request(`${management}/progress`, {
      ...opts, body: JSON.stringify({ stage: "ordered", expectedUpdatedAt: null }),
    })).status).toBe(200);
    expect(jobs()).toHaveLength(0);
    body.set("sendTelegramAlert", "maybe");
    expect((await request(`${management}/updates`, { method: "POST", headers: manager, body })).status).toBe(400);
    expect((await request(`${management}/progress`, {
      ...opts, body: JSON.stringify({ stage: "in_transit", expectedUpdatedAt: null, sendTelegramAlert: "maybe" }),
    })).status).toBe(400);
  });
  it("allows a previously silent published post to be announced once, then remembers that choice", async () => {
    const { update } = await getBody<{ update: Update }>(await save(undefined, true, false, management, manager, false));
    expect(update.telegramAlertQueued).not.toBe(true);
    const alerted = await getBody<{ update: Update }>(await save(update.id, true));
    expect(alerted.update.telegramAlertQueued).toBe(true);
    expect(jobs()).toHaveLength(1);
    await drainGroupBuyUpdateNotifications();
    await save(update.id, true);
    await drainGroupBuyUpdateNotifications();
    expect(data.notify).toHaveBeenCalledTimes(2);
  });
  it("accepts the alert flag together with all five image-removal form fields", async () => {
    const { update } = await getBody<{ update: Update }>(await save(undefined, false, true));
    const body = new FormData();
    body.set("title", "Changed"); body.set("note", "No image now."); body.set("published", "true");
    body.set("removeImage", "true"); body.set("sendTelegramAlert", "true");
    const response = await request(`${management}/updates/${update.id}`, { method: "PUT", headers: manager, body });
    expect(response.status).toBe(200);
    expect((await getBody<{ update: Update }>(response)).update).toMatchObject({ imageUrl: null, telegramAlertQueued: true });
    expect(jobs()).toHaveLength(1);
  });
  it("queues only published notes and announces the first publication once, not every edit", async () => {
    const { update } = await getBody<{ update: Update }>(await save(undefined, false));
    expect(jobs()).toHaveLength(0);
    await save(update.id, true);
    expect(jobs()).toHaveLength(1);
    expect(data.notify).not.toHaveBeenCalled(); // Delivery happens after commit, in the worker.
    await drainGroupBuyUpdateNotifications();
    expect(data.notify.mock.calls.map(call => call[0]).sort()).toEqual(["historical", "member"]);
    expect(data.notify.mock.calls[0][1]).toBe("status");
    expect(data.notify.mock.calls[0][2]).toContain("Vendor sent the parcel.");
    expect(data.notify.mock.calls[0][2]).toContain("/order?gbId=GB1#group-buy-updates");
    await save(update.id, true);
    await save(update.id, false);
    await save(update.id, true);
    await drainGroupBuyUpdateNotifications();
    expect(data.notify).toHaveBeenCalledTimes(2);
  });
  it("deduplicates repeated orders and membership, excludes blocked and other-group users", async () => {
    data.tables.orders.push(
      { groupBuyId: "GB1", telegramUsername: "@MEMBER", deletedAt: null },
      { groupBuyId: "GB1", telegramUsername: "member", deletedAt: null },
      { groupBuyId: "GB1", telegramUsername: "removed", deletedAt: "2026-01-01" },
      { groupBuyId: "GB2", telegramUsername: "outsider", deletedAt: null },
    );
    await stage("ordered");
    await drainGroupBuyUpdateNotifications();
    expect(data.notify.mock.calls.map(call => call[0]).sort()).toEqual(["historical", "member"]);
    expect(data.notify.mock.calls[0][2]).toContain("Ordered from vendor");
  });
  it("does not queue unchanged stages or failed transactions", async () => {
    const first = await getBody<Detail>(await stage("ordered"));
    await stage("ordered", first.stageUpdatedAt);
    expect(jobs()).toHaveLength(1);
    data.tables.config = []; data.insertCount = 0; data.failInsertAt = 3;
    expect((await stage("ordered")).status).toBe(500);
    expect(data.tables.config).toEqual([]);
  });
  it("retries transient failures but not successfully delivered or intentionally skipped recipients", async () => {
    await save();
    data.notify.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: false, skipped: true });
    await drainGroupBuyUpdateNotifications(undefined, 1_800_000_000_000);
    expect(data.notify).toHaveBeenCalledTimes(2);
    await drainGroupBuyUpdateNotifications(undefined, 1_800_000_000_001);
    expect(data.notify).toHaveBeenCalledTimes(2);
    await drainGroupBuyUpdateNotifications(undefined, 1_800_000_120_000);
    expect(data.notify).toHaveBeenCalledTimes(3);
    await drainGroupBuyUpdateNotifications(undefined, 1_800_000_240_000);
    expect(data.notify).toHaveBeenCalledTimes(3);
  });
  it("does not deliver unpublished/deleted updates or messages to newly blocked members", async () => {
    const { update } = await getBody<{ update: Update }>(await save());
    await save(update.id, false);
    await drainGroupBuyUpdateNotifications();
    expect(data.notify).not.toHaveBeenCalled();
    const next = await getBody<{ update: Update }>(await save());
    await request(`${management}/updates/${next.update.id}`, { method: "DELETE", headers: manager });
    await drainGroupBuyUpdateNotifications();
    expect(data.notify).not.toHaveBeenCalled();
    await save();
    data.tables.groups[0].blockedAccounts = ["blocked", "member"];
    await drainGroupBuyUpdateNotifications();
    expect(data.notify.mock.calls.map(call => call[0])).toEqual(["historical"]);
  });
  it("leases each job so concurrent workers do not send it twice", async () => {
    await save();
    await Promise.all([drainGroupBuyUpdateNotifications(), drainGroupBuyUpdateNotifications()]);
    expect(data.notify).toHaveBeenCalledTimes(2);
  });
  it("includes an authenticated page link for the image without exposing the storage object", async () => {
    await save(undefined, true, true);
    await drainGroupBuyUpdateNotifications();
    const text = data.notify.mock.calls[0][2] as string;
    expect(text).toContain("View full update and image");
    expect(text).not.toContain(".webp");
    expect(text).not.toContain("/api/organiser");
  });
  it("resumes an expired worker lease without losing the pending announcement", async () => {
    await save();
    const job = jobs()[0];
    const marker = JSON.parse(String(job.value));
    job.value = JSON.stringify({ ...marker, availableAt: 1_800_000_120_000, lease: "old-worker" });
    await drainGroupBuyUpdateNotifications(undefined, 1_800_000_000_000);
    expect(data.notify).not.toHaveBeenCalled();
    await drainGroupBuyUpdateNotifications(undefined, 1_800_000_120_001);
    expect(data.notify).toHaveBeenCalledTimes(2);
  });
  it("HTML-escapes user content and keeps long announcements within Telegram's message limit", async () => {
    const body = new FormData();
    body.set("title", "<b>Price & stock</b>");
    body.set("note", "<script>&".repeat(550)); body.set("published", "true");
    body.set("sendTelegramAlert", "true");
    expect((await request(`${management}/updates`, { method: "POST", headers: manager, body })).status).toBe(201);
    await drainGroupBuyUpdateNotifications();
    const text = data.notify.mock.calls[0][2] as string;
    expect(text).toContain("&lt;b&gt;Price &amp; stock&lt;/b&gt;");
    expect(text).not.toContain("<script>");
    expect(text.length).toBeLessThanOrEqual(4096);
  });
});
