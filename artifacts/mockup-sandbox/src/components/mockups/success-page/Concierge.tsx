import "./_group.css";
import React from "react";
import { motion } from "framer-motion";
import {
  Check,
  FileDown,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Home
} from "lucide-react";

const RECEIPT = {
  code: "PEP-4821",
  grandTotal: 160.0,
  currency: "USD",
};

function currSym(c: string) {
  return c === "GBP" ? "£" : "$";
}

function UsdtBadge({ size = 32 }: { size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: "#26A17B" }}
    >
      <span className="text-white font-black" style={{ fontSize: size * 0.42 }}>₮</span>
    </div>
  );
}

export function Concierge() {
  return (
    <div className="success-page-root min-h-screen flex flex-col font-sans" style={{ background: "var(--t-bg)", color: "var(--t-text)" }}>
      <main className="flex-1 w-full max-w-md mx-auto p-6 pb-24 flex flex-col">
        {/* Concierge Intro */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mt-8 mb-10"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-blue-50/50 border border-blue-100 text-blue-800 text-xs font-semibold tracking-wide uppercase">
            <ShieldCheck className="w-4 h-4" />
            Order {RECEIPT.code}
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ color: "var(--t-text)" }}>
            Nice—your order is updated.
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--t-subtle)" }}>
            We have everything we need to process your request. There’s just one final step before we prepare your shipment.
          </p>
        </motion.div>

        {/* Progress Checklist */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="mb-10 relative"
        >
          {/* Vertical line connecting steps */}
          <div className="absolute left-[13px] top-5 bottom-5 w-px bg-gray-200"></div>
          
          <div className="flex items-start gap-4 mb-6 relative">
            <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0 z-10 shadow-[0_0_0_4px_var(--t-bg)]">
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            </div>
            <div className="pt-0.5">
              <p className="font-semibold text-sm">Order confirmed & updated</p>
              <p className="text-sm text-gray-500 mt-0.5">Details securely logged.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 relative">
            <div className="w-7 h-7 rounded-full border-2 border-[var(--t-blue-deep)] bg-white flex items-center justify-center shrink-0 z-10 shadow-[0_0_0_4px_var(--t-bg)]">
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--t-blue-deep)" }}></div>
            </div>
            <div className="pt-0.5 w-full">
              <p className="font-semibold text-sm" style={{ color: "var(--t-blue-deep)" }}>Awaiting payment</p>
              <p className="text-sm text-gray-500 mt-0.5">Complete your payment of <span className="font-semibold text-gray-900">{currSym(RECEIPT.currency)}{RECEIPT.grandTotal.toFixed(2)}</span>.</p>
            </div>
          </div>
        </motion.div>

        {/* Payment Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="bg-white rounded-2xl border p-5 mb-10 shadow-sm"
          style={{ borderColor: "var(--t-border)" }}
        >
          <div className="mb-4">
            <h2 className="font-semibold text-[15px]">How would you like to pay?</h2>
            <p className="text-sm text-gray-500 mt-1">Both methods are secure and verify automatically.</p>
          </div>

          <div className="space-y-3">
            <button className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left group">
              <UsdtBadge size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">USDT or USDC</p>
                <p className="text-[13px] text-gray-500 mt-0.5">ERC-20 network only</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
            </button>

            <button className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left group">
              <div className="w-9 h-9 rounded-[8px] bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0 shadow-inner">
                <span className="text-white font-black text-[8px] tracking-tight leading-[1] text-center">ANON<br />PAY</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">AnonPay</p>
                <p className="text-[13px] text-gray-500 mt-0.5">BTC, ETH, XMR + 100 more</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </motion.div>

        {/* Secondary Actions (Helpful Asides) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
          className="mt-auto border-t pt-6"
          style={{ borderColor: "var(--t-border)" }}
        >
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4 pl-1">Need anything else?</p>
          
          <div className="grid grid-cols-1 gap-1">
            <button className="flex items-center justify-between p-3 rounded-xl hover:bg-black/5 transition-colors text-left group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-200/50 flex items-center justify-center text-gray-600 group-hover:bg-white group-hover:shadow-sm transition-all">
                  <FileDown className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Download receipt</p>
                  <p className="text-xs text-gray-500">Get a PDF copy for your records</p>
                </div>
              </div>
            </button>

            <button className="flex items-center justify-between p-3 rounded-xl hover:bg-black/5 transition-colors text-left group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-200/50 flex items-center justify-center text-gray-600 group-hover:bg-white group-hover:shadow-sm transition-all">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">View in My Orders</p>
                  <p className="text-xs text-gray-500">Check full order details</p>
                </div>
              </div>
            </button>

            <button className="flex items-center justify-between p-3 rounded-xl hover:bg-black/5 transition-colors text-left group mt-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500">
                  <Home className="w-4 h-4" />
                </div>
                <p className="text-sm font-medium text-gray-600 group-hover:text-gray-900">Return home</p>
              </div>
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
