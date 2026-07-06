import "./_group.css";
import { motion } from "framer-motion";
import {
  CheckCircle2, Home, FileDown, ChevronRight, ClipboardList, Clock
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

export function Guided() {
  return (
    <div className="success-page-root flex flex-col font-sans selection:bg-blue-100" style={{ background: "var(--t-bg)", minHeight: "100vh" }}>
      <main className="flex-1 px-4 py-8 pb-24 max-w-md mx-auto w-full flex flex-col items-center">

        {/* 1. Success check + Headline + Subcopy */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
          style={{ background: "color-mix(in srgb, var(--t-blue-deep) 8%, transparent)" }}
        >
          <CheckCircle2 className="w-10 h-10" style={{ color: "var(--t-blue-deep)" }} />
        </motion.div>

        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-extrabold text-center mb-2 tracking-tight"
          style={{ color: "var(--t-text)" }}
        >
          Order Updated
        </motion.h2>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-center mb-6 px-4 text-sm font-medium"
          style={{ color: "var(--t-subtle)" }}
        >
          We've saved your changes.
        </motion.p>

        {/* 2. Quiet My Orders CTA */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full mb-8"
        >
          <button
            className="w-full h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-black/5 active:scale-[0.98] transition-all border-2"
            style={{ color: "var(--t-text)", borderColor: "var(--t-border)", background: "transparent" }}
          >
            <ClipboardList className="w-4 h-4 opacity-50" />
            View details in My Orders
          </button>
        </motion.div>

        {/* 3. The Guided Payment Panel */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full mb-8"
        >
          <div className="rounded-3xl border-2 p-1.5 overflow-hidden shadow-sm" style={{ borderColor: "color-mix(in srgb, var(--t-blue-deep) 15%, transparent)", background: "var(--t-surface)" }}>
            <div className="p-5 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--t-blue-deep) 10%, transparent)" }}>
                  <Clock className="w-3.5 h-3.5" style={{ color: "var(--t-blue-deep)" }} />
                </div>
                <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "var(--t-blue-deep)" }}>Awaiting Payment</span>
              </div>
              
              <div className="flex items-end justify-between mb-1">
                <p className="text-4xl font-black tracking-tight" style={{ color: "var(--t-text)" }}>
                  {currSym(RECEIPT.currency)}{RECEIPT.grandTotal.toFixed(2)}
                </p>
                <p className="text-sm font-bold mb-1.5" style={{ color: "var(--t-subtle)" }}>
                  {RECEIPT.code}
                </p>
              </div>
              <p className="text-sm font-medium mt-3" style={{ color: "var(--t-subtle)" }}>
                Choose a crypto method to complete your order.
              </p>
            </div>

            <div className="p-1 space-y-1 bg-slate-50 rounded-2xl border" style={{ borderColor: "var(--t-border)" }}>
              <button
                className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-transparent hover:border-slate-200 hover:bg-white hover:shadow-sm active:scale-[0.99] transition-all text-left group"
                style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}
              >
                <UsdtBadge size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>USDT or USDC</p>
                  <p className="text-xs font-medium" style={{ color: "var(--t-subtle)" }}>ERC-20 · Verified instantly</p>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-slate-100 group-hover:bg-slate-200 transition-colors">
                  <ChevronRight className="w-4 h-4 shrink-0 transition-transform" style={{ color: "var(--t-blue-deep)" }} />
                </div>
              </button>

              <button
                className="w-full flex items-center gap-3.5 p-3 rounded-xl border border-transparent hover:border-slate-200 hover:bg-white hover:shadow-sm active:scale-[0.99] transition-all text-left group"
                style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-white font-black text-[8px] tracking-tight leading-none text-center">ANON<br />PAY</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>AnonPay</p>
                  <p className="text-xs font-medium truncate" style={{ color: "var(--t-subtle)" }}>BTC, ETH, XMR & 100+ more</p>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-slate-100 group-hover:bg-slate-200 transition-colors">
                  <ChevronRight className="w-4 h-4 shrink-0 transition-transform" style={{ color: "var(--t-blue-deep)" }} />
                </div>
              </button>
            </div>
          </div>
        </motion.div>

        {/* 4. Secondary Actions (grouped, light) */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full flex flex-col gap-3"
        >
          <button
            className="w-full h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-black/5 active:scale-[0.98] transition-all"
            style={{ color: "var(--t-text)", background: "color-mix(in srgb, var(--t-text) 5%, transparent)" }}
          >
            <FileDown className="w-4 h-4 opacity-60" /> Save Receipt PDF
          </button>

          <button
            className="w-full h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-black/5 active:scale-[0.98] transition-all"
            style={{ color: "var(--t-subtle)" }}
          >
            <Home className="w-4 h-4 opacity-70" /> Return to Home
          </button>
        </motion.div>

      </main>
    </div>
  );
}
