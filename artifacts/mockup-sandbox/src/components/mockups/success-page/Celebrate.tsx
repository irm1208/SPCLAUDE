import "./_group.css";
import React from "react";
import { motion } from "framer-motion";
import {
  Check, Home, FileDown, ArrowRight,
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

export function Celebrate() {
  return (
    <div className="flex flex-col relative w-full" style={{ background: "#FDFCFB", minHeight: "100vh", fontFamily: "var(--font-sans, system-ui)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
        .font-editorial {
          font-family: 'Playfair Display', serif;
        }
        .celebrate-bg {
          background: radial-gradient(circle at 50% 15%, rgba(34, 197, 94, 0.06) 0%, rgba(253, 252, 251, 0) 50%);
        }
        .ring-pulse {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid rgba(34, 197, 94, 0.25);
          animation: pulse-ring 3.5s cubic-bezier(0.2, 0, 0.2, 1) infinite;
        }
        .ring-pulse:nth-child(2) {
          animation-delay: 1.75s;
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.8); opacity: 0; }
        }
      `}</style>
      
      <div className="absolute inset-0 celebrate-bg pointer-events-none" />

      <main className="flex-1 px-5 py-12 pb-24 max-w-md mx-auto w-full flex flex-col relative z-10">
        
        {/* Success Mark */}
        <div className="flex justify-center mt-8 mb-10">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative w-14 h-14 flex items-center justify-center"
          >
            <div className="ring-pulse" />
            <div className="ring-pulse" />
            <div className="absolute inset-0 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
              <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
          </motion.div>
        </div>

        {/* Headline */}
        <div className="text-center mb-10">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-[40px] leading-[1.1] md:text-5xl font-editorial text-stone-900 tracking-tight mb-5"
          >
            Splendid.<br/>Order updated.
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-stone-500 text-[15px] leading-relaxed max-w-[280px] mx-auto"
          >
            Your order <span className="text-stone-900 font-medium">#{RECEIPT.code}</span> is perfectly arranged. Only one step remains.
          </motion.p>
        </div>

        {/* Payment Section */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-stone-100 mb-8 relative overflow-hidden"
        >
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h2 className="text-[11px] font-bold tracking-widest text-stone-400 uppercase mb-1.5">Awaiting Payment</h2>
              <p className="text-3xl font-editorial text-stone-900">{currSym(RECEIPT.currency)}{RECEIPT.grandTotal.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-amber-200/50 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Pending
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button className="w-full group relative flex items-center gap-4 p-4 rounded-2xl border border-stone-200 hover:border-green-500/30 hover:bg-green-50/30 transition-all text-left overflow-hidden">
              <UsdtBadge size={40} />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-stone-900 mb-0.5">USDT or USDC</p>
                <p className="text-[13px] text-stone-500">ERC-20 · Verified automatically</p>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-green-600 transition-colors" />
            </button>

            <button className="w-full group relative flex items-center gap-4 p-4 rounded-2xl border border-stone-200 hover:border-slate-800/30 hover:bg-slate-50 transition-all text-left overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-white font-black text-[8px] tracking-tight leading-none text-center">ANON<br />PAY</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-stone-900 mb-0.5">AnonPay <span className="text-stone-400 font-normal">(Any Crypto)</span></p>
                <p className="text-[13px] text-stone-500">BTC, ETH, XMR & 100+ coins</p>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-slate-800 transition-colors" />
            </button>
          </div>
        </motion.div>

        {/* Secondary Actions */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3"
        >
          <button className="w-full h-14 rounded-2xl bg-[#1A1A1A] text-white font-medium flex items-center justify-center gap-2 hover:bg-black active:scale-[0.98] transition-all">
            View in My Orders
          </button>
          
          <div className="flex gap-3">
            <button className="flex-1 h-12 rounded-xl bg-white border border-stone-200 text-stone-600 font-medium text-[13px] flex items-center justify-center gap-2 hover:bg-stone-50 active:scale-[0.98] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <FileDown className="w-4 h-4 text-stone-400" />
              Receipt PDF
            </button>
            <button className="flex-1 h-12 rounded-xl bg-white border border-stone-200 text-stone-600 font-medium text-[13px] flex items-center justify-center gap-2 hover:bg-stone-50 active:scale-[0.98] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <Home className="w-4 h-4 text-stone-400" />
              Return Home
            </button>
          </div>
        </motion.div>

      </main>
    </div>
  );
}
