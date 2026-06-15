import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface AccountMe {
  telegramUsername: string;
  accountStatus?: string;
  createdAt?: string;
  healthDataConsent?: boolean;
  organiserStatus?: string | null;
  reshipperStatus?: string | null;
  country?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressPostcode?: string | null;
  addressCountry?: string | null;
  addressPhone?: string | null;
  addressPhonePrefix?: string | null;
  credits?: number;
  isWholesale?: boolean;
  rulesetVersion?: number;
  ruleAcceptedVersion?: number | null;
}

async function fetchMe(): Promise<AccountMe | null> {
  const res = await fetch("/api/account/me", { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) return null;
  return res.json();
}

export interface UseAccountResult {
  account: AccountMe | null;
  isLoading: boolean;
  isLoggedIn: boolean;
}

export function useAccount(): UseAccountResult {
  const { data, isLoading, isFetching } = useQuery<AccountMe | null>({
    queryKey: ["account", "me"],
    queryFn: fetchMe,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return {
    account: data ?? null,
    isLoading: isLoading || isFetching,
    isLoggedIn: !!data,
  };
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await fetch("/api/account/logout", { method: "POST", credentials: "include" });
    },
    onSuccess: () => {
      qc.setQueryData(["account", "me"], null);
      qc.invalidateQueries({ queryKey: ["account"] });
    },
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ telegramUsername, password }: { telegramUsername: string; password: string }) => {
      const res = await fetch("/api/account/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUsername, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      return data;
    },
    onSuccess: () => {
      qc.clear();
    },
  });
}

export function useSmartLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ telegramUsername, credential }: { telegramUsername: string; credential: string }) => {
      const res = await fetch("/api/account/smart-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUsername, credential }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      return data as { ok: boolean; telegramUsername: string; needsPassword: boolean; loginMethod: string };
    },
    onSuccess: () => {
      qc.clear();
      qc.invalidateQueries({ queryKey: ["account", "me"] });
    },
  });
}

export function useSignup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ telegramUsername, password, email, country, inviteCode }: { telegramUsername: string; password: string; email: string; country: string; inviteCode?: string }) => {
      const res = await fetch("/api/account/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUsername, password, email, country, inviteCode: inviteCode || undefined }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      return data as { ok: boolean; telegramUsername: string };
    },
    onSuccess: () => {
      qc.clear();
      qc.invalidateQueries({ queryKey: ["account", "me"] });
    },
  });
}

export interface GroupBuySummary {
  id: string;
  name: string;
  status: string;
  description: string | null;
  infoCards: Array<{ title: string; body: string; icon?: string; type?: "info" | "update" | "warning" | "important"; postedAt?: string }>;
  closeDate: string | null;
  manufacturer: string | null;
  manufacturerCountry: string | null;
  organiserId: string | null;
  productCount: number;
  currency: string | null;
  labTestSupplier: string | null;
  vendorShippingEnabled: boolean;
  vendorShippingMessage: string | null;
  vendorShippingAmount: number | null;
  paymentMessageEnabled: boolean;
  paymentMessage: string | null;
  paymentsEnabled: boolean;
  allowedCountries: string[] | null;
  excludedCountries: string[] | null;
  countryLegsEnabled?: boolean;
  allowReshipperCode?: boolean;
  countryLegId?: string | null;
  hidePricesOnInvoice?: boolean;
  hidePricesOnGbViewer?: boolean;
  hidePricesOnOrderForm?: boolean;
  hideOrderTotalOnOrderForm?: boolean;
  adminFeeEnabled?: boolean;
  adminFeeAmount?: number | null;
  adminFeeLabel?: string | null;
  directShippingPaymentsEnabled?: boolean;
}

