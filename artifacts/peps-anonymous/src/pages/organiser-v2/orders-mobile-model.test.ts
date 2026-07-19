import assert from "node:assert/strict";
import test from "node:test";
import type { OrganiserOrder } from "./domain/order.ts";
import {
  buildMobileOrdersModel,
  applyMobileOrderAction,
  selectMobileOrderView,
} from "./orders-mobile-model.ts";
import type { OrderFilterValues } from "./orders-filter-model.ts";

const NOW = Date.parse("2026-07-15T12:00:00Z");

function order(id: string, status: OrganiserOrder["status"], overrides: Partial<OrganiserOrder> = {}): OrganiserOrder {
  return {
    id,
    code: id.replace("order-", "1048"),
    memberUsername: id,
    memberName: id,
    status,
    products: [{ name: "BPC-157", quantity: 2, price: 30 }],
    total: 60,
    paymentMethod: "Revolut",
    country: "United Kingdom",
    createdAt: "2026-07-08T12:00:00Z",
    shippingOption: "Tracked",
    ...overrides,
  };
}

test("mobile model prioritises overdue payment and flagged orders", () => {
  const model = buildMobileOrdersModel([
    order("order-pending", "pending", { total: 65 }),
    order("order-flagged", "paid", { flagged: { note: "Address missing" } }),
    order("order-ready", "processing"),
    order("order-done", "delivered"),
  ], NOW);

  assert.equal(model.summary.paymentCount, 1);
  assert.equal(model.summary.paymentTotal, 65);
  assert.equal(model.summary.dispatchReadyCount, 2);
  assert.deepEqual(model.needsAction.map(item => item.order.id), ["order-pending", "order-flagged"]);
  assert.equal(model.needsAction[0].label, "7 days overdue");
  assert.equal(model.needsAction[1].label, "Address missing");
});

test("mobile views reuse the same normalized orders", () => {
  const pending = order("order-pending", "pending");
  const complete = order("order-complete", "dispatched");
  const model = buildMobileOrdersModel([pending, complete], NOW);
  assert.deepEqual(selectMobileOrderView(model, [pending, complete], "needs-action").map(item => item.id), [pending.id]);
  assert.deepEqual(selectMobileOrderView(model, [pending, complete], "all").map(item => item.id), [pending.id, complete.id]);
  assert.deepEqual(selectMobileOrderView(model, [pending, complete], "completed").map(item => item.id), [complete.id]);
});

test("mobile actions clone filters instead of mutating them", () => {
  const filters: OrderFilterValues = {
    statusFilters: ["all"],
    countryFilters: ["France"],
    paymentMethodFilters: [],
    orderDateFrom: "",
    orderDateTo: "",
    paymentDateFrom: "",
    paymentDateTo: "",
    sortOrder: "newest" as const,
  };
  const next = applyMobileOrderAction(filters, "chase-payment");
  assert.deepEqual(next.statusFilters, ["unpaid", "pending-confirmation"]);
  assert.deepEqual(filters.statusFilters, ["all"]);
});
