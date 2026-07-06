import React from "react";
import { Plane, Package, CheckCircle2, Truck, Check, ChevronRight, FileText, Edit2, RotateCcw, XCircle, ArrowRight, PlaneTakeoff, MapPin, Map, CreditCard, ChevronDown } from "lucide-react";
import "./ticket-style.css";

export function BoardingPass() {
  return (
    <div className="min-h-[100dvh] w-full bg-[#F8FAFC] flex justify-center pb-24 font-['Inter',sans-serif] text-[#374151]">
      <div className="w-full max-w-[430px] pt-8 px-4 flex flex-col gap-6 relative">
        
        {/* Decorative Top Handle */}
        <div className="flex justify-between items-center px-2">
          <button className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[#1B3A7A]">
            <ChevronDown size={20} className="rotate-90" />
          </button>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A9AAA]">
            Dispatch Ticket
          </div>
          <div className="w-8" />
        </div>

        {/* The Ticket */}
        <div className="ticket-shadow bg-white rounded-3xl relative overflow-hidden flex flex-col">
          
          {/* TICKET HEADER - Navy Gradient */}
          <div className="p-6 text-white" style={{ background: 'linear-gradient(135deg, #2D6BCC 0%, #1B3A7A 100%)' }}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 mb-1">
                  Peps Anonymous
                </h1>
                <div className="text-2xl font-bold tracking-tight">
                  SP-7K42
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">
                  Placed
                </div>
                <div className="font-semibold">
                  2 Jul 2026
                </div>
              </div>
            </div>

            {/* Flight Number / Tracking vibe */}
            <div className="bg-[#1C2B3D]/30 rounded-2xl p-4 border border-white/10 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <PlaneTakeoff size={64} />
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">
                    Courier
                  </div>
                  <div className="font-semibold flex items-center gap-1.5">
                    <Truck size={14} className="text-[#E9A020]" />
                    DHL Express
                  </div>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="flex-1 pl-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">
                    Tracking No.
                  </div>
                  <div className="font-bold tracking-widest text-lg">
                    <span className="opacity-50">••••</span> 7741
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TICKET BODY - Status & Address */}
          <div className="p-6 bg-white">
            
            {/* Amber Stamp / Status */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E9A020]/10 text-[#E9A020] flex items-center justify-center border border-[#E9A020]/20">
                  <Package size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#E9A020]">
                    Current Status
                  </div>
                  <div className="text-xl font-bold text-[#0F1F38]">
                    Shipped
                  </div>
                </div>
              </div>
              
              {/* Progress visual */}
              <div className="text-right">
                <div className="text-3xl font-black text-[#1B3A7A]/5 tracking-tighter -mr-2">
                  75%
                </div>
              </div>
            </div>

            {/* Journey Nodes */}
            <div className="relative mb-8 pt-2">
              <div className="absolute top-4 left-3 right-3 h-[2px] bg-[#D0DAE4]" />
              <div className="absolute top-4 left-3 right-[25%] h-[2px] bg-[#2D6BCC]" />
              
              <div className="flex justify-between relative z-10">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#2D6BCC] text-white flex items-center justify-center shadow-[0_0_0_4px_white]">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#1B3A7A]">Order</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#2D6BCC] text-white flex items-center justify-center shadow-[0_0_0_4px_white]">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#1B3A7A]">Paid</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#2D6BCC] text-white flex items-center justify-center shadow-[0_0_0_4px_white]">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#1B3A7A]">Pack</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white border-2 border-[#2D6BCC] text-[#2D6BCC] flex items-center justify-center shadow-[0_0_0_4px_white]">
                    <div className="w-2 h-2 rounded-full bg-[#2D6BCC]" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#2D6BCC]">Ship</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#F8FAFC] border-2 border-[#D0DAE4] text-[#D0DAE4] flex items-center justify-center shadow-[0_0_0_4px_white]">
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#8A9AAA]">Done</span>
                </div>
              </div>
            </div>

            {/* Destination */}
            <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#D0DAE4]/50">
              <div className="flex items-start gap-3">
                <div className="mt-1 text-[#2D6BCC]">
                  <MapPin size={18} />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A9AAA] mb-1">
                    Destination
                  </div>
                  <div className="text-sm font-semibold text-[#0F1F38]">A. Rivera</div>
                  <div className="text-sm text-[#6B7280] leading-relaxed">
                    148 Harbour Lane<br />
                    Bristol BS1 4RN<br />
                    United Kingdom
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* PERFORATION DIVIDER */}
          <div className="ticket-perforation" />

          {/* THE STUB - Items & Totals */}
          <div className="p-6 bg-white pt-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A9AAA] mb-4">
              Manifest
            </div>
            
            <div className="space-y-3 mb-6">
              {[
                { name: "BPC-157", dose: "5mg", qty: 2, price: "$70.00" },
                { name: "TB-500", dose: "5mg", qty: 1, price: "$42.00" },
                { name: "Semaglutide", dose: "5mg", qty: 1, price: "$58.00" },
                { name: "GHK-Cu", dose: "50mg", qty: 1, price: "$30.00" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-[#0F1F38]">{item.name}</span>
                    <span className="text-xs text-[#6B7280]">{item.dose}</span>
                    <span className="text-xs font-medium text-[#8A9AAA]">x{item.qty}</span>
                  </div>
                  <div className="font-medium text-[#374151]">{item.price}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#D0DAE4]/50 pt-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm text-[#6B7280]">
                <span>Products</span>
                <span>$200.00</span>
              </div>
              <div className="flex justify-between text-sm text-[#6B7280]">
                <span>Shipping</span>
                <span>$18.00</span>
              </div>
              <div className="flex justify-between text-sm text-[#6B7280]">
                <span>Tip</span>
                <span>$10.00</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#0F1F38] pt-2">
                <span>Grand Total</span>
                <span>$228.00</span>
              </div>
            </div>

            {/* Payment Status */}
            <div className="bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#22c55e]/20 text-[#22c55e] flex items-center justify-center">
                  <CreditCard size={16} />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#22c55e] mb-0.5">
                    Paid
                  </div>
                  <div className="text-xs font-semibold text-[#166534]">
                    Crypto (USDT)
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#22c55e] mb-0.5">
                  Amount Due
                </div>
                <div className="text-sm font-bold text-[#166534]">
                  $0.00
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button className="flex items-center justify-center gap-2 py-3.5 px-4 bg-white border border-[#D0DAE4] text-[#1B3A7A] rounded-xl font-semibold text-sm shadow-sm active:scale-95 transition-transform">
            <FileText size={16} />
            <span>Receipt PDF</span>
          </button>
          <button className="flex items-center justify-center gap-2 py-3.5 px-4 bg-white border border-[#D0DAE4] text-[#1B3A7A] rounded-xl font-semibold text-sm shadow-sm active:scale-95 transition-transform">
            <Edit2 size={16} />
            <span>Edit Order</span>
          </button>
          <button className="flex items-center justify-center gap-2 py-3.5 px-4 bg-[#1B3A7A] text-white rounded-xl font-semibold text-sm shadow-sm active:scale-95 transition-transform col-span-2">
            <RotateCcw size={16} />
            <span>Place Another Order</span>
          </button>
          <button className="flex items-center justify-center gap-2 py-3.5 px-4 text-[#ef4444] rounded-xl font-medium text-sm active:scale-95 transition-transform col-span-2 hover:bg-[#ef4444]/5 border border-transparent hover:border-[#ef4444]/20 mt-2">
            <XCircle size={16} />
            <span>Cancel Order</span>
          </button>
        </div>

      </div>
    </div>
  );
}
