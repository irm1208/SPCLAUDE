export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "dispatched",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderProduct {
  id?: string;
  productId?: string;
  name: string;
  quantity: number;
  price: number;
  isOos?: boolean;
}

export interface PaymentProof {
  type: "txid" | "screenshot";
  value: string;
}

export interface OrderFlag {
  note: string;
  dueDate?: string;
  dueTime?: string;
}

export interface OrganiserOrder {
  id: string;
  code?: string;
  memberUsername: string;
  memberName: string;
  status: OrderStatus;
  apiStatus?: string;
  paymentStatus?: string;
  products: OrderProduct[];
  total: number;
  paymentMethod: string;
  country: string;
  createdAt: string;
  paidAt?: string;
  shippingOption: string;
  paymentProof?: PaymentProof;
  trackingNumber?: string;
  internalNotes?: string;
  flagged?: OrderFlag;
}

export interface OrderNormalizationIssue {
  index: number;
  code: "invalid_order";
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeProducts(value: unknown): OrderProduct[] | null {
  if (!Array.isArray(value)) return null;
  const products: OrderProduct[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const name = requiredString(item, "name");
    const quantity = Number(item["quantity"]);
    const price = Number(item["price"] ?? 0);
    if (!name || !Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(price) || price < 0) return null;
    products.push({ name, quantity, price });
  }
  return products;
}

function normalizePaymentProof(value: unknown): PaymentProof | undefined {
  if (!isRecord(value)) return undefined;
  const type = value["type"];
  const proofValue = value["value"];
  if ((type !== "txid" && type !== "screenshot") || typeof proofValue !== "string" || !proofValue) return undefined;
  return { type, value: proofValue };
}

function normalizeFlag(value: unknown): OrderFlag | undefined {
  if (!isRecord(value)) return undefined;
  const note = requiredString(value, "note");
  if (!note) return undefined;
  return {
    note,
    dueDate: optionalString(value, "dueDate"),
    dueTime: optionalString(value, "dueTime"),
  };
}

function normalizeStatus(value: unknown): OrderStatus | null {
  if (value === "awaiting_payment") return "pending";
  return ORDER_STATUSES.includes(value as OrderStatus) ? (value as OrderStatus) : null;
}

function createLegacyOrderId(record: Record<string, unknown>, index: number): string {
  const seed = [
    requiredString(record, "memberUsername") ?? requiredString(record, "memberName") ?? "member",
    requiredString(record, "createdAt") ?? "unknown-date",
    String(record["total"] ?? ""),
    String(index),
  ].join("|");
  let hash = 2166136261;
  for (let position = 0; position < seed.length; position += 1) {
    hash ^= seed.charCodeAt(position);
    hash = Math.imul(hash, 16777619);
  }
  return `legacy-order-${(hash >>> 0).toString(36)}`;
}

export function normalizeOrder(value: unknown, fallbackId?: string): OrganiserOrder | null {
  if (!isRecord(value)) return null;

  const id = requiredString(value, "id") ?? fallbackId ?? null;
  const memberUsername = requiredString(value, "memberUsername") ?? "unknown";
  const memberName = requiredString(value, "memberName");
  const status = normalizeStatus(value["status"]);
  const products = normalizeProducts(value["products"]);
  const total = Number(value["total"]);
  const paymentMethod = requiredString(value, "paymentMethod") ?? "Manual";
  const country = requiredString(value, "country") ?? "Unknown";
  const createdAt = requiredString(value, "createdAt");
  const shippingOption = requiredString(value, "shippingOption") ?? "Not selected";

  if (
    !id ||
    !memberName ||
    !status ||
    !products ||
    !Number.isFinite(total) ||
    total < 0 ||
    !createdAt
  ) return null;

  return {
    id,
    memberUsername,
    memberName,
    status,
    paymentStatus: optionalString(value, "paymentStatus"),
    products,
    total,
    paymentMethod,
    country,
    createdAt,
    paidAt: optionalString(value, "paidAt"),
    shippingOption,
    paymentProof: normalizePaymentProof(value["paymentProof"]),
    trackingNumber: optionalString(value, "trackingNumber"),
    internalNotes: optionalString(value, "internalNotes"),
    flagged: normalizeFlag(value["flagged"]),
  };
}

export function normalizeOrdersWithIssues(value: unknown): {
  orders: OrganiserOrder[];
  issues: OrderNormalizationIssue[];
} {
  if (!Array.isArray(value)) return { orders: [], issues: [] };
  const orders: OrganiserOrder[] = [];
  const issues: OrderNormalizationIssue[] = [];
  value.forEach((item, index) => {
    const fallbackId = isRecord(item) ? createLegacyOrderId(item, index) : undefined;
    const order = normalizeOrder(item, fallbackId);
    if (order) {
      orders.push(order);
    } else {
      issues.push({
        index,
        code: "invalid_order",
        message: `Order record ${index + 1} could not be normalized`,
      });
    }
  });
  return { orders, issues };
}

export function normalizeOrders(value: unknown): OrganiserOrder[] {
  return normalizeOrdersWithIssues(value).orders;
}
