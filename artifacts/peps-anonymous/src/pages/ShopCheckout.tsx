import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ShoppingCart, Tag, X, Check, ChevronRight,
  Loader2, Copy, AlertCircle, CheckCircle2, Clock,
  Wallet, User, MapPin, MessageCircle, Shield, Lock, Zap, ExternalLink,
} from "lucide-react";
import { useVialCart } from "@/hooks/use-vial-cart";
import { useAccount } from "@/hooks/use-account";
import { PageLayout } from "@/components/PageLayout";
import { T } from "@/lib/theme";

const ACCENT = "var(--t-blue)";

interface DiscountResult {
  id: string; code: string; discountType: string;
  discountValue: number; discountAmount: number; description: string;
}

interface VialOrder {
  id: string; code: string; total: number; subtotal: number;
  discountAmount: number; discountCodeUsed: string | null;
  orderStatus: string; paymentStatus: string; walletAddress: string | null;
  revolutLink: string | null; paypalLink: string | null;
  shippingName: string | null; shippingAddress: string | null;
  items: { productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
}

const STEPS = ["Review", "Details", "Payment"];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 flex-1">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <React.Fragment key={n}>
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: done ? "#22C55E" : active ? ACCENT : T.border,
                  color: done || active ? "white" : T.subtle,
                  border: "none",
                }}
              >
                {done ? <Check className="w-3 h-3" /> : n}
              </div>
              <span className="text-[10px] font-semibold" style={{ color: active ? ACCENT : done ? "#16A34A" : T.subtle }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-1.5 mt-[-10px]" style={{ background: done ? "#22C55E" : T.border }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const inputStyle = (error?: boolean): React.CSSProperties => ({
  background: T.surface,
  border: `1.5px solid ${error ? "#F87171" : T.border}`,
  color: T.text,
  outline: "none",
  transition: "border-color 0.15s",
});

const cardStyle: React.CSSProperties = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};

function SummaryStrip({ total, count, discountCode }: { total: number; count: number; discountCode?: string | null }) {
  return (
    <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(27,58,122,0.07)", border: "1px solid rgba(27,58,122,0.15)" }}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.subtle }}>Order total</p>
        <p className="text-xl font-black" style={{ color: ACCENT }}>${total.toFixed(2)} <span className="text-sm font-semibold" style={{ color: T.subtle }}>USDT</span></p>
      </div>
      <div className="text-right">
        <p className="text-xs font-semibold" style={{ color: T.muted }}>{count} item{count !== 1 ? "s" : ""}</p>
        {discountCode && <p className="text-xs font-bold text-emerald-600">{discountCode} applied ✓</p>}
      </div>
    </div>
  );
}

