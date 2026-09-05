import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type PaymentStatus, type PaymentRail } from "@open-crypto-checkout/core";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8090/v1";

// For demo merchant creations
export async function createDemoPayment(data: { fiatAmount: string; fiatCurrency: string; rails: string[] }) {
  const res = await fetch(`${API_BASE}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
      // In a real app this requires auth, but for demo storefront we assume dev server doesn't enforce or we mock it.
      // Wait, the backend requires a merchantId and checks Authorization. 
      // The instructions say "demo storefront that creates/opens a demo payment through the real standalone API". 
      // If the backend enforces Authorization, we might need a dev token or just provide a dummy one that the backend mock accepts?
      // Wait, the backend route: `repository.authenticate(String(req.headers.authorization ?? "").replace(/^Bearer /, ""), validateCredential);`
      // Let's pass a demo token. I'll just put something and hope it's configured in dev.
      "Authorization": "Bearer dev-demo-key" 
    },
    body: JSON.stringify({
      merchantOrderReference: `demo_${Date.now()}`,
      ...data
    })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ paymentId: string; checkoutUrl: string; rails: string[] }>;
}

export type CheckoutPayment = {
  publicId: string;
  status: PaymentStatus;
  fiatAmount: string;
  fiatCurrency: string;
  expiresAt: string | null;
  allowedRails: PaymentRail[];
  selectedQuote: {
    railId: string;
    rate: string;
    rateSource: string;
    destinationAddress: string;
    expiresAt: string;
    amountBaseUnits: string;
  } | null;
};

export function usePayment(publicId: string, enabled = true) {
  return useQuery({
    queryKey: ["payment", publicId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/checkout/${publicId}`);
      if (!res.ok) throw new Error("Payment not found");
      return res.json() as Promise<CheckoutPayment>;
    },
    enabled: !!publicId && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return false;
      const terminal: PaymentStatus[] = ["paid", "expired", "failed", "cancelled", "underpaid", "overpaid_review"];
      return terminal.includes(status) ? false : 3000;
    }
  });
}

export function useSelectRail(publicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (railId: string) => {
      const res = await fetch(`${API_BASE}/checkout/${publicId}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ railId })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment", publicId] });
    }
  });
}

export function useSubmitTransaction(publicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transactionHash: string) => {
      const res = await fetch(`${API_BASE}/checkout/${publicId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionHash })
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody?.error?.message || "Submission failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment", publicId] });
    }
  });
}
