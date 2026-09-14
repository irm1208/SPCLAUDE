import React from "react";
import { motion } from "framer-motion";

export default function TitleScene({ time, duration }: { time: number, duration: number }) {
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-[#1B3A7A] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6 }}
    >
      {/* Background gradients */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-[#2D6BCC]/30 to-transparent"
        animate={{ 
          backgroundPosition: ["0% 0%", "100% 100%"],
          scale: [1, 1.2]
        }}
        transition={{ duration: 10, ease: "linear" }}
      />
      
      <motion.img 
        src={`${import.meta.env.BASE_URL || "/"}brand/salt-peps-icon.svg`}
        className="w-32 h-32 mb-12 opacity-80"
        initial={{ y: 20, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 0.8, scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
      />
      
      <div className="overflow-hidden">
        <motion.h1 
          className="text-7xl font-bold text-white tracking-tight"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 80, damping: 20 }}
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          How to request a Group Buy refund
        </motion.h1>
      </div>
      
      <motion.div 
        className="mt-8 w-24 h-1.5 bg-[#2D6BCC] rounded-full"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.8, duration: 0.8, ease: "circOut" }}
      />
    </motion.div>
  );
}