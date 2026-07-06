import React from 'react';
import { motion } from 'framer-motion';
import { Download, Home, ArrowRight, ChevronRight, Check } from 'lucide-react';
import "./_group.css";

const RECEIPT = {
  code: "PEP-4821",
  grandTotal: 160.0,
  currency: "USD",
  date: "Jul 6, 2026, 10:09 PM"
};

function currSym(c: string) {
  return c === "GBP" ? "£" : "$";
}

function UsdtBadge({ size = 36 }: { size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: "#26A17B" }}
    >
      <span className="text-white font-black" style={{ fontSize: size * 0.42 }}>₮</span>
    </div>
  );
}

export function Ticket() {
  return (
    <div className="success-page-root flex flex-col items-center justify-center min-h-[100dvh] py-12 px-4" style={{ background: "var(--t-bg)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        .font-mono-ticket {
          font-family: 'Space Mono', ui-monospace, monospace;
        }
        .ticket-bg {
          background-color: #fff;
          background-image: linear-gradient(90deg, transparent 95%, rgba(0,0,0,0.015) 95%);
          background-size: 20px 100%;
        }
        .stamp {
          color: #DC2626;
          border: 2px solid #DC2626;
          transform: rotate(-8deg);
          box-shadow: inset 0 0 0 1px rgba(220, 38, 38, 0.2);
        }
        .perforation-cutout {
          width: 24px;
          height: 24px;
          background: var(--t-bg);
          border-radius: 50%;
          position: absolute;
          z-index: 10;
        }
      `}</style>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[380px]"
      >
        <div className="ticket-bg shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-sm relative text-[#1A1D1F] border border-gray-200/60 overflow-hidden">
          
          {/* Header */}
          <div className="p-8 pb-7 border-b-2 border-dashed border-gray-200 relative">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight mb-0.5">SALT & PEPS</h1>
                <p className="text-[10px] text-gray-500 font-mono-ticket tracking-widest uppercase">Order Receipt</p>
              </div>
              <div className="stamp px-2 py-1 rounded-sm text-[10px] font-bold tracking-widest bg-red-50/30 mix-blend-multiply">
                AWAITING PAYMENT
              </div>
            </div>

            <div className="space-y-3.5 mb-2">
              <div className="flex justify-between items-end text-sm">
                <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Order Code</span>
                <span className="font-mono-ticket font-bold text-base">{RECEIPT.code}</span>
              </div>
              <div className="flex justify-between items-end text-sm">
                <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Date</span>
                <span className="font-mono-ticket text-gray-600 text-xs mt-0.5">{RECEIPT.date}</span>
              </div>
              <div className="flex justify-between items-end text-sm">
                <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Status</span>
                <span className="font-medium flex items-center gap-1.5 text-green-700 text-sm">
                  <Check className="w-4 h-4" /> Updated
                </span>
              </div>
            </div>
            
            {/* Cutouts */}
            <div className="perforation-cutout border-r border-t border-gray-200/60 transform rotate-45 -bottom-[12px] -left-[12px]" />
            <div className="perforation-cutout border-l border-t border-gray-200/60 transform -rotate-45 -bottom-[12px] -right-[12px]" />
          </div>

          {/* Amount Due */}
          <div className="p-8 py-7 border-b-2 border-dashed border-gray-200 relative bg-gray-50/30">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[10px] text-gray-500 font-mono-ticket mb-1.5 uppercase tracking-widest">Amount Due</span>
              <div className="text-4xl font-mono-ticket font-bold tracking-tighter">
                {currSym(RECEIPT.currency)}{RECEIPT.grandTotal.toFixed(2)}
              </div>
            </div>
            
            {/* Cutouts */}
            <div className="perforation-cutout border-r border-t border-gray-200/60 transform rotate-45 -bottom-[12px] -left-[12px]" />
            <div className="perforation-cutout border-l border-t border-gray-200/60 transform -rotate-45 -bottom-[12px] -right-[12px]" />
          </div>

          {/* Payment Methods */}
          <div className="p-8 pt-7">
            <p className="text-[10px] text-gray-500 font-mono-ticket mb-5 uppercase tracking-widest text-center">Settle Receipt</p>
            
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3.5 p-3.5 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left group">
                <UsdtBadge size={38} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">USDT or USDC</p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">ERC-20 · Verified on-chain</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button className="w-full flex items-center gap-3.5 p-3.5 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left group">
                <div className="w-[38px] h-[38px] rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0 shadow-inner">
                  <span className="text-white font-black text-[7px] tracking-tighter leading-[1.1] text-center">ANON<br/>PAY</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">AnonPay</p>
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">BTC, ETH, XMR & 100+ coins</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Ticket Footer / Secondary Actions */}
          <div className="bg-[#1A1D1F] text-white">
            <button className="w-full flex justify-center items-center gap-2 py-4 text-sm font-medium hover:bg-white/5 transition-colors">
              View Order Details
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Floating actions outside the ticket */}
        <div className="mt-6 flex items-center justify-center gap-4">
           <button className="flex items-center justify-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors">
              <Download className="w-3.5 h-3.5" /> Download PDF
           </button>
           <span className="w-1 h-1 rounded-full bg-gray-300" />
           <button className="flex items-center justify-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors">
              <Home className="w-3.5 h-3.5" /> Return Home
           </button>
        </div>
      </motion.div>
    </div>
  );
}
