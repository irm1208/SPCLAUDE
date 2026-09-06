import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type PaymentStatus, type PublicCheckout } from "@open-crypto-checkout/core";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8090/v1";

// For demo merchant creations
export async function createDemoPayment(data: { fiatAmount: string; fiatCurrency: string; rails: string[] }) {
  const res = await fetch(`${API_BASE}/demo/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      merchantOrderReference: `demo_${Date.now()}`,
      ...data
    })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ paymentId: string; checkoutUrl: string; rails: string[] }>;
}

export type CheckoutPayment = PublicCheckout;

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
