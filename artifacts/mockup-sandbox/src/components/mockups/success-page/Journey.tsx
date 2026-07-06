import "./_group.css";
import { motion } from "framer-motion";
import {
  Check, FileDown, Home, ClipboardList, ChevronRight, Lock, Package, Truck, Receipt
} from "lucide-react";
import React from "react";

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

const timelineAnim = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  })
};

export function Journey() {
  return (
    <div className="success-page-root flex flex-col items-center p-4 py-12" style={{ background: "var(--t-bg)", minHeight: "100vh" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .journey-line {
          position: absolute;
          left: 19px;
          top: 36px;
          bottom: -16px;
          width: 2px;
          background: var(--t-border);
          z-index: 0;
        }
        .journey-line-active {
          position: absolute;
          left: 19px;
          top: 36px;
          height: calc(100% - 36px);
          width: 2px;
          background: var(--t-blue);
          z-index: 1;
        }
        .payment-card {
          box-shadow: 0 4px 20px -4px rgba(45, 107, 204, 0.15);
        }
      `}} />

      <main className="w-full max-w-md mx-auto">
        <motion.div 
          custom={0} initial="hidden" animate="visible" variants={timelineAnim}
          className="mb-8 pl-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium tracking-wide uppercase" style={{ color: "var(--t-subtle)" }}>Order {RECEIPT.code}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--t-text)" }}>Your Order Journey</h1>
          <p className="text-sm mt-1" style={{ color: "var(--t-muted)" }}>Follow these steps to complete your purchase.</p>
        </motion.div>

        <div className="relative pl-4 pr-2">
          {/* Step 1: Updated (Done) */}
          <motion.div custom={1} initial="hidden" animate="visible" variants={timelineAnim} className="relative pb-10 z-10">
            <div className="journey-line-active" />
            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--t-blue)", color: "#fff" }}>
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <div className="pt-2">
                <h3 className="font-bold text-base" style={{ color: "var(--t-text)" }}>Order Updated</h3>
                <p className="text-sm" style={{ color: "var(--t-subtle)" }}>We've securely saved your details.</p>
              </div>
            </div>
          </motion.div>

          {/* Step 2: Payment (Active) */}
          <motion.div custom={2} initial="hidden" animate="visible" variants={timelineAnim} className="relative pb-10 z-10">
            <div className="journey-line" />
            <div className="flex gap-4 relative z-10">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-[3px]" style={{ borderColor: "var(--t-blue)", background: "var(--t-surface)" }}>
                <div className="w-3 h-3 rounded-full" style={{ background: "var(--t-blue)" }} />
              </div>
              <div className="flex-1 pt-1.5 pb-2">
                <h3 className="font-bold text-lg mb-1" style={{ color: "var(--t-text)" }}>Payment Required</h3>
                <p className="text-sm mb-4" style={{ color: "var(--t-subtle)" }}>Select a payment method to complete the <span className="font-bold" style={{ color: "var(--t-text)" }}>{currSym(RECEIPT.currency)}{RECEIPT.grandTotal.toFixed(2)}</span> balance.</p>
                
                <div className="space-y-3 bg-white p-2 rounded-2xl border payment-card" style={{ borderColor: "rgba(45, 107, 204, 0.2)" }}>
                  <button
                    className="w-full flex items-center gap-3.5 p-3 rounded-xl transition-all text-left hover:bg-slate-50 group"
                  >
                    <UsdtBadge size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>USDT or USDC</p>
                      <p className="text-[11px] leading-snug" style={{ color: "var(--t-subtle)" }}>ERC-20 · Verified on-chain</p>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: "var(--t-subtle)" }} />
                  </button>

                  <div className="h-[1px] w-full" style={{ background: "var(--t-border)", opacity: 0.5 }} />

                  <button
                    className="w-full flex items-center gap-3.5 p-3 rounded-xl transition-all text-left hover:bg-slate-50 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-white font-black text-[8px] tracking-tight leading-none text-center">ANON<br />PAY</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>AnonPay (Any Crypto)</p>
                      <p className="text-[11px] leading-snug" style={{ color: "var(--t-subtle)" }}>BTC, ETH, XMR & 100+ coins</p>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: "var(--t-subtle)" }} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Step 3: Processing */}
          <motion.div custom={3} initial="hidden" animate="visible" variants={timelineAnim} className="relative pb-10 z-10">
             <div className="journey-line" />
             <div className="flex gap-4 relative z-10 opacity-50">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2" style={{ borderColor: "var(--t-border)", background: "var(--t-bg)", color: "var(--t-subtle)" }}>
                <Package className="w-4 h-4" />
              </div>
              <div className="pt-2">
                <h3 className="font-medium text-base" style={{ color: "var(--t-muted)" }}>Processing</h3>
                <p className="text-sm" style={{ color: "var(--t-subtle)" }}>Awaits payment confirmation</p>
              </div>
            </div>
          </motion.div>

          {/* Step 4: Shipping */}
          <motion.div custom={4} initial="hidden" animate="visible" variants={timelineAnim} className="relative pb-4 z-10">
             <div className="flex gap-4 relative z-10 opacity-50">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2" style={{ borderColor: "var(--t-border)", background: "var(--t-bg)", color: "var(--t-subtle)" }}>
                <Truck className="w-4 h-4" />
              </div>
              <div className="pt-2">
                <h3 className="font-medium text-base" style={{ color: "var(--t-muted)" }}>Ships to you</h3>
                <p className="text-sm" style={{ color: "var(--t-subtle)" }}>Tracking provided after dispatch</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Secondary Actions */}
        <motion.div custom={5} initial="hidden" animate="visible" variants={timelineAnim} className="mt-8 pt-8 border-t flex flex-col gap-3 px-4" style={{ borderColor: "var(--t-border)" }}>
           <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--t-subtle)" }}>Manage Order</p>
           
           <div className="grid grid-cols-2 gap-3">
             <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border bg-white hover:bg-slate-50 transition-colors" style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}>
               <ClipboardList className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
               <span className="text-xs font-medium">My Orders</span>
             </button>
             <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border bg-white hover:bg-slate-50 transition-colors" style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}>
               <Receipt className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
               <span className="text-xs font-medium">Get Receipt</span>
             </button>
           </div>
           
           <button className="w-full mt-2 h-12 flex items-center justify-center gap-2 text-sm font-medium rounded-xl transition-colors hover:bg-slate-100" style={{ color: "var(--t-muted)" }}>
             <Home className="w-4 h-4" /> Return Home
           </button>
        </motion.div>

      </main>
    </div>
  );
}
