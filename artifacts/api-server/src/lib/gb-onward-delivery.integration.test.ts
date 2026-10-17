import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { suppliedEuMatrix } from "./gb-onward-delivery-rules";

describe.skipIf(process.env.ONWARD_DELIVERY_DB_TESTS !== "1")("onward-delivery PostgreSQL persistence and isolation", () => {
  beforeAll(async () => { await import("@workspace/db"); await import("./gb-onward-delivery"); }, 30_000);
  async function fixture(run: (store: any, api: any, data: any, tx: any) => Promise<void>) {
    const store = await import("@workspace/db");
    const api = await import("./gb-onward-delivery");
    const rollback = new Error("rollback synthetic onward-delivery fixtures");
    await expect(store.db.transaction(async tx => {
      const id = randomUUID(), orderId = randomUUID(), productId = randomUUID();
      const owner = `onward-owner-${id}`, member = `onward-member-${id}`, resh = `onward-resh-${id}`, other = `onward-other-${id}`;
      for (const username of [owner, member, resh, other]) {
        await tx.insert(store.accountsTable).values({ telegramUsername: username, country: "AT", organiserStatus: username === owner ? "approved" : null });
      }
      await tx.insert(store.groupBuysTable).values({ id, name: "Synthetic onward estimate", organiserId: owner, currency: "USD" });
      await tx.insert(store.accountGroupBuysTable).values({ id: randomUUID(), accountId: member, groupBuyId: id });
      await tx.insert(store.gbReshippersTable).values({ id: randomUUID(), gbId: id, reshipperUsername: resh, country: "AT", enabled: true });
      await tx.insert(store.productsTable).values({ id: productId, name: "Synthetic kit", price: "20" });
      await tx.insert(store.ordersTable).values({
        id: orderId, code: "test-onward", telegramUsername: member, groupBuyId: id, reshipperUsername: resh, shippingCountry: "AT",
        deliveryMethod: "Existing delivery", deliveryPrice: "3", vendorShipping: "9", productSubtotal: "100", grandTotal: "112",
        paymentStatus: "confirmed", paymentUsdAmount: "112",
      });
      await tx.insert(store.orderLineItemsTable).values({ id: randomUUID(), orderId, productId, productName: "Synthetic kit", quantity: "5", unitPrice: "20", lineTotal: "100" });
      // Route all service reads and service transactions into this rollback-only fixture.
      const select = vi.spyOn(store.db, "select").mockImplementation((...args: any[]) => (tx.select as any)(...args));
      const transaction = vi.spyOn(store.db, "transaction").mockImplementation((fn: any) => fn(tx));
      try { await run(store, api, { id, orderId, productId, owner, member, resh, other }, tx); }
      finally { select.mockRestore(); transaction.mockRestore(); }
      throw rollback;
    })).rejects.toBe(rollback);
  }
  it("persists matrix and member choice while keeping every payment amount unchanged", async () => {
    await fixture(async (store, api, f, tx) => {
      await api.saveOnwardMatrix(f.id, f.resh, { username: f.owner }, suppliedEuMatrix());
      const result = await api.changeOnwardChoice(f.orderId, { username: f.member }, "pickup");
      expect(result).toMatchObject({ status: "available", selectedMethod: "pickup", currency: "USD", kits: 5, reshipperUsername: f.resh });
      expect(result.options).toEqual([{ method: "pickup", amount: 17.3 }, { method: "home", amount: 19.6 }]);
      expect(await api.onwardOrderEstimate(f.orderId, { username: f.member }, "member")).toMatchObject({ selectedMethod: "pickup" });
      expect(await api.getOnwardOrderPreference(f.orderId)).toBe("pickup");
      const [order] = await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, f.orderId));
      expect(order).toMatchObject({ productSubtotal: "100.00", grandTotal: "112.00", deliveryPrice: "3.00", vendorShipping: "9.00", paymentStatus: "confirmed", paymentUsdAmount: "112.00" });
    });
  });
  it("recalculates using current quantity and country and never copies rates between reshippers", async () => {
    await fixture(async (store, api, f, tx) => {
      await api.saveOnwardMatrix(f.id, f.resh, { username: f.owner }, suppliedEuMatrix());
      await api.saveOnwardOrderPreference(tx, f.orderId, "pickup");
      await tx.update(store.orderLineItemsTable).set({ quantity: "5.5" }).where(eq(store.orderLineItemsTable.orderId, f.orderId));
      expect((await api.onwardOrderEstimate(f.orderId, { username: f.member }, "member")).options[0].amount).toBe(23);
      await tx.update(store.ordersTable).set({ shippingCountry: "HR" }).where(eq(store.ordersTable.id, f.orderId));
      expect((await api.onwardOrderEstimate(f.orderId, { username: f.member }, "member")).options).toEqual([{ method: "home", amount: 27.3 }]);
      await tx.insert(store.gbReshippersTable).values({ id: randomUUID(), gbId: f.id, reshipperUsername: f.other, country: "HR" });
      await tx.update(store.ordersTable).set({ reshipperUsername: f.other }).where(eq(store.ordersTable.id, f.orderId));
      expect(await api.onwardOrderEstimate(f.orderId, { username: f.member }, "member")).toMatchObject({ status: "unavailable", options: [] });
      await expect(api.onwardOrderEstimate(f.orderId, { username: f.resh }, "reshipper", f.id)).rejects.toMatchObject({ status: 403 });
    });
  });
  it("enforces owner, member, group and reshipper boundaries on real rows", async () => {
    await fixture(async (_store, api, f) => {
      await expect(api.saveOnwardMatrix(f.id, f.resh, { username: f.other }, suppliedEuMatrix())).rejects.toMatchObject({ status: 403 });
      await expect(api.saveOnwardMatrix(f.id, f.other, { username: f.owner }, suppliedEuMatrix())).rejects.toMatchObject({ status: 404 });
      await expect(api.onwardOrderEstimate(f.orderId, { username: f.other }, "member")).rejects.toMatchObject({ status: 403 });
      await expect(api.onwardOrderEstimate(f.orderId, { username: "admin", admin: true }, "admin", "other-group")).rejects.toMatchObject({ status: 404 });
      await expect(api.onwardSettings(f.id, { username: "admin", admin: true, adminGbId: "other-group" })).rejects.toMatchObject({ status: 403 });
      await expect(api.memberOnwardPreview(f.id, { username: f.other }, { kits: 1, country: "AT" })).rejects.toMatchObject({ status: 403 });
      expect(await api.onwardOrderEstimate(f.orderId, { username: f.resh }, "reshipper", f.id)).toMatchObject({ reshipperUsername: f.resh });
    });
  });
  it("uses stable assignment identity across a reshipper username change", async () => {
    await fixture(async (store, api, f, tx) => {
      await api.saveOnwardMatrix(f.id, f.resh, { username: f.owner }, suppliedEuMatrix());
      const renamed = `${f.resh}-new`;
      await tx.update(store.accountsTable).set({ telegramUsername: renamed }).where(eq(store.accountsTable.telegramUsername, f.resh));
      const settings = await api.onwardSettings(f.id, { username: f.owner });
      expect(settings.reshippers[0]).toMatchObject({ username: renamed, matrix: suppliedEuMatrix() });
    });
  });
  it("rejects dispatched changes and supports disabling without changing totals", async () => {
    await fixture(async (store, api, f, tx) => {
      await api.saveOnwardMatrix(f.id, f.resh, { username: f.owner }, suppliedEuMatrix());
      await api.changeOnwardChoice(f.orderId, { username: f.member }, "home");
      await tx.update(store.ordersTable).set({ status: "Shipped" }).where(eq(store.ordersTable.id, f.orderId));
      await expect(api.changeOnwardChoice(f.orderId, { username: f.member }, "pickup")).rejects.toMatchObject({ status: 409 });
      await api.saveOnwardMatrix(f.id, f.resh, { username: f.owner }, { ...suppliedEuMatrix(), enabled: false });
      expect(await api.onwardOrderEstimate(f.orderId, { username: f.member }, "member")).toMatchObject({ status: "unavailable", configured: false, options: [], selectedMethod: "home" });
    });
  });
  it("uses actual assignment for an edit preview and never guesses among multiple reshippers", async () => {
    await fixture(async (store, api, f, tx) => {
      await api.saveOnwardMatrix(f.id, f.resh, { username: f.owner }, suppliedEuMatrix());
      expect((await api.memberOnwardPreview(f.id, { username: f.member }, { kits: 1, country: "AT" })).options[0].amount).toBe(17.3);
      await tx.insert(store.gbReshippersTable).values({ id: randomUUID(), gbId: f.id, reshipperUsername: f.other, country: "AT" });
      expect(await api.memberOnwardPreview(f.id, { username: f.member }, { kits: 1, country: "AT" })).toMatchObject({ status: "unassigned", options: [] });
      expect(await api.memberOnwardPreview(f.id, { username: f.member }, { kits: 1, country: "AT", orderId: f.orderId })).toMatchObject({ status: "available", reshipperUsername: f.resh });
      expect(await api.memberOnwardPreview(f.id, { username: f.member }, { kits: 1, country: "AT", directShippingRequested: true })).toMatchObject({ status: "not_applicable" });
    });
  });
});
