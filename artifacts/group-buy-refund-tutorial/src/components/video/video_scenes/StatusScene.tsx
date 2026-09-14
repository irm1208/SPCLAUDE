import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CustomerPortalFrame } from "../CustomerPortalFrame";
import { AlertTriangle, CheckCircle2, ShieldCheck, ExternalLink, Clock } from "lucide-react";

type RefundStatus = "requested" | "verifying" | "verification_failed" | "completed";

export default function StatusScene({ time, duration }: { time: number, duration: number }) {
  const [status, setStatus] = useState<RefundStatus>("requested");

  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];
    
    timers.push(setTimeout(() => setStatus("verifying"), 3800));
    timers.push(setTimeout(() => setStatus("verification_failed"), 7800));
    timers.push(setTimeout(() => setStatus("completed"), 12300));
    
    return () => timers.forEach(clearTimeout);
  }, []);

  const config = {
    requested: {
      bg: "rgba(45,107,204,0.08)",
      border: "rgba(45,107,204,0.20)",
      icon: <ShieldCheck className="w-5 h-5 text-[#2D6BCC]" />,
      text: "Refund request submitted",
      color: "#1A1D1F"
    },
    verifying: {
      bg: "rgba(45,107,204,0.08)",
      border: "rgba(45,107,204,0.20)",
      icon: <ShieldCheck className="w-5 h-5 text-[#2D6BCC]" />,
      text: "Refund is being verified",
      color: "#1A1D1F"
    },
    verification_failed: {
      bg: "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.24)",
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      text: "Refund verification failed",
      color: "#b91c1c"
    },
    completed: {
      bg: "rgba(34,197,94,0.09)",
      border: "rgba(34,197,94,0.24)",
      icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
      text: "Refund completed",
      color: "#15803d"
    }
  };

  const currentConfig = config[status];

  return (
    <motion.div 
      className="absolute inset-0 bg-[#F8FAFC]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <CustomerPortalFrame zoom={1.08} originX="50%" originY="30%">
        <div className="max-w-3xl mx-auto w-full pt-16">
          <motion.div 
            layout
            className="rounded-xl p-6 shadow-sm relative overflow-hidden"
            style={{
              background: currentConfig.bg,
              border: `2px solid ${currentConfig.border}`
            }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          >
            <div className="flex items-center gap-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={status}
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 90 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentConfig.icon}
                </motion.div>
              </AnimatePresence>
              
              <AnimatePresence mode="wait">
                <motion.span 
                  key={status}
                  className="text-lg font-bold"
                  style={{ color: currentConfig.color }}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {currentConfig.text}
                </motion.span>
              </AnimatePresence>
              
              <span className="ml-auto text-xl font-extrabold text-[#1A1D1F]">$125.00</span>
            </div>

            <AnimatePresence>
              {status === "verification_failed" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 text-sm text-red-700 bg-red-100/50 p-3 rounded-lg border border-red-200"
                >
                  <span className="font-mono font-bold mr-2">INVALID_ADDRESS</span>
                  The provided wallet address could not be verified on the Ethereum network.
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {status === "completed" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 text-sm flex items-center gap-2 flex-wrap"
                >
                  <span className="text-[#6B7280] font-semibold">TXID</span>
                  <div className="flex items-center text-[#2D6BCC] font-mono font-bold bg-white/50 px-2 py-1 rounded">
                    0x8a92...f31a
                    <ExternalLink className="inline w-3 h-3 ml-1.5" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.p 
              className="mt-4 text-xs text-[#6B7280]"
              layout
            >
              Crypto is sent externally by the processor, then the transaction ID is verified.
            </motion.p>
          </motion.div>
          
          <AnimatePresence>
            {status === "completed" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3 }}
                className="mt-8 flex items-center gap-4 bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm font-medium">
                  Depending on network congestion, it may take <strong>several minutes</strong> for the transaction to appear in your wallet after completion.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CustomerPortalFrame>
    </motion.div>
  );
}