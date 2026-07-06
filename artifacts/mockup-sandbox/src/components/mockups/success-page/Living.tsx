import "./_group.css";
import { motion } from "framer-motion";
import {
  Home, FileDown, ChevronRight, ClipboardList, ArrowRight,
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
      className="rounded-full flex items-center justify-center shrink-0 shadow-sm"
      style={{ width: size, height: size, background: "#26A17B" }}
    >
      <span className="text-white font-black" style={{ fontSize: size * 0.42 }}>₮</span>
    </div>
  );
}

const checkVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { 
    pathLength: 1, 
    opacity: 1,
    transition: { 
      duration: 0.6, 
      ease: [0.22, 1, 0.36, 1],
      delay: 0.2
    }
  }
};

const circleVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { 
      duration: 0.5, 
      ease: [0.22, 1, 0.36, 1] 
    }
  }
};

const ringPulseVariants = {
  hidden: { scale: 0.8, opacity: 0, borderWidth: "8px" },
  visible: { 
    scale: 1.5, 
    opacity: 0, 
    borderWidth: "0px",
    transition: { 
      duration: 1, 
      ease: "easeOut",
      delay: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { 
      duration: 0.5, 
      ease: [0.22, 1, 0.36, 1] 
    }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    }
  }
};

function AnimatedCheck() {
  return (
    <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
      <motion.div
        variants={ringPulseVariants}
        initial="hidden"
        animate="visible"
        className="absolute inset-0 rounded-full border-blue-600"
        style={{ borderColor: "var(--t-blue-deep)" }}
      />
      <motion.div
        variants={circleVariants}
        className="absolute inset-0 rounded-full flex items-center justify-center"
        style={{ background: "rgba(27, 58, 122, 0.08)" }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10" stroke="var(--t-blue-deep)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <motion.path
            variants={checkVariants}
            d="M20 6L9 17l-5-5"
          />
        </svg>
      </motion.div>
    </div>
  );
}

function PaymentPanel() {
  return (
    <motion.div 
      variants={itemVariants}
      className="p-5 space-y-4 rounded-2xl border shadow-sm transition-all"
      style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}
    >
      <div>
        <p className="font-bold text-base mb-0.5" style={{ color: "var(--t-text)" }}>How would you like to pay?</p>
        <p className="text-sm" style={{ color: "var(--t-subtle)" }}>
          Total: <span className="font-bold" style={{ color: "var(--t-text)" }}>{currSym(RECEIPT.currency)}{RECEIPT.grandTotal.toFixed(2)}</span>
        </p>
      </div>

      <div className="space-y-2.5">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-colors text-left group"
          style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)" }}
        >
          <UsdtBadge size={44} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>USDT or USDC</p>
            <p className="text-xs" style={{ color: "var(--t-subtle)" }}>ERC-20 · Verified automatically</p>
          </div>
          <motion.div
            className="shrink-0 text-gray-400 group-hover:text-gray-600"
            whileHover={{ x: 3 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <ChevronRight className="w-5 h-5" style={{ color: "var(--t-subtle)" }} />
          </motion.div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-colors text-left group"
          style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)" }}
        >
          <div className="w-11 h-11 rounded-[9px] bg-slate-800 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white font-black text-[9px] tracking-tight leading-none text-center">ANON<br />PAY</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>AnonPay (Any Crypto)</p>
            <p className="text-xs truncate" style={{ color: "var(--t-subtle)" }}>Pay with BTC, ETH, XMR & 100+ coins</p>
          </div>
          <motion.div
            className="shrink-0 text-gray-400 group-hover:text-gray-600"
            whileHover={{ x: 3 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <ChevronRight className="w-5 h-5" style={{ color: "var(--t-subtle)" }} />
          </motion.div>
        </motion.button>
      </div>
    </motion.div>
  );
}

export function Living() {
  return (
    <div className="success-page-root flex flex-col" style={{ background: "var(--t-bg)", minHeight: "100vh" }}>
      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 px-4 py-8 pb-24 max-w-md mx-auto w-full flex flex-col items-center"
      >
        <AnimatedCheck />

        <motion.h2
          variants={itemVariants}
          className="text-2xl font-bold text-center mb-2"
          style={{ color: "var(--t-text)" }}
        >
          Order Updated!
        </motion.h2>

        <motion.p
          variants={itemVariants}
          className="text-center mb-8 px-4 leading-relaxed text-sm"
          style={{ color: "var(--t-muted)" }}
        >
          Your order has been updated.{" "}
          You can view it anytime in <span className="font-semibold" style={{ color: "var(--t-text)" }}>My Orders</span>.
        </motion.p>

        <motion.div variants={itemVariants} className="w-full mb-6">
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            className="w-full h-14 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2.5 shadow-md relative overflow-hidden group"
            style={{ background: "var(--t-blue-deep)" }}
          >
            <motion.div 
              className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"
            />
            <ClipboardList className="w-5 h-5" />
            View your order in My Orders
            <motion.div
              whileHover={{ x: 3 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </motion.button>
        </motion.div>

        <motion.div variants={itemVariants} className="w-full mb-6">
          <PaymentPanel />
        </motion.div>

        <motion.div variants={itemVariants} className="w-full mb-4">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full h-14 rounded-2xl text-sm font-bold flex items-center justify-between px-5 border shadow-sm bg-white"
            style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <FileDown className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold leading-tight">Save Your Receipt</p>
                <p className="text-xs font-normal" style={{ color: "var(--t-subtle)" }}>Download PDF copy</p>
              </div>
            </div>
            <FileDown className="w-5 h-5" style={{ color: "var(--t-subtle)" }} />
          </motion.button>
        </motion.div>

        <motion.div variants={itemVariants} className="w-full">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full h-14 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 border bg-transparent"
            style={{ color: "var(--t-subtle)", borderColor: "transparent" }}
          >
            <Home className="w-4 h-4" /> Return to Home
          </motion.button>
        </motion.div>

      </motion.main>
    </div>
  );
}
