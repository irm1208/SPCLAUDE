import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CustomerPortalFrame, Cursor } from "../CustomerPortalFrame";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function RefundFormScene({ time, duration }: { time: number, duration: number }) {
  const [cursorPos, setCursorPos] = useState({ x: 900, y: 800 });
  const [clickCount, setClickCount] = useState(0);
  
  const [showForm, setShowForm] = useState(false);
  const [method, setMethod] = useState("credit");
  const [wallet, setWallet] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];
    
    // Initial UI mount is automatic
    
    // 1. Move to "I want a refund" button
    timers.push(setTimeout(() => setCursorPos({ x: 920, y: 190 }), 1000));
    timers.push(setTimeout(() => { setClickCount(1); setShowForm(true); }, 1800));
    
    // 2. Move to Crypto option
    timers.push(setTimeout(() => setCursorPos({ x: 380, y: 355 }), 2800));
    timers.push(setTimeout(() => { setClickCount(2); setMethod("crypto"); }, 3600));
    
    // 3. Move to Wallet input
    timers.push(setTimeout(() => setCursorPos({ x: 420, y: 530 }), 4500));
    timers.push(setTimeout(() => setClickCount(3), 5100));
    
    // Type wallet
    const walletStr = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";
    for(let i=0; i<walletStr.length; i++) {
      timers.push(setTimeout(() => setWallet(walletStr.slice(0, i+1)), 5500 + i * 40));
    }
    
    // 4. Move to Submit button
    timers.push(setTimeout(() => setCursorPos({ x: 500, y: 720 }), 8500));
    timers.push(setTimeout(() => { setClickCount(4); setSubmitting(true); }, 9200));

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-[#F8FAFC]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <CustomerPortalFrame zoom={1.3} originX="50%" originY="40%">
        <div className="max-w-4xl mx-auto w-full pt-10">
          <div className="bg-white rounded-xl shadow-sm border border-[#E4E4E7] p-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-extrabold text-[#0F1F38]">Need a refund?</p>
                <p className="text-sm mt-1 text-[#6B7280]">Refund amount: $125.00 · reviewed and manually processed.</p>
              </div>
              <AnimatePresence>
                {!showForm && (
                  <motion.button 
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold text-white bg-[#1B3A7A] hover:bg-[#2D6BCC] transition-colors"
                  >
                    I want a refund
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {showForm && (
                <motion.div 
                  className="mt-8 space-y-6 origin-top"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.5, ease: "circOut" }}
                >
                  <fieldset className="space-y-4">
                    <legend className="text-sm font-bold text-[#0F1F38]">Refund method</legend>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-3 text-base text-[#374151]">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${method === 'credit' ? 'border-[#2D6BCC]' : 'border-[#D0DAE4]'}`}>
                          {method === 'credit' && <div className="w-2.5 h-2.5 rounded-full bg-[#2D6BCC]" />}
                        </div>
                        Refund to account credits
                      </label>
                      <label className="flex items-center gap-3 text-base text-[#374151]">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${method === 'crypto' ? 'border-[#2D6BCC]' : 'border-[#D0DAE4]'}`}>
                          {method === 'crypto' && <div className="w-2.5 h-2.5 rounded-full bg-[#2D6BCC]" />}
                        </div>
                        Refund in crypto
                      </label>
                    </div>
                  </fieldset>

                  <AnimatePresence>
                    {method === "crypto" && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-5 origin-top overflow-hidden"
                      >
                        <label className="block text-sm font-bold text-[#0F1F38]">
                          Asset
                          <select className="mt-2 w-full rounded-lg px-4 py-3 text-base bg-[#F8FAFC] border border-[#E4E4E7] text-[#1A1D1F]">
                            <option value="USDC">USDC</option>
                            <option value="USDT">USDT</option>
                          </select>
                        </label>
                        <label className="block text-sm font-bold text-[#0F1F38]">
                          Ethereum ERC-20 address
                          <div className="relative">
                            <input 
                              value={wallet} 
                              readOnly 
                              placeholder="0x…" 
                              className="mt-2 w-full rounded-lg px-4 py-3 text-base font-mono bg-[#F8FAFC] border border-[#E4E4E7] text-[#1A1D1F] focus:border-[#2D6BCC] focus:ring-1 focus:ring-[#2D6BCC]" 
                            />
                            {wallet.length > 0 && wallet.length < 42 && (
                              <motion.div 
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-5 bg-[#2D6BCC]"
                                animate={{ opacity: [1, 0] }}
                                transition={{ repeat: Infinity, duration: 0.8 }}
                              />
                            )}
                          </div>
                        </label>
                        <p className="text-sm flex gap-2 text-[#b45309] bg-amber-50 p-3 rounded-lg border border-amber-200/50">
                          <AlertTriangle className="w-5 h-5 shrink-0" />
                          Completed on-chain transfers cannot be reversed. Check this address carefully.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="pt-4 border-t border-[#E4E4E7] flex gap-3">
                    <button type="button" className="rounded-lg px-5 py-2.5 text-sm font-semibold border border-[#E4E4E7] text-[#6B7280]">
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="rounded-lg px-5 py-2.5 text-sm font-bold text-white bg-[#1B3A7A] flex items-center gap-2"
                      style={{ opacity: submitting ? 0.8 : 1 }}
                    >
                      {submitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
                      ) : (
                        "Submit refund request"
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <Cursor x={cursorPos.x} y={cursorPos.y} active={clickCount > 0} />
      </CustomerPortalFrame>
    </motion.div>
  );
}