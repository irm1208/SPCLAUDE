import "./_group.css";
import React from "react";
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

function UsdtBadge({ size = 28 }: { size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 shadow-sm"
      style={{ width: size, height: size, background: "#26A17B" }}
    >
      <span className="text-white font-black" style={{ fontSize: size * 0.42 }}>₮</span>
    </div>
  );
}

export function Compact() {
  return (
    <div className="success-page-root flex flex-col items-center justify-center min-h-[100dvh]" style={{ background: "var(--t-bg)" }}>
      <main className="w-full max-w-[400px] px-4">
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden"
          style={{ boxShadow: "0 10px 40px -10px rgba(0,0,0,0.08)" }}
        >
          {/* Header Row */}
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--t-border)" }}>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="font-semibold text-[15px]" style={{ color: "var(--t-text)" }}>Order updated</span>
            </div>
            <span className="text-sm font-medium px-2 py-0.5 rounded-md" style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }}>
              {RECEIPT.code}
            </span>
          </div>

          {/* Amount Due Line */}
          <div className="px-5 py-6 text-center border-b border-dashed" style={{ borderColor: "var(--t-border)" }}>
            <div className="text-sm font-medium mb-1" style={{ color: "var(--t-subtle)" }}>Amount Due</div>
            <div className="text-4xl font-extrabold tracking-tight" style={{ color: "var(--t-text)" }}>
              {currSym(RECEIPT.currency)}{RECEIPT.grandTotal.toFixed(2)}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="p-5 border-b" style={{ borderColor: "var(--t-border)", background: "#FAFAFB" }}>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--t-muted)" }}>Select Payment</div>
            <div className="space-y-2">
              <button
                className="w-full flex items-center gap-3 p-3 rounded-xl border bg-white hover:border-blue-300 transition-all text-left group shadow-sm"
                style={{ borderColor: "var(--t-border)" }}
              >
                <UsdtBadge size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>USDT or USDC</div>
                  <div className="text-[11px] truncate" style={{ color: "var(--t-subtle)" }}>ERC-20 · Verified automatically</div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </button>

              <button
                className="w-full flex items-center gap-3 p-3 rounded-xl border bg-white hover:border-blue-300 transition-all text-left group shadow-sm"
                style={{ borderColor: "var(--t-border)" }}
              >
                <div className="w-8 h-8 rounded-[7px] bg-slate-800 flex items-center justify-center shrink-0">
                  <span className="text-white font-black text-[7px] tracking-tight leading-none text-center">ANON<br />PAY</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>AnonPay (Any Crypto)</div>
                  <div className="text-[11px] truncate" style={{ color: "var(--t-subtle)" }}>BTC, ETH, XMR & 100+ coins</div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </button>
            </div>
          </div>

          {/* Secondary Actions (Footer List) */}
          <div className="p-2">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left group">
              <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "rgba(45, 107, 204, 0.1)", color: "var(--t-blue)" }}>
                <ClipboardList className="w-4 h-4" />
              </div>
              <span className="text-[13px] font-medium flex-1" style={{ color: "var(--t-text)" }}>View in My Orders</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left group">
              <div className="w-7 h-7 rounded-md flex items-center justify-center bg-gray-100 text-gray-600">
                <FileDown className="w-4 h-4" />
              </div>
              <span className="text-[13px] font-medium flex-1" style={{ color: "var(--t-text)" }}>Download Receipt PDF</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left group">
              <div className="w-7 h-7 rounded-md flex items-center justify-center bg-gray-100 text-gray-600">
                <Home className="w-4 h-4" />
              </div>
              <span className="text-[13px] font-medium flex-1" style={{ color: "var(--t-text)" }}>Return to Home</span>
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
