import "./_group.css";
import { motion } from "framer-motion";
import {
  CheckCircle2, Home, FileDown, ChevronRight, ClipboardList, ArrowRight,
  Wallet
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
      className="rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-black/5"
      style={{ width: size, height: size, background: "#26A17B" }}
    >
      <span className="text-white font-black" style={{ fontSize: size * 0.42 }}>₮</span>
    </div>
  );
}

function PaymentPanelMock() {
  return (
    <div className="p-6 rounded-2xl bg-white border border-blue-100 shadow-[0_4px_20px_-4px_rgba(45,107,204,0.08),0_2px_8px_-2px_rgba(45,107,204,0.04)] relative overflow-hidden">
      {/* Subtle brand blue top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--t-blue)] to-[var(--t-blue-deep)]" />
      
      <div className="flex items-start gap-4 mb-5">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
          <Wallet className="w-5 h-5 text-[var(--t-blue)]" />
        </div>
        <div>
          <h3 className="font-bold text-lg mb-1" style={{ color: "var(--t-text)" }}>How would you like to pay?</h3>
          <p className="text-sm leading-relaxed" style={{ color: "var(--t-subtle)" }}>
            Total: <span className="font-bold text-[var(--t-text)]">{currSym(RECEIPT.currency)}{RECEIPT.grandTotal.toFixed(2)}</span> — choose your method
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <button
          className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-left group shadow-sm"
        >
          <UsdtBadge size={44} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>USDT or USDC</p>
            <p className="text-xs mt-0.5 text-slate-500">ERC-20 · Verified automatically</p>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-left group shadow-sm"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0 shadow-sm border border-slate-900/10">
            <span className="text-white font-black text-[9px] tracking-tight leading-none text-center">ANON<br />PAY</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>AnonPay (Any Crypto)</p>
            <p className="text-xs mt-0.5 text-slate-500 leading-tight">BTC, ETH, XMR & 100+ coins</p>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

export function PolishedUnity() {
  return (
    <div className="success-page-root flex flex-col font-sans" style={{ background: "var(--t-bg)", minHeight: "100vh" }}>
      <main className="flex-1 px-5 py-10 pb-24 max-w-md mx-auto w-full flex flex-col items-center">

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="relative w-20 h-20 mb-6 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-green-100 rounded-full scale-110" />
          <div className="absolute inset-0 bg-green-500 rounded-full opacity-20" />
          <CheckCircle2 className="w-10 h-10 text-green-600 relative z-10" strokeWidth={2.5} />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl font-bold tracking-tight mb-2 text-slate-900">
            Order Updated!
          </h2>
          <p className="text-sm text-slate-500 px-4 leading-relaxed">
            Your order has been updated. You can view its status anytime in <span className="font-semibold text-slate-700">My Orders</span>.
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="w-full mb-8"
        >
          <button
            className="w-full h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all border shadow-sm group bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
          >
            <ClipboardList className="w-4 h-4 text-slate-400 group-hover:text-slate-500" />
            View order in My Orders
            <ArrowRight className="w-4 h-4 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="w-full mb-6"
        >
          <PaymentPanelMock />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="w-full mb-6"
        >
          <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-sm flex flex-col items-start text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <FileDown className="w-4 h-4 text-slate-600" />
              </div>
              <p className="text-sm font-bold text-slate-900">Save Your Receipt</p>
            </div>
            <p className="text-sm text-slate-500 mb-4 pl-11">
              Download a PDF of your full order details for your records.
            </p>
            <button
              className="ml-11 w-[calc(100%-44px)] h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Download PDF
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full mt-4"
        >
          <button
            className="w-full h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors text-slate-500 hover:text-slate-800 hover:bg-black/5"
          >
            <Home className="w-4 h-4" /> Return to Home
          </button>
        </motion.div>

      </main>
    </div>
  );
}
