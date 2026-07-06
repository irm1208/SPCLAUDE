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
  ChevronLeft
} from 'lucide-react';

export function GradientBentoDesktop() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans relative">
      {/* Background Gradient Header */}
      <div className="absolute top-0 left-0 w-full h-[360px] bg-[linear-gradient(135deg,#2D6BCC_0%,#1B3A7A_100%)] rounded-b-[3rem] z-0 shadow-xl"></div>

      <div className="relative z-10 max-w-[1150px] mx-auto pt-10 pb-24 px-8">
        
        {/* Header Content */}
        <div className="flex items-start justify-between text-white mb-10">
          <div>
            <button className="flex items-center gap-2 text-white/70 hover:text-white mb-6 text-sm font-bold tracking-wide transition-colors">
              <ChevronLeft size={16} /> BACK TO ORDERS
            </button>
            <h1 className="text-4xl font-bold tracking-tight mb-2">SP-7K42</h1>
            <p className="text-white/70 text-base font-medium">Placed on 2 Jul 2026</p>
          </div>
          <div className="text-right pt-10">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/60 mb-2">Order Details</div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* PRIMARY COLUMN (Left) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Status Bento Tile - Expansive */}
            <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#D0DAE4]/50">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#E9A020]/10 flex items-center justify-center">
                    <Truck size={24} className="text-[#E9A020]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-[#8A9AAA] mb-1">Current Status</div>
                    <div className="text-[#0F1F38] font-bold text-2xl leading-tight">Shipped</div>
                  </div>
                </div>
                <div className="bg-[#E9A020] text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-sm shadow-[#E9A020]/20">
                  75% Complete
                </div>
              </div>

              {/* Progress Track (Wider for Desktop) */}
              <div className="relative mt-8 mb-4 px-4">
                <div className="absolute top-1/2 left-8 right-8 h-1.5 -translate-y-1/2 bg-[#F8FAFC] rounded-full overflow-hidden border border-[#D0DAE4]/30">
                  <div className="absolute top-0 left-0 bottom-0 w-[75%] bg-[#E9A020] rounded-full"></div>
                </div>
                
                <div className="relative flex justify-between">
                  {/* Ordered */}
                  <div className="flex flex-col items-center gap-2 z-10 w-16">
                    <div className="w-6 h-6 rounded-full bg-[#22c55e] flex items-center justify-center border-[3px] border-white shadow-sm">
                      <CheckCircle2 size={14} className="text-white" />
                    </div>
                    <span className="text-[11px] font-bold text-[#374151]">Ordered</span>
                  </div>
                  {/* Paid */}
                  <div className="flex flex-col items-center gap-2 z-10 w-16">
                    <div className="w-6 h-6 rounded-full bg-[#22c55e] flex items-center justify-center border-[3px] border-white shadow-sm">
                      <CheckCircle2 size={14} className="text-white" />
                    </div>
                    <span className="text-[11px] font-bold text-[#374151]">Paid</span>
                  </div>
                  {/* Packed */}
                  <div className="flex flex-col items-center gap-2 z-10 w-16">
                    <div className="w-6 h-6 rounded-full bg-[#22c55e] flex items-center justify-center border-[3px] border-white shadow-sm">
                      <CheckCircle2 size={14} className="text-white" />
                    </div>
                    <span className="text-[11px] font-bold text-[#374151]">Packed</span>
                  </div>
                  {/* Shipped (Current) */}
                  <div className="flex flex-col items-center gap-2 z-10 w-16">
                    <div className="w-6 h-6 rounded-full bg-[#E9A020] flex items-center justify-center border-[3px] border-white shadow-[0_0_0_3px_rgba(233,160,32,0.2)]">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    <span className="text-[11px] font-bold text-[#0F1F38]">Shipped</span>
                  </div>
                  {/* Delivered */}
                  <div className="flex flex-col items-center gap-2 z-10 w-16">
                    <div className="w-6 h-6 rounded-full bg-[#F8FAFC] border-[3px] border-white shadow-sm"></div>
                    <span className="text-[11px] font-bold text-[#8A9AAA]">Delivered</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Bento Tile */}
            <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#D0DAE4]/50">
              <div className="flex items-center justify-between mb-6">
                <div className="text-xs font-bold uppercase tracking-widest text-[#8A9AAA]">Order Items</div>
                <div className="text-[#1B3A7A] font-bold text-sm bg-[#1B3A7A]/5 px-3 py-1 rounded-lg">4 Items</div>
              </div>
              
              <div className="space-y-4">
                {[
                  { name: 'BPC-157', dose: '5mg', qty: 2, price: '$70.00' },
                  { name: 'TB-500', dose: '5mg', qty: 1, price: '$42.00' },
                  { name: 'Semaglutide', dose: '5mg', qty: 1, price: '$58.00' },
                  { name: 'GHK-Cu', dose: '50mg', qty: 1, price: '$30.00' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between group p-3 rounded-2xl hover:bg-[#F8FAFC] transition-colors border border-transparent hover:border-[#D0DAE4]/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] border border-[#D0DAE4]/40 flex items-center justify-center shrink-0">
                        <Package size={20} className="text-[#2D6BCC]" />
                      </div>
                      <div>
                        <div className="text-[#0F1F38] font-bold text-base flex items-center gap-2 mb-1">
                          {item.name}
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#1B3A7A]/5 text-[#1B3A7A] font-bold">{item.dose}</span>
                        </div>
                        <div className="text-[#6B7280] text-sm font-medium">Qty: {item.qty}</div>
                      </div>
                    </div>
                    <div className="text-[#0F1F38] font-bold text-lg">{item.price}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* SECONDARY COLUMN (Right Sidebar) */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
              {/* Tracking Tile */}
              <div className="bg-[#1C2B3D] text-white rounded-3xl p-6 shadow-lg relative overflow-hidden group">
                <div className="absolute -top-4 -right-4 p-3 opacity-[0.07] rotate-12 transition-transform group-hover:rotate-6">
                  <Truck size={80} />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-3 relative z-10">Courier</div>
                <div className="font-bold text-base mb-2 relative z-10">DHL Express</div>
                <div className="text-[#E9A020] font-mono text-xs font-medium tracking-widest bg-[#162231] px-2.5 py-1.5 rounded-lg inline-block border border-white/5 relative z-10">
                  <span className="text-white/30 tracking-[0.3em] mr-1">••••</span>7741
                </div>
              </div>

              {/* Payment Tile */}
              <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#D0DAE4]/50">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A9AAA] mb-3">Payment</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                  <div className="font-bold text-[#0F1F38] text-base">Confirmed</div>
                </div>
                <div className="text-xs text-[#6B7280] font-bold flex items-center gap-1.5 bg-[#F8FAFC] inline-flex px-2 py-1 rounded-md border border-[#D0DAE4]/30">
                  <CreditCard size={14} className="text-[#1B3A7A]" /> Crypto (USDT)
                </div>
              </div>
            </div>

            {/* Delivery Tile */}
            <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#D0DAE4]/50 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#F8FAFC] flex items-center justify-center shrink-0 border border-[#D0DAE4]/50">
                <MapPin size={18} className="text-[#1B3A7A]" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A9AAA] mb-2">Delivery Address</div>
                <div className="text-[#0F1F38] font-bold text-base mb-1">A. Rivera</div>
                <div className="text-[#6B7280] text-sm leading-relaxed">
                  148 Harbour Lane<br />
                  Bristol BS1 4RN<br />
                  United Kingdom
                </div>
              </div>
            </div>

            {/* Totals Tile */}
            <div className="bg-[#1C2B3D] text-white rounded-3xl p-8 shadow-xl">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60 font-medium">Products</span>
                  <span className="font-bold">$200.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60 font-medium">Shipping</span>
                  <span className="font-bold">$18.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60 font-medium">Tip</span>
                  <span className="font-bold">$10.00</span>
                </div>
              </div>
              
              <div className="pt-5 border-t border-white/10 flex flex-col gap-1 mb-2">
                <div className="flex justify-between items-end">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">Grand Total</span>
                  <span className="text-3xl font-bold text-white">$228.00</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 bg-white/5 px-4 py-2.5 rounded-xl mt-4">
                <span className="text-white/60 font-medium">Amount Due</span>
                <span className="text-[#22c55e] font-bold">$0.00</span>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#1B3A7A] text-white font-bold text-sm hover:bg-[#1B3164] transition-colors shadow-lg shadow-[#1B3A7A]/20">
                <Download size={18} /> Receipt PDF
              </button>
              <button className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white text-[#1B3A7A] font-bold text-sm border border-[#D0DAE4] hover:bg-[#F8FAFC] transition-colors shadow-sm">
                <RotateCcw size={18} /> Order Again
              </button>
              <button className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-transparent text-[#6B7280] font-bold text-sm hover:bg-[#D0DAE4]/20 hover:text-[#0F1F38] transition-colors border border-dashed border-[#D0DAE4]">
                <Edit3 size={16} /> Edit Order
              </button>
              <button className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-transparent text-[#ef4444] font-bold text-sm hover:bg-[#ef4444]/10 transition-colors border border-dashed border-[#ef4444]/30">
                <XCircle size={16} /> Cancel Order
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
