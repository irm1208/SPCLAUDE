import "./_group.css";
import { motion } from "framer-motion";
import {
  CheckCircle2, Home, FileDown, ChevronRight, ClipboardList, ArrowRight,
} from "lucide-react";

const RECEIPT = {
  code: "PEP-4821",
  grandTotal: 160.0,
  currency: "USD",
};

function currSym(c: string) {
  return c === "GBP" ? "£" : "$";
}

function UsdtBadge({ size = 44 }: { size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 shadow-sm"
      style={{ width: size, height: size, background: "#26A17B" }}
    >
      <span className="text-white font-black" style={{ fontSize: size * 0.42 }}>₮</span>
    </div>
  );
}

function PaymentPanelMock() {
  const cryptoStyle = {
    background:
      "linear-gradient(135deg, color-mix(in srgb, #8B5CF6 18%, var(--t-surface)) 0%, color-mix(in srgb, #7C3AED 15%, var(--t-surface)) 50%, color-mix(in srgb, #3B82F6 13%, var(--t-surface)) 100%)",
    borderColor: "rgba(139, 92, 246, 0.35)",
  };
  return (
    <div className="p-5 space-y-4 rounded-xl border shadow-sm" style={cryptoStyle}>
      <div>
        <p className="font-bold text-base mb-0.5" style={{ color: "var(--t-text)" }}>How would you like to pay?</p>
        <p className="text-xs" style={{ color: "var(--t-subtle)" }}>
          Total: <span className="font-bold">{currSym(RECEIPT.currency)}{RECEIPT.grandTotal.toFixed(2)}</span> — choose your payment method below.
        </p>
      </div>

      <div className="space-y-2.5">
        <button
          className="w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left group"
          style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}
        >
          <UsdtBadge size={44} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>USDT or USDC</p>
            <p className="text-xs" style={{ color: "var(--t-subtle)" }}>ERC-20 · Verified automatically on-chain</p>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: "var(--t-subtle)" }} />
        </button>

        <button
          className="w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-all text-left group"
          style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}
        >
          <div className="w-11 h-11 rounded-[9px] bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white font-black text-[9px] tracking-tight leading-none text-center">ANON<br />PAY</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>AnonPay (Any Crypto)</p>
            <p className="text-xs" style={{ color: "var(--t-subtle)" }}>Pay with BTC, ETH, XMR & 100+ coins — auto-converted, no account needed</p>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: "var(--t-subtle)" }} />
        </button>
      </div>
    </div>
  );
}

export function Current() {
  return (
    <div className="success-page-root flex flex-col" style={{ background: "var(--t-bg)", minHeight: "100vh" }}>
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
          Order Updated!
        </motion.h2>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-center mb-7 px-4 leading-relaxed text-sm"
          style={{ color: "var(--t-muted)" }}
        >
          Your order has been updated.{" "}
          You can view it anytime in <span className="font-semibold" style={{ color: "var(--t-text)" }}>My Orders</span>.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="w-full mb-5"
        >
          <button
            className="w-full h-14 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2.5 hover:brightness-110 active:scale-[0.98] transition-all relative overflow-hidden"
            style={{ background: "var(--t-blue-deep)" }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none" style={{ background: "rgba(255,255,255,0.04)", transform: "translate(30%, -30%)" }} />
            <ClipboardList className="w-5 h-5" />
            View your order in My Orders
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.32 }}
          className="w-full mb-5"
        >
          <PaymentPanelMock />
        </motion.div>

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
              className="w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white border border-white/20 hover:bg-white/5 transition-all"
            >
              <FileDown className="w-4 h-4" />Download Receipt PDF
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full"
        >
          <button
            className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all border"
            style={{ color: "#0D1B2A", borderColor: "#CBD5E1", background: "#F8FAFC" }}
          >
            <Home className="w-4 h-4" /> Return to Home
          </button>
        </motion.div>

      </main>
    </div>
  );
}
