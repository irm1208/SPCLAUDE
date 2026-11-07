import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cents,
  money,
  isEligible,
  orderState,
  summarize,
  filterOrders,
  paginate,
  selectPage,
  toggleOne,
  parsePaidAt,
  selectedTotal,
  MAX_SELECTION,
  type LedgerOrder,
} from "./model";

const base: LedgerOrder = {
  id: "o",
  reference: "REF",
  status: "Submitted",
  stale: false,
  totalCost: "10.00",
  paymentId: null,
};

test("cents parses exact money and rejects invalid instead of zero", () => {
  assert.equal(cents("10.1"), 1010n);
  assert.equal(cents(20.2), 2020n);
  assert.equal(cents("abc"), null);
  assert.equal(cents(null), null);
  assert.equal(cents("-1"), null);
  assert.equal(money(null), "Unavailable");
  assert.equal(money(123456n), "$1,234.56");
});

test("fallback eligibility only for safe nonstale unpaid valid statuses", () => {
  assert.equal(isEligible(base), true);
  assert.equal(isEligible({ ...base, stale: true }), false);
  assert.equal(isEligible({ ...base, paymentId: "p" }), false);
  assert.equal(isEligible({ ...base, totalCost: "0" }), false);
  assert.equal(isEligible({ ...base, totalCost: "bad" }), false);
  assert.equal(isEligible({ ...base, status: "Cancelled" }), false);
  assert.equal(isEligible({ ...base, eligible: false }), false);
  assert.equal(orderState({ ...base, stale: true }), "needs_review");
  assert.equal(orderState({ ...base, paymentId: "p" }), "paid");
  assert.equal(orderState({ ...base, status: "Recalled" }), "not_owed");
  assert.equal(orderState({ ...base, paymentState: "needs_review" }), "needs_review");
});

test("summary prefers server summary and falls back with exact cents", () => {
  const server = {
    currency: "USD" as const,
    owed: { amount: "1.00", count: 1 },
    paid: { amount: "2.00", count: 1 },
    needsReview: { amount: "0.00", count: 0 },
    notOwed: { amount: "0.00", count: 0 },
    unavailableCount: 0,
  };
  assert.equal(summarize([base], server), server);
  const s = summarize([
    { ...base, id: "a", totalCost: "10.10" },
    { ...base, id: "b", totalCost: "20.20" },
    { ...base, id: "c", paymentId: "p", totalCost: "5" },
    { ...base, id: "d", stale: true, totalCost: "7" },
    { ...base, id: "e", totalCost: "nope" },
  ]);
  assert.deepEqual(s.owed, { amount: "30.30", count: 2 });
  assert.deepEqual(s.paid, { amount: "5.00", count: 1 });
  assert.deepEqual(s.needsReview, { amount: "7.00", count: 2 });
  assert.equal(s.unavailableCount, 1);
});

test("filters by search, payment, fulfilment and dates", () => {
  const rows: LedgerOrder[] = [
    { ...base, id: "a", reference: "ALPHA", submittedAt: "2026-01-05T10:00:00Z", sourceOrders: [{ id: "x", code: "12656", username: "jbg" }] },
    { ...base, id: "b", reference: "BETA", status: "Shipped", submittedAt: "2026-02-05T10:00:00Z" },
    { ...base, id: "c", reference: "GAMMA", paymentId: "p", submittedAt: null },
  ];
  const f = { query: "", payment: "all", fulfilment: "all", from: "", to: "" };
  assert.deepEqual(filterOrders(rows, { ...f, query: "12656" }).map((o) => o.id), ["a"]);
  assert.deepEqual(filterOrders(rows, { ...f, query: "jbg" }).map((o) => o.id), ["a"]);
  assert.deepEqual(filterOrders(rows, { ...f, payment: "paid" }).map((o) => o.id), ["c"]);
  assert.deepEqual(filterOrders(rows, { ...f, fulfilment: "Shipped" }).map((o) => o.id), ["b"]);
  assert.deepEqual(filterOrders(rows, { ...f, from: "2026-02-01" }).map((o) => o.id), ["b"]);
  assert.deepEqual(filterOrders(rows, { ...f, to: "2026-01-31" }).map((o) => o.id), ["a"]);
  assert.deepEqual(filterOrders(rows, { ...f, from: "garbage" }).map((o) => o.id), ["a", "b", "c"]);
});

test("paginates and caps page selection at 200 preserving other pages", () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ ...base, id: `o${i}` }));
  const p = paginate(rows, 9, 25);
  assert.equal(p.page, 2);
  assert.equal(p.rows.length, 5);
  const sel = selectPage(new Set(["keep"]), paginate(rows, 1, 25).rows);
  assert.equal(sel.next.size, 26);
  const full = new Set(Array.from({ length: MAX_SELECTION - 1 }, (_, i) => `x${i}`));
  const capped = selectPage(full, rows);
  assert.equal(capped.next.size, MAX_SELECTION);
  assert.equal(capped.skipped, 29);
  assert.equal(toggleOne(capped.next, { ...base, id: "new" }).size, MAX_SELECTION);
  assert.equal(selectPage(new Set(), [{ ...base, stale: true }]).next.size, 0);
});

test("selected total sums exact cents of eligible selected orders", () => {
  const rows = [{ ...base, id: "a", totalCost: "10.10" }, { ...base, id: "b", totalCost: "20.20" }, { ...base, id: "c", paymentId: "p" }];
  assert.equal(selectedTotal(rows, new Set(["a", "b", "c"])).total, 3030n);
  assert.equal(selectedTotal(rows, new Set(["a", "b", "c"])).orders.length, 2);
});

test("payment date validates before toISOString", () => {
  assert.deepEqual(parsePaidAt(""), { ok: true, iso: undefined });
  assert.equal(parsePaidAt("not a date").ok, false);
  const r = parsePaidAt("2026-01-02T03:04");
  assert.equal(r.ok, true);
});
