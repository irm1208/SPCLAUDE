import "./_group.css";
import { motion } from "framer-motion";
import {
  CheckCircle2, Home, FileDown, ChevronRight, ClipboardList
} from "lucide-react";

const RECEIPT = {
  code: "PEP-4821",
  grandTotal: 160.0,
  currency: "USD",
};

function currSym(c: string) {
  return c === "GBP" ? "£" : "$";
}

function UsdtBadge({ size = 42 }: { size?: number }) {
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
  return (
    <div className="p-6 space-y-6 rounded-2xl shadow-sm relative overflow-hidden bg-white border-2" style={{ borderColor: "var(--t-blue-deep)" }}>
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: "var(--t-blue-deep)" }} />
      
      <div className="text-center pb-5 border-b" style={{ borderColor: "var(--t-border)" }}>
        <p className="font-bold text-[11px] mb-1.5 uppercase tracking-wider" style={{ color: "var(--t-blue-deep)" }}>Awaiting Payment</p>
        <p className="font-black text-4xl tracking-tight" style={{ color: "var(--t-text)" }}>
          {currSym(RECEIPT.currency)}{RECEIPT.grandTotal.toFixed(2)}
        </p>
      </div>

      <div className="space-y-3">
        <p className="font-bold text-sm mb-2 text-center" style={{ color: "var(--t-text)" }}>How would you like to pay?</p>
        
        <button
          className="w-full flex items-center gap-3.5 p-4 rounded-xl border transition-all text-left group hover:shadow-md"
          style={{ background: "var(--t-bg)", borderColor: "var(--t-border)" }}
        >
          <UsdtBadge size={42} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>USDT or USDC</p>
            <p className="text-xs leading-snug mt-0.5" style={{ color: "var(--t-subtle)" }}>ERC-20 · Verified automatically</p>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: "var(--t-blue-deep)" }} />
        </button>

        <button
          className="w-full flex items-center gap-3.5 p-4 rounded-xl border transition-all text-left group hover:shadow-md"
          style={{ background: "var(--t-bg)", borderColor: "var(--t-border)" }}
        >
          <div className="w-[42px] h-[42px] rounded-[10px] bg-slate-800 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white font-black text-[9px] tracking-tight leading-none text-center">ANON<br />PAY</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>AnonPay (Any Crypto)</p>
            <p className="text-xs leading-snug mt-0.5" style={{ color: "var(--t-subtle)" }}>BTC, ETH, XMR & 100+ coins</p>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: "var(--t-blue-deep)" }} />
        </button>
      </div>
    </div>
  );
}

export function Cohesive() {
  return (
    <div className="success-page-root flex flex-col" style={{ background: "var(--t-bg)", minHeight: "100vh" }}>
      <main className="flex-1 px-4 py-10 pb-24 max-w-md mx-auto w-full flex flex-col items-center">

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
          style={{ background: "rgba(34,197,94,0.1)" }}
        >
          <CheckCircle2 className="w-8 h-8" style={{ color: "#22C55E" }} />
        </motion.div>

        <motion.h2
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-black text-center mb-2 tracking-tight"
          style={{ color: "var(--t-text)" }}
        >
          Order Updated!
        </motion.h2>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-center mb-8 px-4 text-sm leading-relaxed"
          style={{ color: "var(--t-subtle)" }}
        >
          Your order has been updated.{" "}
          <span className="block">You can view it anytime in My Orders.</span>
        </motion.p>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full mb-8"
        >
          <button
            className="w-full h-14 rounded-2xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all border bg-white shadow-sm hover:border-gray-300"
            style={{ color: "var(--t-text)", borderColor: "var(--t-border)" }}
          >
            <ClipboardList className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
            View your order in My Orders
          </button>
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="w-full mb-8"
        >
          <PaymentPanelMock />
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full mb-4"
        >
          <div className="rounded-2xl p-4 px-5 border flex items-center justify-between shadow-sm bg-white" style={{ borderColor: "var(--t-border)" }}>
            <div>
              <p className="text-sm font-bold mb-0.5" style={{ color: "var(--t-text)" }}>Save Your Receipt</p>
              <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>
                PDF of your full order
              </p>
            </div>
            <button
              className="h-10 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border hover:bg-gray-50"
              style={{ color: "var(--t-text)", borderColor: "var(--t-border)" }}
            >
              <FileDown className="w-3.5 h-3.5" style={{ color: "var(--t-subtle)" }} /> Download
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="w-full"
        >
          <button
            className="w-full h-14 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-all"
            style={{ color: "var(--t-subtle)" }}
          >
            <Home className="w-4 h-4" /> Return to Home
          </button>
        </motion.div>

      </main>
    </div>
  );
}