export default function ShopCheckout() {
  const [, setLocation] = useLocation();
  const { items, total, itemCount, clearCart } = useVialCart();
  const cartTotal = total();
  const cartCount = itemCount();
  const { account } = useAccount();

  const [step, setStep] = useState(1);

  const [codeInput, setCodeInput] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discount, setDiscount] = useState<DiscountResult | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);

  const [telegram, setTelegram] = useState(account ? account.telegramUsername.replace(/^@/, "") : "");

  useEffect(() => {
    if (account && !telegram) {
      setTelegram(account.telegramUsername.replace(/^@/, ""));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const [shippingName, setShippingName] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});

  const [order, setOrder] = useState<VialOrder | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payResult, setPayResult] = useState<{ verified: boolean; reason?: string; pending?: boolean } | null>(null);
  const [copied, setCopied] = useState<"wallet" | "amount" | null>(null);

  useEffect(() => {
    if (!order || order.orderStatus !== "pending_acceptance") return;
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/vial/orders/${order.id}`);
        if (r.ok) {
          const d: VialOrder = await r.json();
          if (d.orderStatus !== "pending_acceptance") setOrder(d);
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(poll);
  }, [order]);

  const finalTotal = Math.max(0, cartTotal - (discount?.discountAmount ?? 0));

  useEffect(() => {
    if (cartCount === 0 && !order) setLocation("/shop");
  }, [cartCount, order]);

  const applyCode = async () => {
    if (!codeInput.trim()) return;
    setDiscountLoading(true); setDiscountError("");
    try {
      const res = await fetch("/api/vial/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeInput.trim(), subtotal: cartTotal }),
      });
      const data = await res.json();
      if (!res.ok) { setDiscountError(data.error || "Invalid code"); setDiscount(null); }
      else { setDiscount(data); setShowCodeInput(false); }
    } catch { setDiscountError("Failed to validate code"); }
    finally { setDiscountLoading(false); }
  };

  const [shippingErrors, setShippingErrors] = useState<Record<string, string>>({});

  const validateContact = () => {
    const errs: Record<string, string> = {};
    if (!telegram.trim()) errs.telegram = "Required";
    setContactErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateShipping = () => {
    const errs: Record<string, string> = {};
    if (!shippingName.trim()) errs.shippingName = "Required";
    if (!shippingAddress.trim()) errs.shippingAddress = "Required";
    setShippingErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const placeOrder = async () => {
    if (!validateContact()) return;
    setCheckoutLoading(true); setCheckoutError("");
    try {
      const res = await fetch("/api/vial/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
          telegramUsername: telegram.trim(),
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
          discountCode: discount?.code,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setCheckoutError(data.error || "Failed to place order"); return; }
      setOrder(data);
      clearCart();
      setStep(3);
    } catch { setCheckoutError("Network error — please try again"); }
    finally { setCheckoutLoading(false); }
  };

  const submitPayment = async () => {
    if (!order || !txHash.trim()) return;
    if (!validateShipping()) return;
    setPayLoading(true); setPayResult(null);
    try {
      const res = await fetch(`/api/vial/orders/${order.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash: txHash.trim(),
          shippingName: shippingName.trim(),
          shippingAddress: shippingAddress.trim(),
        }),
      });
      const data = await res.json();
      setPayResult(data);
      if (data.verified) setOrder(prev => prev ? { ...prev, paymentStatus: "confirmed" } : prev);
    } catch { setPayResult({ verified: false, reason: "Network error" }); }
    finally { setPayLoading(false); }
  };

  const copyText = async (text: string, field: "wallet" | "amount") => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <PageLayout>
      <div className="flex flex-col" style={{ background: T.bg, minHeight: "100%" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4" style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="max-w-xl mx-auto py-3.5">
          <div className="flex items-start gap-3">
            <button
              onClick={() => step > 1 && step < 3 ? setStep(step - 1) : setLocation("/shop")}
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 transition-colors"
              style={{ background: T.surface2 }}
            >
              <ArrowLeft className="w-4 h-4" style={{ color: T.muted }} />
            </button>
            <div className="flex-1">
              <p className="text-[10px] font-semibold mb-2" style={{ color: ACCENT }}>The Lonely Vial · Checkout</p>
              <StepBar current={step} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-5 space-y-4 pb-10">

        {/* ─── Step 1: Review ─── */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* Cart items */}
              <div className="rounded-xl overflow-hidden" style={cardStyle}>
                <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                  <ShoppingCart className="w-4 h-4" style={{ color: ACCENT }} />
                  <h2 className="text-sm font-bold" style={{ color: T.text }}>Order Summary</h2>
                  <span className="ml-auto text-xs font-semibold" style={{ color: T.subtle }}>{cartCount} item{cartCount !== 1 ? "s" : ""}</span>
                </div>
                <div className="divide-y" style={{ borderColor: T.border }}>
                  {items.map(item => (
                    <div key={item.id} className="px-4 py-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0" style={{ background: "linear-gradient(135deg, var(--brand-navy), var(--brand-blue))" }}>
                        {item.productName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: T.text }}>{item.productName}</p>
                        <p className="text-xs mt-0.5" style={{ color: T.subtle }}>{item.quantity} × ${item.price.toFixed(2)}</p>
                      </div>
                      <span className="text-sm font-black shrink-0" style={{ color: ACCENT }}>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Totals in card */}
                <div className="px-4 py-3 space-y-2" style={{ borderTop: `1px solid ${T.border}`, background: T.surface2 }}>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: T.muted }}>Subtotal</span>
                    <span className="font-semibold" style={{ color: T.text }}>${cartTotal.toFixed(2)}</span>
                  </div>
                  {discount && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600">Discount ({discount.code})</span>
                      <span className="font-semibold text-emerald-600">−${discount.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
                    <span style={{ color: T.text }}>Total</span>
                    <span style={{ color: ACCENT }}>${finalTotal.toFixed(2)} USDT</span>
                  </div>
                </div>
              </div>

              {/* Discount code */}
              <div className="rounded-xl overflow-hidden" style={cardStyle}>
                {discount ? (
                  <div className="px-4 py-3 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-emerald-600">{discount.code}</p>
                      <p className="text-xs text-emerald-500/80">{discount.description} · saves ${discount.discountAmount.toFixed(2)}</p>
                    </div>
                    <button onClick={() => { setDiscount(null); setCodeInput(""); }} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: T.surface2 }}>
                      <X className="w-3 h-3" style={{ color: T.muted }} />
                    </button>
                  </div>
                ) : showCodeInput ? (
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={codeInput}
                        onChange={e => setCodeInput(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === "Enter" && applyCode()}
                        placeholder="Enter discount code"
                        autoFocus
                        className="flex-1 h-10 px-3 rounded-xl text-sm uppercase font-mono"
                        style={inputStyle()}
                      />
                      <button
                        onClick={applyCode}
                        disabled={discountLoading || !codeInput.trim()}
                        className="h-10 px-4 rounded-xl text-xs font-bold disabled:opacity-40"
                        style={{ background: "rgba(45,107,204,0.1)", color: ACCENT, border: "1px solid rgba(45,107,204,0.2)" }}
                      >
                        {discountLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                      </button>
                      <button onClick={() => { setShowCodeInput(false); setDiscountError(""); }} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: T.surface2 }}>
                        <X className="w-3.5 h-3.5" style={{ color: T.subtle }} />
                      </button>
                    </div>
                    {discountError && <p className="text-xs text-red-500">{discountError}</p>}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCodeInput(true)}
                    className="w-full px-4 py-3 flex items-center gap-2 text-left"
                  >
                    <Tag className="w-4 h-4" style={{ color: T.subtle }} />
                    <span className="text-sm font-medium" style={{ color: T.muted }}>Have a discount code?</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-auto" style={{ color: T.subtle }} />
                  </button>
                )}
              </div>

              {/* Trust line */}
              <div className="flex items-center justify-center gap-4 text-xs" style={{ color: T.subtle }}>
                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure</span>
                <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Anonymous</span>
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Instant</span>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full h-13 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white"
                style={{ background: "linear-gradient(135deg, var(--t-blue-deep) 0%, var(--t-blue) 100%)", boxShadow: "0 4px 18px var(--t-blue-35)", height: 52 }}
              >
                Continue to Details <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ─── Step 2: Contact ─── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <SummaryStrip total={finalTotal} count={cartCount} discountCode={discount?.code} />

              <div className="rounded-xl overflow-hidden" style={cardStyle}>
                <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                  <User className="w-4 h-4" style={{ color: ACCENT }} />
                  <h2 className="text-sm font-bold" style={{ color: T.text }}>Contact &amp; Shipping</h2>
                </div>

                <div className="px-4 py-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5 flex items-center gap-1" style={{ color: T.muted }}>
                      <MessageCircle className="w-3.5 h-3.5" /> Telegram Username <span className="text-red-400 ml-0.5">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: T.subtle }}>@</span>
                      <input
                        value={telegram}
                        onChange={e => setTelegram(e.target.value.replace(/^@/, ""))}
                        placeholder="your_username"
                        className="w-full h-11 pl-8 pr-4 rounded-xl text-sm focus:ring-2 focus:ring-blue-100/20"
                        style={inputStyle(!!contactErrors.telegram)}
                      />
                    </div>
                    {contactErrors.telegram && <p className="text-xs text-red-400 mt-1">{contactErrors.telegram}</p>}
                    <p className="text-xs mt-1" style={{ color: T.subtle }}>We'll reach you here to confirm your order</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: T.muted }}>
                      Email <span className="text-xs font-normal" style={{ color: T.subtle }}>(optional)</span>
                    </label>
                    <input
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      type="email"
                      placeholder="for order confirmation"
                      className="w-full h-11 px-4 rounded-xl text-sm"
                      style={inputStyle()}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: T.muted }}>
                      Notes <span className="text-xs font-normal" style={{ color: T.subtle }}>(optional)</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Any special instructions…"
                      rows={2}
                      className="w-full px-4 pt-3 pb-3 rounded-xl text-sm resize-none"
                      style={inputStyle()}
                    />
                  </div>
                </div>
              </div>

              {checkoutError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-500">{checkoutError}</p>
                </div>
              )}

              <button
                onClick={placeOrder}
                disabled={checkoutLoading}
                className="w-full rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, var(--t-blue-deep) 0%, var(--t-blue) 100%)", boxShadow: "0 4px 18px var(--t-blue-35)", height: 52 }}
              >
                {checkoutLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Placing order…</>
                  : <>Place Order · ${finalTotal.toFixed(2)} USDT <ChevronRight className="w-4 h-4" /></>
                }
              </button>

              <div className="flex items-center justify-center gap-4 text-xs" style={{ color: T.subtle }}>
                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure</span>
                <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Anonymous</span>
              </div>
            </motion.div>
          )}

          {/* ─── Step 3: Payment ─── */}
          {step === 3 && order && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">

              {/* Waiting for seller acceptance */}
              {order.orderStatus === "pending_acceptance" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl p-8 text-center space-y-5"
                  style={{ background: "linear-gradient(160deg, var(--t-blue-07) 0%, rgba(245,158,11,0.03) 100%)", border: "1.5px solid var(--t-blue-20)" }}
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "var(--t-blue-10)" }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-7 h-7" style={{ color: "var(--t-blue)" }} />
                    </motion.div>
                  </div>
                  <div>
                    <h2 className="text-lg font-black" style={{ color: "#1B3A7A" }}>Waiting for Seller</h2>
                    <p className="text-xs font-mono font-bold mt-1" style={{ color: "#94A3B8" }}>Order #{order.code}</p>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: T.muted }}>
                    Your order has been placed and is awaiting approval from the seller. Payment details will appear once accepted.
                  </p>
                  <div className="rounded-xl px-4 py-3" style={{ background: "var(--t-blue-08)" }}>
                    <p className="text-xs font-semibold" style={{ color: "var(--t-blue)" }}>This page checks automatically every 5 seconds.</p>
                  </div>
                </motion.div>
              )}

              {/* Rejected by seller */}
              {order.orderStatus === "rejected" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl p-8 text-center space-y-4"
                  style={{ background: "linear-gradient(160deg, rgba(220,38,38,0.06) 0%, rgba(239,68,68,0.03) 100%)", border: "1.5px solid rgba(220,38,38,0.2)" }}
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(220,38,38,0.1)" }}>
                    <X className="w-8 h-8" style={{ color: "#DC2626" }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black" style={{ color: "#991B1B" }}>Order Rejected</h2>
                    <p className="text-xs font-mono font-bold mt-1" style={{ color: T.subtle }}>Order #{order.code}</p>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#7F1D1D" }}>
                    The seller was unable to fulfil this order. Please return to the shop and try a different seller or product.
                  </p>
                  <button
                    onClick={() => setLocation("/shop")}
                    className="h-11 px-8 rounded-xl text-sm font-bold"
                    style={{ background: "#DC2626", color: "white" }}
                  >
                    Back to Shop
                  </button>
                </motion.div>
              )}

              {order.orderStatus === "accepted" && (order.paymentStatus === "confirmed" ? (
                /* Payment confirmed — celebration view */
                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="rounded-3xl p-8 text-center space-y-4"
                  style={{ background: "linear-gradient(160deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.04) 100%)", border: "1px solid rgba(16,185,129,0.2)" }}
                >
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ delay: 0.15, type: "spring", damping: 14 }}
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                    style={{ background: "rgba(16,185,129,0.15)" }}
                  >
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-black text-emerald-600">Payment Confirmed!</h2>
                    <p className="text-xs font-mono font-bold mt-1" style={{ color: T.subtle }}>Order #{order.code}</p>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: T.muted }}>
                    Your order is being processed. We'll contact you via Telegram shortly.
                  </p>
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      onClick={() => setLocation("/account?s=orders")}
                      className="w-full h-11 rounded-xl text-sm font-bold text-white"
                      style={{ background: "#059669" }}
                    >
                      View my orders
                    </button>
                    <button
                      onClick={() => setLocation("/shop")}
                      className="w-full h-10 rounded-xl text-sm font-semibold"
                      style={{ background: "rgba(16,185,129,0.10)", color: "#059669", border: "1px solid rgba(16,185,129,0.18)" }}
                    >
                      Back to Shop
                    </button>
                  </div>
                </motion.div>
              ) : (
                <>
                  {/* Order placed confirmation */}
                  <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: "var(--t-blue-05)", border: "1px solid var(--t-blue-12)" }}>
                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--t-blue-12)" }}>
                      <CheckCircle2 className="w-5 h-5" style={{ color: ACCENT }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: T.text }}>Order Placed!</p>
                      <p className="text-xs font-mono font-semibold mt-0.5" style={{ color: ACCENT }}>#{order.code}</p>
                      <p className="text-xs mt-0.5" style={{ color: T.muted }}>Complete payment below to confirm</p>
                    </div>
                    <button
                      onClick={() => setLocation("/account?s=orders")}
                      className="text-[11px] font-bold shrink-0 flex items-center gap-0.5"
                      style={{ color: ACCENT }}
                    >
                      My account <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Shipping details form — collected here after seller accepts */}
                  <div className="rounded-xl overflow-hidden" style={cardStyle}>
                    <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                      <MapPin className="w-4 h-4" style={{ color: ACCENT }} />
                      <h3 className="text-sm font-bold" style={{ color: T.text }}>Delivery Details</h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-bold mb-1.5" style={{ color: T.muted }}>
                          Full Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          value={shippingName}
                          onChange={e => setShippingName(e.target.value)}
                          placeholder="Name for delivery"
                          className="w-full h-11 px-4 rounded-xl text-sm"
                          style={inputStyle(!!shippingErrors.shippingName)}
                        />
                        {shippingErrors.shippingName && <p className="text-xs text-red-400 mt-1">{shippingErrors.shippingName}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1.5 flex items-center gap-1" style={{ color: T.muted }}>
                          Shipping Address <span className="text-red-400 ml-0.5">*</span>
                        </label>
                        <textarea
                          value={shippingAddress}
                          onChange={e => setShippingAddress(e.target.value)}
                          placeholder={"Street address\nCity, Postcode\nCountry"}
                          rows={3}
                          className="w-full px-4 pt-3 pb-3 rounded-xl text-sm resize-none"
                          style={inputStyle(!!shippingErrors.shippingAddress)}
                        />
                        {shippingErrors.shippingAddress && <p className="text-xs text-red-400 mt-1">{shippingErrors.shippingAddress}</p>}
                      </div>
                      <p className="text-xs" style={{ color: T.subtle }}>Your address is only shared with the seller once payment is confirmed.</p>
                    </div>
                  </div>

                  {/* Payment card */}
                  <div className="rounded-xl overflow-hidden" style={cardStyle}>
                    <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                      <Wallet className="w-4 h-4" style={{ color: ACCENT }} />
                      <h3 className="text-sm font-bold" style={{ color: T.text }}>Payment Options</h3>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Amount */}
                      <div className="rounded-xl p-3.5" style={{ background: "var(--t-blue-06)", border: "1px solid var(--t-blue-15)" }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: "var(--t-blue)" }}>Order total</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-black font-mono" style={{ color: T.text }}>{order.total.toFixed(2)}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md text-white" style={{ background: "#26A17B" }}>USDT</span>
                          </div>
                          <button
                            onClick={() => copyText(order.total.toFixed(2), "amount")}
                            className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
                            style={{ background: T.surface2, color: T.muted }}
                          >
                            {copied === "amount" ? <><Check className="w-3 h-3 text-emerald-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                          </button>
                        </div>
                      </div>

                      {/* Crypto / Wallet */}
                      {order.walletAddress ? (
                        <div className="rounded-xl p-3.5 space-y-2" style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
                          <p className="text-xs font-semibold" style={{ color: T.muted }}>USDT wallet address</p>
                          <div className="flex items-start gap-2">
                            <p className="text-xs font-mono break-all flex-1 leading-relaxed" style={{ color: T.text }}>{order.walletAddress}</p>
                            <button
                              onClick={() => copyText(order.walletAddress!, "wallet")}
                              className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold shrink-0"
                              style={{ background: T.surface2, color: T.muted }}
                            >
                              {copied === "wallet" ? <><Check className="w-3 h-3 text-emerald-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                            </button>
                          </div>
                          <div className="space-y-1 px-0.5">
                            {["Send EXACTLY the amount above", "Use a personal wallet — not an exchange", "Wrong amount or network will delay your order"].map(w => (
                              <p key={w} className="text-xs flex items-start gap-1.5" style={{ color: T.subtle }}>
                                <span className="text-blue-500 mt-0.5 shrink-0">⚠</span>{w}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl p-3.5" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)" }}>
                          <p className="text-xs text-red-500">Wallet not yet configured — please contact us via Telegram.</p>
                        </div>
                      )}

                      {/* Revolut */}
                      {order.revolutLink && (
                        <div className="rounded-xl p-3.5 space-y-1.5" style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
                          <p className="text-xs font-semibold" style={{ color: T.muted }}>Or pay via Revolut</p>
                          <a
                            href={order.revolutLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-bold"
                            style={{ color: ACCENT }}
                          >
                            {order.revolutLink} <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          <p className="text-[11px]" style={{ color: T.subtle }}>Include your order code <span className="font-mono font-bold" style={{ color: T.text }}>#{order.code}</span> in the payment note.</p>
                        </div>
                      )}

                      {/* PayPal */}
                      {order.paypalLink && (
                        <div className="rounded-xl p-3.5 space-y-1.5" style={{ background: T.surface2, border: `1px solid ${T.border}` }}>
                          <p className="text-xs font-semibold" style={{ color: T.muted }}>Or pay via PayPal</p>
                          <a
                            href={order.paypalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-bold"
                            style={{ color: ACCENT }}
                          >
                            {order.paypalLink} <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          <p className="text-[11px]" style={{ color: T.subtle }}>Include your order code <span className="font-mono font-bold" style={{ color: T.text }}>#{order.code}</span> in the payment note.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* TX hash */}
                  <div className="rounded-xl overflow-hidden" style={cardStyle}>
                    <div className="px-4 py-3" style={{ borderBottom: `1px solid ${T.border}` }}>
                      <h3 className="text-sm font-bold" style={{ color: T.text }}>Submit Transaction Hash</h3>
                      <p className="text-xs mt-0.5" style={{ color: T.muted }}>Paste the 0x… hash after sending to auto-verify your payment</p>
                    </div>
                    <div className="p-4 space-y-3">
                      <input
                        value={txHash}
                        onChange={e => setTxHash(e.target.value.trim())}
                        placeholder="0x…"
                        className="w-full h-11 px-4 rounded-xl text-xs font-mono"
                        style={inputStyle()}
                      />
                      {payResult && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm"
                          style={{
                            background: payResult.verified ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
                            border: `1px solid ${payResult.verified ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.15)"}`,
                            color: payResult.verified ? "#059669" : "#DC2626",
                          }}>
                          {payResult.verified
                            ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            : payResult.pending ? <Clock className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                          <span>{payResult.verified ? "Payment verified — your order is confirmed!" : payResult.reason}</span>
                        </div>
                      )}
                      <button
                        onClick={submitPayment}
                        disabled={payLoading || !txHash.trim() || !order.walletAddress}
                        className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, var(--t-blue-deep) 0%, var(--t-blue) 100%)" }}
                      >
                        {payLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</> : "Verify Payment"}
                      </button>
                    </div>
                  </div>

                  {/* Order summary */}
                  <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: T.subtle }}>Order #{order.code}</p>
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span style={{ color: T.muted }}>{item.productName} × {item.quantity}</span>
                        <span className="font-semibold" style={{ color: T.text }}>${item.lineTotal.toFixed(2)}</span>
                      </div>
                    ))}
                    {order.discountAmount > 0 && (
                      <div className="flex justify-between text-xs text-emerald-600">
                        <span>Discount ({order.discountCodeUsed})</span>
                        <span>−${order.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
                      <span style={{ color: T.text }}>Total</span>
                      <span style={{ color: ACCENT }}>${order.total.toFixed(2)} USDT</span>
                    </div>
                  </div>
                </>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </PageLayout>
  );
}
