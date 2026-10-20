import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { OrganiserOrder } from "./domain/order.ts";
import {
  countActiveOrderFilterCategories,
  createOrderFilterChips,
  filterOrders,
  validateOrderFilterDates,
  type OrderFilterValues,
} from "./orders-filter-model.ts";

const baseFilters: OrderFilterValues = {
  statusFilters: ["all"],
  countryFilters: [],
  paymentMethodFilters: [],
  orderDateFrom: "",
  orderDateTo: "",
  paymentDateFrom: "",
  paymentDateTo: "",
  sortOrder: "newest",
};

const orders: OrganiserOrder[] = [
  {
    id: "ORD-001",
    memberUsername: "john_doe",
    memberName: "John D.",
    status: "paid",
    products: [{ name: "Tirzepatide 10mg", quantity: 2, price: 60 }],
    total: 120,
    paymentMethod: "USDT",
    country: "United Kingdom",
    createdAt: "2026-07-10T14:30:00Z",
    paidAt: "2026-07-11T09:00:00Z",
    shippingOption: "Tracked",
    paymentProof: { type: "txid", value: "0xabc123" },
  },
  {
    id: "ORD-002",
    memberUsername: "sarah_m",
    memberName: "Sarah M.",
    status: "pending",
    products: [{ name: "Semaglutide 5mg", quantity: 1, price: 65 }],
    total: 65,
    paymentMethod: "Revolut",
    country: "France",
    createdAt: "2026-07-12T18:15:00Z",
    shippingOption: "Express",
  },
  {
    id: "ORD-003",
    memberUsername: "anna_p",
    memberName: "Anna P.",
    status: "processing",
    products: [{ name: "BPC-157 5mg", quantity: 2, price: 30 }],
    total: 60,
    paymentMethod: "PayPal",
    country: "Germany",
    createdAt: "2026-07-09T16:20:00Z",
    paidAt: "2026-07-10T08:00:00Z",
    shippingOption: "Tracked",
  },
];

test("test-payment filter includes Test Sent and Test OK regardless of fulfilment status", () => {
  const candidates: OrganiserOrder[] = [
    { ...orders[0], id: "sent", status: "pending", paymentStatus: "test_ready" },
    { ...orders[0], id: "test-ok", paymentStatus: "test_confirmed" },
    { ...orders[0], id: "shipped-test", status: "shipped", paymentStatus: " TEST_CONFIRMED " },
    { ...orders[0], id: "paid", paymentStatus: "confirmed" },
    { ...orders[0], id: "unpaid", paymentStatus: "unpaid" },
    { ...orders[0], id: "review", paymentStatus: "pending_confirmation" },
    { ...orders[0], id: "missing", paymentStatus: undefined },
  ];
  assert.deepEqual(
    filterOrders(candidates, { ...baseFilters, statusFilters: ["test-payments"] }, "").map(o => o.id),
    ["sent", "test-ok", "shipped-test"],
  );
  assert.equal(filterOrders(candidates, baseFilters, "").length, candidates.length);
});

test("test-payment selection combines with country, method, search and amount sorting", () => {
  const candidates: OrganiserOrder[] = [
    { ...orders[0], id: "sent", paymentStatus: "test_ready", total: 80 },
    { ...orders[0], id: "test-ok", paymentStatus: "test_confirmed", total: 50 },
    { ...orders[1], id: "other-country", paymentStatus: "test_ready" },
    { ...orders[0], id: "other-method", paymentStatus: "test_ready", paymentMethod: "PayPal" },
  ];
  const filters: OrderFilterValues = {
    ...baseFilters, statusFilters: ["test-payments"],
    countryFilters: ["United Kingdom"], paymentMethodFilters: ["USDT"], sortOrder: "amount-asc",
  };
  assert.deepEqual(filterOrders(candidates, filters, "john").map(o => o.id), ["test-ok", "sent"]);
  assert.deepEqual(filterOrders(candidates, filters, "no-match"), []);
  assert.deepEqual(createOrderFilterChips({ ...baseFilters, statusFilters: ["test-payments"] }), [
    { id: "status", label: "Status: Test Sent / Test OK" },
  ]);
});

