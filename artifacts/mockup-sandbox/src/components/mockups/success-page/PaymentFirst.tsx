import "./_group.css";
import { motion } from "framer-motion";
import {
  CheckCircle2, Home, FileDown, ChevronRight, ClipboardList, ArrowRight, Wallet, Check
} from "lucide-react";

const RECEIPT = {
  code: "PEP-4821",
  grandTotal: 160.0,
  currency: "USD",
};

function currSym(c: string) {
  return c === "GBP" ? "£" : "$";
}

function UsdtBadge({ size = 40 }: { size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 shadow-sm"
      style={{ width: size, height: size, background: "#26A17B" }}
    >
      <span className="text-white font-black" style={{ fontSize: size * 0.42 }}>₮</span>
    </div>
  );
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const fadeUp = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", bounce: 0.4 } }
};

export function PaymentFirst() {
  return (
    <div className="success-page-root flex flex-col font-sans" style={{ background: "var(--t-bg)", minHeight: "100vh" }}>
      <main className="flex-1 px-4 py-8 pb-24 max-w-md mx-auto w-full flex flex-col">

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-6"
        >
          {/* Header Compact Confirmation */}
          <motion.div variants={fadeUp} className="flex flex-col items-center pt-2">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500/10">
                <Check className="w-5 h-5 text-green-600" strokeWidth={3} />
              </div>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--t-text)" }}>
                Order Updated!
              </h2>
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--t-muted)" }}>
              Order #{RECEIPT.code}
            </p>
          </motion.div>

          {/* Payment Hero Card */}
          <motion.div variants={fadeUp} className="w-full">
            <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
              <div className="text-center mb-6">
                <p className="text-sm font-medium uppercase tracking-wider mb-1" style={{ color: "var(--t-blue)" }}>Total Due</p>
                <div className="text-4xl font-black tracking-tight" style={{ color: "var(--t-text)" }}>
                  {currSym(RECEIPT.currency)}{RECEIPT.grandTotal.toFixed(2)}
                </div>
                <p className="text-sm mt-2" style={{ color: "var(--t-subtle)" }}>Choose a payment method to complete</p>
              </div>

              <div className="space-y-3">
                <button
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                  style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}
                >
                  <UsdtBadge size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold" style={{ color: "var(--t-text)" }}>USDT or USDC</p>
                    <p className="text-[13px] leading-tight mt-0.5" style={{ color: "var(--t-subtle)" }}>ERC-20 · Auto-verified</p>
                  </div>
                  <ChevronRight className="w-5 h-5 shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>

                <button
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                  style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}
                >
                  <div className="w-[44px] h-[44px] rounded-[10px] bg-[#1a1b1e] flex flex-col items-center justify-center shrink-0 shadow-inner">
                    <span className="text-white font-black text-[9px] tracking-tight leading-[1.1] text-center">ANON<br />PAY</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold" style={{ color: "var(--t-text)" }}>AnonPay</p>
                    <p className="text-[13px] leading-tight mt-0.5" style={{ color: "var(--t-subtle)" }}>BTC, ETH, XMR & 100+</p>
                  </div>
                  <ChevronRight className="w-5 h-5 shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Secondary Actions */}
          <motion.div variants={fadeUp} className="w-full flex flex-col gap-3 mt-4">
            
            {/* Download Receipt Block */}
            <div className="bg-slate-100/60 rounded-2xl p-4 border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-[14px] font-bold text-slate-800">Save Receipt</p>
                <p className="text-[13px] text-slate-500">PDF copy of your order details</p>
              </div>
              <button className="h-10 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
                <FileDown className="w-4 h-4" /> Download
              </button>
            </div>

            {/* Navigation Block */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                className="h-12 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-slate-200/50 transition-colors bg-slate-100/50 text-slate-600"
              >
                <ClipboardList className="w-4 h-4" /> My Orders
              </button>
              
              <button
                className="h-12 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-slate-200/50 transition-colors bg-slate-100/50 text-slate-600"
              >
                <Home className="w-4 h-4" /> Home
              </button>
            </div>

          </motion.div>

        </motion.div>
      </main>
    </div>
  );
}
