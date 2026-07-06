import React from 'react';
import { ArrowLeft, Box, Check, Copy, CreditCard, Download, Edit2, MapPin, Package, RotateCcw, Truck, XCircle } from 'lucide-react';

export function SplitPanelDesktop() {
  return (
    <div className="min-h-[100dvh] w-full bg-[#F8FAFC] font-sans flex text-[#374151]">
      {/* Left Panel - Deep Navy Gradient */}
      <div 
        className="w-[45%] lg:w-1/2 flex justify-end p-10 lg:p-16 relative z-10 shadow-[20px_0_60px_rgba(27,58,122,0.15)] overflow-y-auto"
        style={{ background: 'linear-gradient(135deg, #2D6BCC 0%, #1B3A7A 100%)' }}
      >
        <div className="w-full max-w-[540px] flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-16 text-white">
            <button className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 hover:bg-white/20 active:bg-white/30 transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div className="text-center">
              <h1 className="text-sm font-medium opacity-90 tracking-[0.2em] uppercase">Order Details</h1>
              <div className="text-2xl font-bold tracking-tight mt-1">SP-7K42</div>
            </div>
            <div className="w-12 h-12" /> {/* Spacer */}
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {/* Status Hero */}
            <div className="flex flex-col mb-16">
              <div className="text-white/70 text-sm font-bold uppercase tracking-[0.2em] mb-4">Current Status</div>
              <div className="text-5xl lg:text-6xl font-black text-[#E9A020] tracking-tight leading-none mb-4 flex items-center gap-4">
                SHIPPED
                <Truck size={48} className="text-[#E9A020]" />
              </div>
              <div className="text-white/60 text-base font-medium">Placed on 2 Jul 2026</div>
            </div>

            {/* Journey Progress */}
            <div className="bg-[#1C2B3D]/60 backdrop-blur-md rounded-3xl p-8 mb-10 border border-white/10 shadow-2xl">
              <div className="relative flex justify-between items-center z-10">
                <div className="absolute left-[10%] right-[10%] top-[18px] -translate-y-1/2 h-1.5 bg-white/10 -z-10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#E9A020] w-[75%] rounded-full shadow-[0_0_10px_rgba(233,160,32,0.5)]" />
                </div>
                
                {/* Step 1 */}
                <div className="flex flex-col items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-[#E9A020] text-white flex items-center justify-center shadow-[0_0_15px_rgba(233,160,32,0.4)]">
                    <Check size={18} strokeWidth={3} />
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Ordered</span>
                </div>
                {/* Step 2 */}
                <div className="flex flex-col items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-[#E9A020] text-white flex items-center justify-center shadow-[0_0_15px_rgba(233,160,32,0.4)]">
                    <Check size={18} strokeWidth={3} />
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Paid</span>
                </div>
                {/* Step 3 */}
                <div className="flex flex-col items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-[#E9A020] text-white flex items-center justify-center shadow-[0_0_15px_rgba(233,160,32,0.4)]">
                    <Check size={18} strokeWidth={3} />
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Packed</span>
                </div>
                {/* Step 4 */}
                <div className="flex flex-col items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-white text-[#1B3A7A] flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.6)]">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#2D6BCC] animate-pulse" />
                  </div>
                  <span className="text-xs font-bold text-[#E9A020] uppercase tracking-wider">Shipped</span>
                </div>
                {/* Step 5 */}
                <div className="flex flex-col items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-[#162231] border-2 border-white/20 text-white/40 flex items-center justify-center">
                    <Package size={18} />
                  </div>
                  <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Delivered</span>
                </div>
              </div>
            </div>

            {/* Tracking & Address */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[#1C2B3D]/40 backdrop-blur-sm rounded-3xl p-6 border border-white/5 hover:bg-[#1C2B3D]/50 transition-colors">
                <div className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Truck size={14} /> Courier
                </div>
                <div className="text-white font-medium text-lg mb-3">DHL Express</div>
                <div className="flex items-center gap-3">
                  <div className="bg-[#162231] px-3 py-1.5 rounded-lg text-white/90 text-sm font-mono tracking-widest border border-white/10 flex items-center gap-2">
                    <span className="opacity-50 tracking-[2px]">••••</span> 7741
                  </div>
                  <button className="text-white/40 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg">
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              <div className="bg-[#1C2B3D]/40 backdrop-blur-sm rounded-3xl p-6 border border-white/5 hover:bg-[#1C2B3D]/50 transition-colors">
                <div className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <MapPin size={14} /> Ship To
                </div>
                <div className="text-white font-medium text-lg mb-2">A. Rivera</div>
                <div className="text-white/70 text-sm leading-relaxed">
                  148 Harbour Lane<br />
                  Bristol BS1 4RN<br />
                  United Kingdom
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Clean White */}
      <div className="w-[55%] lg:w-1/2 flex justify-start p-10 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-[600px] flex flex-col py-4">
          
          {/* Order Items */}
          <div className="bg-white rounded-[32px] p-8 lg:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-[#D0DAE4]/50 mb-8">
            <h2 className="text-[#0F1F38] text-base font-bold tracking-widest uppercase flex items-center gap-3 mb-8">
              <Box size={20} className="text-[#2D6BCC]" />
              Order Items
            </h2>
            
            <div className="space-y-6">
              {/* Item 1 */}
              <div className="flex justify-between items-center pb-6 border-b border-[#D0DAE4]/30 group hover:bg-[#F8FAFC] transition-colors -mx-4 px-4 rounded-2xl">
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F8FAFC] border border-[#D0DAE4]/50 flex items-center justify-center text-[#2D6BCC] font-bold text-lg shadow-sm">
                    x2
                  </div>
                  <div>
                    <div className="font-bold text-[#0F1F38] text-lg">BPC-157</div>
                    <div className="text-sm text-[#6B7280] mt-1">5mg vial</div>
                  </div>
                </div>
                <div className="font-bold text-[#0F1F38] text-lg">$70.00</div>
              </div>
              
              {/* Item 2 */}
              <div className="flex justify-between items-center pb-6 border-b border-[#D0DAE4]/30 group hover:bg-[#F8FAFC] transition-colors -mx-4 px-4 rounded-2xl">
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F8FAFC] border border-[#D0DAE4]/50 flex items-center justify-center text-[#2D6BCC] font-bold text-lg shadow-sm">
                    x1
                  </div>
                  <div>
                    <div className="font-bold text-[#0F1F38] text-lg">TB-500</div>
                    <div className="text-sm text-[#6B7280] mt-1">5mg vial</div>
                  </div>
                </div>
                <div className="font-bold text-[#0F1F38] text-lg">$42.00</div>
              </div>

              {/* Item 3 */}
              <div className="flex justify-between items-center pb-6 border-b border-[#D0DAE4]/30 group hover:bg-[#F8FAFC] transition-colors -mx-4 px-4 rounded-2xl">
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F8FAFC] border border-[#D0DAE4]/50 flex items-center justify-center text-[#2D6BCC] font-bold text-lg shadow-sm">
                    x1
                  </div>
                  <div>
                    <div className="font-bold text-[#0F1F38] text-lg">Semaglutide</div>
                    <div className="text-sm text-[#6B7280] mt-1">5mg vial</div>
                  </div>
                </div>
                <div className="font-bold text-[#0F1F38] text-lg">$58.00</div>
              </div>

              {/* Item 4 */}
              <div className="flex justify-between items-center group hover:bg-[#F8FAFC] transition-colors -mx-4 px-4 rounded-2xl py-2">
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F8FAFC] border border-[#D0DAE4]/50 flex items-center justify-center text-[#2D6BCC] font-bold text-lg shadow-sm">
                    x1
                  </div>
                  <div>
                    <div className="font-bold text-[#0F1F38] text-lg">GHK-Cu</div>
                    <div className="text-sm text-[#6B7280] mt-1">50mg vial</div>
                  </div>
                </div>
                <div className="font-bold text-[#0F1F38] text-lg">$30.00</div>
              </div>
            </div>
          </div>

          {/* Totals & Payment */}
          <div className="bg-white rounded-[32px] p-8 lg:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-[#D0DAE4]/50 mb-10">
            <h2 className="text-[#0F1F38] text-base font-bold tracking-widest uppercase flex items-center gap-3 mb-8">
              <CreditCard size={20} className="text-[#2D6BCC]" />
              Payment & Totals
            </h2>
            
            <div className="space-y-4 mb-8 text-base">
              <div className="flex justify-between text-[#6B7280]">
                <span>Products</span>
                <span className="font-medium text-[#0F1F38]">$200.00</span>
              </div>
              <div className="flex justify-between text-[#6B7280]">
                <span>Shipping</span>
                <span className="font-medium text-[#0F1F38]">$18.00</span>
              </div>
              <div className="flex justify-between text-[#6B7280]">
                <span>Tip</span>
                <span className="font-medium text-[#0F1F38]">$10.00</span>
              </div>
              <div className="h-px w-full bg-[#D0DAE4]/50 my-6" />
              <div className="flex justify-between text-[#0F1F38] font-black text-xl">
                <span>Grand Total</span>
                <span>$228.00</span>
              </div>
              <div className="flex justify-between text-[#E9A020] font-bold text-lg pt-2">
                <span>Amount Due</span>
                <span>$0.00</span>
              </div>
            </div>

            <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-[#D0DAE4]/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#22c55e]/10 text-[#22c55e] flex items-center justify-center">
                  <Check size={24} strokeWidth={3} />
                </div>
                <div>
                  <div className="text-base font-bold text-[#0F1F38]">Crypto (USDT)</div>
                  <div className="text-xs font-bold text-[#22c55e] uppercase tracking-widest mt-1">Payment Confirmed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-3 bg-white hover:bg-[#F8FAFC] border border-[#D0DAE4] p-5 rounded-2xl text-[#0F1F38] font-bold text-sm transition-all hover:shadow-md active:scale-[0.98]">
              <Download size={20} className="text-[#2D6BCC]" />
              Save Receipt PDF
            </button>
            <button className="flex items-center justify-center gap-3 bg-[#1B3A7A] hover:bg-[#1B3164] text-white p-5 rounded-2xl font-bold text-sm transition-all shadow-[0_4px_15px_rgba(27,58,122,0.3)] hover:shadow-[0_6px_20px_rgba(27,58,122,0.4)] active:scale-[0.98]">
              <RotateCcw size={20} className="text-white/80" />
              Place Another Order
            </button>
            <button className="flex items-center justify-center gap-3 bg-white hover:bg-[#F8FAFC] border border-[#D0DAE4] p-5 rounded-2xl text-[#0F1F38] font-bold text-sm transition-all hover:shadow-md active:scale-[0.98] col-span-2">
              <Edit2 size={18} className="text-[#8A9AAA]" />
              Edit Order Details
            </button>
            <button className="flex items-center justify-center gap-2 p-4 rounded-2xl text-[#ef4444] hover:bg-red-50 font-medium text-sm transition-colors col-span-2">
              <XCircle size={18} />
              Cancel Order
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