test("both organiser screens expose the combined filter on mobile and desktop", () => {
  const legacy = readFileSync(new URL("../GbOrganiser.tsx", import.meta.url), "utf8");
  const modern = readFileSync(new URL("./OrdersTab.tsx", import.meta.url), "utf8");
  assert.equal((legacy.match(/id: "test-payments", label: "Test Sent \/ Test OK"/g) ?? []).length, 2);
  assert.match(legacy, /filter === "test-payments" \? reviewOrders\.filter\(matchesTestPayment\)/);
  assert.match(modern, /value: "test-payments", label: "Test Sent \/ Test OK"/);
});

test("amount sorting works in both directions without changing the original orders", () => {
  assert.deepEqual(filterOrders(orders, { ...baseFilters, sortOrder: "amount-asc" }, "").map(order => order.id), ["ORD-003", "ORD-002", "ORD-001"]);
  assert.deepEqual(filterOrders(orders, { ...baseFilters, sortOrder: "amount-desc" }, "").map(order => order.id), ["ORD-001", "ORD-002", "ORD-003"]);
  assert.equal(orders[0].id, "ORD-001");
});

test("active filter count uses categories rather than selected values", () => {
  assert.equal(countActiveOrderFilterCategories({
    ...baseFilters,
    statusFilters: ["paid", "unpaid"],
    countryFilters: ["United Kingdom", "France"],
    orderDateFrom: "2026-07-01",
  }), 3);
});

test("filter chips summarise multiple selections and humanise statuses", () => {
  assert.deepEqual(createOrderFilterChips({
    ...baseFilters,
    statusFilters: ["pending-confirmation"],
    countryFilters: ["United Kingdom", "France"],
    paymentMethodFilters: ["USDT"],
  }), [
    { id: "status", label: "Status: Pending confirmation" },
    { id: "country", label: "Country: 2 selected" },
    { id: "payment", label: "Payment: USDT" },
  ]);
});

test("date validation rejects reversed ranges", () => {
  assert.deepEqual(validateOrderFilterDates({
    ...baseFilters,
    orderDateFrom: "2026-07-15",
    orderDateTo: "2026-07-01",
  }), { orderDate: "Order date from must be before order date to." });
});

test("draft preview filters without mutating the input", () => {
  const draft: OrderFilterValues = {
    ...baseFilters,
    statusFilters: ["paid"],
    countryFilters: ["United Kingdom"],
  };
  const result = filterOrders(orders, draft, "abc123");
  assert.deepEqual(result.map(order => order.id), ["ORD-001"]);
  assert.deepEqual(draft.countryFilters, ["United Kingdom"]);
});

test("status filter maps the existing UI status choices", () => {
  assert.deepEqual(
    filterOrders(orders, { ...baseFilters, statusFilters: ["unpaid", "pending-confirmation"] }, "")
      .map(order => order.id),
    ["ORD-002", "ORD-003"],
  );
});

test("to dates include the whole selected calendar day", () => {
  const result = filterOrders(orders, { ...baseFilters, orderDateTo: "2026-07-12" }, "");
  assert.deepEqual(result.map(order => order.id), ["ORD-002", "ORD-001", "ORD-003"]);
});

test("search includes the member-facing order code", () => {
  const coded = { ...orders[0], id: "internal-id", code: "10482" };
  assert.deepEqual(filterOrders([coded], baseFilters, "10482").map(order => order.id), ["internal-id"]);
});

test("pending confirmation uses the live payment status", () => {
  const review = { ...orders[1], paymentStatus: "pending_confirmation" };
  assert.deepEqual(
    filterOrders([review], { ...baseFilters, statusFilters: ["pending-confirmation"] }, "")
      .map(order => order.id),
    ["ORD-002"],
  );
});

test("operational filters expose dispatch-ready and completed orders", () => {
  const dispatched = { ...orders[0], id: "ORD-004", status: "dispatched" as const };
  assert.deepEqual(
    filterOrders([...orders, dispatched], { ...baseFilters, statusFilters: ["ready-dispatch"] }, "")
      .map(order => order.id),
    ["ORD-001", "ORD-003"],
  );
  assert.deepEqual(
    filterOrders([...orders, dispatched], { ...baseFilters, statusFilters: ["completed"] }, "")
      .map(order => order.id),
    ["ORD-004"],
  );
});
