export type PaymentState = "owed" | "paid" | "needs_review" | "not_owed";
export type SourceOrder = { id: string; code: string | null; username: string | null };
export type LineItem = { productName: string; quantity: number | null; unitCost: string | null; lineTotal: string | null };
export type Wallet = { id: string; currency: string; network: string; address: string; label?: string };
export type OrderProfit = {
  currency: "USD";
  basis: "product_gross";
  salesUsd: string | null;
  supplierProductsUsd: string | null;
  amountUsd: string | null;
  reason: string | null;
  definition: string;
};
export type LedgerOrder = {
  id: string;
  reference: string;
  status: string;
  stale: boolean;
  totalCost: string | number | null;
  currencyUSD?: boolean;
  paymentId: string | null;
  sourceType?: "order" | "shared";
  sourceId?: string;
  submittedAt?: string | null;
  sourceOrders?: SourceOrder[];
  items?: LineItem[];
  productCost?: string | null;
  shippingCost?: string | null;
  eligible?: boolean;
  paymentState?: PaymentState;
  reviewReason?: string | null;
  paidAmountUsd?: string | null;
  reviewToken?: string;
  canRemove?: boolean;
  requiresRemovalOverride?: boolean;
  removalReason?: string | null;
  profit?: OrderProfit;
};
export type ReceiptDetail = {
  sourceType: "order" | "shared";
  sourceId: string;
  submittedAt: string | null;
  sourceOrders: SourceOrder[];
  items: LineItem[];
  productCost: string | null;
  shippingCost: string | null;
  totalCost: string | null;
  currency: "USD";
};
export type Receipt = {
  id: string;
  txid: string;
  cryptoAmount: string;
  usdAmount: string | number;
  currency: string;
  network: string;
  walletSnapshot: { currency: string; network: string; address: string; label?: string };
  orders: { submissionId: string; reference: string; amountUsd: string; detail?: ReceiptDetail }[];
  paidAt: string;
  recordedAt: string;
  recordedBy: string;
  voidedAt: string | null;
  voidReason: string | null;
  note?: string;
};
type Bucket = { amount: string; count: number };
export type Summary = { currency: "USD"; owed: Bucket; paid: Bucket; needsReview: Bucket; notOwed: Bucket; unavailableCount: number };
export type LedgerData = {
  vendors: { id: string; name: string }[];
  vendorId: string;
  wallets: Wallet[];
  orders: LedgerOrder[];
  payments: Receipt[];
  summary?: Summary;
};
export type Filters = { query: string; payment: string; fulfilment: string; from: string; to: string };

export const MAX_SELECTION = 200;
export const PAGE_SIZE = 25;
const PAYABLE_STATUSES = new Set(["Submitted", "Processing", "Shipped", "Completed"]);
export const STATE_LABEL: Record<PaymentState, string> = { owed: "Owed", paid: "Paid", needs_review: "Needs review", not_owed: "Not owed" };
export const STATE_TONE: Record<PaymentState, string> = { owed: "#1B3A7A", paid: "#15803D", needs_review: "#B4770E", not_owed: "#6B7280" };

