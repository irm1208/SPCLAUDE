import { randomUUID } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { suppliedEuMatrix } from "./gb-onward-delivery-rules";

const chain = vi.hoisted(() => ({ verify: vi.fn(), time: vi.fn() }));
vi.mock("./payment-verify", async importOriginal => ({ ...await importOriginal<typeof import("./payment-verify")>(), verifyTransaction: chain.verify }));
vi.mock("./gb-onward-chain-time", () => ({ onwardTransactionTime: chain.time }));
vi.mock("./crypto-pricing", async importOriginal => ({
  ...await importOriginal<typeof import("./crypto-pricing")>(),
  fetchFiatToUsd: vi.fn(async () => 1), fetchUsdPerCoin: vi.fn(async () => 1),
}));
vi.mock("./audit-log", () => ({ writeLog: vi.fn(async () => {}) }));
vi.mock("./telegram", () => ({ notifyUser: vi.fn(async () => {}), notifyUserFromTemplate: vi.fn(async () => {}), sendAdminFromTemplate: vi.fn(async () => {}) }));
const wallet = { enabled: true, confirmationMode: "manual", currency: "USDT", network: "Ethereum", walletAddress: `0x${"a".repeat(40)}` };
const hash = `0x${"b".repeat(64)}`;
const newBody = () => ({ idempotencyKey: randomUUID(), amount: 17.3, currency: "USD", method: "pickup" });