export function useMyGroupBuys(enabled = true) {
  return useQuery<GroupBuySummary[]>({
    queryKey: ["account", "group-buys"],
    queryFn: async () => {
      const res = await fetch("/api/group-buys", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60 * 1000,
    retry: false,
    enabled,
  });
}

export interface ViewerAccessEntry {
  id: string;
  name: string;
  status: string;
  hasQrAccess: boolean;
  hasLegAccess: boolean;
}

export function useViewerAccess(enabled = true) {
  return useQuery<ViewerAccessEntry[]>({
    queryKey: ["account", "viewer-access"],
    queryFn: async () => {
      const res = await fetch("/api/group-buys/my-viewer-access", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60 * 1000,
    retry: false,
    enabled,
  });
}

export interface ActiveGroupBuy {
  id: string;
  name: string;
  requiresPin: boolean;
  allowedCountries: string[] | null;
  excludedCountries: string[] | null;
  organiserId: string | null;
  reshipperCountries: string[];
  countryLegsEnabled?: boolean;
}

export interface CountryLegReshipper {
  telegramUsername: string;
  paymentTarget?: string | null;
  enabledPaymentMethods?: Record<string, unknown> | null;
  reshipperPaymentDetails?: Record<string, unknown> | null;
}

export interface CountryLeg {
  id: string;
  countryCode: string;
  countryName: string;
  inviteEnabled: boolean;
  status: string;
  /** All reshippers assigned to this country leg */
  reshippers: CountryLegReshipper[];
  /** First reshipper (legacy compat) */
  reshipper: CountryLegReshipper | null;
}

export function useCountryLegs(gbId: string | null) {
  return useQuery<CountryLeg[]>({
    queryKey: ["country-legs", gbId],
    queryFn: async () => {
      if (!gbId) return [];
      const res = await fetch(`/api/group-buys/${gbId}/country-legs`, { credentials: "include" });
      if (!res.ok) return [];
      const legs: CountryLeg[] = await res.json();
      // United Kingdom always first, then the rest in their original order
      return [
        ...legs.filter(l => l.countryCode === "GB"),
        ...legs.filter(l => l.countryCode !== "GB"),
      ];
    },
    staleTime: 60 * 1000,
    retry: false,
    enabled: !!gbId,
  });
}

export function useActiveGroupBuys() {
  return useQuery<ActiveGroupBuy[]>({
    queryKey: ["group-buys", "active"],
    queryFn: async () => {
      const res = await fetch("/api/group-buys/active", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export function useJoinGroupBuy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupBuyId,
      invitePin,
      countryCode,
      countryLegInvite,
    }: {
      groupBuyId: string;
      invitePin?: string;
      countryCode?: string;
      countryLegInvite?: string;
    }) => {
      const res = await fetch("/api/account/join-gb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupBuyId, invitePin, countryCode, countryLegInvite }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join group buy");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["account", "group-buys"] });
      qc.refetchQueries({ queryKey: ["account", "group-buys"] });
    },
  });
}

export function useRequestPublicListing() {
  return useMutation({
    mutationFn: async (gbId: string) => {
      const res = await fetch(`/api/organiser/group-buys/${gbId}/request-public`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request public listing");
      return data;
    },
  });
}

export function useLeaveGroupBuy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupBuyId }: { groupBuyId: string }) => {
      const res = await fetch(`/api/account/group-buys/${groupBuyId}/leave`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to leave group buy");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["account", "group-buys"] });
      qc.invalidateQueries({ queryKey: ["account", "orders"] });
    },
  });
}


export function useAssignMyCountryLeg(gbId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ countryLegId }: { countryLegId: string }) => {
      const res = await fetch(`/api/group-buys/${gbId}/my-country-leg`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryLegId }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign country");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["account", "group-buys"] });
      qc.refetchQueries({ queryKey: ["account", "group-buys"] });
      if (gbId) qc.invalidateQueries({ queryKey: ["group-buys", gbId, "country-legs"] });
    },
  });
}

export function useUpdateCountry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ country }: { country: string }) => {
      const res = await fetch("/api/account/country", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update country");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["account", "me"] });
    },
  });
}

