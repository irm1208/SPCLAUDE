import React from 'react';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Download, 
  Edit3, 
  RotateCcw, 
  XCircle, 
  MapPin, 
  CreditCard,
  ChevronLeft,
  CircleDot
} from 'lucide-react';

export function GradientBento() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans overflow-hidden flex justify-center">
      <div className="w-full max-w-[430px] bg-[#F8FAFC] relative pb-20 shadow-2xl">
        
        {/* HERO HEADER */}
        <div 
          className="px-5 pt-12 pb-24 text-white rounded-b-[2rem] relative z-0"
          style={{ background: 'linear-gradient(135deg, #2D6BCC 0%, #1B3A7A 100%)' }}
        >
          {/* Header Nav */}
          <div className="flex items-center justify-between mb-8">
            <button className="p-2 -ml-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <ChevronLeft size={20} className="text-white" />
            </button>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Order Details</div>
            <div className="w-9"></div>
          </div>

          <div className="mb-2">
            <h1 className="text-3xl font-bold tracking-tight mb-1">SP-7K42</h1>
            <p className="text-white/70 text-sm font-medium">Placed on 2 Jul 2026</p>
          </div>
        </div>

        {/* BENTO GRID */}
        <div className="px-4 -mt-16 relative z-10 space-y-4">
          
          {/* Status Tile - Large */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#D0DAE4]/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#E9A020]/10 flex items-center justify-center">
                  <Truck size={16} className="text-[#E9A020]" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A9AAA]">Current Status</div>
                  <div className="text-[#0F1F38] font-bold text-lg leading-tight">Shipped</div>
                </div>
              </div>
              <div className="bg-[#E9A020] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                75%
              </div>
            </div>

            {/* Progress Track */}
            <div className="relative mt-6 mb-2">
              <div className="absolute top-1/2 left-2 right-2 h-1 -translate-y-1/2 bg-[#F8FAFC] rounded-full overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-[75%] bg-[#E9A020] rounded-full"></div>
              </div>
              
              <div className="relative flex justify-between">
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div className="w-4 h-4 rounded-full bg-[#22c55e] flex items-center justify-center border-2 border-white">
                    <CheckCircle2 size={10} className="text-white" />
                  </div>
                  <span className="text-[9px] font-bold text-[#374151]">Ordered</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div className="w-4 h-4 rounded-full bg-[#22c55e] flex items-center justify-center border-2 border-white">
                    <CheckCircle2 size={10} className="text-white" />
                  </div>
                  <span className="text-[9px] font-bold text-[#374151]">Paid</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div className="w-4 h-4 rounded-full bg-[#22c55e] flex items-center justify-center border-2 border-white">
                    <CheckCircle2 size={10} className="text-white" />
                  </div>
                  <span className="text-[9px] font-bold text-[#374151]">Packed</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div className="w-4 h-4 rounded-full bg-[#E9A020] flex items-center justify-center border-2 border-white shadow-[0_0_0_2px_rgba(233,160,32,0.2)]">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                  <span className="text-[9px] font-bold text-[#0F1F38]">Shipped</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div className="w-4 h-4 rounded-full bg-[#F8FAFC] border-2 border-white"></div>
                  <span className="text-[9px] font-bold text-[#8A9AAA]">Delivered</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Tracking Tile */}
            <div className="bg-[#1C2B3D] text-white rounded-2xl p-4 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Truck size={48} />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-3">Courier</div>
              <div className="font-bold text-sm mb-1">DHL Express</div>
              <div className="text-[#E9A020] font-mono text-xs font-medium tracking-widest bg-[#162231] px-2 py-1.5 rounded inline-block border border-white/5">
                <span className="text-white/40 tracking-[0.3em]">••••</span>7741
              </div>
            </div>

            {/* Payment Tile */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#D0DAE4]/50">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A9AAA] mb-3">Payment</div>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></div>
                <div className="font-bold text-[#0F1F38] text-sm">Confirmed</div>
              </div>
              <div className="text-xs text-[#6B7280] font-medium flex items-center gap-1.5">
                <CreditCard size={12} /> Crypto (USDT)
              </div>
            </div>
          </div>

          {/* Delivery Tile */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#D0DAE4]/50 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F8FAFC] flex items-center justify-center shrink-0 border border-[#D0DAE4]/50">
              <MapPin size={14} className="text-[#1B3A7A]" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A9AAA] mb-1">Delivery Address</div>
              <div className="text-[#0F1F38] font-bold text-sm">A. Rivera</div>
              <div className="text-[#6B7280] text-xs leading-relaxed mt-0.5">
                148 Harbour Lane<br />
                Bristol BS1 4RN<br />
                United Kingdom
              </div>
            </div>
          </div>

          {/* Items Tile */}
          <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#D0DAE4]/50">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A9AAA] mb-4">Items</div>
            
            <div className="space-y-3">
              {[
                { name: 'BPC-157', dose: '5mg', qty: 2, price: '$70.00' },
                { name: 'TB-500', dose: '5mg', qty: 1, price: '$42.00' },
                { name: 'Semaglutide', dose: '5mg', qty: 1, price: '$58.00' },
                { name: 'GHK-Cu', dose: '50mg', qty: 1, price: '$30.00' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#F8FAFC] border border-[#D0DAE4]/40 flex items-center justify-center">
                      <Package size={14} className="text-[#2D6BCC]" />
                    </div>
                    <div>
                      <div className="text-[#0F1F38] font-bold text-sm flex items-center gap-1.5">
                        {item.name}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1B3A7A]/5 text-[#1B3A7A] font-medium">{item.dose}</span>
                      </div>
                      <div className="text-[#6B7280] text-xs">Qty: {item.qty}</div>
                    </div>
                  </div>
                  <div className="text-[#0F1F38] font-bold text-sm">{item.price}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Tile */}
          <div className="bg-[#1C2B3D] text-white rounded-2xl p-5 shadow-lg">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Products</span>
                <span className="font-medium">$200.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Shipping</span>
                <span className="font-medium">$18.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Tip</span>
                <span className="font-medium">$10.00</span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/10 flex justify-between items-end mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Grand Total</span>
              <span className="text-2xl font-bold text-white">$228.00</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/50">Amount Due</span>
              <span className="text-[#22c55e] font-bold">$0.00</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 pb-8 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1B3A7A] text-white font-bold text-sm hover:bg-[#1B3164] transition-colors shadow-lg shadow-[#1B3A7A]/20">
                <Download size={16} /> Receipt PDF
              </button>
              <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-[#1B3A7A] font-bold text-sm border border-[#D0DAE4] hover:bg-[#F8FAFC] transition-colors shadow-sm">
                <RotateCcw size={16} /> Order Again
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-transparent text-[#6B7280] font-bold text-sm hover:bg-[#D0DAE4]/20 transition-colors border border-dashed border-[#D0DAE4]">
                <Edit3 size={16} /> Edit Order
              </button>
              <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-transparent text-[#ef4444] font-bold text-sm hover:bg-[#ef4444]/10 transition-colors border border-dashed border-[#ef4444]/30">
                <XCircle size={16} /> Cancel Order
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
