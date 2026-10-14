/**
 * Development-only database integration checks. All rows have dedicated fixture identities;
 * cleanup runs even when an assertion fails. Never run against production.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool, accountsTable, accountGroupBuysTable, productsTable, groupBuysTable,
  groupBuyProductsTable, ordersTable, orderLineItemsTable, creditTransactionsTable,
  gbHalfKitOffersTable as offers, gbHalfKitClaimsTable as claims, gbReshippersTable } from "@workspace/db";
import { listHalfKits, saveHalfKit, claimHalfKit, releaseHalfKit, cancelUnpaidHalfClaims } from "../src/lib/half-kit-offers";
import { halfKitShippingSnapshots } from "../src/lib/half-kit-shipping";
import { lockHalfKitMoney } from "../src/lib/half-kit-lock";
import { resolveHalfKitPayments } from "../src/lib/half-kit-payment-destination";

if (process.env.NODE_ENV === "production") throw new Error("Do not run fixtures in production.");
const suffix = randomUUID().slice(0, 8), groupId = `half-kit-fixture-${suffix}`;
const user = `halfkit_a_${suffix}`, other = `halfkit_b_${suffix}`, organiser = `halfkit_org_${suffix}`;
const productId = `halfkit-p-${suffix}`, second = `halfkit-p2-${suffix}`;
const orderId = `halfkit-o-${suffix}`, otherId = `halfkit-o2-${suffix}`;
const owner = { username: organiser }, member = { username: user }, memberB = { username: other };
const ids = [orderId, otherId];
const header = (id: string, username: string, code: string) => ({
  id, code, telegramUsername: username, groupBuyId: groupId, deliveryMethod: "Fixture delivery",
  productSubtotal: "20.00", deliveryPrice: "3.00", vendorShipping: "4.00", grandTotal: "22.00",
  couponCode: "ORIGINAL", couponDiscount: "5.00", status: "Submitted", paymentStatus: "confirmed",
  paymentUsdAmount: "15.00", amountDue: "7.00",
});
let checks = 0;
function check(label: string, test: () => void) { test(); checks++; console.log(`PASS ${label}`); }
async function rejected(label: string, operation: () => Promise<unknown>, status = 409) {
  await assert.rejects(operation, (error: any) => error.status === status); checks++; console.log(`PASS ${label}`);
}
try {
  await db.transaction(async tx => {
    await tx.insert(accountsTable).values([user, other, organiser].map(telegramUsername => ({
      telegramUsername, credits: telegramUsername === user ? 10 : 0,
    })));
    await tx.insert(productsTable).values([{ id: productId, name: "Fixture compound", price: "40.00", stock: 999 },
      { id: second, name: "Fixture second compound", price: "10.00", stock: 999 }]);
    await tx.insert(groupBuysTable).values({ id: groupId, name: "Half-kit integration fixture", organiserId: organiser,
      currency: "USD", status: "closed", allowHalfKits: true, allowCredits: true });
    await tx.insert(groupBuyProductsTable).values([{ id: randomUUID(), groupBuyId: groupId, productId, stockOverride: "1.00" },
      { id: randomUUID(), groupBuyId: groupId, productId: second }]);
    await tx.insert(accountGroupBuysTable).values([user, other].map(accountId => ({ id: randomUUID(), groupBuyId: groupId, accountId })));
    await tx.insert(ordersTable).values([header(orderId, user, `HK${suffix}A`),
      { ...header(otherId, other, `HK${suffix}B`), productSubtotal: "10.00", grandTotal: "10.00",
        deliveryPrice: "0", vendorShipping: "0", couponCode: null, couponDiscount: "0",
        paymentStatus: "unpaid", paymentUsdAmount: null, amountDue: "0" }]);
    await tx.insert(orderLineItemsTable).values([{ id: randomUUID(), orderId, productId, productName: "Fixture compound",
      quantity: "0.50", unitPrice: "40.00", lineTotal: "20.00" },
      { id: randomUUID(), orderId: otherId, productId: second, productName: "Fixture second compound",
        quantity: "1", unitPrice: "10", lineTotal: "10" }]);
  });
  let manager = await listHalfKits(groupId, owner, true);
  check("live remainder and default half price", () => {
    const candidate = manager.candidates.find((row: any) => row.productId === productId)!;
    assert.equal(candidate.remainingHalf, true); assert.equal(candidate.defaultPrice, 20);
  });
  await rejected("foreign organiser denied", () => listHalfKits(groupId, memberB, true), 403);
  await rejected("non-half product cannot publish", () => saveHalfKit(groupId, second, owner,
    { price: 5, deliveryCharge: 0, vendorShippingCharge: 0, published: true }));
  let offer = await saveHalfKit(groupId, productId, owner, { price: 15, deliveryCharge: 2, vendorShippingCharge: 3, published: true });
  let memberData = await listHalfKits(groupId, member, false);
  check("member quote shows charges, own orders and group credits", () => {
    assert.equal(memberData.offers.length, 1); assert.equal(memberData.offers[0].deliveryCharge, 2);
    assert.equal(memberData.orders.length, 1); assert.equal(memberData.orders[0].id, orderId);
    assert.equal(memberData.creditsBalance, 10);
  });
  const requestId = randomUUID();
  const input = { orderId, version: offer.version, useCredits: true, expectedCredit: 10, requestId };
  await rejected("foreign target order denied", () => claimHalfKit(groupId, offer.id, memberB, input), 403);
  await rejected("credit preview mismatch rolls back", () => claimHalfKit(groupId, offer.id, member, { ...input, expectedCredit: 5 }));
  const result = await claimHalfKit(groupId, offer.id, member, input);
  const [paidOrder] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.telegramUsername, user));
  check("confirmed primary payment and original coupon preserved", () => {
    assert.equal(paidOrder.paymentStatus, "confirmed"); assert.equal(Number(paidOrder.paymentUsdAmount), 15);
    assert.equal(paidOrder.couponCode, "ORIGINAL"); assert.equal(Number(paidOrder.couponDiscount), 5);
  });
  check("gross, separate shipping, net balance and credit debit agree", () => {
    assert.equal(Number(paidOrder.grandTotal), 42); assert.equal(Number(paidOrder.productSubtotal), 35);
    assert.equal(Number(paidOrder.deliveryPrice), 5); assert.equal(Number(paidOrder.vendorShipping), 7);
    assert.equal(Number(paidOrder.creditsApplied), 10); assert.equal(Number(paidOrder.amountDue), 17);
    assert.equal(Number(account.credits), 0);
  });
  const missingDestination = await resolveHalfKitPayments(paidOrder);
  check("missing local half-kit wallets never use a global destination", () => {
    assert.equal(missingDestination?.cryptoWalletAddress, null);
    assert.equal(missingDestination?.anonPayEnabled, false);
  });
  const ordinaryRouting = await resolveHalfKitPayments({ id: otherId, groupBuyId: groupId });
  check("an order without a claimed half keeps ordinary payment routing", () => assert.equal(ordinaryRouting, null));
  const organiserWallet = `0x${"1".repeat(40)}`;
  await db.update(groupBuysTable).set({
    organiserPayments: { cryptoWalletAddress: organiserWallet, cryptoCurrency: "USDT", cryptoNetwork: "ERC-20",
      anonPayEnabled: true, anonPayWallet: organiserWallet, anonPayTicker: "usdt", anonPayNetwork: "ERC20" },
  }).where(eq(groupBuysTable.id, groupId));
  const localDestination = await resolveHalfKitPayments(paidOrder);
  check("the half-kit routing source uses only the group organiser wallets", () => {
    assert.equal(localDestination?.cryptoWalletAddress, organiserWallet);
    assert.equal(localDestination?.cryptoCurrency, "USDT");
    assert.equal(localDestination?.anonPayWallet, organiserWallet);
  });
  const reshipperId = randomUUID(), reshipperWallet = `0x${"2".repeat(40)}`;
  await db.insert(gbReshippersTable).values({
    id: reshipperId, gbId: groupId, country: "United Kingdom", reshipperUsername: organiser,
    enabledPaymentMethods: { cryptoEnabled: true, anonPayEnabled: true },
    reshipperPaymentDetails: { cryptoWalletAddress: reshipperWallet, cryptoCurrency: "USDT", cryptoNetwork: "ERC-20",
      anonPayWallet: reshipperWallet, anonPayTicker: "usdt", anonPayNetwork: "ERC20" },
  });
  const reshipperDestination = await resolveHalfKitPayments({ ...paidOrder, reshipperUsername: organiser, shippingCountry: "GB" });
  check("the assigned reshipper's enabled wallets take priority", () => {
    assert.equal(reshipperDestination?.cryptoWalletAddress, reshipperWallet);
    assert.equal(reshipperDestination?.anonPayWallet, reshipperWallet);
  });
  await db.update(gbReshippersTable).set({ paymentTarget: "organiser" }).where(eq(gbReshippersTable.id, reshipperId));
  const organiserTarget = await resolveHalfKitPayments({ ...paidOrder, reshipperUsername: organiser });
  check("reshipper settings can direct collection to the organiser", () => assert.equal(organiserTarget?.cryptoWalletAddress, organiserWallet));
  await db.delete(gbReshippersTable).where(eq(gbReshippersTable.id, reshipperId));
  await db.update(groupBuysTable).set({ allowCredits: false }).where(eq(groupBuysTable.id, groupId));
  const replay = await claimHalfKit(groupId, offer.id, member, input);
  check("retry is idempotent even after disabling credits", () => assert.equal(replay.claimId, result.claimId));
  memberData = await listHalfKits(groupId, member, false);
  check("claimed offer immediately disappears", () => assert.equal(memberData.offers.length, 0));
  await rejected("second claimant cannot take filled half", () => claimHalfKit(groupId, offer.id, memberB,
    { orderId: otherId, version: offer.version, useCredits: false, expectedCredit: 0, requestId: randomUUID() }));
  await releaseHalfKit(groupId, result.claimId, owner);
  await releaseHalfKit(groupId, result.claimId, owner);
  const [restored] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  const [restoredAccount] = await db.select().from(accountsTable).where(eq(accountsTable.telegramUsername, user));
  check("manual release reverses only the claim and returns credits once", () => {
    assert.equal(Number(restored.grandTotal), 22); assert.equal(Number(restored.amountDue), 7);
    assert.equal(Number(restored.creditsApplied), 0); assert.equal(Number(restoredAccount.credits), 10);
  });
  memberData = await listHalfKits(groupId, member, false);
  check("release restores the offer while disabled credits stay disabled", () => {
    assert.equal(memberData.offers.length, 1); assert.equal(memberData.creditsBalance, 0);
  });
  offer = (await db.select().from(offers).where(eq(offers.id, offer.id)))[0];
  await rejected("disabled credits cannot be newly spent", () => claimHalfKit(groupId, offer.id, member,
    { ...input, version: offer.version, requestId: randomUUID() }), 403);
  // Different connections / real transaction locks, not an in-memory sequential approximation.
  const raced = await Promise.allSettled([
    claimHalfKit(groupId, offer.id, member, { ...input, version: offer.version, useCredits: false, expectedCredit: 0, requestId: randomUUID() }),
    claimHalfKit(groupId, offer.id, memberB, { orderId: otherId, version: offer.version, useCredits: false, expectedCredit: 0, requestId: randomUUID() }),
  ]);
  check("concurrent claims have exactly one winner", () => {
    assert.equal(raced.filter(row => row.status === "fulfilled").length, 1);
    assert.equal(raced.filter(row => row.status === "rejected").length, 1);
    const loser = (raced.find(row => row.status === "rejected") as PromiseRejectedResult).reason;
    assert.equal(loser.code, "HALF_KIT_TAKEN");
    assert.match(loser.message, /^Sorry, this half kit was taken (less than a second|\d+ seconds?) ago\.$/);
  });
  const winner = (raced.find(row => row.status === "fulfilled") as PromiseFulfilledResult<any>).value;
  await db.update(ordersTable).set({ paymentStatus: "confirmed", amountDue: "0", balancePaymentStatus: "confirmed",
    balanceConfirmedAt: new Date() }).where(eq(ordersTable.id, winner.orderId));
  await rejected("paid claim cannot be released as unpaid", () => releaseHalfKit(groupId, winner.claimId, owner));
  await halfKitShippingSnapshots([winner.orderId]);
  await db.update(ordersTable).set({ amountDue: "5.00" }).where(eq(ordersTable.id, winner.orderId));
  await rejected("settled claim stays paid after a later shipping balance", () => releaseHalfKit(groupId, winner.claimId, owner));
  const anchorId = `halfkit-anchor-${suffix}`, cancelId = `halfkit-cancel-${suffix}`;
  ids.push(anchorId, cancelId);
  await db.transaction(async tx => {
    await tx.insert(ordersTable).values([
      { ...header(anchorId, organiser, `HA-${suffix}`), productSubtotal: "10", grandTotal: "10", paymentUsdAmount: "10",
        deliveryPrice: "0", vendorShipping: "0", couponCode: null, couponDiscount: "0", amountDue: "0" },
      { ...header(cancelId, user, `HC-${suffix}`), productSubtotal: "20", grandTotal: "20",
        deliveryPrice: "0", vendorShipping: "0", couponCode: null, couponDiscount: "0",
        paymentStatus: "unpaid", paymentUsdAmount: "20", amountDue: "0" },
    ]);
    await tx.insert(orderLineItemsTable).values([
      { id: randomUUID(), orderId: anchorId, productId: second, productName: "Fixture 2",
        quantity: "0.50", unitPrice: "20", lineTotal: "10" },
      { id: randomUUID(), orderId: cancelId, productId, productName: "Fixture",
        quantity: "1", unitPrice: "20", lineTotal: "20" },
    ]);
    await tx.update(groupBuysTable).set({ allowCredits: true }).where(eq(groupBuysTable.id, groupId));
  });
  const creditOffer = await saveHalfKit(groupId, second, owner, { price: 5, deliveryCharge: 2, vendorShippingCharge: 3, published: true });
  const creditClaim = await claimHalfKit(groupId, creditOffer.id, member,
    { orderId: cancelId, version: creditOffer.version, useCredits: true, expectedCredit: 10, requestId: randomUUID() });
  const [creditTarget] = await db.select().from(ordersTable).where(eq(ordersTable.id, cancelId));
  check("credit-funded half leaves original unpaid payment intact", () => assert.equal(creditTarget.paymentStatus, "unpaid"));
  await db.transaction(async tx => {
    await lockHalfKitMoney(tx, groupId);
    await cancelUnpaidHalfClaims(tx, cancelId, user);
    await tx.update(ordersTable).set({ deletedAt: new Date() }).where(eq(ordersTable.id, cancelId));
  });
  const [cancelled] = await db.select().from(ordersTable).where(eq(ordersTable.id, cancelId));
  const [returned] = await db.select().from(accountsTable).where(eq(accountsTable.telegramUsername, user));
  const [releasedCredit] = await db.select().from(claims).where(eq(claims.id, creditClaim.claimId));
  check("whole cancellation returns half credits and removes its snapshot atomically", () => {
    assert.equal(Number(cancelled.grandTotal), 20); assert.equal(Number(cancelled.creditsApplied), 0);
    assert.equal(Number(returned.credits), 10); assert.equal(releasedCredit.state, "released");
  });
  await db.transaction(async tx => cancelUnpaidHalfClaims(tx, cancelId, user));
  const [returnedAgain] = await db.select().from(accountsTable).where(eq(accountsTable.telegramUsername, user));
  check("repeat cancellation cannot return credits twice", () => assert.equal(Number(returnedAgain.credits), 10));
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
  check("global catalogue stock is untouched", () => assert.equal(product.stock, 999));
  console.log(`${checks} database integration checks passed.`);
} finally {
  await db.transaction(async tx => {
    await tx.delete(claims).where(eq(claims.groupBuyId, groupId));
    await tx.delete(offers).where(eq(offers.groupBuyId, groupId));
    await tx.delete(gbReshippersTable).where(eq(gbReshippersTable.gbId, groupId));
    await tx.delete(creditTransactionsTable).where(inArray(creditTransactionsTable.accountUsername, [user, other, organiser]));
    await tx.delete(accountGroupBuysTable).where(eq(accountGroupBuysTable.groupBuyId, groupId));
    await tx.delete(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, ids));
    await tx.delete(ordersTable).where(inArray(ordersTable.id, ids));
    await tx.delete(groupBuyProductsTable).where(eq(groupBuyProductsTable.groupBuyId, groupId));
    await tx.delete(groupBuysTable).where(eq(groupBuysTable.id, groupId));
    await tx.delete(productsTable).where(inArray(productsTable.id, [productId, second]));
    await tx.delete(accountsTable).where(inArray(accountsTable.telegramUsername, [user, other, organiser]));
  });
  await pool.end();
}
