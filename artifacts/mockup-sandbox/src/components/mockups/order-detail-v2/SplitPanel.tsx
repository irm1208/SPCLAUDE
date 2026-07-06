import React from 'react';
import { ArrowLeft, Box, Check, Copy, CreditCard, Download, Edit2, MapPin, Package, RotateCcw, Truck, XCircle } from 'lucide-react';

export function SplitPanel() {
  return (
    <div className="min-h-[100dvh] w-full max-w-[430px] mx-auto bg-[#F8FAFC] font-sans overflow-hidden flex flex-col relative text-[#374151]">
      {/* Top Panel - Deep Navy Gradient */}
      <div 
        className="px-5 pt-12 pb-10 flex flex-col relative z-10 rounded-b-[32px] shadow-[0_10px_40px_rgba(27,58,122,0.15)]"
        style={{ background: 'linear-gradient(135deg, #2D6BCC 0%, #1B3A7A 100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8 text-white">
          <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 active:bg-white/20 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-sm font-medium opacity-90 tracking-wide">ORDER DETAILS</h1>
            <div className="text-lg font-bold tracking-tight">SP-7K42</div>
          </div>
          <div className="w-10 h-10" /> {/* Spacer */}
        </div>

        {/* Status Hero */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="text-white/70 text-xs font-medium uppercase tracking-widest mb-2">Current Status</div>
          <div className="text-[32px] font-black text-[#E9A020] tracking-tight leading-none mb-1 flex items-center gap-3">
            SHIPPED
            <Truck size={28} className="text-[#E9A020]" />
          </div>
          <div className="text-white/60 text-sm">Placed on 2 Jul 2026</div>
        </div>

        {/* Journey Progress */}
        <div className="bg-[#1C2B3D]/60 backdrop-blur-md rounded-2xl p-5 mb-6 border border-white/10">
          <div className="relative flex justify-between items-center z-10">
            <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 h-1 bg-white/10 -z-10 rounded-full overflow-hidden">
              <div className="h-full bg-[#E9A020] w-[75%] rounded-full" />
            </div>
            
            {/* Step 1 */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#E9A020] text-white flex items-center justify-center text-[10px] shadow-[0_0_10px_rgba(233,160,32,0.4)]">
                <Check size={12} strokeWidth={3} />
              </div>
              <span className="text-[9px] font-bold text-white uppercase tracking-wider">Ordered</span>
            </div>
            {/* Step 2 */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#E9A020] text-white flex items-center justify-center text-[10px] shadow-[0_0_10px_rgba(233,160,32,0.4)]">
                <Check size={12} strokeWidth={3} />
              </div>
              <span className="text-[9px] font-bold text-white uppercase tracking-wider">Paid</span>
            </div>
            {/* Step 3 */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#E9A020] text-white flex items-center justify-center text-[10px] shadow-[0_0_10px_rgba(233,160,32,0.4)]">
                <Check size={12} strokeWidth={3} />
              </div>
              <span className="text-[9px] font-bold text-white uppercase tracking-wider">Packed</span>
            </div>
            {/* Step 4 */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white text-[#1B3A7A] flex items-center justify-center text-[10px] shadow-[0_0_15px_rgba(255,255,255,0.6)]">
                <div className="w-2.5 h-2.5 rounded-full bg-[#2D6BCC] animate-pulse" />
              </div>
              <span className="text-[9px] font-bold text-[#E9A020] uppercase tracking-wider">Shipped</span>
            </div>
            {/* Step 5 */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#162231] border border-white/20 text-white/40 flex items-center justify-center text-[10px]">
                <Package size={12} />
              </div>
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Delivered</span>
            </div>
          </div>
        </div>

        {/* Tracking & Address */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1C2B3D]/40 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
            <div className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Truck size={12} /> Courier
            </div>
            <div className="text-white font-medium text-sm mb-1">DHL Express</div>
            <div className="flex items-center gap-2">
              <div className="bg-[#162231] px-2 py-1 rounded text-white/90 text-xs font-mono tracking-widest border border-white/10 flex items-center gap-1.5">
                <span className="opacity-50 tracking-[2px]">••••</span> 7741
              </div>
              <button className="text-white/40 hover:text-white transition-colors">
                <Copy size={14} />
              </button>
            </div>
          </div>
          <div className="bg-[#1C2B3D]/40 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
            <div className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <MapPin size={12} /> Ship To
            </div>
            <div className="text-white font-medium text-sm mb-1">A. Rivera</div>
            <div className="text-white/70 text-xs leading-relaxed">
              148 Harbour Lane<br />
              Bristol BS1 4RN<br />
              UK
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel - Clean White */}
      <div className="flex-1 px-5 pt-8 pb-12 bg-[#F8FAFC]">
        
        {/* Order Items */}
        <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#D0DAE4]/50 mb-6">
          <h2 className="text-[#0F1F38] text-sm font-bold tracking-wide flex items-center gap-2 mb-5">
            <Box size={16} className="text-[#2D6BCC]" />
            ORDER ITEMS
          </h2>
          
          <div className="space-y-4">
            {/* Item 1 */}
            <div className="flex justify-between items-start pb-4 border-b border-[#D0DAE4]/30">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#D0DAE4]/50 flex items-center justify-center text-[#2D6BCC] font-bold text-xs">
                  x2
                </div>
                <div>
                  <div className="font-bold text-[#0F1F38] text-sm">BPC-157</div>
                  <div className="text-xs text-[#6B7280] mt-0.5">5mg vial</div>
                </div>
              </div>
              <div className="font-semibold text-[#0F1F38]">$70.00</div>
            </div>
            
            {/* Item 2 */}
            <div className="flex justify-between items-start pb-4 border-b border-[#D0DAE4]/30">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#D0DAE4]/50 flex items-center justify-center text-[#2D6BCC] font-bold text-xs">
                  x1
                </div>
                <div>
                  <div className="font-bold text-[#0F1F38] text-sm">TB-500</div>
                  <div className="text-xs text-[#6B7280] mt-0.5">5mg vial</div>
                </div>
              </div>
              <div className="font-semibold text-[#0F1F38]">$42.00</div>
            </div>

            {/* Item 3 */}
            <div className="flex justify-between items-start pb-4 border-b border-[#D0DAE4]/30">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#D0DAE4]/50 flex items-center justify-center text-[#2D6BCC] font-bold text-xs">
                  x1
                </div>
                <div>
                  <div className="font-bold text-[#0F1F38] text-sm">Semaglutide</div>
                  <div className="text-xs text-[#6B7280] mt-0.5">5mg vial</div>
                </div>
              </div>
              <div className="font-semibold text-[#0F1F38]">$58.00</div>
            </div>

            {/* Item 4 */}
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#D0DAE4]/50 flex items-center justify-center text-[#2D6BCC] font-bold text-xs">
                  x1
                </div>
                <div>
                  <div className="font-bold text-[#0F1F38] text-sm">GHK-Cu</div>
                  <div className="text-xs text-[#6B7280] mt-0.5">50mg vial</div>
                </div>
              </div>
              <div className="font-semibold text-[#0F1F38]">$30.00</div>
            </div>
          </div>
        </div>

        {/* Totals & Payment */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#D0DAE4]/50">
            <h2 className="text-[#0F1F38] text-sm font-bold tracking-wide flex items-center gap-2 mb-5">
              <CreditCard size={16} className="text-[#2D6BCC]" />
              PAYMENT & TOTALS
            </h2>
            
            <div className="space-y-3 mb-6 text-sm">
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
              <div className="h-px w-full bg-[#D0DAE4]/50 my-2" />
              <div className="flex justify-between text-[#0F1F38] font-bold text-base">
                <span>Grand Total</span>
                <span>$228.00</span>
              </div>
              <div className="flex justify-between text-[#E9A020] font-bold pt-1">
                <span>Amount Due</span>
                <span>$0.00</span>
              </div>
            </div>

            <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#D0DAE4]/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#22c55e]/10 text-[#22c55e] flex items-center justify-center">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F1F38]">Crypto (USDT)</div>
                  <div className="text-[10px] font-medium text-[#22c55e] uppercase tracking-wider">Payment Confirmed</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center justify-center gap-2 bg-white border border-[#D0DAE4] p-4 rounded-2xl text-[#0F1F38] font-semibold text-xs active:bg-[#F8FAFC] transition-colors shadow-sm">
              <Download size={18} className="text-[#2D6BCC]" />
              Save Receipt
            </button>
            <button className="flex flex-col items-center justify-center gap-2 bg-white border border-[#D0DAE4] p-4 rounded-2xl text-[#0F1F38] font-semibold text-xs active:bg-[#F8FAFC] transition-colors shadow-sm">
              <RotateCcw size={18} className="text-[#2D6BCC]" />
              Order Again
            </button>
          </div>
          <button className="w-full flex items-center justify-center gap-2 bg-white border border-[#D0DAE4] p-4 rounded-2xl text-[#0F1F38] font-semibold text-xs active:bg-[#F8FAFC] transition-colors shadow-sm">
            <Edit2 size={16} className="text-[#8A9AAA]" />
            Edit Order Details
          </button>
          <button className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl text-[#ef4444] font-medium text-xs active:bg-red-50 transition-colors">
            <XCircle size={16} />
            Cancel Order
          </button>
        </div>

      </div>
    </div>
  );
}
