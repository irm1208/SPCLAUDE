/** COA charges are independent of the product order and its payment panel. */
export type CoaRail = { currency: string; network: string; walletAddress: string };
export type CoaConfig = {
  mode: "disabled" | "selected" | "open";
  fee: number; currency: "USD" | "GBP" | "EUR"; cap: number;
  rails: CoaRail[]; manualInstructions: string;
};
export type CoaRequest = {
  id: string; orderId: string; groupBuyId: string; orderCode: string;
  member: string; groupName: string; source: "invited" | "public";
  status: "invited" | "reserved" | "expired" | "withdrawn" | "review" | "paid" | "processing" | "completed";
  client: string; sample: string; manufacturer: string; batch: string;
  fee: number; currency: string; expiresAt: string | null;
  payment: { currency: string; network: string; walletAddress: string; amount: number } | null;
  txHash: string | null; reference: string | null; verificationMessage: string | null;
  internalNotes?: string; updatedAt: string;
};
export type CoaMemberView = {
  eligible: boolean; reason: string | null; available: number;
  config: CoaConfig | null; request: CoaRequest | null;
};
export type CoaAdminView = {
  requests: CoaRequest[];
  groups: { id: string; name: string }[];
  config: CoaConfig | null; committed: number;
  orders: { id: string; code: string; member: string }[];
};
export const defaultCoaConfig: CoaConfig = {
  mode: "disabled", fee: 0, currency: "USD", cap: 1, rails: [], manualInstructions: "",
};
export async function coaApi<T>(path: string, options: RequestInit = {}, secret?: string): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include", ...options,
    headers: { "Content-Type": "application/json", ...(secret ? { "x-admin-secret": secret } : {}), ...options.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Unable to load COA requests.");
  }
  return res.json();
}
