import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Home, FileDown, TriangleAlert, Loader2,
  ShieldCheck, ExternalLink, MapPin, Package, Send, QrCode, ArrowRight, ClipboardList,
} from "lucide-react";
import { Button, Card, Input, Label, cn } from "@/components/ui";
import { PageLayout } from "@/components/PageLayout";
import { SiteAnnouncements } from "@/components/SiteAnnouncements";
import { useState, useEffect } from "react";
import PaymentPanel from "@/components/PaymentPanel";
import { HubBottomNav, type HubSection } from "@/components/HubBottomNav";
import { useAccount } from "@/hooks/use-account";
import { COUNTRIES } from "@/data/countries";
import { generateReceiptPDF, type Receipt, type ReceiptLineItem } from "@/lib/generate-receipt-pdf";

export type { Receipt, ReceiptLineItem };

const COMMON_COUNTRIES = ["United Kingdom", "Ireland", "United States", "Canada", "Australia", "Germany", "France", "Netherlands", "Spain", "Italy"];

function ShippingAddressForm({ orderId, onSaved }: { orderId: string; onSaved: () => void }) {
  const { account } = useAccount();
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !street.trim() || !city.trim() || !postcode.trim()) {
      setError("Full name, street address, city and postcode are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const fullAddress = [street.trim(), city.trim(), postcode.trim()].join("\n");
    try {
      let url: string;
      let body: Record<string, string | undefined>;
      if (account) {
        url = `/api/account/orders/${orderId}/shipping-address`;
        body = {
          shippingName: name.trim(),
          shippingAddress: fullAddress,
          shippingCity: city.trim(),
          shippingPostcode: postcode.trim(),
          shippingCountry: country || undefined,
        };
      } else {
        let tgUsername: string | undefined;
        let pin: string | undefined;
        try {
          const session = JSON.parse(localStorage.getItem("peps:portal_session") ?? "{}");
          tgUsername = session.username;
          pin = session.pin;
        } catch { /* ignore */ }
        url = `/api/orders/${orderId}/shipping-address`;
        body = {
          telegramUsername: tgUsername,
          pin,
          shippingName: name.trim(),
          shippingAddress: fullAddress,
          shippingCity: city.trim(),
          shippingPostcode: postcode.trim(),
          shippingCountry: country || undefined,
        };
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to save");
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  const fieldStyle = {
    background: "var(--t-surface2)",
    borderColor: "var(--t-border)",
    color: "var(--t-text)",
  };
  const labelStyle = { color: "var(--t-blue)" };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full mb-5"
    >
      <div
        className="rounded-xl p-5 relative overflow-hidden border"
        style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}
      >
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: "color-mix(in srgb, var(--t-blue) 8%, transparent)", transform: "translate(30%, -30%)" }}
        />
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--t-blue) 15%, transparent)" }}
          >
            <MapPin className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>Royal Mail Delivery</p>
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>Enter your shipping details</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="ship-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wider" style={labelStyle}>Full Name</label>
            <input
              id="ship-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Jane Smith"
              disabled={saving}
              autoComplete="name"
              className="w-full h-11 rounded-xl px-4 text-sm border focus:outline-none disabled:opacity-50"
              style={fieldStyle}
            />
          </div>

          <div>
            <label htmlFor="ship-street" className="mb-1.5 block text-xs font-bold uppercase tracking-wider" style={labelStyle}>Address Line 1</label>
            <input
              id="ship-street"
              value={street}
              onChange={e => setStreet(e.target.value)}
              placeholder="House number & street name"
              disabled={saving}
              autoComplete="address-line1"
              className="w-full h-11 rounded-xl px-4 text-sm border focus:outline-none disabled:opacity-50"
              style={fieldStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ship-city" className="mb-1.5 block text-xs font-bold uppercase tracking-wider" style={labelStyle}>City</label>
              <input
                id="ship-city"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. London"
                disabled={saving}
                autoComplete="address-level2"
                className="w-full h-11 rounded-xl px-4 text-sm border focus:outline-none disabled:opacity-50"
                style={fieldStyle}
              />
            </div>
            <div>
              <label htmlFor="ship-postcode" className="mb-1.5 block text-xs font-bold uppercase tracking-wider" style={labelStyle}>Postcode</label>
              <input
                id="ship-postcode"
                value={postcode}
                onChange={e => setPostcode(e.target.value)}
                placeholder="e.g. W1U 6TJ"
                disabled={saving}
                autoComplete="postal-code"
                className="w-full h-11 rounded-xl px-4 text-sm border focus:outline-none disabled:opacity-50"
                style={fieldStyle}
              />
            </div>
          </div>

          <div>
            <label htmlFor="ship-country" className="mb-1.5 block text-xs font-bold uppercase tracking-wider" style={labelStyle}>
              Country <span style={{ color: "var(--t-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
            </label>
            <select
              id="ship-country"
              value={country}
              onChange={e => setCountry(e.target.value)}
              disabled={saving}
              autoComplete="country-name"
              className="w-full h-11 rounded-xl px-4 text-sm border focus:outline-none disabled:opacity-50"
              style={{ ...fieldStyle, color: country ? "var(--t-text)" : "var(--t-muted)" }}
            >
              <option value="">Select country…</option>
              <optgroup label="Common">
                {COMMON_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="All Countries">
                {COUNTRIES.filter(c => !COMMON_COUNTRIES.includes(c)).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {error && <p className="text-xs font-medium" style={{ color: "#f87171" }}>{error}</p>}

          <button
            type="submit"
            disabled={saving || !name.trim() || !street.trim() || !city.trim() || !postcode.trim()}
            className="w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white disabled:opacity-50 transition-all active:scale-[0.98]"
            style={{ background: "var(--t-blue)" }}
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
              : <><Send className="w-4 h-4" />Save Address</>
            }
          </button>
        </form>
      </div>
    </motion.div>
  );
}

function InPostNotice() {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full mb-5"
    >
      <div className="rounded-xl border p-5" style={{ borderColor: "#EAB308", background: "rgba(234,179,8,0.05)" }}>
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(234,179,8,0.15)" }}>
            <QrCode className="w-4 h-4" style={{ color: "#CA8A04" }} />
          </div>
          <div>
            <p className="font-semibold text-sm mb-1" style={{ color: "#1A2B3C" }}>
              InPost Locker Delivery
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#5A6E7F" }}>
              Once SleepingPeps confirms your orders are ready to ship, please visit{" "}
              <a href="https://inpost.co.uk" target="_blank" rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2" style={{ color: "#CA8A04" }}>
                inpost.co.uk
              </a>{" "}
              to purchase your QR code, then return to{" "}
              <span className="font-semibold">Find Your Order</span> to upload it.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Success() {
  const [, setLocation] = useLocation();
  const { account } = useAccount();
  const searchParams = new URLSearchParams(window.location.search);
  const action = searchParams.get("action") || "created";
  const orderId = searchParams.get("oid") || "";

  const [downloading, setDownloading] = useState(false);
  const [confirmedTxHash, setConfirmedTxHash] = useState<string | null>(null);
  const [globalVendorWarning, setGlobalVendorWarning] = useState(true);
  const [addressSaved, setAddressSaved] = useState(false);
  const [hubSection, setHubSection] = useState<HubSection>("orders");
  const [hubMoreOpen, setHubMoreOpen] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then(d => setGlobalVendorWarning(d.vendorShippingWarning !== false))
      .catch(() => {});
  }, []);

  const receiptRaw = localStorage.getItem("peps:lastReceipt");
  const receipt: Receipt | null = receiptRaw ? (() => {
    try { return JSON.parse(receiptRaw); } catch { return null; }
  })() : null;

  const deliveryMethod = receipt?.deliveryMethod ?? "";
  const isRoyalMail = deliveryMethod.toLowerCase().includes("royal mail");
  const isInPost = deliveryMethod.toLowerCase().includes("inpost");

  // Show the TBD warning only if vendor shipping is still to be determined
  const showVendorWarning = receipt
    ? (receipt.vendorShippingIsTbd === true)
    : globalVendorWarning;

  const handleDownloadReceipt = () => {
    if (!receipt) return;
    setDownloading(true);
    try {
      const doc = generateReceiptPDF(receipt);
      doc.save(`peps-receipt-${receipt.code}.pdf`);
    } catch { /* ignore */ } finally {
      setDownloading(false);
    }
  };

  return (
    <PageLayout>
    <div className="flex flex-col" style={{ background: "var(--t-bg)", minHeight: "100%" }}>
      <SiteAnnouncements />

      <main className="flex-1 px-4 py-8 pb-24 max-w-md mx-auto w-full flex flex-col items-center">

        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: "rgba(34,197,94,0.1)" }}
        >
          <CheckCircle2 className="w-10 h-10" style={{ color: "#22C55E" }} />
        </motion.div>

        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-center mb-2"
          style={{ color: "var(--t-text)" }}
        >
          Order {action === "updated" ? "Updated" : "Placed"}!
        </motion.h2>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-center mb-7 px-4 leading-relaxed text-sm"
          style={{ color: "var(--t-muted)" }}
        >
          {action === "updated" ? "Your order has been updated." : "Your order is confirmed."}{" "}
          You can view it anytime in <span className="font-semibold" style={{ color: "var(--t-text)" }}>My Orders</span>.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="w-full mb-5"
        >
          <button
            onClick={() => setLocation("/account?s=orders")}
            className="w-full h-14 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2.5 hover:brightness-110 active:scale-[0.98] transition-all relative overflow-hidden"
            style={{ background: "var(--t-blue-deep)" }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none" style={{ background: "rgba(255,255,255,0.04)", transform: "translate(30%, -30%)" }} />
            <ClipboardList className="w-5 h-5" />
            View your order in My Orders
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        {showVendorWarning && !confirmedTxHash && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full mb-5"
          >
            <div className="flex gap-3 items-start p-4 rounded-xl border" style={{ background: "#FFFBEB", borderColor: "#D97706" }}>
              <TriangleAlert className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#D97706" }} />
              <p className="text-sm leading-relaxed" style={{ color: "#A16207" }}>
                <span className="font-semibold" style={{ color: "#92400E" }}>Vendor shipping is still to be determined.</span>{" "}
                Your final total will be confirmed via Telegram before payment is taken.
              </p>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {confirmedTxHash && (
            <motion.div
              key="paid-banner"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full mb-5"
            >
              <div className="flex gap-3 items-start p-4 rounded-xl bg-green-50 border border-green-200">
                <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-green-800">Payment Confirmed</p>
                    <span className="px-2 py-0.5 rounded-full bg-green-600 text-white text-[10px] font-bold tracking-wide">PAID</span>
                  </div>
                  {confirmedTxHash?.startsWith("anonpay:") ? (
                    <p className="text-xs text-green-700 mb-1">Your AnonPay crypto payment has been verified.</p>
                  ) : (
                    <p className="text-xs text-green-700 mb-1">Your USDT payment has been verified on the blockchain.</p>
                  )}
                  <p className="text-[10px] text-green-600 font-semibold mb-0.5">Transaction ID</p>
                  {confirmedTxHash?.startsWith("anonpay:") ? (
                    <a
                      href={`https://trocador.app/anonpay/${encodeURIComponent(confirmedTxHash.slice("anonpay:".length))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-green-600 break-all hover:underline flex items-center gap-1"
                    >
                      {confirmedTxHash.slice("anonpay:".length)}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <a
                      href={`https://etherscan.io/tx/${confirmedTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-green-600 break-all hover:underline flex items-center gap-1"
                    >
                      {confirmedTxHash}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {orderId && receipt && !confirmedTxHash && receipt.paymentsEnabled !== false && (receipt.amountDue ?? receipt.grandTotal) > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.32 }}
            className="w-full mb-5"
          >
            <PaymentPanel
              orderId={orderId}
              orderPin="0000"
              grandTotal={receipt.amountDue ?? receipt.grandTotal}
              currency={receipt.currency}
              paymentStatus="unpaid"
              paymentTxHash={null}
              paymentTestAmount={null}
              testPaymentTxHash={null}
              paymentsEnabled={receipt.paymentsEnabled}
              onStatusChange={(status, txHash) => {
                if (status === "confirmed" && txHash) setConfirmedTxHash(txHash);
              }}
            />
          </motion.div>
        )}

        {orderId && receipt && !confirmedTxHash && receipt.paymentsEnabled !== false && (receipt.amountDue ?? receipt.grandTotal) === 0 && (receipt.creditsApplied ?? 0) > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.32 }}
            className="w-full mb-5"
          >
            <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "color-mix(in srgb, #22c55e 12%, var(--t-surface))", border: "1px solid color-mix(in srgb, #22c55e 35%, transparent)" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "color-mix(in srgb, #22c55e 20%, transparent)" }}>
                <CheckCircle2 className="w-5 h-5" style={{ color: "#22c55e" }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>Paid with store credits</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>
                  Your store credits covered the full order total — no payment needed.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {isInPost && <InPostNotice />}

        <AnimatePresence>
          {confirmedTxHash && orderId && !isInPost && !addressSaved && (
            <ShippingAddressForm
              key="ship-form"
              orderId={orderId}
              onSaved={() => setAddressSaved(true)}
            />
          )}
          {confirmedTxHash && addressSaved && !isInPost && (
            <motion.div
              key="ship-saved"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full mb-5"
            >
              <div className="flex gap-3 items-center p-4 rounded-xl bg-green-50 border border-green-200">
                <Package className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm font-semibold text-green-800">Shipping address saved. We'll send your order!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {receipt && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="w-full mb-5"
          >
            <div className="rounded-xl p-5" style={{ background: "var(--t-blue-deep)" }}>
              <p className="text-sm font-semibold mb-1 text-white">Save Your Receipt</p>
              <p className="text-xs mb-4 text-white/50">
                A PDF of your full order — easy to save or print.
              </p>
              <button
                onClick={handleDownloadReceipt}
                disabled={downloading}
                className="w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white border border-white/20 hover:bg-white/5 transition-all disabled:opacity-50"
              >
                {downloading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
                  : <><FileDown className="w-4 h-4" />Download Receipt PDF</>
                }
              </button>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full"
        >
          <button
            onClick={() => setLocation("/")}
            className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all border"
            style={{ color: "#0D1B2A", borderColor: "#CBD5E1", background: "#F8FAFC" }}
          >
            <Home className="w-4 h-4" /> Return to Home
          </button>
        </motion.div>

      </main>
    </div>
    <HubBottomNav
      section={hubSection}
      setSection={(s) => { setHubSection(s); setLocation(`/account?s=${s}`); }}
      hubMoreOpen={hubMoreOpen}
      setHubMoreOpen={setHubMoreOpen}
      account={account}
    />
    </PageLayout>
  );
}
