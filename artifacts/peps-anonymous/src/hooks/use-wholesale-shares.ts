import { useQuery, useQueryClient } from "@tanstack/react-query";

// ── Types (mirror the backend buildShareResponse payload) ──────────────────────

export type WholesaleShareStatus = "open" | "locked" | "submitted" | "cancelled";
export type WholesaleSplitMode = "even" | "by_size";

export interface WholesaleShareItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface WholesaleShareMember {
  username: string;
  isCreator: boolean;
  isYou: boolean;
  items: WholesaleShareItem[];
  kits: number;
  subtotal: number;
  tip: number;
  shippingShare: number | null;
  orderId: string | null;
  orderCode: string | null;
  orderStatus: string | null;
  paymentStatus: string | null;
  hasDeliveryAddress: boolean;
}

export interface WholesaleShareVendorRegion {
  name: string;
  prices?: number[];
  priceNote?: string;
  customNote?: string;
  countries?: string[];
}

export interface WholesaleShareVendor {
  id: string;
  name: string;
  tiers: string[];
  tierBounds?: number[];
  maxKitsPerPackage?: number;
  regions: WholesaleShareVendorRegion[];
}

export interface WholesaleShareDetail {
  id: string;
  status: WholesaleShareStatus;
  splitMode: WholesaleSplitMode;
  maxMembers: number;
  vendorId: string | null;
  creatorUsername: string;
  isCreator: boolean;
  currentUsername: string;
  isMember: boolean;
  delivery: {
    username: string | null;
    name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    country: string | null;
    canEditAddress: boolean;
  };
  vendor: WholesaleShareVendor | null;
  shippingEstimate: number | null;
  shippingRegion: string | null;
  estimateCalculable: boolean;
  combinedKits: number;
  combinedSubtotal: number;
  totalVendorShipping: number | null;
  totalKits: number | null;
  members: WholesaleShareMember[];
  memberCount: number;
  allPaid: boolean;
  createdAt: string;
  lockedAt: string | null;
  submittedAt: string | null;
  cancelledAt: string | null;
}

export interface WholesaleShareSummary {
  id: string;
  status: WholesaleShareStatus;
  splitMode: WholesaleSplitMode;
  isCreator: boolean;
  memberCount: number;
  maxMembers: number;
  createdAt: string;
}

export interface WholesaleShareMessage {
  id: string;
  username: string;
  body: string;
  createdAt: string;
  isYou: boolean;
}

// ── Shared fetch helper ────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...(init?.headers ?? {}) } : init?.headers,
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-json */ }
  if (!res.ok) {
    const message = (data as { error?: string })?.error || "Something went wrong. Please try again.";
    const err = new Error(message) as Error & { status?: number; data?: unknown };
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

// ── Queries ────────────────────────────────────────────────────────────────────

export function useWholesaleShares(enabled = true) {
  return useQuery<WholesaleShareSummary[]>({
    queryKey: ["wholesale-shares"],
    queryFn: () => request<WholesaleShareSummary[]>("/api/wholesale-shares"),
    staleTime: 30 * 1000,
    retry: false,
    enabled,
  });
}

export type ShareFetchResult =
  | { ok: true; share: WholesaleShareDetail }
  | { ok: false; status: number; message: string; creatorUsername?: string | null };

export function useWholesaleShare(id: string | null) {
  return useQuery<ShareFetchResult>({
    queryKey: ["wholesale-share", id],
    queryFn: async () => {
      try {
        const share = await request<WholesaleShareDetail>(`/api/wholesale-shares/${id}`);
        return { ok: true as const, share };
      } catch (e) {
        const err = e as Error & { status?: number; data?: { creatorUsername?: string | null } };
        return {
          ok: false as const,
          status: err.status ?? 0,
          message: err.message,
          creatorUsername: err.data?.creatorUsername ?? null,
        };
      }
    },
    enabled: !!id,
    retry: false,
    refetchInterval: 6000,
    refetchOnWindowFocus: true,
  });
}

// ── Mutations (plain async fns — call then invalidate) ──────────────────────────

export function createWholesaleShare(splitMode: WholesaleSplitMode = "even") {
  return request<WholesaleShareDetail>("/api/wholesale-shares", {
    method: "POST",
    body: JSON.stringify({ splitMode }),
  });
}

export function joinWholesaleShare(id: string) {
  return request<WholesaleShareDetail>(`/api/wholesale-shares/${id}/join`, { method: "POST" });
}

export function setWholesaleShareItems(
  id: string,
  items: Array<{ productId: string; quantity: number }>,
  tip: number,
) {
  return request<WholesaleShareDetail>(`/api/wholesale-shares/${id}/items`, {
    method: "PUT",
    body: JSON.stringify({ items, tip }),
  });
}

// The organiser only picks WHICH member receives the parcel. The server seeds the
// address from that member's saved account address (if any); the recipient can then
// override it with a one-off address via setWholesaleShareDeliveryAddress below.
export function setWholesaleShareDelivery(id: string, deliveryUsername: string) {
  return request<WholesaleShareDetail>(`/api/wholesale-shares/${id}/delivery`, {
    method: "PUT",
    body: JSON.stringify({ deliveryUsername }),
  });
}

export interface WholesaleDeliveryAddressInput {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
  country: string;
  phone?: string;
  email?: string;
}

// The designated delivery recipient sets a one-off shipping address for this share
// only (overriding their saved account address for this parcel, without changing
// their account). Receiver-only on the server.
export function setWholesaleShareDeliveryAddress(id: string, addr: WholesaleDeliveryAddressInput) {
  return request<WholesaleShareDetail>(`/api/wholesale-shares/${id}/delivery-address`, {
    method: "PUT",
    body: JSON.stringify(addr),
  });
}

export function setWholesaleShareSplit(id: string, splitMode: WholesaleSplitMode) {
  return request<WholesaleShareDetail>(`/api/wholesale-shares/${id}/split`, {
    method: "PUT",
    body: JSON.stringify({ splitMode }),
  });
}

export function lockWholesaleShare(id: string) {
  return request<WholesaleShareDetail>(`/api/wholesale-shares/${id}/lock`, { method: "POST" });
}

export function cancelWholesaleShare(id: string) {
  return request<WholesaleShareDetail>(`/api/wholesale-shares/${id}/cancel`, { method: "POST" });
}

export function useInvalidateWholesaleShare() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ["wholesale-shares"] });
    if (id) qc.invalidateQueries({ queryKey: ["wholesale-share", id] });
  };
}

// ── Chat (shared order message thread) ─────────────────────────────────────────

export function useWholesaleShareMessages(id: string | null, enabled = true) {
  return useQuery<WholesaleShareMessage[]>({
    queryKey: ["wholesale-share-messages", id],
    queryFn: () => request<WholesaleShareMessage[]>(`/api/wholesale-shares/${id}/messages`),
    enabled: !!id && enabled,
    retry: false,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

export function postWholesaleShareMessage(id: string, body: string) {
  return request<WholesaleShareMessage>(`/api/wholesale-shares/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function useInvalidateWholesaleShareMessages() {
  const qc = useQueryClient();
  return (id: string) => qc.invalidateQueries({ queryKey: ["wholesale-share-messages", id] });
}
