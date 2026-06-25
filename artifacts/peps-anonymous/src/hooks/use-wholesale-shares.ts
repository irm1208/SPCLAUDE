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
  isRecipient: boolean;
  items: WholesaleShareItem[];
  kits: number;
  subtotal: number;
  tip: number;
  shippingShare: number | null;
  // Optional peer-to-peer fees (paid separately, not part of the order total).
  organiserFee: number;
  reshipperFee: number;
  organiserFeePaid: boolean;
  reshipperFeePaid: boolean;
  // Onward shipping destination this member provided (visible only to the member
  // themselves and the parcel recipient who forwards it; null otherwise).
  onwardAddress: string | null;
  onwardQr: string | null;
  orderId: string | null;
  orderCode: string | null;
  orderStatus: string | null;
  paymentStatus: string | null;
  hasDeliveryAddress: boolean;
  // The organiser may remove this member while the order is open (never the creator).
  canRemove: boolean;
}

export interface WholesaleShareFees {
  organiserPaymentInfo: string | null;
  organiserFeeTotal: number;
  active: boolean;
  recipientUsername: string | null;
  organiserUsername: string;
  canManage: boolean;
  canConfirmOrganiserFees: boolean;
}

export type WholesaleWalletCurrency = "USDT" | "USDC";

export interface WholesaleShareOnward {
  enabled: boolean;
  recipientUsername: string | null;
  payment: {
    walletAddress: string | null;
    walletCurrency: WholesaleWalletCurrency | null;
    anonpay: string | null;
    paypal: string | null;
    revolut: string | null;
    notes: string | null;
  };
  chargeTotal: number;
  // Raw configured charges, present only for the recipient (used to seed the editor).
  charges: { username: string; amount: number }[];
  canManage: boolean;        // recipient && share open — may configure onward shipping
  canConfirm: boolean;       // recipient (pre-cancel) — may mark onward charges paid
  canSetDestination: boolean; // non-recipient member && enabled && pre-cancel
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

// Organiser-set order rules. Any field may be null (no limit / not set).
export interface WholesaleShareSettings {
  minKitsPerMember: number | null;
  maxKitsPerMember: number | null;
  maxTotalKits: number | null;
  lockDeadline: string | null; // ISO timestamp
  allowedCountries: string[] | null;
  canManage: boolean; // organiser && share open
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
  fees: WholesaleShareFees;
  onward: WholesaleShareOnward;
  members: WholesaleShareMember[];
  memberCount: number;
  allPaid: boolean;
  // Organiser-set rules + whether a set deadline has already passed.
  settings: WholesaleShareSettings;
  deadlinePassed: boolean;
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

export function leaveWholesaleShare(id: string) {
  return request<{ ok: boolean }>(`/api/wholesale-shares/${id}/leave`, { method: "POST" });
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

export interface WholesaleFeeInput {
  username: string;
  organiserFee?: number;
}

// Organiser sets the optional per-participant organiser fee plus the payment
// details for how it should be paid. Editable only while the share is open.
export function setWholesaleShareFees(
  id: string,
  payload: { organiserPaymentInfo?: string; fees: WholesaleFeeInput[] },
) {
  return request<WholesaleShareDetail>(`/api/wholesale-shares/${id}/fees`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export interface WholesaleOnwardChargeInput {
  username: string;
  amount: number;
}

// The parcel recipient configures onward shipping: toggle it on/off, publish their
// own payout methods, and set a custom onward charge per participant. Recipient-only
// and editable only while the share is open.
export function setWholesaleShareOnward(
  id: string,
  payload: {
    enabled: boolean;
    walletAddress?: string;
    walletCurrency?: WholesaleWalletCurrency | "";
    anonpay?: string;
    paypal?: string;
    revolut?: string;
    notes?: string;
    charges: WholesaleOnwardChargeInput[];
  },
) {
  return request<WholesaleShareDetail>(`/api/wholesale-shares/${id}/onward`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// A participant provides their own onward forwarding destination: a written address
// and/or an uploaded courier DELIVERY QR image (data URL, stored uncompressed). Send
// only the field(s) you want to change. Allowed while onward shipping is enabled.
export function setWholesaleShareOnwardDestination(
  id: string,
  payload: { address?: string | null; qr?: string | null },
) {
  return request<WholesaleShareDetail>(`/api/wholesale-shares/${id}/onward-destination`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// The payee (organiser for organiser fees, recipient for reshipper fees) marks a
// participant's fee as paid / unpaid.
export function confirmWholesaleShareFee(
  id: string,
  payload: { username: string; feeType: "organiser" | "reshipper"; paid: boolean },
) {
  return request<WholesaleShareDetail>(`/api/wholesale-shares/${id}/fees/confirm`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Organiser sets the order rules (limits, deadline, allowed countries). Any field
// sent as null/"" clears that rule. Organiser-only and editable while open.
export interface WholesaleShareSettingsInput {
  minKitsPerMember?: number | null;
  maxKitsPerMember?: number | null;
  maxTotalKits?: number | null;
  lockDeadline?: string | null; // ISO timestamp, or null/"" to clear
  allowedCountries?: string[] | null;
}

export function setWholesaleShareSettings(id: string, payload: WholesaleShareSettingsInput) {
  return request<WholesaleShareDetail>(`/api/wholesale-shares/${id}/settings`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// Organiser removes a member from an open shared order (never the creator).
export function removeWholesaleShareMember(id: string, username: string) {
  return request<WholesaleShareDetail>(`/api/wholesale-shares/${id}/remove-member`, {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export function lockWholesaleShare(id: string) {
  return request<WholesaleShareDetail>(`/api/wholesale-shares/${id}/lock`, { method: "POST" });
}

export function cancelWholesaleShare(id: string) {
  return request<WholesaleShareDetail>(`/api/wholesale-shares/${id}/cancel`, { method: "POST" });
}

// Organiser reverts a locked share back to "open" so items/delivery can be edited
// again. Blocked once any member has paid (the server returns 409 in that case).
export function unlockWholesaleShare(id: string) {
  return request<WholesaleShareDetail>(`/api/wholesale-shares/${id}/unlock`, { method: "POST" });
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
