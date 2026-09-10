import React from "react";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAccount } from "@/hooks/use-account";

export default function LegacyOrderRedirect() {
  const [, setLocation] = useLocation();
  const { isLoggedIn, isLoading } = useAccount();

  React.useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) {
      setLocation("/login");
      return;
    }

    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) {
      setLocation("/account?s=orders");
      return;
    }

    let cancelled = false;
    fetch(`/api/account/order-by-code?code=${encodeURIComponent(code)}`, {
      credentials: "include",
    })
      .then(async response => {
        if (!response.ok) throw new Error("Order not found");
        return response.json() as Promise<{ id?: string }>;
      })
      .then(order => {
        if (!cancelled && order.id) setLocation(`/account/orders/${order.id}`);
      })
      .catch(() => {
        if (!cancelled) setLocation("/account?s=orders");
      });

    return () => {
      cancelled = true;
    };
  }, [isLoading, isLoggedIn, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Opening your orders…
      </div>
    </div>
  );
}