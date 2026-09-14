import React from "react";
import { motion } from "framer-motion";
import { PackageCheck } from "lucide-react";

export default function ClosingScene({ time, duration }: { time: number, duration: number }) {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-[#F8FAFC]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="absolute inset-0 border-[16px] border-[#1B3A7A]/5 pointer-events-none" />
      
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", delay: 0.2 }}
        className="w-24 h-24 rounded-2xl bg-white border border-[#E4E4E7] shadow-xl flex items-center justify-center mb-8"
      >
        <PackageCheck className="w-12 h-12 text-[#2D6BCC]" />
      </motion.div>
      
      <motion.h2 
        className="text-4xl font-bold text-[#0F1F38]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        Check back anytime
      </motion.h2>
      
      <motion.div 
        className="mt-12 flex gap-4 items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <img src={`${import.meta.env.BASE_URL || "/"}brand/salt-peps-icon.svg`} className="w-8 h-8" alt="Icon" />
        <span className="text-xl font-bold text-[#1B3A7A] tracking-tight">PEPS ANONYMOUS</span>
      </motion.div>
    </motion.div>
  );
}