describe.skipIf(process.env.ONWARD_PAYMENT_DB_TESTS !== "1")("onward-payment transactional persistence", () => {
  beforeEach(() => {
    chain.verify.mockReset(); chain.time.mockReset();
    chain.verify.mockResolvedValue({ verified: true, amountUsdt: 17.3, blockConfirmations: 6 });
    chain.time.mockImplementation(async () => Date.now());
  });
  async function fixture(run: (store: any, api: any, f: any, tx: any) => Promise<void>) {
    const store = await import("@workspace/db");
    const api = await import("./gb-onward-payments");
    const estimates = await import("./gb-onward-delivery");
    const rollback = new Error("rollback synthetic onward-payment fixtures");
    await expect(store.db.transaction(async tx => {
      const id = randomUUID(), orderId = randomUUID(), productId = randomUUID(), assignmentId = randomUUID();
      const owner = `onward-owner-${id}`, member = `onward-member-${id}`, resh = `onward-resh-${id}`, other = `onward-other-${id}`;
      for (const username of [owner, member, resh, other]) {
        await tx.insert(store.accountsTable).values({ telegramUsername: username, country: "AT", organiserStatus: username === owner ? "approved" : null });
      }
      await tx.insert(store.groupBuysTable).values({ id, name: "Synthetic closed onward payment", organiserId: owner, currency: "USD", status: "closed" });
      await tx.insert(store.accountGroupBuysTable).values({ id: randomUUID(), accountId: member, groupBuyId: id });
      await tx.insert(store.gbReshippersTable).values({ id: assignmentId, gbId: id, reshipperUsername: resh, country: "AT", enabled: true,
        enabledPaymentMethods: { cryptoEnabled: true },
        reshipperPaymentDetails: { cryptoWalletAddress: `0x${"c".repeat(40)}`, cryptoCurrency: "USDT", cryptoNetwork: "Ethereum" } });
      await tx.insert(store.productsTable).values({ id: productId, name: "Synthetic kit", price: "20" });
      await tx.insert(store.ordersTable).values({
        id: orderId, code: `test-onward-${id}`, telegramUsername: member, groupBuyId: id, reshipperUsername: resh, shippingCountry: "AT",
        shippingName: "Synthetic Member", shippingAddress: "1 Example Road, Vienna 1010", shippingPhone: "+43 123456789", shippingEmail: "member@example.test",
        deliveryMethod: "Existing delivery", deliveryPrice: "3", vendorShipping: "9", productSubtotal: "100", grandTotal: "112",
        paymentStatus: "confirmed", paymentUsdAmount: "112",
      });
      await tx.insert(store.orderLineItemsTable).values({ id: randomUUID(), orderId, productId, productName: "Synthetic kit",
        quantity: "5", unitPrice: "20", lineTotal: "100" });
      const select = vi.spyOn(store.db, "select").mockImplementation((...args: any[]) => (tx.select as any)(...args));
      const insert = vi.spyOn(store.db, "insert").mockImplementation((...args: any[]) => (tx.insert as any)(...args));
      const transaction = vi.spyOn(store.db, "transaction").mockImplementation((fn: any) => fn(tx));
      try {
        await estimates.saveOnwardMatrix(id, resh, { username: owner }, suppliedEuMatrix());
        await api.saveOnwardPaymentSettings(id, { username: resh }, wallet);
        await run(store, api, { id, orderId, productId, assignmentId, owner, member, resh, other }, tx);
      } finally { select.mockRestore(); insert.mockRestore(); transaction.mockRestore(); }
      throw rollback;
    })).rejects.toBe(rollback);
  }
  it("shows request guidance only for an eligible configured order, including closed paid group buys", async () => {
    await fixture(async (store, api, f, tx) => {
      expect(await api.readOnwardPayment(f.orderId, { username: f.member }, "member"))
        .toMatchObject({ request: null, awaitingRequest: true });
      await tx.update(store.ordersTable).set({ directShippingRequested: true }).where(eq(store.ordersTable.id, f.orderId));
      expect(await api.readOnwardPayment(f.orderId, { username: f.member }, "member"))
        .toMatchObject({ request: null, awaitingRequest: false });
      await tx.update(store.ordersTable).set({ directShippingRequested: false, status: "Cancelled" }).where(eq(store.ordersTable.id, f.orderId));
      expect(await api.readOnwardPayment(f.orderId, { username: f.member }, "member"))
        .toMatchObject({ awaitingRequest: false });
      await tx.update(store.ordersTable).set({ status: "Submitted" }).where(eq(store.ordersTable.id, f.orderId));
      const estimates = await import("./gb-onward-delivery");
      await estimates.saveOnwardMatrix(f.id, f.resh, { username: f.owner }, { ...suppliedEuMatrix(), enabled: false });
      expect(await api.readOnwardPayment(f.orderId, { username: f.member }, "member"))
        .toMatchObject({ awaitingRequest: false });
    });
  });
  it("lets the member pay the current matrix rate immediately without a reshipper request", async () => {
    await fixture(async (store, api, f, tx) => {
      const before = (await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, f.orderId)))[0];
      expect((await api.readOnwardPayment(f.orderId, { username: f.member }, "member")).immediate.options).toHaveLength(2);
      await expect(api.startMemberOnwardPayment(f.orderId, { username: f.other }, { method: "pickup", idempotencyKey: randomUUID() })).rejects.toMatchObject({ status: 403 });
      const data = await api.startMemberOnwardPayment(f.orderId, { username: f.member }, {
        method: "pickup", amount: 0.01, walletAddress: "attacker", idempotencyKey: randomUUID(),
      });
      expect(data.request).toMatchObject({ amount: 17.3, currency: "USD", wallet: { walletAddress: wallet.walletAddress }, status: "unpaid" });
      expect((await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, f.orderId)))[0])
        .toMatchObject({ grandTotal: before.grandTotal, paymentStatus: "confirmed", paymentTxHash: before.paymentTxHash });
    });
  });
  it("requires complete contact details and an enabled wallet before immediate payment", async () => {
    await fixture(async (store, api, f, tx) => {
      await tx.update(store.ordersTable).set({ shippingEmail: null }).where(eq(store.ordersTable.id, f.orderId));
      await expect(api.startMemberOnwardPayment(f.orderId, { username: f.member }, { method: "pickup", idempotencyKey: randomUUID() }))
        .rejects.toThrow(/email/i);
      await api.saveOnwardPaymentSettings(f.id, { username: f.resh }, { ...wallet, enabled: false });
      await expect(api.startMemberOnwardPayment(f.orderId, { username: f.member }, {
        method: "pickup", shippingEmail: "member@example.test", idempotencyKey: randomUUID(),
      })).rejects.toMatchObject({ status: 409 });
      expect((await api.readOnwardPayment(f.orderId, { username: f.member }, "member")).request).toBeNull();
    });
  });
  it("rejects combining different wallets and confirms one verified matching transfer without changing totals", async () => {
    await fixture(async (store, api, f, tx) => {
      await tx.update(store.ordersTable).set({ paymentStatus: "unpaid", paymentUsdAmount: null }).where(eq(store.ordersTable.id, f.orderId));
      await tx.update(store.groupBuysTable).set({ paymentsEnabled: true }).where(eq(store.groupBuysTable.id, f.id));
      await tx.insert(store.siteConfigTable).values({ key: "paymentRoutingEnabled", value: "true" })
        .onConflictDoUpdate({ target: store.siteConfigTable.key, set: { value: "true" } });
      await api.createOnwardPayment(f.id, f.orderId, { username: f.resh }, newBody());
      let data = await api.readOnwardPayment(f.orderId, { username: f.member }, "member");
      await expect(api.quoteCombinedOnwardPayment(f.orderId, data.request.id, { username: f.member })).rejects.toThrow(/different wallets/i);
      await tx.update(store.gbReshippersTable).set({ reshipperPaymentDetails: {
        cryptoWalletAddress: wallet.walletAddress, cryptoCurrency: "USDT", cryptoNetwork: "Ethereum",
      } }).where(eq(store.gbReshippersTable.id, f.assignmentId));
      const { quote } = await api.quoteCombinedOnwardPayment(f.orderId, data.request.id, { username: f.member });
      expect(quote).toMatchObject({ productCryptoAmount: 112, deliveryCryptoAmount: 17.3, totalCryptoAmount: 129.3 });
      chain.verify.mockResolvedValue({ verified: true, amountUsdt: 129.3, blockConfirmations: 6 });
      data = await api.payCombinedOnward(f.orderId, data.request.id, { username: f.member }, { quoteId: quote.id, txHash: hash });
      expect(data).toMatchObject({ combinedVerified: true, request: { status: "pending_confirmation", combined: { verified: true } } });
      const [paid] = await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, f.orderId));
      expect(paid).toMatchObject({ paymentStatus: "confirmed", paymentTxHash: hash, grandTotal: "112.00" });
      expect(await api.reserveProductPaymentTransaction(hash, randomUUID())).toBe(false);
      await expect(api.manageOnwardPayment(f.id, f.orderId, data.request.id, { username: f.resh }, "reject", "reject"))
        .rejects.toThrow(/already verified/i);
      await api.manageOnwardPayment(f.id, f.orderId, data.request.id, { username: f.resh }, "confirm");
      expect((await api.payCombinedOnward(f.orderId, data.request.id, { username: f.member }, { quoteId: quote.id, txHash: hash })).combinedVerified).toBe(true);
    });
  });
  it("does not mark either payment paid for an underpaid combined transfer or an edited order", async () => {
    await fixture(async (store, api, f, tx) => {
      await tx.update(store.ordersTable).set({ paymentStatus: "unpaid", paymentUsdAmount: null }).where(eq(store.ordersTable.id, f.orderId));
      await tx.update(store.groupBuysTable).set({ paymentsEnabled: true, organiserPayments: {
        cryptoWalletAddress: wallet.walletAddress, cryptoCurrency: "USDT", cryptoNetwork: "Ethereum",
      } }).where(eq(store.groupBuysTable.id, f.id));
      await tx.update(store.gbReshippersTable).set({ reshipperPaymentDetails: {
        cryptoWalletAddress: wallet.walletAddress, cryptoCurrency: "USDT", cryptoNetwork: "Ethereum",
      } }).where(eq(store.gbReshippersTable.id, f.assignmentId));
      await tx.insert(store.siteConfigTable).values({ key: "paymentRoutingEnabled", value: "true" })
        .onConflictDoUpdate({ target: store.siteConfigTable.key, set: { value: "true" } });
      const data = await api.createOnwardPayment(f.id, f.orderId, { username: f.resh }, newBody());
      const { quote } = await api.quoteCombinedOnwardPayment(f.orderId, data.request.id, { username: f.member });
      chain.verify.mockResolvedValue({ verified: false, underpayment: true, amountPaid: 112, shortfall: 17.3 });
      await expect(api.payCombinedOnward(f.orderId, data.request.id, { username: f.member }, { quoteId: quote.id, txHash: hash }))
        .rejects.toThrow(/not verified yet/i);
      const [unpaid] = await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, f.orderId));
      expect(unpaid.paymentStatus).toBe("unpaid");
      expect((await api.readOnwardPayment(f.orderId, { username: f.member }, "member")).request.status).toBe("unpaid");
      await tx.update(store.ordersTable).set({ grandTotal: "150" }).where(eq(store.ordersTable.id, f.orderId));
      chain.verify.mockClear();
      await expect(api.payCombinedOnward(f.orderId, data.request.id, { username: f.member }, { quoteId: quote.id, txHash: hash }))
        .rejects.toThrow(/changed/i);
      expect(chain.verify).not.toHaveBeenCalled();
    });
  });
  it("creates a closed-GB charge, preserves the original order and snapshots a separate wallet", async () => {
    await fixture(async (store, api, f, tx) => {
      const [before] = await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, f.orderId));
      const body = newBody();
      const made = await api.createOnwardPayment(f.id, f.orderId, { username: f.resh }, body);
      expect(made).toMatchObject({ canManage: true, request: { amount: 17.3, cryptoAmount: 17.3, status: "unpaid", confirmationMode: "manual", wallet: { walletAddress: wallet.walletAddress } } });
      expect((await api.createOnwardPayment(f.id, f.orderId, { username: f.resh }, body)).request.id).toBe(made.request.id);
      await expect(api.createOnwardPayment(f.id, f.orderId, { username: f.resh }, newBody())).rejects.toMatchObject({ status: 409 });
      await api.saveOnwardPaymentSettings(f.id, { username: f.resh }, { ...wallet, walletAddress: `0x${"d".repeat(40)}`, confirmationMode: "automatic" });
      const afterSave = await api.readOnwardPayment(f.orderId, { username: f.member }, "member");
      expect(afterSave.request.wallet.walletAddress).toBe(wallet.walletAddress);
      expect(afterSave.request.confirmationMode).toBe("manual");
      expect((await api.listOnwardPayments(f.id, { username: f.resh })).orders[0]).toMatchObject({ canRequest: false, request: { id: made.request.id } });
      const pending = await api.submitOnwardPayment(f.orderId, made.request.id, { username: f.member }, hash);
      expect(pending.request.status).toBe("pending_confirmation"); expect(chain.verify).not.toHaveBeenCalled();
      const paid = await api.manageOnwardPayment(f.id, f.orderId, made.request.id, { username: f.resh }, "confirm");
      expect(paid.request).toMatchObject({ status: "paid", confirmedBy: f.resh });
      await expect(api.manageOnwardPayment(f.id, f.orderId, made.request.id, { username: f.resh }, "cancel")).rejects.toMatchObject({ status: 409 });
      expect((await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, f.orderId)))[0]).toEqual(before);
      expect(await api.hasOnwardPaymentTransaction(hash.toUpperCase())).toBe(true);
    });
  });
  it("allows only the owning organiser to manage a selected reshipper's charges and matrix", async () => {
    await fixture(async (store, api, f, tx) => {
      const matrices = await import("./gb-onward-delivery");
      const own = await matrices.onwardSettings(f.id, { username: f.resh }, true);
      expect(own.reshippers.map((r: any) => r.username)).toEqual([f.resh]);
      const rates = suppliedEuMatrix(); rates.rates[0].homeSmall = 29;
      await matrices.saveOnwardMatrix(f.id, f.resh, { username: f.resh }, rates, true);
      expect((await matrices.onwardSettings(f.id, { username: f.owner })).reshippers[0].matrix!.rates[0].homeSmall).toBe(29);
      await expect(matrices.saveOnwardMatrix(f.id, f.resh, { username: f.other }, rates, true)).rejects.toMatchObject({ status: 403 });
      const delegated = await api.organiserOnwardActor(f.id, f.resh, { username: f.owner });
      const made = await api.createOnwardPayment(f.id, f.orderId, delegated, newBody());
      expect(made.request.wallet.walletAddress).toBe(wallet.walletAddress);
      await api.submitOnwardPayment(f.orderId, made.request.id, { username: f.member }, hash);
      expect((await api.manageOnwardPayment(f.id, f.orderId, made.request.id, delegated, "confirm")).request.status).toBe("paid");
      await expect(api.organiserOnwardActor(f.id, f.resh, { username: f.other })).rejects.toMatchObject({ status: 403 });
      await expect(api.organiserOnwardActor(f.id, f.other, { username: f.owner })).rejects.toMatchObject({ status: 403 });
      const [order] = await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, f.orderId));
      expect(order.grandTotal).toBe("112.00");
    });
  });
  it("keeps cancellation/rejection history and requires a new request for changed charges", async () => {
    await fixture(async (_store, api, f) => {
      const first = (await api.createOnwardPayment(f.id, f.orderId, { username: f.resh }, newBody())).request;
      await api.submitOnwardPayment(f.orderId, first.id, { username: f.member }, hash);
      await expect(api.manageOnwardPayment(f.id, f.orderId, first.id, { username: f.resh }, "cancel")).rejects.toMatchObject({ status: 409 });
      const rejected = await api.manageOnwardPayment(f.id, f.orderId, first.id, { username: f.resh }, "reject", "Wrong network; contact me");
      expect(rejected.request).toMatchObject({ status: "unpaid", txHash: null, verificationNote: "Wrong network; contact me" });
      expect(rejected.request.attempts).toHaveLength(1);
      expect(await api.hasOnwardPaymentTransaction(hash)).toBe(false);
      await api.manageOnwardPayment(f.id, f.orderId, first.id, { username: f.resh }, "cancel");
      const second = await api.createOnwardPayment(f.id, f.orderId, { username: f.resh }, { ...newBody(), amount: 25.6, method: "home" });
      expect(second.request.id).not.toBe(first.id); expect(second.history).toHaveLength(1);
      expect(second.history[0]).toMatchObject({ status: "cancelled", attempts: [{ txHash: hash }] });
      await expect(api.submitOnwardPayment(f.orderId, first.id, { username: f.member }, hash)).rejects.toMatchObject({ status: 409 });
    });
  });
  it("forbids foreign members, unrelated reshippers and manager mutations", async () => {
    await fixture(async (_store, api, f) => {
      const made = await api.createOnwardPayment(f.id, f.orderId, { username: f.resh }, newBody());
      await expect(api.readOnwardPayment(f.orderId, { username: f.other }, "member")).rejects.toMatchObject({ status: 403 });
      await expect(api.readOnwardPayment(f.orderId, { username: f.other }, "reshipper", f.id)).rejects.toMatchObject({ status: 403 });
      await expect(api.saveOnwardPaymentSettings(f.id, { username: f.other }, wallet)).rejects.toMatchObject({ status: 403 });
      await expect(api.createOnwardPayment(f.id, f.orderId, { username: f.owner }, newBody())).rejects.toMatchObject({ status: 403 });
      const manager = await api.readOnwardPayment(f.orderId, { username: f.owner }, "organiser", f.id);
      expect(manager).toMatchObject({ canManage: false, request: { id: made.request.id } });
    });
  });
  it("does not reuse a product TX or a TX already reserved by another delivery charge", async () => {
    await fixture(async (store, api, f, tx) => {
      const made = await api.createOnwardPayment(f.id, f.orderId, { username: f.resh }, newBody());
      await tx.update(store.ordersTable).set({ paymentTxHash: hash }).where(eq(store.ordersTable.id, f.orderId));
      await expect(api.submitOnwardPayment(f.orderId, made.request.id, { username: f.member }, hash.toUpperCase())).rejects.toMatchObject({ status: 409 });
      await tx.update(store.ordersTable).set({ paymentTxHash: null }).where(eq(store.ordersTable.id, f.orderId));
      await api.submitOnwardPayment(f.orderId, made.request.id, { username: f.member }, hash);
      const secondId = randomUUID();
      const [original] = await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, f.orderId));
      await tx.insert(store.ordersTable).values({ ...original, id: secondId, code: `second-${f.id}` });
      await tx.insert(store.orderLineItemsTable).values({ id: randomUUID(), orderId: secondId, productId: f.productId,
        productName: "Synthetic kit", quantity: "1", unitPrice: "20", lineTotal: "20" });
      const second = await api.createOnwardPayment(f.id, secondId, { username: f.resh }, newBody());
      await expect(api.submitOnwardPayment(secondId, second.request.id, { username: f.member }, hash)).rejects.toMatchObject({ status: 409 });
    });
  });
  it("automatically confirms only a recent verified transfer for the snapshotted amount and wallet", async () => {
    await fixture(async (_store, api, f) => {
      await api.saveOnwardPaymentSettings(f.id, { username: f.resh }, { ...wallet, confirmationMode: "automatic" });
      const made = await api.createOnwardPayment(f.id, f.orderId, { username: f.resh }, newBody());
      const result = await api.submitOnwardPayment(f.orderId, made.request.id, { username: f.member }, hash);
      expect(chain.verify).toHaveBeenCalledWith(hash, wallet.walletAddress, 17.3, "USDT", "Ethereum", 0.01);
      expect(result.request).toMatchObject({ status: "paid", confirmedBy: "automatic" });
    });
  });
  it.each(["old", "unknown-time", "underpaid", "pending", "unsupported"])("keeps %s automatic evidence pending for manual review/retry", async kind => {
    await fixture(async (_store, api, f) => {
      await api.saveOnwardPaymentSettings(f.id, { username: f.resh }, { ...wallet, confirmationMode: "automatic" });
      const made = await api.createOnwardPayment(f.id, f.orderId, { username: f.resh }, newBody());
      if (kind === "old") chain.time.mockResolvedValue(Date.now() - 86400_000);
      if (kind === "unknown-time") chain.time.mockResolvedValue(null);
      if (kind === "underpaid") chain.verify.mockResolvedValue({ verified: true, amountUsdt: 1, blockConfirmations: 3 });
      if (kind === "pending") chain.verify.mockResolvedValue({ verified: false, pending: true, reason: "Waiting for confirmations" });
      if (kind === "unsupported") chain.verify.mockResolvedValue({ verified: false, manual: true, reason: "Manual review required" });
      expect((await api.submitOnwardPayment(f.orderId, made.request.id, { username: f.member }, hash)).request.status).toBe("pending_confirmation");
      await api.manageOnwardPayment(f.id, f.orderId, made.request.id, { username: f.resh }, "confirm");
      expect((await api.readOnwardPayment(f.orderId, { username: f.member }, "member")).request.status).toBe("paid");
    });
  });
  it("hides an old reshipper's proof and blocks submitting after reassignment", async () => {
    await fixture(async (store, api, f, tx) => {
      const made = await api.createOnwardPayment(f.id, f.orderId, { username: f.resh }, newBody());
      await tx.insert(store.gbReshippersTable).values({ id: randomUUID(), gbId: f.id, reshipperUsername: f.other, country: "AT", enabled: true });
      await tx.update(store.ordersTable).set({ reshipperUsername: f.other }).where(eq(store.ordersTable.id, f.orderId));
      const other = await api.readOnwardPayment(f.orderId, { username: f.other }, "reshipper", f.id);
      expect(other.request).toBeNull(); expect(other.history).toEqual([]);
      await expect(api.submitOnwardPayment(f.orderId, made.request.id, { username: f.member }, hash)).rejects.toMatchObject({ status: 409 });
      await expect(api.manageOnwardPayment(f.id, f.orderId, made.request.id, { username: f.other }, "confirm")).rejects.toMatchObject({ status: 409 });
    });
  });
  it("never applies a delayed verification to a different assignment", async () => {
    await fixture(async (store, api, f, tx) => {
      await api.saveOnwardPaymentSettings(f.id, { username: f.resh }, { ...wallet, confirmationMode: "automatic" });
      const made = await api.createOnwardPayment(f.id, f.orderId, { username: f.resh }, newBody());
      chain.time.mockImplementationOnce(async () => {
        await tx.update(store.ordersTable).set({ reshipperUsername: null }).where(eq(store.ordersTable.id, f.orderId));
        return Date.now();
      });
      const result = await api.submitOnwardPayment(f.orderId, made.request.id, { username: f.member }, hash);
      expect(result.request.status).toBe("pending_confirmation"); expect(result.canSubmit).toBe(false);
    });
  });
  it("allows over-25-kit quotes and settlement after dispatch without changing fulfilment", async () => {
    await fixture(async (store, api, f, tx) => {
      await tx.update(store.ordersTable).set({ status: "Shipped" }).where(eq(store.ordersTable.id, f.orderId));
      await tx.update(store.orderLineItemsTable).set({ quantity: "26" }).where(eq(store.orderLineItemsTable.orderId, f.orderId));
      expect((await api.listOnwardPayments(f.id, { username: f.resh })).orders[0]).toMatchObject({ canRequest: true, estimate: { status: "quote_required" } });
      const made = await api.createOnwardPayment(f.id, f.orderId, { username: f.resh }, { ...newBody(), amount: 60 });
      await tx.update(store.ordersTable).set({ dispatchedByReshipper: f.resh }).where(eq(store.ordersTable.id, f.orderId));
      expect((await api.submitOnwardPayment(f.orderId, made.request.id, { username: f.member }, hash)).request.status).toBe("pending_confirmation");
      await api.manageOnwardPayment(f.id, f.orderId, made.request.id, { username: f.resh }, "confirm");
      const [order] = await tx.select().from(store.ordersTable).where(eq(store.ordersTable.id, f.orderId));
      expect(order).toMatchObject({ status: "Shipped", dispatchedByReshipper: f.resh, paymentStatus: "confirmed", grandTotal: "112.00" });
    });
  });
  it("serializes concurrent request creation and competing transaction claims in real PostgreSQL transactions", async () => {
    const store = await import("@workspace/db"), api = await import("./gb-onward-payments");
    const id = randomUUID(), orderIds = [randomUUID(), randomUUID()], assignmentId = randomUUID(), productId = randomUUID();
    const owner = `onward-owner-${id}`, member = `onward-member-${id}`, resh = `onward-resh-${id}`;
    const txHash = `0x${randomUUID().replaceAll("-", "").repeat(2)}`;
    const productRaceHash = `0x${randomUUID().replaceAll("-", "").repeat(2)}`;
    try {
      await store.db.transaction(async tx => {
        for (const username of [owner, member, resh]) await tx.insert(store.accountsTable).values({ telegramUsername: username, country: "AT" });
        await tx.insert(store.groupBuysTable).values({ id, name: "Synthetic concurrent onward payments", organiserId: owner, currency: "USD", status: "closed" });
        await tx.insert(store.accountGroupBuysTable).values({ id: randomUUID(), accountId: member, groupBuyId: id });
        await tx.insert(store.gbReshippersTable).values({ id: assignmentId, gbId: id, reshipperUsername: resh, country: "AT", enabled: true });
        await tx.insert(store.productsTable).values({ id: productId, name: "Synthetic concurrent kit", price: "20" });
        for (const orderId of orderIds) {
          await tx.insert(store.ordersTable).values({ id: orderId, code: `concurrent-${orderId}`, telegramUsername: member, groupBuyId: id,
            shippingName: "Synthetic Member", shippingAddress: "1 Example Road, Vienna 1010", shippingPhone: "+43 123456789", shippingEmail: "member@example.test",
            reshipperUsername: resh, shippingCountry: "AT", deliveryMethod: "Existing delivery", deliveryPrice: "3",
            vendorShipping: "9", productSubtotal: "20", grandTotal: "32", paymentStatus: "confirmed" });
          await tx.insert(store.orderLineItemsTable).values({ id: randomUUID(), orderId, productId, productName: "Synthetic kit",
            quantity: "1", unitPrice: "20", lineTotal: "20" });
        }
      });
      await api.saveOnwardPaymentSettings(id, { username: resh }, wallet);
      const creations = await Promise.allSettled([
        api.createOnwardPayment(id, orderIds[0], { username: resh }, newBody()),
        api.createOnwardPayment(id, orderIds[0], { username: resh }, newBody()),
      ]);
      expect(creations.filter(r => r.status === "fulfilled")).toHaveLength(1);
      expect(creations.filter(r => r.status === "rejected")).toHaveLength(1);
      const first = await api.readOnwardPayment(orderIds[0], { username: member }, "member");
      const second = await api.createOnwardPayment(id, orderIds[1], { username: resh }, newBody());
      const claims = await Promise.allSettled([
        api.submitOnwardPayment(orderIds[0], first.request!.id, { username: member }, txHash),
        api.submitOnwardPayment(orderIds[1], second.request!.id, { username: member }, txHash),
      ]);
      expect(claims.filter(r => r.status === "fulfilled")).toHaveLength(1);
      expect(claims.filter(r => r.status === "rejected")).toHaveLength(1);
      const after = await Promise.all(orderIds.map(orderId => api.readOnwardPayment(orderId, { username: member }, "member")));
      expect(after.filter(r => r.request?.status === "pending_confirmation")).toHaveLength(1);
      expect(after.filter(r => r.request?.status === "unpaid")).toHaveLength(1);
      const unpaidIndex = after.findIndex(r => r.request?.status === "unpaid");
      const productRace = await Promise.allSettled([
        api.submitOnwardPayment(orderIds[unpaidIndex], after[unpaidIndex].request!.id, { username: member }, productRaceHash),
        api.reserveProductPaymentTransaction(productRaceHash, orderIds[1 - unpaidIndex]),
      ]);
      const onwardWon = productRace[0].status === "fulfilled";
      const productWon = productRace[1].status === "fulfilled" && productRace[1].value === true;
      expect(Number(onwardWon) + Number(productWon)).toBe(1);
    } finally {
      await store.db.transaction(async tx => {
        await tx.delete(store.siteConfigTable).where(inArray(store.siteConfigTable.key, [
          ...orderIds.map(orderId => `gb_onward_charge:${orderId}`), `gb_onward_payment_settings:${assignmentId}`,
          `gb_onward_tx:ethereum:${txHash.slice(2)}`,
          `gb_onward_tx:ethereum:${productRaceHash.slice(2)}`,
          `crypto_payment_tx:${txHash.slice(2)}`, `crypto_payment_tx:${productRaceHash.slice(2)}`,
        ]));
        await tx.delete(store.orderLineItemsTable).where(inArray(store.orderLineItemsTable.orderId, orderIds));
        await tx.delete(store.ordersTable).where(inArray(store.ordersTable.id, orderIds));
        await tx.delete(store.gbReshippersTable).where(eq(store.gbReshippersTable.gbId, id));
        await tx.delete(store.accountGroupBuysTable).where(eq(store.accountGroupBuysTable.groupBuyId, id));
        await tx.delete(store.groupBuysTable).where(eq(store.groupBuysTable.id, id));
        await tx.delete(store.productsTable).where(eq(store.productsTable.id, productId));
        await tx.delete(store.accountsTable).where(inArray(store.accountsTable.telegramUsername, [owner, member, resh]));
      });
    }
  });
});