export function cents(value: string | number | null | undefined): bigint | null {
  if (value === null || value === undefined) return null;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value).trim());
  return match ? BigInt(match[1]) * 100n + BigInt((match[2] || "").padEnd(2, "0")) : null;
}
export function plain(value: bigint) {
  return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
}
export function money(value: bigint | null) {
  if (value === null) return "Unavailable";
  const whole = (value / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${whole}.${String(value % 100n).padStart(2, "0")}`;
}
export const moneyOf = (v: string | number | null | undefined) => money(cents(v));
export function signedCents(value: string | number | null | undefined): bigint | null {
  if (value === null || value === undefined) return null;
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(String(value).trim());
  if (!match) return null;
  const amount = BigInt(match[2]) * 100n + BigInt((match[3] || "").padEnd(2, "0"));
  return match[1] ? -amount : amount;
}
export function signedMoneyOf(value: string | number | null | undefined) {
  const amount = signedCents(value);
  if (amount === null) return "Unavailable";
  return amount < 0n ? `-$${money(-amount).slice(1)}` : money(amount);
}

export function isEligible(o: LedgerOrder) {
  if (typeof o.eligible === "boolean") return o.eligible;
  const c = cents(o.totalCost);
  return !o.stale && !o.paymentId && c !== null && c > 0n && PAYABLE_STATUSES.has(o.status);
}
export function orderState(o: LedgerOrder): PaymentState {
  if (o.paymentState) return o.paymentState;
  if (o.paymentId) return "paid";
  if (o.stale) return "needs_review";
  if (isEligible(o)) return "owed";
  if (PAYABLE_STATUSES.has(o.status)) return "needs_review";
  return "not_owed";
}

export function summarize(orders: LedgerOrder[], server?: Summary): Summary {
  if (server && server.owed && server.paid && server.needsReview && server.notOwed) return server;
  const acc: Record<PaymentState, { c: bigint; n: number }> = { owed: { c: 0n, n: 0 }, paid: { c: 0n, n: 0 }, needs_review: { c: 0n, n: 0 }, not_owed: { c: 0n, n: 0 } };
  let unavailableCount = 0;
  for (const o of orders) {
    const s = orderState(o);
    const c = cents(s === "paid" ? o.paidAmountUsd ?? o.totalCost : o.totalCost);
    acc[s].n++;
    if (c === null) unavailableCount++;
    else acc[s].c += c;
  }
  const b = (k: PaymentState) => ({ amount: plain(acc[k].c), count: acc[k].n });
  return { currency: "USD", owed: b("owed"), paid: b("paid"), needsReview: b("needs_review"), notOwed: b("not_owed"), unavailableCount };
}

/** Parses a YYYY-MM-DD date input; returns null when blank or invalid. */
function dayBound(v: string, end: boolean): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T${end ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}
export function dateFilterValid(v: string) {
  return !v || dayBound(v, false) !== null;
}

export function filterOrders(orders: LedgerOrder[], f: Filters) {
  const q = f.query.trim().toLowerCase();
  const from = dayBound(f.from, false);
  const to = dayBound(f.to, true);
  return orders.filter((o) => {
    if (f.payment !== "all" && orderState(o) !== f.payment) return false;
    if (f.fulfilment !== "all" && o.status !== f.fulfilment) return false;
    if (from !== null || to !== null) {
      const t = o.submittedAt ? new Date(o.submittedAt).getTime() : NaN;
      if (Number.isNaN(t) || (from !== null && t < from) || (to !== null && t > to)) return false;
    }
    if (!q) return true;
    const hay = [o.reference, o.sourceId ?? "", ...(o.sourceOrders ?? []).flatMap((s) => [s.code ?? "", s.username ?? ""])];
    return hay.some((h) => h.toLowerCase().includes(q));
  });
}

export function paginate<T>(rows: T[], page: number, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(Math.max(1, page), pages);
  return { rows: rows.slice((p - 1) * size, p * size), page: p, pages };
}

export function selectPage(selected: Set<string>, pageRows: LedgerOrder[]) {
  const next = new Set(selected);
  let skipped = 0;
  for (const o of pageRows) {
    if (!isEligible(o) || next.has(o.id)) continue;
    if (next.size >= MAX_SELECTION) skipped++;
    else next.add(o.id);
  }
  return { next, skipped };
}
export function clearPage(selected: Set<string>, pageRows: LedgerOrder[]) {
  const next = new Set(selected);
  pageRows.forEach((o) => next.delete(o.id));
  return next;
}
export function toggleOne(selected: Set<string>, o: LedgerOrder) {
  const next = new Set(selected);
  if (next.has(o.id)) next.delete(o.id);
  else if (isEligible(o) && next.size < MAX_SELECTION) next.add(o.id);
  return next;
}
export function selectedTotal(orders: LedgerOrder[], selected: Set<string>) {
  const chosen = orders.filter((o) => selected.has(o.id) && isEligible(o) && cents(o.totalCost) !== null);
  return { orders: chosen, total: chosen.reduce((s, o) => s + (cents(o.totalCost) ?? 0n), 0n) };
}

export function parsePaidAt(v: string): { ok: true; iso: string | undefined } | { ok: false } {
  if (!v.trim()) return { ok: true, iso: undefined };
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? { ok: false } : { ok: true, iso: d.toISOString() };
}
export function fmtDate(v: string | null | undefined, withTime = false) {
  if (!v) return "Not recorded";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "Invalid date";
  return withTime ? d.toLocaleString() : d.toLocaleDateString();
}
export function isLedger(v: unknown): v is LedgerData {
  const r = v as Record<string, unknown> | null;
  return !!r && ["vendors", "wallets", "orders", "payments"].every((k) => Array.isArray(r[k]));
}

export const REVIEW_TOKEN = /^[a-f0-9]{64}$/;
export const hasReviewToken = (o: LedgerOrder): o is LedgerOrder & { reviewToken: string } =>
  typeof o.reviewToken === "string" && REVIEW_TOKEN.test(o.reviewToken);
