import React from "react";
import { motion } from "framer-motion";

export function CustomerPortalFrame({ children, zoom = 1, originX = "50%", originY = "50%" }: { children: React.ReactNode, zoom?: number, originX?: string | number, originY?: string | number }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      initial={{ scale: 1 }}
      animate={{ scale: zoom, originX, originY }}
      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[1440px] h-[900px] bg-[#F8FAFC] rounded-2xl overflow-hidden shadow-2xl border border-black/5 flex flex-col relative">
        {/* Header */}
        <div className="h-20 shrink-0 w-full flex items-center px-10 shadow-sm z-10" style={{ background: "linear-gradient(135deg, #2D6BCC 0%, #1B3A7A 100%)" }}>
          <img src={`${import.meta.env.BASE_URL || "/"}brand/salt-peps-logo-reverse.svg`} className="h-8" alt="Logo" />
          <div className="ml-16 flex gap-8 text-white/80 font-medium text-lg">
            <span className="text-white border-b-2 border-white pb-1">My Orders</span>
            <span>Settings</span>
            <span>Support</span>
          </div>
          <div className="ml-auto w-10 h-10 rounded-full bg-white/20" />
        </div>
        
        {/* Content Area */}
        <div className="flex-1 p-12 overflow-hidden relative">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

export function Cursor({ x, y, active = false }: { x: number, y: number, active?: boolean }) {
  return (
    <motion.div
      className="absolute z-50 pointer-events-none"
      animate={{ x, y }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      <motion.svg
        width="32" height="32" viewBox="0 0 32 32" fill="none"
        animate={{ scale: active ? 0.8 : 1 }}
        transition={{ duration: 0.15 }}
        style={{ filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.3))" }}
      >
        <path d="M12 28V6L26 20H18L12 28Z" fill="white" stroke="black" strokeWidth="1.5" strokeLinejoin="round" />
      </motion.svg>
      {active && (
        <motion.div 
          className="absolute left-3 top-3 w-8 h-8 rounded-full border-2 border-[#2D6BCC]"
          initial={{ scale: 0.5, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </motion.div>
  );
}