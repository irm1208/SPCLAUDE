import assert from "node:assert/strict";
import test from "node:test";
import { buildReshipperFulfilmentTxt } from "./reshipper-fulfilment-txt";

const orders = [
  { reshipperUsername: "Ajer", status: "Submitted", paymentStatus: "confirmed", grandTotal: 110.25, telegramUsername: "PRIVATE_MEMBER_ONE",
    lineItems: [{ productName: "HGH 36IU", quantity: 2 }, { productName: "Tirzepatide 10mg", quantity: 0.5 }] },
  { reshipperUsername: "@AJER", status: "Processing", paymentStatus: "unpaid", grandTotal: 50.75, telegramUsername: "PRIVATE_MEMBER_TWO",
    lineItems: [{ productName: "HGH 36IU", quantity: 1 }, { productName: "OOS", quantity: 9, isOos: true }] },
  { reshipperUsername: "other", status: "Submitted", paymentStatus: "confirmed", grandTotal: 999,
    lineItems: [{ productName: "Other reshipper product", quantity: 10 }] },
  { reshipperUsername: "ajer", status: "Cancelled", paymentStatus: "unpaid", grandTotal: 999,
    lineItems: [{ productName: "Cancelled product", quantity: 10 }] },
  { reshipperUsername: "ajer", status: "Submitted", paymentStatus: "refunded", grandTotal: 999,
    lineItems: [{ productName: "Refunded product", quantity: 10 }] },
];
test("one combined order per reshipper, including half kits and current customer totals", () => {
  const text = buildReshipperFulfilmentTxt(orders, "@Ajer", "USD");
  assert.match(text, /^@Ajer\n/);
  assert.match(text, /HGH 36IU × 3/);
  assert.match(text, /Tirzepatide 10mg × 0.5/);
  assert.match(text, /Total: \$161.00 USD/);
  assert.match(text, /Number of kits: 3.5/);
});
test("no member identities, individual order details, cancelled/refunded or other recipients", () => {
  const text = buildReshipperFulfilmentTxt(orders, "ajer", "USD");
  for (const forbidden of ["PRIVATE_MEMBER", "Other reshipper", "Cancelled product", "Refunded product", "OOS", "Order #"])
    assert.ok(!text.includes(forbidden));
});
test("preserves different product doses", () => {
  const text = buildReshipperFulfilmentTxt([{ ...orders[0], lineItems: [
    { productName: "HGH 36IU", quantity: 1 }, { productName: "HGH 24IU", quantity: 2 },
  ] }], "ajer", "EUR");
  assert.match(text, /HGH 36IU × 1/);
  assert.match(text, /HGH 24IU × 2/);
  assert.match(text, /€110.25 EUR/);
});
test("supports stablecoins and GBP without converting amounts", () => {
  for (const currency of ["USDT", "USDC"]) assert.match(buildReshipperFulfilmentTxt(orders, "ajer", currency), new RegExp(`\\$161.00 ${currency}`));
  assert.match(buildReshipperFulfilmentTxt(orders, "ajer", "GBP"), /£161.00 GBP/);
});
test("rejects empty or invalid downloads instead of producing misleading totals", () => {
  assert.throws(() => buildReshipperFulfilmentTxt(orders, "nobody", "USD"), /no active orders/i);
  assert.throws(() => buildReshipperFulfilmentTxt([{ ...orders[0], grandTotal: NaN }], "ajer", "USD"), /total/i);
  assert.throws(() => buildReshipperFulfilmentTxt([{ ...orders[0], lineItems: [{ productName: "Bad", quantity: -1 }] }], "ajer", "USD"), /quantity/i);
});
