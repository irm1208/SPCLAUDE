import "./_group.css";
import { motion } from "framer-motion";
import { Check, ArrowRight, Download, Home } from "lucide-react";

export function Zen() {
  const RECEIPT = {
    code: "PEP-4821",
    grandTotal: 160.0,
    currency: "USD",
  };

  const fadeUp = {
    initial: { y: 16, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  };

  const staggerContainer = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <div 
      className="success-page-root flex flex-col items-center justify-center min-h-screen"
      style={{ 
        background: "#FAF9F6", // warm paper
        color: "#1C1917" // soft ink
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap');
        
        .zen-font-serif {
          font-family: 'Playfair Display', serif;
        }
        
        .zen-hairline {
          height: 1px;
          background-color: rgba(28, 25, 23, 0.1);
          width: 100%;
        }
      `}</style>

      <main className="w-full max-w-[420px] px-8 py-16 flex flex-col">
        
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-col"
        >
          {/* Success Mark */}
          <motion.div variants={fadeUp} className="mb-10 flex justify-center">
            <div className="w-8 h-8 rounded-full border border-[#1C1917] flex items-center justify-center">
              <Check className="w-4 h-4 text-[#1C1917] opacity-80" strokeWidth={1.5} />
            </div>
          </motion.div>

          {/* Header Typography */}
          <motion.div variants={fadeUp} className="text-center mb-12">
            <h1 className="zen-font-serif text-3xl font-medium tracking-wide mb-3">
              Order updated
            </h1>
            <p className="text-sm tracking-widest uppercase opacity-50 mb-2">
              Order No. {RECEIPT.code}
            </p>
          </motion.div>

          {/* Amount */}
          <motion.div variants={fadeUp} className="text-center mb-12">
            <p className="text-xs tracking-widest uppercase opacity-50 mb-3">Balance due</p>
            <p className="zen-font-serif text-5xl tracking-tight">
              ${RECEIPT.grandTotal.toFixed(2)}
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="zen-hairline mb-10" />

          {/* Payment Section */}
          <motion.div variants={fadeUp} className="mb-12">
            <p className="text-xs tracking-widest uppercase opacity-50 mb-6 text-center">
              Select payment method
            </p>
            
            <div className="flex flex-col gap-0">
              {/* USDT / USDC */}
              <button className="flex items-center justify-between py-5 border-b border-[#1C1917]/10 group hover:bg-[#1C1917]/[0.02] transition-colors -mx-4 px-4 rounded-sm">
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#26A17B]/10 flex items-center justify-center shrink-0">
                    <span className="text-[#26A17B] font-medium text-[10px]">₮</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium tracking-wide text-[#1C1917]">USDT or USDC</p>
                    <p className="text-xs opacity-50 mt-0.5">ERC-20 · Verified on-chain</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" strokeWidth={1.5} />
              </button>

              {/* AnonPay */}
              <button className="flex items-center justify-between py-5 border-b border-[#1C1917]/10 group hover:bg-[#1C1917]/[0.02] transition-colors -mx-4 px-4 rounded-sm">
                <div className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded-sm bg-[#1C1917]/5 flex items-center justify-center shrink-0">
                    <span className="text-[#1C1917] font-bold text-[6px] leading-tight text-center">ANON<br/>PAY</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium tracking-wide text-[#1C1917]">AnonPay</p>
                    <p className="text-xs opacity-50 mt-0.5">BTC, ETH, XMR · Auto-converted</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>

          {/* Secondary Actions */}
          <motion.div variants={fadeUp} className="flex flex-col items-center gap-6 mt-8">
            <button className="text-sm tracking-wide flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
              View in My Orders
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            
            <div className="flex items-center gap-6 text-xs opacity-50">
              <button className="hover:opacity-100 transition-opacity flex items-center gap-1.5 uppercase tracking-widest">
                <Download className="w-3 h-3" strokeWidth={1.5} />
                Receipt
              </button>
              <span>·</span>
              <button className="hover:opacity-100 transition-opacity flex items-center gap-1.5 uppercase tracking-widest">
                Home
              </button>
            </div>
          </motion.div>

        </motion.div>
      </main>
    </div>
  );
}
