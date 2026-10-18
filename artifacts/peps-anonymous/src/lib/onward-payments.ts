// Onward delivery PAYMENT requests (reshipper -> member, paid in crypto to the reshipper's
// separate onward wallet). Never part of product totals or product payment details.
import { defaultFetcher, type Fetcher, type OnwardEstimate } from "@/lib/onward-delivery";

export type ConfirmationMode = "manual" | "automatic";
export type ChargeStatus = "unpaid" | "pending_confirmation" | "paid" | "cancelled";
export type FiatCurrency = "USD" | "EUR" | "GBP";
export const FIAT_CURRENCIES: FiatCurrency[] = ["USD", "EUR", "GBP"];

export interface WalletSettings { enabled: boolean; confirmationMode: ConfirmationMode; currency: string; network: string; walletAddress: string }
export interface Rail { currency: string; network: string }
export interface Charge {
  id: string; orderId: string; status: ChargeStatus;
  amount: number; currency: FiatCurrency; method: "pickup" | "home";
  note: string; reshipperUsername: string;
  wallet: { currency: string; network: string; walletAddress: string };
  cryptoAmount: number; confirmationMode: ConfirmationMode;
  txHash: string | null; verificationNote: string | null;
  createdAt: string; submittedAt: string | null; confirmedAt: string | null;
}
export interface Envelope { request: Charge | null; history: Charge[]; canManage: boolean; canSubmit: boolean;
  /** Member view: true when this order is eligible for onward delivery but no request was sent yet. */
  awaitingRequest?: boolean }
export interface ReshipperOrderRow {
  id: string; code: string; username: string; country: string; kits: number; orderStatus: string;
  canRequest: boolean; estimate: OnwardEstimate; request: Charge | null;
  requestBlockedReason?: string | null;
}
export interface ReshipperOverview { settings: WalletSettings; rails: Rail[]; orders: ReshipperOrderRow[] }
export type ReadonlySource = { kind: "admin" | "organiser" | "reshipper"; gbId: string; orderId: string; fetcher?: Fetcher; headers?: Record<string, string> };

export class ApiError extends Error { constructor(msg: string, public status: number) { super(msg); } }

async function call<T>(f: Fetcher, url: string, method = "GET", body?: unknown, headers?: Record<string, string>, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await f(url, {
      method, credentials: "include", cache: "no-store", signal,
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(headers ?? {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    throw new ApiError("Network error. Your changes are kept; try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error || `Request failed (${res.status})`, res.status);
  return data as T;
}

const e = encodeURIComponent;
export const onwardPayApi = {
  overview: (f: Fetcher, gbId: string, signal?: AbortSignal) => call<ReshipperOverview>(f, `/api/reshipper/gb/${e(gbId)}/onward-payments`, "GET", undefined, undefined, signal),
  saveSettings: (f: Fetcher, gbId: string, s: WalletSettings) => call<{ settings: WalletSettings }>(f, `/api/reshipper/gb/${e(gbId)}/onward-payments/settings`, "PUT", s),
  create: (f: Fetcher, gbId: string, orderId: string, body: { idempotencyKey: string; amount: number; currency: FiatCurrency; method: "pickup" | "home"; note?: string }) =>
    call<Envelope>(f, `/api/reshipper/gb/${e(gbId)}/orders/${e(orderId)}/onward-payments`, "POST", body),
  action: (f: Fetcher, gbId: string, orderId: string, requestId: string, act: "confirm" | "reject" | "cancel", body: object = {}) =>
    call<Envelope>(f, `/api/reshipper/gb/${e(gbId)}/orders/${e(orderId)}/onward-payments/${e(requestId)}/${act}`, "POST", body),
  member: (orderId: string, signal?: AbortSignal) => call<Envelope>(defaultFetcher, `/api/orders/${e(orderId)}/onward-payments`, "GET", undefined, undefined, signal),
  submit: (orderId: string, requestId: string, txHash: string) => call<Envelope>(defaultFetcher, `/api/orders/${e(orderId)}/onward-payments/${e(requestId)}/submit`, "POST", { txHash }),
  verify: (orderId: string, requestId: string) => call<Envelope>(defaultFetcher, `/api/orders/${e(orderId)}/onward-payments/${e(requestId)}/verify`, "POST", {}),
  inspect: (s: ReadonlySource, signal?: AbortSignal) => {
    const base = s.kind === "reshipper" ? `/api/reshipper/gb/${e(s.gbId)}` : `/api/${s.kind}/group-buys/${e(s.gbId)}`;
    return call<Envelope>(s.fetcher ?? defaultFetcher, `${base}/orders/${e(s.orderId)}/onward-payments`, "GET", undefined, s.headers, signal);
  },
};

export const STATUS_LABEL: Record<ChargeStatus, string> = {
  unpaid: "Awaiting payment", pending_confirmation: "Awaiting confirmation", paid: "Paid", cancelled: "Cancelled",
};
export const STATUS_COLOR: Record<ChargeStatus, string> = {
  unpaid: "#E9A020", pending_confirmation: "#2D6BCC", paid: "#16a34a", cancelled: "#8A9AAA",
};

/** Parse a fiat amount: positive, max 2 decimals. Returns null if invalid. */
export function parseAmount(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}
export function validateSettings(s: WalletSettings): string | null {
  if (!s.enabled) return null;
  if (!s.currency || !s.network) return "Choose a token and network.";
  if (s.walletAddress.trim().length < 8) return "Enter the wallet address payments should go to.";
  return null;
}
export const fmtFiat = (n: number, c: string) => { try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(n); } catch { return `${n.toFixed(2)} ${c}`; } };
export const fmtCrypto = (n: number) => String(n);
export const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");
export const newIdempotencyKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
/** Prefill from estimate only when the estimate currency is a valid fiat charge currency. */
export function prefillFromEstimate(est: OnwardEstimate | null | undefined, method: "pickup" | "home"): { amount: string; currency: FiatCurrency | null } {
  const opt = est?.options.find(o => o.method === method);
  const cur = FIAT_CURRENCIES.includes(est?.currency as FiatCurrency) ? (est!.currency as FiatCurrency) : null;
  return { amount: opt && cur ? opt.amount.toFixed(2) : "", currency: cur };
}
