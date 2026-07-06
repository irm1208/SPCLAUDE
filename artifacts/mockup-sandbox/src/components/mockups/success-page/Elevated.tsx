import "./_group.css";
import { motion } from "framer-motion";
import {
  CheckCircle2, Home, FileDown, ChevronRight, ClipboardList, ArrowRight, CreditCard
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
      className="rounded-full flex items-center justify-center shrink-0"
      style={{ 
        width: size, 
        height: size, 
        background: "linear-gradient(135deg, #26A17B, #1B785B)", 
        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.3), 0 2px 6px rgba(38,161,123,0.3)" 
      }}
    >
      <span className="text-white font-black" style={{ fontSize: size * 0.42, textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>₮</span>
    </div>
  );
}

function PaymentPanel() {
  const heroStyle = {
    background: "linear-gradient(180deg, var(--t-blue-deep) 0%, #0f224a 100%)",
    boxShadow: "0 12px 24px -8px rgba(27, 58, 122, 0.4), inset 0 1px 0px rgba(255,255,255,0.12)",
    borderColor: "transparent",
  };
  
  return (
    <div className="rounded-2xl relative overflow-hidden" style={heroStyle}>
      {/* Ambient glow in top right */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Subtle top border glow */}
      <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent"></div>
      
      <div className="p-6 pb-5 relative z-10">
        <p className="font-semibold text-xs mb-1.5 text-blue-200/70 tracking-wider uppercase">Awaiting Payment</p>
        <p className="text-3xl font-bold text-white tracking-tight mb-1">
          {currSym(RECEIPT.currency)}{RECEIPT.grandTotal.toFixed(2)}
        </p>
        <p className="text-sm font-medium text-blue-100/60">Select a secure payment method</p>
      </div>

      <div className="bg-white/[0.04] backdrop-blur-md p-2 m-2 mt-0 rounded-xl border border-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] relative z-10 space-y-1">
        <button
          className="w-full flex items-center gap-4 p-3.5 rounded-lg transition-all text-left group hover:bg-white/[0.08] active:scale-[0.98]"
        >
          <UsdtBadge size={40} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white tracking-tight">USDT or USDC</p>
            <p className="text-xs text-blue-100/60 mt-0.5 font-medium">ERC-20 · Instant verification</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:translate-x-1 transition-all border border-white/5">
            <ChevronRight className="w-4 h-4 text-white/80" />
          </div>
        </button>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent my-1"></div>

        <button
          className="w-full flex items-center gap-4 p-3.5 rounded-lg transition-all text-left group hover:bg-white/[0.08] active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-slate-700 to-slate-900 flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),_0_2px_4px_rgba(0,0,0,0.3)] border border-slate-600/50">
            <span className="text-white font-black text-[9px] tracking-tighter leading-[0.9] text-center">ANON<br />PAY</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white tracking-tight">AnonPay <span className="font-normal text-blue-100/60 ml-0.5">(Any Crypto)</span></p>
            <p className="text-xs text-blue-100/60 mt-0.5 font-medium">BTC, ETH, XMR & 100+ coins</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:translate-x-1 transition-all border border-white/5">
            <ChevronRight className="w-4 h-4 text-white/80" />
          </div>
        </button>
      </div>
    </div>
  );
}

export function Elevated() {
  return (
    <div className="success-page-root flex flex-col font-sans" style={{ background: "var(--t-bg)", minHeight: "100vh" }}>
      <main className="flex-1 px-5 py-10 pb-24 max-w-md mx-auto w-full flex flex-col items-center">

        {/* Success Header Area */}
        <div className="flex flex-col items-center mb-8 w-full">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
            className="relative mb-5"
          >
            {/* Soft background glow */}
            <div className="absolute inset-0 bg-blue-600 blur-xl opacity-20 rounded-full"></div>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center relative shadow-[0_8px_16px_-6px_rgba(27,58,122,0.2),_inset_0_1px_1px_rgba(255,255,255,0.9)] border border-blue-100 bg-white">
              <CheckCircle2 className="w-8 h-8" style={{ color: "var(--t-blue-deep)" }} strokeWidth={2.5} />
            </div>
          </motion.div>

          <motion.h2
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-2xl font-extrabold text-center tracking-tight mb-2"
            style={{ color: "var(--t-text)" }}
          >
            Order Updated
          </motion.h2>

          <motion.p
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="text-center text-[15px] max-w-[280px]"
            style={{ color: "var(--t-subtle)" }}
          >
            Your order <span className="font-semibold text-slate-800">{RECEIPT.code}</span> has been confirmed. View it anytime in your dashboard.
          </motion.p>
        </div>

        {/* View Order CTA - High Elevation Light Surface */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full mb-8"
        >
          <button
            className="w-full h-14 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2.5 transition-all group bg-white shadow-[0_4px_12px_-4px_rgba(0,0,0,0.08),_0_2px_4px_-2px_rgba(0,0,0,0.04),_inset_0_1px_1px_rgba(255,255,255,1)] border border-slate-200/80 hover:shadow-[0_8px_16px_-6px_rgba(0,0,0,0.1)] active:scale-[0.98]"
            style={{ color: "var(--t-blue-deep)" }}
          >
            <ClipboardList className="w-5 h-5 text-blue-600/80" />
            View in My Orders
            <ArrowRight className="w-4 h-4 text-blue-600/60 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        {/* Hero Surface: Payment Panel */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="w-full mb-8"
        >
          <PaymentPanel />
        </motion.div>

        {/* Lower Elevation Secondary Actions */}
        <div className="w-full space-y-3">
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <button
              className="w-full h-14 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2.5 transition-all bg-white/60 shadow-sm border border-slate-200/50 hover:bg-white active:scale-[0.98]"
              style={{ color: "var(--t-text)" }}
            >
              <FileDown className="w-[18px] h-[18px] text-slate-500" />
              Save Receipt PDF
            </button>
          </motion.div>

          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <button
              className="w-full h-14 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2.5 transition-all hover:bg-slate-200/50 active:scale-[0.98] text-slate-600"
            >
              <Home className="w-[18px] h-[18px] opacity-70" />
              Return to Home
            </button>
          </motion.div>
        </div>

      </main>
    </div>
  );
}
