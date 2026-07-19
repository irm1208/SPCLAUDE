import type { OrganiserOrder } from "./domain/order.ts";
import type {
  DeskState,
  DispatchOrder,
  DispatchRecord,
} from "./dispatch/types.ts";

export interface OrderTrendPoint {
  date: string;
  label: string;
  received: number;
  verified: number;
}

const VERIFIED_ORDER_STATUSES = new Set<OrganiserOrder["status"]>([
  "paid",
  "processing",
  "shipped",
  "delivered",
  "dispatched",
]);

const ORGANISER_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:$|T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?)$/;

function toCalendarDate(value: string): string | null {
  const match = ORGANISER_DATE_PATTERN.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const candidate = new Date(`${yearText}-${monthText}-${dayText}T00:00:00.000Z`);

  if (
    !Number.isFinite(candidate.getTime())
    || candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() + 1 !== month
    || candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return `${yearText}-${monthText}-${dayText}`;
}

function shiftCalendarDate(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/**
 * Groups orders by their received date and returns cumulative series values.
 * Invalid dates are ignored instead of introducing non-deterministic labels.
 */
export function buildOrderTrend(orders: readonly OrganiserOrder[]): OrderTrendPoint[] {
  const daily = new Map<string, { received: number; verified: number }>();

  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const date = toCalendarDate(order.createdAt);
    if (!date) continue;

    const totals = daily.get(date) ?? { received: 0, verified: 0 };
    totals.received += 1;
    if (VERIFIED_ORDER_STATUSES.has(order.status)) totals.verified += 1;
    daily.set(date, totals);
  }

  if (daily.size === 0) {
    for (let day = 0; day < 4; day += 1) {
      daily.set(shiftCalendarDate("1970-01-01", day), { received: 0, verified: 0 });
    }
  } else if (daily.size < 4) {
    const firstDate = [...daily.keys()].sort()[0]!;
    for (let daysBefore = 1; daily.size < 4; daysBefore += 1) {
      daily.set(shiftCalendarDate(firstDate, -daysBefore), { received: 0, verified: 0 });
    }
  }

  let received = 0;
  let verified = 0;

  return [...daily.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, totals]) => {
      received += totals.received;
      verified += totals.verified;
      return {
        date,
        label: date,
        received,
        verified,
      };
    });
}

export type DispatchLaneId =
  | "awaiting"
  | "packing"
  | "label"
  | "carrier";

export type DispatchLaneOrder = DispatchOrder | DispatchRecord;

export interface DispatchLane {
  id: DispatchLaneId;
  label: string;
  orders: DispatchLaneOrder[];
}

/**
 * Projects the dispatch desk into the four approved presentation lanes.
 * Logged records are kept separate from active orders and every input order is
 * appended to exactly one newly-created lane.
 */
export function buildDispatchLanes(state: DeskState): DispatchLane[] {
  const lanes: DispatchLane[] = [
    { id: "awaiting", label: "Awaiting stock", orders: [] },
    { id: "packing", label: "Ready to pack", orders: [] },
    { id: "label", label: "Label ready", orders: [] },
    { id: "carrier", label: "Handed to carrier", orders: [] },
  ];
  const laneById = new Map(lanes.map((lane) => [lane.id, lane]));
  const fulfilmentByOrderId = new Map(
    (state.fulfilment ?? []).map((row) => [row.order.id, row]),
  );

  for (const order of state.orders) {
    const fulfilment = fulfilmentByOrderId.get(order.id);
    const laneId: DispatchLaneId = !fulfilment?.ready
      ? "awaiting"
      : order.qrState === "uploaded" || order.qrState === "not_required"
        ? "label"
        : "packing";
    laneById.get(laneId)!.orders.push(order);
  }

  laneById.get("carrier")!.orders.push(...state.log);
  return lanes;
}

export interface ProductAllocationInput {
  id: string;
  soldCount: number;
  stock: number | null;
  visible: boolean;
}

export type ProductReadiness = "ready" | "shortage" | "review";

export interface ProductAllocation {
  id: string;
  required: number;
  ordered: number;
  received: number;
  allocated: number;
  available: number;
  progress: number;
  readiness: ProductReadiness;
}

/**
 * Builds display-only procurement totals from the catalogue's demand and stock
 * fields. Unlimited stock is treated as sufficient for current demand.
 */
export function buildProductAllocation(product: ProductAllocationInput): ProductAllocation {
  const required = toNonNegativeInteger(product.soldCount);
  const received = product.stock === null
    ? required
    : toNonNegativeInteger(product.stock);
  const ordered = Math.max(required, received);
  const allocated = Math.min(required, received);
  const available = Math.max(0, received - allocated);
  const progress = required === 0 ? 100 : Math.round((allocated / required) * 100);
  const readiness: ProductReadiness = !product.visible
    ? "review"
    : allocated >= required
      ? "ready"
      : "shortage";

  return {
    id: product.id,
    required,
    ordered,
    received,
    allocated,
    available,
    progress,
    readiness,
  };
}

function toNonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}
