import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDispatchLanes,
  buildOrderTrend,
  buildProductAllocation,
  type ProductAllocation,
  type ProductAllocationInput,
} from "./approved-selectors.ts";
import type { OrganiserOrder } from "./domain/order.ts";
import { SAMPLE_ORDERS } from "./domain/sample-orders.ts";
import type {
  DeskState,
  DispatchOrder,
  DispatchRecord,
  QrState,
} from "./dispatch/types.ts";

const EMPTY_TREND = [
  { date: "1970-01-01", label: "1970-01-01", received: 0, verified: 0 },
  { date: "1970-01-02", label: "1970-01-02", received: 0, verified: 0 },
  { date: "1970-01-03", label: "1970-01-03", received: 0, verified: 0 },
  { date: "1970-01-04", label: "1970-01-04", received: 0, verified: 0 },
] as const;

function orderAt(
  id: string,
  createdAt: string,
  status: OrganiserOrder["status"],
): OrganiserOrder {
  return { ...SAMPLE_ORDERS[0]!, id, createdAt, status };
}

test("buildOrderTrend returns deterministic points for empty input", () => {
  assert.deepEqual(buildOrderTrend([]), EMPTY_TREND);
});

test("buildOrderTrend groups timezone-less datetimes by their literal calendar date", () => {
  const originalTimezone = process.env.TZ;
  process.env.TZ = "Pacific/Kiritimati";

  try {
    assert.deepEqual(
      buildOrderTrend([
        orderAt("date-only", "2026-03-01", "pending"),
        orderAt("timezone-less", "2026-03-01T00:30:00", "paid"),
      ]),
      [
        { date: "2026-02-26", label: "2026-02-26", received: 0, verified: 0 },
        { date: "2026-02-27", label: "2026-02-27", received: 0, verified: 0 },
        { date: "2026-02-28", label: "2026-02-28", received: 0, verified: 0 },
        { date: "2026-03-01", label: "2026-03-01", received: 2, verified: 1 },
      ],
    );
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

test("buildOrderTrend rejects impossible calendar dates", () => {
  for (const createdAt of ["2026-02-30", "2026-02-30T12:00:00"]) {
    assert.deepEqual(
      buildOrderTrend([orderAt("impossible", createdAt, "paid")]),
      EMPTY_TREND,
    );
  }
});

test("buildOrderTrend rejects malformed datetime suffixes", () => {
  for (const createdAt of [
    "2026-03-01T",
    "2026-03-01Trash",
    "2026-03-01Tgarbage",
    "2026-03-01T24:00:00Z",
    "2026-03-01T12:60:00Z",
  ]) {
    assert.deepEqual(
      buildOrderTrend([orderAt("malformed", createdAt, "paid")]),
      EMPTY_TREND,
    );
  }
});

test("buildOrderTrend accepts organiser ISO-like datetime formats", () => {
  const points = buildOrderTrend([
    orderAt("seconds", "2026-03-01T14:30:00Z", "paid"),
    orderAt("milliseconds", "2026-03-01T14:30:00.123Z", "paid"),
    orderAt("timezone-less", "2026-03-01T14:30:00", "paid"),
    orderAt("offset", "2026-03-01T14:30:00+01:00", "paid"),
  ]);
  assert.deepEqual(points, [
    { date: "2026-02-26", label: "2026-02-26", received: 0, verified: 0 },
    { date: "2026-02-27", label: "2026-02-27", received: 0, verified: 0 },
    { date: "2026-02-28", label: "2026-02-28", received: 0, verified: 0 },
    { date: "2026-03-01", label: "2026-03-01", received: 4, verified: 4 },
  ]);
});

test("buildOrderTrend excludes cancelled orders and returns exact totals", () => {
  const cancelled = {
    ...SAMPLE_ORDERS[0]!,
    id: "ORD-CANCELLED",
    status: "cancelled" as const,
  };
  const points = buildOrderTrend(SAMPLE_ORDERS);
  assert.equal(points.at(-1)?.received, 4);
  assert.equal(points.at(-1)?.verified, 3);

  const withCancelled = buildOrderTrend([...SAMPLE_ORDERS, cancelled]);
  assert.equal(withCancelled.at(-1)?.received, 4);
  assert.equal(withCancelled.at(-1)?.verified, 3);
});

function dispatchOrder(id: string, qrState: QrState): DispatchOrder {
  return {
    id,
    code: `GB-${id}`,
    memberName: `Member ${id}`,
    telegramUsername: id,
    deliveryMethod: "Tracked",
    shippingCountry: "United Kingdom",
    qrState,
    items: [{ productId: "product-1", name: "Product 1", quantity: 1 }],
  };
}

test("buildDispatchLanes assigns each dispatch state to its exact lane", () => {
  const unready = dispatchOrder("unready", "not_required");
  const reminder = dispatchOrder("reminder", "reminder_needed");
  const uploaded = dispatchOrder("uploaded", "uploaded");
  const notRequired = dispatchOrder("not-required", "not_required");
  const logged: DispatchRecord = {
    ...dispatchOrder("logged", "not_required"),
    dispatchedAt: "2026-07-11T16:20:00Z",
    parcelIds: ["parcel-1"],
    dispatchPhotos: [],
  };
  const state: DeskState = {
    stage: "prepare",
    view: "desk",
    scopeType: "all",
    scopeId: "",
    parcels: [],
    orders: [unready, reminder, uploaded, notRequired],
    selectedParcelIds: [],
    fulfilment: [
      {
        order: unready,
        ready: false,
        missingItems: [{ ...unready.items[0]!, available: 0 }],
      },
      { order: reminder, ready: true, missingItems: [] },
      { order: uploaded, ready: true, missingItems: [] },
      { order: notRequired, ready: true, missingItems: [] },
    ],
    selectedOrderIds: [],
    log: [logged],
  };
  const before = structuredClone(state);

  const lanes = buildDispatchLanes(state);

  assert.deepEqual(
    lanes.map((lane) => ({
      id: lane.id,
      orders: lane.orders.map((order) => order.id),
    })),
    [
      { id: "awaiting", orders: ["unready"] },
      { id: "packing", orders: ["reminder"] },
      { id: "label", orders: ["uploaded", "not-required"] },
      { id: "carrier", orders: ["logged"] },
    ],
  );
  assert.deepEqual(state, before);
});

test("buildProductAllocation returns exact sanitized allocation records", () => {
  const cases: Array<{
    input: ProductAllocationInput;
    expected: ProductAllocation;
  }> = [
    {
      input: { id: "sufficient", soldCount: 9, stock: 12, visible: true },
      expected: {
        id: "sufficient", required: 9, ordered: 12, received: 12,
        allocated: 9, available: 3, progress: 100, readiness: "ready",
      },
    },
    {
      input: { id: "shortage", soldCount: 9, stock: 3, visible: true },
      expected: {
        id: "shortage", required: 9, ordered: 9, received: 3,
        allocated: 3, available: 0, progress: 33, readiness: "shortage",
      },
    },
    {
      input: { id: "hidden", soldCount: 9, stock: 3, visible: false },
      expected: {
        id: "hidden", required: 9, ordered: 9, received: 3,
        allocated: 3, available: 0, progress: 33, readiness: "review",
      },
    },
    {
      input: { id: "unlimited", soldCount: 9, stock: null, visible: true },
      expected: {
        id: "unlimited", required: 9, ordered: 9, received: 9,
        allocated: 9, available: 0, progress: 100, readiness: "ready",
      },
    },
    {
      input: { id: "zero", soldCount: 0, stock: 0, visible: true },
      expected: {
        id: "zero", required: 0, ordered: 0, received: 0,
        allocated: 0, available: 0, progress: 100, readiness: "ready",
      },
    },
    {
      input: { id: "negative", soldCount: -9, stock: -3, visible: true },
      expected: {
        id: "negative", required: 0, ordered: 0, received: 0,
        allocated: 0, available: 0, progress: 100, readiness: "ready",
      },
    },
    {
      input: { id: "nan", soldCount: Number.NaN, stock: Number.NaN, visible: true },
      expected: {
        id: "nan", required: 0, ordered: 0, received: 0,
        allocated: 0, available: 0, progress: 100, readiness: "ready",
      },
    },
    {
      input: { id: "infinity", soldCount: Number.POSITIVE_INFINITY, stock: Number.POSITIVE_INFINITY, visible: true },
      expected: {
        id: "infinity", required: 0, ordered: 0, received: 0,
        allocated: 0, available: 0, progress: 100, readiness: "ready",
      },
    },
  ];

  for (const { input, expected } of cases) {
    const before = structuredClone(input);
    assert.deepEqual(buildProductAllocation(input), expected);
    assert.deepEqual(input, before);
  }
});
