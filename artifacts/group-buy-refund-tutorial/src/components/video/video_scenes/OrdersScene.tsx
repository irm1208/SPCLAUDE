import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CustomerPortalFrame, Cursor } from "../CustomerPortalFrame";
import { CheckCircle2, ChevronRight, Package } from "lucide-react";

export default function OrdersScene({ time, duration }: { time: number, duration: number }) {
  const [cursorPos, setCursorPos] = useState({ x: 800, y: 700 });
  const [click, setClick] = useState(false);
  const [hoverRow, setHoverRow] = useState(false);

  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];
    
    // Move to first order row
    timers.push(setTimeout(() => setCursorPos({ x: 720, y: 340 }), 1500));
    timers.push(setTimeout(() => setHoverRow(true), 2100));
    timers.push(setTimeout(() => setClick(true), 2800));
    timers.push(setTimeout(() => setClick(false), 3000));
    
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-[#F8FAFC]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.6 }}
    >
      <CustomerPortalFrame zoom={1.1} originX="50%" originY="30%">
        <div className="max-w-5xl mx-auto w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl font-bold text-[#0F1F38] mb-8" style={{ fontFamily: "Inter, sans-serif" }}>My Orders</h2>
            
            <div className="space-y-4">
              {/* Order 1 - Confirmed */}
              <motion.div 
                className="bg-white rounded-xl border p-6 flex items-center transition-colors relative overflow-hidden shadow-sm"
                style={{ borderColor: hoverRow ? "#2D6BCC" : "#E4E4E7", backgroundColor: hoverRow ? "#F0F5FF" : "white" }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg font-bold text-[#1B3A7A]">Order #ORD-8492</span>
                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                    </span>
                  </div>
                  <div className="text-[#6B7280] flex items-center gap-4 text-sm font-medium">
                    <span className="flex items-center gap-1.5"><Package className="w-4 h-4" /> BPC-157 Group Buy</span>
                    <span>•</span>
                    <span>15 Aug 2026</span>
                    <span>•</span>
                    <span>$125.00</span>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-[#2D6BCC]" />
                
                {/* Ripple effect on click */}
                {click && (
                  <motion.div 
                    className="absolute inset-0 bg-[#2D6BCC]/10"
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.6 }}
                  />
                )}
              </motion.div>

              {/* Order 2 - Draft */}
              <div className="bg-white rounded-xl border border-[#E4E4E7] p-6 flex items-center opacity-70">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg font-bold text-[#0F1F38]">Order #ORD-7721</span>
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">Draft</span>
                  </div>
                  <div className="text-[#6B7280] flex items-center gap-4 text-sm font-medium">
                    <span className="flex items-center gap-1.5"><Package className="w-4 h-4" /> Tirzepatide Group Buy</span>
                    <span>•</span>
                    <span>10 Aug 2026</span>
                    <span>•</span>
                    <span>$85.00</span>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-[#8A9AAA]" />
              </div>
            </div>
          </motion.div>
        </div>
        
        <Cursor x={cursorPos.x} y={cursorPos.y} active={click} />
      </CustomerPortalFrame>
    </motion.div>
  );
}