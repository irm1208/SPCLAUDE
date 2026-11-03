import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

describe.skipIf(process.env.ORDER_REVISION_DB_TESTS !== "1")("own-stock revisions database workflow", () => {
  let store: typeof import("@workspace/db");
  let service: typeof import("./group-buy-order-revisions");
  beforeAll(async () => { store = await import("@workspace/db"); service = await import("./group-buy-order-revisions"); });
  async function fixture(run: (f: any) => Promise<void>) {
    const rollback = new Error("test rollback");
    try {
      await store.db.transaction(async tx => {
        const groupId = randomUUID(), otherGroup = randomUUID(), orderId = randomUUID();
        const own = randomUUID(), catalogue = randomUUID(), ownLine = randomUUID(), otherLine = randomUUID();
        const actor = { username: `revision-org-${randomUUID()}` }, member = `revision-member-${randomUUID()}`;
        await tx.insert(store.groupBuysTable).values([
          { id: groupId, name: "Synthetic revisions test", organiserId: actor.username, currency: "USD" },
          { id: otherGroup, name: "Synthetic other group", organiserId: actor.username, currency: "USD" },
        ]);
        await tx.insert(store.productsTable).values([
          { id: own, name: "Own product", vendor: "Synthetic", price: "50", organiserId: actor.username },
          { id: catalogue, name: "Shared product", vendor: "Synthetic", price: "20" },
        ]);
        await tx.insert(store.groupBuyProductsTable).values([
          { id: randomUUID(), groupBuyId: groupId, productId: own },
          { id: randomUUID(), groupBuyId: groupId, productId: catalogue },
          { id: randomUUID(), groupBuyId: otherGroup, productId: own },
        ]);
        await tx.insert(store.ordersTable).values({ id: orderId, code: "SYNTHETIC-REVISION",
          telegramUsername: `@${member}`, deliveryMethod: "Synthetic delivery", deliveryPrice: "8",
          vendorShipping: "4", tip: "1", groupBuyId: groupId, productSubtotal: "120",
          grandTotal: "128", creditsApplied: 2, couponDiscount: "5", paymentStatus: "unpaid" });
        await tx.insert(store.orderLineItemsTable).values([
          { id: ownLine, orderId, productId: own, productName: "Own product", quantity: "2", unitPrice: "50", lineTotal: "100" },
          { id: otherLine, orderId, productId: catalogue, productName: "Shared product", quantity: "1", unitPrice: "20", lineTotal: "20" },
        ]);
        const input = { message: "Supplier stock and pricing correction", changes: [{ orderId, items: [
          { id: ownLine, quantity: 1, unitPrice: 70 }, { id: otherLine, quantity: 1, unitPrice: 20 },
        ] }] };
        const f = { tx, groupId, otherGroup, orderId, own, ownLine, otherLine, actor, member, input,
          create: async () => {
            await service.setRevisionEnabled(groupId, actor, true, tx);
            return service.createOrderRevisions(groupId, actor, input, tx);
          },
          order: async () => (await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, orderId)))[0],
        };
        await run(f);
        throw rollback;
      });
    } catch (e) { if (e !== rollback) throw e; }
  }
  it("is disabled by default and cannot send before being enabled", async () => fixture(async f => {
    expect((await service.organiserRevisionList(f.groupId, f.actor, f.tx)).enabled).toBe(false);
    await expect(service.createOrderRevisions(f.groupId, f.actor, f.input, f.tx)).rejects.toThrow("Enable");
    expect((await f.order()).grandTotal).toBe("128.00");
  }));
  it("proposes without writing orders, exposes only the member's pending link", async () => fixture(async f => {
    const result = await f.create();
    expect(result.created).toBe(1);
    expect((await f.order()).grandTotal).toBe("128.00");
    expect((await service.memberPendingRevisions(f.member, f.tx)).orderIds).toEqual([f.orderId]);
    expect((await service.memberPendingRevisions("somebody-else", f.tx)).orderIds).toEqual([]);
    const view = await service.memberOrderRevisions(f.orderId, f.member, f.tx);
    expect(view.requests[0].proposal.grandTotal).toBe(98);
    expect(view.requests[0].before.grandTotal).toBe(128);
  }));
  it("accepts once and preserves shipping, tips, discounts, credits and catalogue prices", async () => fixture(async f => {
    const result = await f.create(), id = result.notifications[0].id;
    await f.tx.update(store.ordersTable).set({ paymentUsdAmount: "128", paymentCryptoCurrency: "USDC",
      paymentCryptoRate: "1", paymentCryptoNetwork: "Ethereum" }).where(eq(store.ordersTable.id, f.orderId));
    expect(await service.decideOrderRevision(f.orderId, id, f.member, "accepted", f.tx)).toEqual({ status: "accepted" });
    const saved = await f.order();
    expect(saved).toMatchObject({ grandTotal: "98.00", productSubtotal: "90.00", deliveryPrice: "8.00",
      vendorShipping: "4.00", tip: "1.00", creditsApplied: 2, couponDiscount: "5.00",
      paymentUsdAmount: null, paymentCryptoCurrency: null, paymentCryptoRate: null, paymentCryptoNetwork: null });
    expect((await f.tx.select().from(store.productsTable).where(eq(store.productsTable.id, f.own)))[0].price).toBe("50.00");
    expect(await service.decideOrderRevision(f.orderId, id, f.member, "accepted", f.tx)).toEqual({ status: "accepted" });
    expect((await f.order()).grandTotal).toBe("98.00");
  }));
  it("declines without changing order and cannot subsequently accept", async () => fixture(async f => {
    const id = (await f.create()).notifications[0].id;
    await service.decideOrderRevision(f.orderId, id, f.member, "declined", f.tx);
    expect((await f.order()).grandTotal).toBe("128.00");
    await expect(service.decideOrderRevision(f.orderId, id, f.member, "accepted", f.tx)).rejects.toThrow("answered");
  }));
  it("rechecks paid and in-progress payments at acceptance", async () => fixture(async f => {
    const id = (await f.create()).notifications[0].id;
    for (const patch of [{ paymentStatus: "confirmed" }, { paymentStatus: "pending_confirmation" },
      { paymentStatus: "unpaid", paymentTxHash: "anonpay:synthetic" }]) {
      await f.tx.update(store.ordersTable).set(patch).where(eq(store.ordersTable.id, f.orderId));
      await expect(service.decideOrderRevision(f.orderId, id, f.member, "accepted", f.tx)).rejects.toThrow("unpaid");
      expect((await f.order()).grandTotal).toBe("128.00");
    }
  }));
  it("rejects paid orders at proposal creation too", async () => fixture(async f => {
    await service.setRevisionEnabled(f.groupId, f.actor, true, f.tx);
    await f.tx.update(store.ordersTable).set({ paymentStatus: "confirmed" }).where(eq(store.ordersTable.id, f.orderId));
    await expect(service.createOrderRevisions(f.groupId, f.actor, f.input, f.tx)).rejects.toThrow("unpaid");
  }));
  it("protects ownership at organiser, member, group and item boundaries", async () => fixture(async f => {
    await expect(service.organiserRevisionList(f.groupId, { username: "another-organiser" }, f.tx)).rejects.toThrow("not found");
    await expect(service.setRevisionEnabled(f.groupId, { username: "another-organiser" }, true, f.tx)).rejects.toThrow("not found");
    const id = (await f.create()).notifications[0].id;
    await expect(service.memberOrderRevisions(f.orderId, "somebody-else", f.tx)).rejects.toThrow("not found");
    await expect(service.decideOrderRevision(f.orderId, id, "somebody-else", "accepted", f.tx)).rejects.toThrow("not found");
    await service.setRevisionEnabled(f.otherGroup, f.actor, true, f.tx);
    await expect(service.createOrderRevisions(f.otherGroup, f.actor, f.input, f.tx)).rejects.toThrow("not in this group");
    const bad = structuredClone(f.input); bad.changes[0].items[1].unitPrice = 1;
    await expect(service.createOrderRevisions(f.groupId, f.actor, bad, f.tx)).rejects.toThrow("Only products");
    expect((await f.order()).grandTotal).toBe("128.00");
  }));
  it("invalidates stale financial snapshots and withdraws superseded proposals", async () => fixture(async f => {
    const id = (await f.create()).notifications[0].id;
    await f.tx.update(store.ordersTable).set({ vendorShipping: "5", grandTotal: "129" }).where(eq(store.ordersTable.id, f.orderId));
    expect((await service.decideOrderRevision(f.orderId, id, f.member, "accepted", f.tx)).status).toBe("stale");
    expect((await f.order()).grandTotal).toBe("129.00");
    const next = await service.createOrderRevisions(f.groupId, f.actor, f.input, f.tx);
    const last = await service.createOrderRevisions(f.groupId, f.actor, { ...f.input, message: "Replacement request" }, f.tx);
    expect(next.notifications[0].id).not.toBe(last.notifications[0].id);
    const view = await service.memberOrderRevisions(f.orderId, f.member, f.tx);
    expect(view.requests.filter((r: any) => r.status === "pending")).toHaveLength(1);
    expect(view.requests.some((r: any) => r.status === "withdrawn")).toBe(true);
  }));
  it("pauses acceptance when disabled but still allows decline", async () => fixture(async f => {
    const id = (await f.create()).notifications[0].id;
    await service.setRevisionEnabled(f.groupId, f.actor, false, f.tx);
    await expect(service.decideOrderRevision(f.orderId, id, f.member, "accepted", f.tx)).rejects.toThrow("paused");
    expect((await service.decideOrderRevision(f.orderId, id, f.member, "declined", f.tx)).status).toBe("declined");
  }));
  it("does not expose controls for groups without organiser-added stock", async () => fixture(async f => {
    await f.tx.update(store.productsTable).set({ organiserId: null }).where(eq(store.productsTable.id, f.own));
    expect((await service.organiserRevisionList(f.groupId, f.actor, f.tx)).eligible).toBe(false);
    await expect(service.setRevisionEnabled(f.groupId, f.actor, true, f.tx)).rejects.toThrow("organiser-added");
  }));
  it("rolls back all proposals if any selected order is invalid", async () => fixture(async f => {
    await service.setRevisionEnabled(f.groupId, f.actor, true, f.tx);
    await expect(service.createOrderRevisions(f.groupId, f.actor, { ...f.input, changes: [
      f.input.changes[0], { orderId: "zz-missing-order", items: [] },
    ] }, f.tx)).rejects.toThrow("not found");
    expect((await service.organiserRevisionList(f.groupId, f.actor, f.tx)).requests).toHaveLength(0);
  }));
});
