import React from "react";
import { Package, Check, Truck, FileText, Edit2, RotateCcw, XCircle, PlaneTakeoff, MapPin, CreditCard, ChevronLeft } from "lucide-react";
import "./BoardingPassDesktop.css";

export function BoardingPassDesktop() {
  return (
    <div className="min-h-[100dvh] w-full bg-[#F8FAFC] flex justify-center py-12 px-6 font-['Inter',sans-serif] text-[#374151]">
      <div className="w-full max-w-[1100px] flex flex-col gap-6">
        
        {/* Top Nav / Handle */}
        <div className="flex justify-between items-center px-2">
          <button className="flex items-center gap-2 text-[#1B3A7A] font-semibold hover:bg-white px-3 py-2 rounded-xl transition-colors">
            <ChevronLeft size={20} />
            <span>Back to Orders</span>
          </button>
          <div className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#8A9AAA]">
            Dispatch Ticket
          </div>
          <div className="w-[120px]" /> {/* Spacer for balance */}
        </div>

        {/* Desktop Ticket Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Main Ticket Area */}
          <div className="flex-1 flex ticket-desktop-shadow bg-white rounded-[32px] relative overflow-hidden">
            
            {/* LEFT BODY */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* HEADER */}
              <div className="p-8 text-white relative z-10 shrink-0" style={{ background: 'linear-gradient(135deg, #2D6BCC 0%, #1B3A7A 100%)' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-xs font-bold uppercase tracking-[0.2em] text-white/70 mb-2">
                      Peps Anonymous
                    </h1>
                    <div className="text-4xl font-bold tracking-tight">
                      SP-7K42
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-8">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">
                        Placed
                      </div>
                      <div className="font-semibold text-lg">
                        2 Jul 2026
                      </div>
                    </div>
                    {/* Flight Number / Tracking vibe inside header */}
                    <div className="bg-[#1C2B3D]/30 rounded-2xl p-4 border border-white/10 backdrop-blur-sm relative overflow-hidden hidden md:block w-[300px]">
                      <div className="absolute top-0 right-0 p-3 opacity-10">
                        <PlaneTakeoff size={64} />
                      </div>
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="flex-1">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">
                            Courier
                          </div>
                          <div className="font-semibold flex items-center gap-1.5 whitespace-nowrap">
                            <Truck size={14} className="text-[#E9A020]" />
                            DHL Express
                          </div>
                        </div>
                        <div className="w-px h-8 bg-white/20" />
                        <div className="flex-1 pl-2">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1">
                            Tracking No.
                          </div>
                          <div className="font-bold tracking-widest text-lg whitespace-nowrap">
                            <span className="opacity-50">••••</span> 7741
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BODY CONTENT */}
              <div className="p-8 bg-white flex flex-col flex-1">
                {/* Status Row */}
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#E9A020]/10 text-[#E9A020] flex items-center justify-center border border-[#E9A020]/20">
                      <Package size={24} />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-[#E9A020] mb-0.5">
                        Current Status
                      </div>
                      <div className="text-2xl font-bold text-[#0F1F38]">
                        Shipped
                      </div>
                    </div>
                  </div>
                  <div className="text-5xl font-black text-[#1B3A7A]/5 tracking-tighter">
                    75%
                  </div>
                </div>

                {/* Journey Line */}
                <div className="relative mb-12 pt-2 px-2">
                  <div className="absolute top-4 left-4 right-4 h-[2px] bg-[#D0DAE4]" />
                  <div className="absolute top-4 left-4 right-[25%] h-[2px] bg-[#2D6BCC]" />
                  
                  <div className="flex justify-between relative z-10">
                    {['Order', 'Paid', 'Pack', 'Ship'].map((step, i) => (
                      <div key={i} className="flex flex-col items-center gap-3 w-16">
                        {step === 'Ship' ? (
                          <div className="w-8 h-8 rounded-full bg-white border-[3px] border-[#2D6BCC] text-[#2D6BCC] flex items-center justify-center shadow-[0_0_0_4px_white]">
                            <div className="w-3 h-3 rounded-full bg-[#2D6BCC]" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#2D6BCC] text-white flex items-center justify-center shadow-[0_0_0_4px_white]">
                            <Check size={16} strokeWidth={3} />
                          </div>
                        )}
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${step === 'Ship' ? 'text-[#2D6BCC]' : 'text-[#1B3A7A]'}`}>{step}</span>
                      </div>
                    ))}
                    <div className="flex flex-col items-center gap-3 w-16">
                      <div className="w-8 h-8 rounded-full bg-[#F8FAFC] border-[3px] border-[#D0DAE4] text-[#D0DAE4] flex items-center justify-center shadow-[0_0_0_4px_white]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9AAA]">Done</span>
                    </div>
                  </div>
                </div>

                {/* Items Manifest */}
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A9AAA] mb-5">
                    Order Manifest
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {[
                      { name: "BPC-157", dose: "5mg", qty: 2, price: "$70.00" },
                      { name: "TB-500", dose: "5mg", qty: 1, price: "$42.00" },
                      { name: "Semaglutide", dose: "5mg", qty: 1, price: "$58.00" },
                      { name: "GHK-Cu", dose: "50mg", qty: 1, price: "$30.00" },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-base p-4 rounded-xl border border-[#D0DAE4]/50 bg-[#F8FAFC]/50">
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-[#0F1F38]">{item.name}</span>
                          <span className="text-sm text-[#6B7280]">{item.dose}</span>
                          <span className="text-sm font-medium text-[#8A9AAA] ml-1">x{item.qty}</span>
                        </div>
                        <div className="font-semibold text-[#374151]">{item.price}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* VERTICAL PERFORATION */}
            <div className="ticket-perforation-vertical shrink-0 hidden md:block">
              <div className="dashed-header-overlay hidden md:block" />
            </div>

            {/* RIGHT STUB */}
            <div className="w-[340px] shrink-0 bg-[#F8FAFC]/50 flex flex-col relative hidden md:flex">
              {/* Header space matching left side (visually continuous but lighter) */}
              <div className="h-[104px] w-full bg-[#1B3A7A] relative overflow-hidden">
                 <div className="absolute inset-0 bg-[#1C2B3D]/30 backdrop-blur-sm" />
                 <div className="absolute top-1/2 -translate-y-1/2 right-8 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 rotate-90 origin-right whitespace-nowrap">
                   Customer Copy
                 </div>
              </div>
              
              <div className="p-8 flex flex-col flex-1 gap-8 bg-white border-l border-[#D0DAE4]/0">
                {/* Destination */}
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#8A9AAA] mb-3">
                    <MapPin size={14} className="text-[#2D6BCC]" /> Destination
                  </div>
                  <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#D0DAE4]/50">
                    <div className="text-base font-semibold text-[#0F1F38] mb-1">A. Rivera</div>
                    <div className="text-sm text-[#6B7280] leading-relaxed">
                      148 Harbour Lane<br />
                      Bristol BS1 4RN<br />
                      United Kingdom
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A9AAA] mb-4">
                    Summary
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm text-[#6B7280]">
                      <span>Products</span>
                      <span className="font-medium text-[#374151]">$200.00</span>
                    </div>
                    <div className="flex justify-between text-sm text-[#6B7280]">
                      <span>Shipping</span>
                      <span className="font-medium text-[#374151]">$18.00</span>
                    </div>
                    <div className="flex justify-between text-sm text-[#6B7280]">
                      <span>Tip</span>
                      <span className="font-medium text-[#374151]">$10.00</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-[#D0DAE4]/50">
                    <div className="flex justify-between items-baseline mb-4">
                      <span className="text-sm font-bold text-[#0F1F38]">Grand Total</span>
                      <span className="text-2xl font-bold text-[#0F1F38]">$228.00</span>
                    </div>
                    
                    {/* Payment Status inside Totals */}
                    <div className="bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#22c55e]/20 text-[#22c55e] flex items-center justify-center">
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-[#22c55e] mb-0.5">
                            Paid Confirmed
                          </div>
                          <div className="text-sm font-semibold text-[#166534]">
                            Crypto (USDT)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
          </div>

          {/* Side Actions Column */}
          <div className="w-[280px] shrink-0 flex flex-col gap-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A9AAA] px-2 pb-1">
              Actions
            </div>
            <button className="flex items-center justify-between p-4 bg-white border border-[#D0DAE4] text-[#1B3A7A] rounded-2xl font-semibold shadow-sm hover:border-[#1B3A7A] transition-colors group">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-[#2D6BCC]" />
                <span>Save Receipt PDF</span>
              </div>
            </button>
            <button className="flex items-center justify-between p-4 bg-white border border-[#D0DAE4] text-[#1B3A7A] rounded-2xl font-semibold shadow-sm hover:border-[#1B3A7A] transition-colors group">
              <div className="flex items-center gap-3">
                <Edit2 size={18} className="text-[#2D6BCC]" />
                <span>Edit Order</span>
              </div>
            </button>
            <button className="flex items-center justify-between p-4 bg-[#1B3A7A] border border-[#1B3A7A] text-white rounded-2xl font-semibold shadow-md hover:bg-[#1B3164] transition-colors group">
              <div className="flex items-center gap-3">
                <RotateCcw size={18} />
                <span>Place Another Order</span>
              </div>
            </button>
            <div className="h-px bg-[#D0DAE4]/50 my-2 mx-4" />
            <button className="flex items-center justify-between p-4 bg-white border border-transparent text-[#ef4444] rounded-2xl font-medium hover:bg-[#ef4444]/5 hover:border-[#ef4444]/20 transition-colors group">
              <div className="flex items-center gap-3">
                <XCircle size={18} />
                <span>Cancel Order</span>
              </div>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
