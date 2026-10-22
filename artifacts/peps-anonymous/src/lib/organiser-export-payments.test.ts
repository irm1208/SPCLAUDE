import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mapApiOrder } from "../pages/organiser-v2/api/organiser-api";
import { normalizeOrder } from "../pages/organiser-v2/domain/order";
import { paymentExportCells, PAYMENT_EXPORT_HEADERS, encodeCsv } from "./organiser-export-payments";

const main = `0x${"a".repeat(64)}`;
const extra = `0x${"b".repeat(64)}`;
const trial = `0x${"c".repeat(64)}`;
const balance = `0x${"d".repeat(64)}`;

test("exports main and additional payments without duplicate EVM TXIDs", () => {
  assert.deepEqual(paymentExportCells({
    paymentTxHash: main,
    paymentTxHashes: [main.toUpperCase(), extra, "", extra],
    testPaymentTxHash: trial,
    balanceTxHash: balance,
  }), [`${main}; ${extra}`, trial, balance]);
  assert.deepEqual(PAYMENT_EXPORT_HEADERS, ["Payment TXIDs", "Test Payment TXID", "Balance / Top-up TXID"]);
});

test("empty payments stay blank and non-chain payment markers are not called TXIDs", () => {
  assert.deepEqual(paymentExportCells({}), ["", "", ""]);
  assert.deepEqual(paymentExportCells({
    paymentTxHash: "fiat:paypal",
    paymentTxHashes: ["anonpay:reference"],
    testPaymentTxHash: "test:manual",
  }), ["", "", ""]);
});

test("Solana transaction signatures retain their case", () => {
  assert.equal(paymentExportCells({ paymentTxHashes: ["Abc123", "abc123"] })[0], "Abc123; abc123");
});

test("V2 API mapping and normalization preserve every export payment field", () => {
  const mapped = mapApiOrder({
    id: "order-1", telegramUsername: "member", status: "Submitted",
    paymentTxHash: main, paymentTxHashes: [main, extra],
    testPaymentTxHash: trial, balanceTxHash: balance, lineItems: [],
  });
  const normalized = normalizeOrder(mapped);
  assert.ok(normalized);
  assert.deepEqual(paymentExportCells(normalized), [`${main}; ${extra}`, trial, balance]);
});

test("CSV quotes commas, quotes and newlines without corrupting payment columns", () => {
  assert.equal(encodeCsv([["Name", "TXID"], ['A, "B"\nC', main]]),
    `"Name","TXID"\n"A, ""B""\nC","${main}"`);
});

test("both organiser CSV exports use the payment columns", () => {
  for (const path of ["../pages/GbOrganiser.tsx", "../pages/organiser-v2/OrdersTab.tsx"]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /\.\.\.PAYMENT_EXPORT_HEADERS/);
    assert.match(source, /\.\.\.paymentExportCells\(o\)/);
  }
});
