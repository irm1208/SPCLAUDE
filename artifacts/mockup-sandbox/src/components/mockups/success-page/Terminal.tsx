import "./_group.css";
import { motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  ClipboardList,
  FileDown,
  Home
} from "lucide-react";

export function Terminal() {
  return (
    <div
      className="success-page-root flex flex-col min-h-screen text-white font-mono selection:bg-white/20"
      style={{
        background: "#09090b",
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <main className="flex-1 w-full max-w-[440px] mx-auto flex flex-col px-5 py-10 relative">
        
        {/* Status & Metadata */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center mt-8 mb-12"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 mb-6">
            <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-green-400" strokeWidth={3} />
            </div>
            <span className="text-[11px] font-medium tracking-wide uppercase text-zinc-300">
              Order Updated
            </span>
          </div>

          <div className="text-zinc-400 text-sm font-medium mb-1">
            Order Code <span className="text-zinc-200">PEP-4821</span>
          </div>
          
          <h1 className="text-[4rem] font-light tracking-tighter leading-none mt-2">
            <span className="text-zinc-500 text-4xl mr-1 font-light">$</span>
            160<span className="text-zinc-500">.00</span>
          </h1>
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 w-full flex flex-col gap-3"
        >
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2 pl-1">
            Select Payment Method
          </div>

          <button className="group relative w-full flex items-center p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors text-left overflow-hidden">
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="w-12 h-12 rounded-full bg-[#26A17B] flex items-center justify-center shrink-0 mr-4 shadow-[0_0_15px_rgba(38,161,123,0.3)]">
              <span className="text-white font-black text-xl">₮</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-white mb-0.5">USDT or USDC</p>
              <p className="text-[11px] text-zinc-400 leading-snug pr-4">ERC-20 &middot; Verified automatically on-chain</p>
            </div>
            
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-black transition-colors text-zinc-400">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>

          <button className="group relative w-full flex items-center p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors text-left overflow-hidden">
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mr-4 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <span className="text-white font-black text-[10px] leading-[1.1] text-center tracking-tighter">ANON<br/>PAY</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-white mb-0.5">AnonPay <span className="text-zinc-500 font-normal">(Any Crypto)</span></p>
              <p className="text-[11px] text-zinc-400 leading-snug pr-4">BTC, ETH, XMR & 100+ coins &middot; Auto-converted</p>
            </div>
            
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-black transition-colors text-zinc-400">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </motion.div>

        {/* Quiet Utility Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-16 pt-6 border-t border-zinc-900 w-full"
        >
          <div className="flex items-center justify-around px-2">
            <button className="flex flex-col items-center gap-2 text-zinc-500 hover:text-white transition-colors group">
              <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
                <ClipboardList className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-medium tracking-wide">My Orders</span>
            </button>
            
            <button className="flex flex-col items-center gap-2 text-zinc-500 hover:text-white transition-colors group">
              <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
                <FileDown className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-medium tracking-wide">Receipt</span>
            </button>
            
            <button className="flex flex-col items-center gap-2 text-zinc-500 hover:text-white transition-colors group">
              <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
                <Home className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-medium tracking-wide">Home</span>
            </button>
          </div>
        </motion.div>

      </main>
    </div>
  );
}
