export type HalfKitScope = "organiser" | "admin";
export interface HalfKitGroup { id: string; name: string; currency: string; allowCredits: boolean }
export interface HalfKitOffer { id: string; productId: string; price: number; deliveryCharge: number; vendorShippingCharge: number; published: boolean; version: number; currency?: string }
export interface HalfKitCandidate { productId: string; productName: string; totalQuantity: number; defaultPrice: number; remainingHalf: boolean; offer: HalfKitOffer | null }
export type HalfKitClaimStatus = "unpaid" | "paid" | "released" | "blocked";
export interface HalfKitClaim { id: string; orderId: string; orderCode: string; username: string; productName: string; price: number; deliveryCharge: number; vendorShippingCharge: number; creditsUsed: number; status: HalfKitClaimStatus; createdAt: string; canRelease: boolean; currency?: string }
export interface HalfKitManagement { group: HalfKitGroup; candidates: HalfKitCandidate[]; claims: HalfKitClaim[] }
export interface OfferInput { price: number; deliveryCharge: number; vendorShippingCharge: number; published: boolean; version?: number }
export interface MemberOffer { id: string; productId: string; productName: string; price: number; deliveryCharge: number; vendorShippingCharge: number; version: number }
export interface MemberOrder { id: string; code: string; paymentStatus: string; amountDue: number }
export interface MemberOffersResponse { group: HalfKitGroup; offers: MemberOffer[]; orders: MemberOrder[]; creditsBalance: number }
export interface ClaimInput { orderId: string; version: number; useCredits: boolean; requestId: string; expectedCredit: number }
export interface ClaimResult { claimId: string; orderId: string; orderCode: string; amountDue: number; paymentPath: string }

export const offerCurrencyMismatch = (offer: HalfKitOffer | null, groupCurrency: string) =>
  !!offer?.currency && offer.currency !== groupCurrency;

export const HALF_KIT_POLL_MS = 30_000;
export interface HalfKitAvailability { counts: Record<string, number> }
export const fetchHalfKitAvailability = () => request<HalfKitAvailability>("/api/group-buys/half-kit-availability/counts");

export class HalfKitApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); this.name = "HalfKitApiError"; }
}
export const isHalfKitTaken = (e: unknown) => e instanceof HalfKitApiError && e.code === "HALF_KIT_TAKEN";
export const isPreviewConflict = (e: unknown) => e instanceof HalfKitApiError && e.status === 409 && !isHalfKitTaken(e);
export const isAuthRequired = (e: unknown) => e instanceof HalfKitApiError && e.status === 401;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body && typeof body === "object" && ("error" in body || "message" in body)
      ? String((body as { error?: string; message?: string }).error ?? (body as { message?: string }).message)
      : `Request failed (${res.status})`;
    throw new HalfKitApiError(msg, res.status, typeof body?.code === "string" ? body.code : undefined);
  }
  return body as T;
}
const post = <T>(url: string, body: unknown) => request<T>(url, { method: "POST", body: JSON.stringify(body) });
const base = (scope: HalfKitScope, gbId: string) => `/api/${scope}/group-buys/${encodeURIComponent(gbId)}/half-kit-offers`;

export const fetchManagement = (scope: HalfKitScope, gbId: string) => request<HalfKitManagement>(base(scope, gbId));
export const saveOffer = (scope: HalfKitScope, gbId: string, productId: string, input: OfferInput) =>
  post<unknown>(`${base(scope, gbId)}/${encodeURIComponent(productId)}`, input);
export const releaseClaim = (scope: HalfKitScope, gbId: string, claimId: string) =>
  post<unknown>(`${base(scope, gbId)}/claims/${encodeURIComponent(claimId)}/release`, {});
export const fetchMemberOffers = (gbId: string) =>
  request<MemberOffersResponse>(`/api/group-buys/${encodeURIComponent(gbId)}/half-kit-offers`);
export const claimHalfKit = (gbId: string, offerId: string, input: ClaimInput) =>
  post<ClaimResult>(`/api/group-buys/${encodeURIComponent(gbId)}/half-kit-offers/${encodeURIComponent(offerId)}/claim`, input);

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const defaultHalfPrice = (kitPrice: number) => round2(kitPrice / 2);

export function validateOfferForm(f: { price: string; deliveryCharge: string; vendorShippingCharge: string }):
  { ok: true; value: { price: number; deliveryCharge: number; vendorShippingCharge: number } } | { ok: false; error: string } {
  if (f.price.trim() === "") return { ok: false, error: "Price is required" };
  const parse = (s: string) => (s.trim() === "" ? 0 : Number(s));
  const price = parse(f.price), deliveryCharge = parse(f.deliveryCharge), vendorShippingCharge = parse(f.vendorShippingCharge);
  for (const n of [price, deliveryCharge, vendorShippingCharge]) {
    if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Amounts must be zero or more" };
  }
  return { ok: true, value: { price: round2(price), deliveryCharge: round2(deliveryCharge), vendorShippingCharge: round2(vendorShippingCharge) } };
}

export function computeClaimTotals(o: { price: number; deliveryCharge: number; vendorShippingCharge: number }, balance: number, useCredits: boolean, allowCredits: boolean) {
  const total = round2(o.price + o.deliveryCharge + o.vendorShippingCharge);
  const credits = useCredits && allowCredits ? round2(Math.max(0, Math.min(balance, total))) : 0;
  return { total, credits, cash: round2(total - credits) };
}

export async function publishSequentially(ids: string[], run: (id: string) => Promise<unknown>) {
  const succeeded: string[] = [];
  const failed: { productId: string; error: string }[] = [];
  for (const id of ids) {
    try { await run(id); succeeded.push(id); }
    catch (e) { failed.push({ productId: id, error: e instanceof Error ? e.message : String(e) }); }
  }
  return { succeeded, failed };
}

export const eligibleOrders = (orders: MemberOrder[]) => orders;

export function newRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const formatMoney = (currency: string, n: number) => `${currency} ${n.toFixed(2)}`;
