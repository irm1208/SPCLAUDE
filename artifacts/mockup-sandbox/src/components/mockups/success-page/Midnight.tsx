import "./_group.css";
import { motion } from "framer-motion";
import {
  Check, Home, FileDown, ChevronRight, ArrowRight,
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

function UsdtBadge({ size = 40 }: { size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(38,161,123,0.3)]"
      style={{ width: size, height: size, background: "#26A17B" }}
    >
      <span className="text-white font-black" style={{ fontSize: size * 0.45 }}>₮</span>
    </div>
  );
}

export function Midnight() {
  return (
    <div 
      className="success-page-root flex flex-col font-sans" 
      style={{ 
        background: "#070B14", // Deep near-black navy
        minHeight: "100vh",
        color: "#F8FAFC",
        // Override group css vars locally for any nested usage
        "--t-bg": "#070B14",
        "--t-surface": "#0F1626",
        "--t-surface2": "#162035",
        "--t-border": "#1E293B",
        "--t-text": "#F8FAFC",
        "--t-muted": "#94A3B8",
        "--t-subtle": "#64748B",
        "--t-blue": "#3B82F6",
        "--t-blue-deep": "#1E3A8A"
      } as React.CSSProperties}
    >
      {/* Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-blue-600/10 blur-[120px] pointer-events-none rounded-full" />
      
      <main className="flex-1 px-5 py-10 pb-24 max-w-md mx-auto w-full flex flex-col items-center relative z-10">
        
        {/* Status Header */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
          className="w-16 h-16 rounded-full flex items-center justify-center mb-6 relative"
        >
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-2 bg-emerald-500/30 rounded-full" />
          <Check className="w-8 h-8 text-emerald-400 relative z-10" strokeWidth={3} />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-xl font-medium tracking-tight mb-2 text-white/90">
            Order Updated
          </h2>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-white/60 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {RECEIPT.code}
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-slate-400 uppercase tracking-widest font-semibold">Total Due</p>
            <div className="text-5xl font-light tracking-tight text-white flex items-center justify-center gap-1 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
              <span className="text-3xl text-slate-500">{currSym(RECEIPT.currency)}</span>
              {RECEIPT.grandTotal.toFixed(2)}
            </div>
          </div>
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full mb-8"
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-sm font-semibold text-slate-300">Select Payment Asset</h3>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1">
              <Wallet className="w-3 h-3" /> Secure
            </span>
          </div>

          <div className="space-y-3">
            {/* USDT Card */}
            <button className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group bg-[#0F1626] border border-slate-800 hover:border-slate-600 hover:bg-[#131A2D] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <UsdtBadge size={44} />
              <div className="flex-1 min-w-0 z-10">
                <p className="text-base font-semibold text-white mb-0.5 tracking-tight">USDT or USDC</p>
                <p className="text-xs text-slate-400 font-mono tracking-tight">ERC-20 · Auto-verified</p>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all z-10" />
            </button>

            {/* AnonPay Card */}
            <button className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group bg-[#0F1626] border border-slate-800 hover:border-slate-600 hover:bg-[#131A2D] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-11 h-11 rounded-[10px] bg-gradient-to-br from-indigo-500 to-purple-700 flex flex-col items-center justify-center shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                <span className="text-[8px] font-black leading-[1.1] tracking-tight text-white">ANON</span>
                <span className="text-[8px] font-black leading-[1.1] tracking-tight text-white">PAY</span>
              </div>
              <div className="flex-1 min-w-0 z-10">
                <p className="text-base font-semibold text-white mb-0.5 tracking-tight flex items-center gap-2">
                  AnonPay 
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/10 text-white/70 tracking-wider">ANY COIN</span>
                </p>
                <p className="text-xs text-slate-400">BTC, ETH, XMR & 100+ coins</p>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0 text-slate-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all z-10" />
            </button>
          </div>
        </motion.div>

        {/* Secondary Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full space-y-3"
        >
          <button className="w-full h-14 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            View Order Status
            <ArrowRight className="w-4 h-4 opacity-50" />
          </button>
          
          <div className="flex gap-3">
            <button className="flex-1 h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-transparent text-slate-400 hover:text-white transition-colors">
              <FileDown className="w-4 h-4" /> Receipt PDF
            </button>
            <button className="flex-1 h-12 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-transparent text-slate-400 hover:text-white transition-colors">
              <Home className="w-4 h-4" /> Home
            </button>
          </div>
        </motion.div>

      </main>
    </div>
  );
}