export interface AccountOrder {
  id: string;
  code: string;
  telegramUsername: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  productSubtotal: number;
  deliveryMethod: string;
  groupBuyId: string | null;
  orderType?: string | null;
  currency?: string | null;
  adminMessage: string | null;
  trackingNumber: string | null;
  notes: string | null;
  createdAt: string;
  testingContribution?: number;
  testVote?: string | null;
  lineItems: Array<{
    productId?: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

export function useHasTestingContribution(enabled = true) {
  const { data: orders } = useQuery<AccountOrder[]>({
    queryKey: ["account", "orders", "all"],
    queryFn: async () => {
      const res = await fetch("/api/account/orders", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60 * 1000,
    retry: false,
    enabled,
  });
  return !!(orders && orders.some(o => (o.testingContribution ?? 0) > 0));
}

export interface GbParcel {
  id: string;
  label: string | null;
  carrier: string | null;
  maskedTrackingNumber: string;
  status: string | null;
  items: Array<{ name: string; qty: number; productId?: string }>;
  events: unknown[];
  trackingUrl: string | null;
  lastChecked: string | null;
  createdAt: string;
}

export function useOrderParcels(groupBuyId: string | null | undefined) {
  return useQuery<GbParcel[]>({
    queryKey: ["account", "gb-parcels", groupBuyId],
    queryFn: async () => {
      const res = await fetch(`/api/account/group-buys/${groupBuyId}/parcels`, {
        credentials: "include",
      });
      if (res.status === 403) return [];
      if (!res.ok) throw new Error("Failed to load parcel tracking");
      return res.json();
    },
    enabled: !!groupBuyId,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}

export function useOrderLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ telegramUsername, orderCode }: { telegramUsername: string; orderCode: string }) => {
      const res = await fetch("/api/account/order-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUsername, orderCode }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      return data as { ok: boolean; telegramUsername: string; needsPassword: boolean };
    },
    onSuccess: () => {
      qc.clear();
    },
  });
}

export function useSetPassword() {
  return useMutation({
    mutationFn: async ({ password }: { password: string }) => {
      const res = await fetch("/api/account/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set password");
      return data;
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/account/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword, currentPassword }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      return data;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fullName, email }: { fullName?: string; email?: string }) => {
      const res = await fetch("/api/account/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["account", "profile"] });
    },
  });
}

export function useProfile() {
  return useQuery<{ fullName: string | null; email: string | null; phone: string | null; address: string | null } | null>({
    queryKey: ["account", "profile"],
    queryFn: async () => {
      const res = await fetch("/api/account/profile", { credentials: "include" });
      if (!res.ok) return null;
      const data = await res.json();
      return data.profile ?? null;
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export interface TelegramPrefs {
  status: boolean;
  deleted: boolean;
  payment: boolean;
  profile: boolean;
  new_order: boolean;
}

export interface TelegramStatus {
  linked: boolean;
  prefs: TelegramPrefs;
}

export function useTelegramStatus(enabled = true) {
  return useQuery<TelegramStatus>({
    queryKey: ["account", "telegram-status"],
    queryFn: async () => {
      const res = await fetch("/api/account/telegram/status", { credentials: "include" });
      if (!res.ok) return { linked: false, prefs: { status: true, deleted: true, payment: true, profile: true, new_order: true } };
      return res.json();
    },
    staleTime: 30 * 1000,
    retry: false,
    enabled,
  });
}

export function useTelegramLinkInit() {
  return useMutation({
    mutationFn: async (): Promise<{ code: string; expiresAt: string; botUrl: string | null; instruction: string }> => {
      const res = await fetch("/api/account/telegram/link-init", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate link code");
      return data;
    },
  });
}

export function useTelegramUnlink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/account/telegram/unlink", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to unlink");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["account", "telegram-status"] });
    },
  });
}

export function useTelegramSendTest() {
  return useMutation({
    mutationFn: async (): Promise<{ ok: boolean }> => {
      const res = await fetch("/api/account/telegram/send-test", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send test message");
      return data;
    },
  });
}

export function useTelegramUpdatePrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: Partial<TelegramPrefs>) => {
      const res = await fetch("/api/account/telegram/prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update prefs");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["account", "telegram-status"] });
    },
  });
}

export interface DeletedOrder {
  id: string;
  code: string;
  status: string;
  grandTotal: number;
  productSubtotal: number;
  deliveryMethod: string;
  groupBuyId: string | null;
  currency: string | null;
  deletedAt: string;
  deletedBy: string;
  expiresAt: string;
  canRestore: boolean;
  lineItems: { productName: string; quantity: number; lineTotal: number }[];
}

export function useDeletedOrders() {
  return useQuery<DeletedOrder[]>({
    queryKey: ["account", "orders", "deleted"],
    queryFn: async () => {
      const res = await fetch("/api/account/orders/deleted", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useRestoreOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/account/orders/${orderId}/restore`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore order");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["account", "orders"] });
    },
  });
}

export function useTestingGbPools(enabled = true) {
  return useQuery<{
    gbId: string; gbName: string;
    isOptedIn: boolean; canLateOptIn: boolean;
    contributionAmount: number; anyContribution: boolean;
    roundStatus: string;
  }[]>({
    queryKey: ["account", "testing", "gb-pools"],
    queryFn: async () => {
      const res = await fetch("/api/account/testing/gb-pools", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60 * 1000,
    retry: false,
    enabled,
  });
}

export function useTestingActivePools(enabled = true) {
  return useQuery<{ gbId: string; gbName: string }[]>({
    queryKey: ["account", "testing", "active-pools"],
    queryFn: async () => {
      const res = await fetch("/api/account/testing/active-pools", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60 * 1000,
    retry: false,
    enabled,
  });
}

export function useTestingLateOptIn(enabled = true) {
  return useQuery<{ gbId: string; gbName: string; contributionAmount: number; anyContribution: boolean }[]>({
    queryKey: ["account", "testing", "late-optin"],
    queryFn: async () => {
      const res = await fetch("/api/account/testing/late-optin", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60 * 1000,
    retry: false,
    enabled,
  });
}

export function useAccountOrders(gbId?: string | null, enabled = true) {
  const url = gbId ? `/api/account/orders?gbId=${encodeURIComponent(gbId)}` : "/api/account/orders";
  return useQuery<AccountOrder[]>({
    queryKey: ["account", "orders", gbId ?? "all"],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30 * 1000,
    retry: false,
    enabled,
  });
}
