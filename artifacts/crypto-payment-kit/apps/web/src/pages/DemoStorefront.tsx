import React, { useState } from "react";
import { useLocation } from "wouter";
import { createDemoPayment } from "../api";
import { Button, Input } from "../components";
import { ShoppingCart } from "lucide-react";
import { PAYMENT_RAILS } from "@open-crypto-checkout/core";

export default function DemoStorefront() {
  const [, setLocation] = useLocation();
  const [amount, setAmount] = useState("49.99");
  const [currency, setCurrency] = useState("USD");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await createDemoPayment({
        fiatAmount: amount,
        fiatCurrency: currency,
        rails: PAYMENT_RAILS.map((r) => r.id),
      });
      setLocation(`/checkout/${res.paymentId}`);
    } catch (err: any) {
      setError(err.message || "Failed to create payment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-slate-900">
      <div className="max-w-md w-full border border-slate-800 bg-card shadow-xl shadow-black/10 rounded-2xl p-8">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-6">
          <ShoppingCart className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold font-display tracking-tight mb-2 text-center">Demo Storefront</h1>
        <p className="text-muted-foreground text-sm text-center mb-8">
          Create a test payment to preview the Open Crypto Checkout experience.
        </p>

        <form onSubmit={handleCheckout} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 font-mono text-lg"
                required
                data-testid="input-amount"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Currency</label>
            <Input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="font-mono"
              maxLength={3}
              required
              data-testid="input-currency"
            />
          </div>

          {error && <div className="p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-md text-sm">{error}</div>}

          <Button type="submit" className="w-full h-12 text-base" isLoading={isLoading} data-testid="button-checkout">
            Proceed to Checkout
          </Button>
        </form>
      </div>
    </div>
  );
}
