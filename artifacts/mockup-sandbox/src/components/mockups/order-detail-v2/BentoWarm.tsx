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

export function BentoWarm() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans relative">
      {/* Background Gradient Header - Warmer Tint */}
      <div className="absolute top-0 left-0 w-full h-[360px] bg-[linear-gradient(135deg,#3B5E99_0%,#1A2B56_100%)] rounded-b-[3.5rem] z-0 shadow-[0_20px_60px_rgba(27,43,86,0.15)] overflow-hidden">
        {/* Warm glow overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(233,160,32,0.15)_0%,transparent_60%)]"></div>
      </div>

      <div className="relative z-10 max-w-[1150px] mx-auto pt-12 pb-24 px-8">
        
        {/* Header Content */}
        <div className="flex items-start justify-between text-[#FDFBF7] mb-12">
          <div>
            <button className="flex items-center gap-2 text-[#FDFBF7]/80 hover:text-[#FDFBF7] mb-6 text-[13px] font-bold tracking-wider transition-colors">
              <ChevronLeft size={18} strokeWidth={2.5} /> BACK TO ORDERS
            </button>
            <h1 className="text-[2.75rem] font-bold tracking-tight mb-2 text-[#FDFBF7] drop-shadow-sm">SP-7K42</h1>
            <p className="text-[#FDFBF7]/80 text-lg font-medium">Placed on 2 Jul 2026</p>
          </div>
          <div className="text-right pt-12">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#FDFBF7]/70 mb-2">Order Details</div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          
          {/* PRIMARY COLUMN (Left) */}
          <div className="lg:col-span-8 space-y-7">
            
            {/* Status Bento Tile */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_16px_40px_rgb(139,130,122,0.06)] border border-[#EBE5DE]/80 relative overflow-hidden">
              {/* Soft warm corner glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle_at_top_right,rgba(233,160,32,0.04)_0%,transparent_70%)] rounded-bl-full pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-12 relative z-10">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-[#E9A020]/10 flex items-center justify-center border border-[#E9A020]/20 shadow-sm shadow-[#E9A020]/5">
                    <Truck size={28} className="text-[#E9A020]" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-[#9A9289] mb-1.5">Current Status</div>
                    <div className="text-[#2B2520] font-bold text-3xl leading-tight tracking-tight">Shipped</div>
                  </div>
                </div>
                <div className="bg-[#E9A020] text-white text-[15px] font-bold px-5 py-2 rounded-full shadow-[0_4px_16px_rgba(233,160,32,0.3)]">
                  75% Complete
                </div>
              </div>

              {/* Progress Track */}
              <div className="relative mt-12 mb-2 px-6">
                <div className="absolute top-1/2 left-10 right-10 h-2.5 -translate-y-1/2 bg-[#F6F3EC] rounded-full overflow-hidden border border-[#EBE5DE]/50">
                  <div className="absolute top-0 left-0 bottom-0 w-[75%] bg-[#E9A020] rounded-full"></div>
                </div>
                
                <div className="relative flex justify-between">
                  {/* Ordered */}
                  <div className="flex flex-col items-center gap-3 z-10 w-20">
                    <div className="w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center border-[4px] border-white shadow-md shadow-[#22c55e]/20">
                      <CheckCircle2 size={18} className="text-white" strokeWidth={3} />
                    </div>
                    <span className="text-xs font-bold text-[#5A524A]">Ordered</span>
                  </div>
                  {/* Paid */}
                  <div className="flex flex-col items-center gap-3 z-10 w-20">
                    <div className="w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center border-[4px] border-white shadow-md shadow-[#22c55e]/20">
                      <CheckCircle2 size={18} className="text-white" strokeWidth={3} />
                    </div>
                    <span className="text-xs font-bold text-[#5A524A]">Paid</span>
                  </div>
                  {/* Packed */}
                  <div className="flex flex-col items-center gap-3 z-10 w-20">
                    <div className="w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center border-[4px] border-white shadow-md shadow-[#22c55e]/20">
                      <CheckCircle2 size={18} className="text-white" strokeWidth={3} />
                    </div>
                    <span className="text-xs font-bold text-[#5A524A]">Packed</span>
                  </div>
                  {/* Shipped (Current) */}
                  <div className="flex flex-col items-center gap-3 z-10 w-20">
                    <div className="w-8 h-8 rounded-full bg-[#E9A020] flex items-center justify-center border-[4px] border-white shadow-[0_0_0_4px_rgba(233,160,32,0.15)] relative">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                    <span className="text-xs font-bold text-[#2B2520]">Shipped</span>
                  </div>
                  {/* Delivered */}
                  <div className="flex flex-col items-center gap-3 z-10 w-20">
                    <div className="w-8 h-8 rounded-full bg-[#FDFBF7] border-[4px] border-white shadow-sm border border-[#EBE5DE]/80"></div>
                    <span className="text-xs font-bold text-[#A59D93]">Delivered</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Bento Tile */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_16px_40px_rgb(139,130,122,0.06)] border border-[#EBE5DE]/80">
              <div className="flex items-center justify-between mb-8">
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#9A9289]">Order Items</div>
                <div className="text-[#3B5E99] font-bold text-[13px] bg-[#3B5E99]/10 px-4 py-1.5 rounded-xl border border-[#3B5E99]/5">4 Items</div>
              </div>
              
              <div className="space-y-4">
                {[
                  { name: 'BPC-157', dose: '5mg', qty: 2, price: '$70.00' },
                  { name: 'TB-500', dose: '5mg', qty: 1, price: '$42.00' },
                  { name: 'Semaglutide', dose: '5mg', qty: 1, price: '$58.00' },
                  { name: 'GHK-Cu', dose: '50mg', qty: 1, price: '$30.00' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between group p-4 rounded-2xl hover:bg-[#FDFBF7] transition-colors border border-transparent hover:border-[#EBE5DE]/80">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-[#FDFBF7] border border-[#EBE5DE]/60 flex items-center justify-center shrink-0 shadow-sm shadow-[#EBE5DE]/40">
                        <Package size={24} className="text-[#3B5E99]" strokeWidth={2} />
                      </div>
                      <div>
                        <div className="text-[#2B2520] font-bold text-lg flex items-center gap-2.5 mb-1.5">
                          {item.name}
                          <span className="text-[11px] px-2 py-0.5 rounded-lg bg-[#3B5E99]/10 text-[#3B5E99] font-bold border border-[#3B5E99]/5">{item.dose}</span>
                        </div>
                        <div className="text-[#8B827A] text-[15px] font-medium">Qty: {item.qty}</div>
                      </div>
                    </div>
                    <div className="text-[#2B2520] font-bold text-xl">{item.price}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* SECONDARY COLUMN (Right Sidebar) */}
          <div className="lg:col-span-4 space-y-7">
            
            <div className="grid grid-cols-2 gap-5">
              {/* Tracking Tile */}
              <div className="bg-[#1C2538] text-white rounded-[2rem] p-7 shadow-xl relative overflow-hidden group border border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(233,160,32,0.1)_0%,transparent_60%)]"></div>
                <div className="absolute -top-5 -right-5 p-4 opacity-[0.06] rotate-12 transition-transform group-hover:rotate-6">
                  <Truck size={96} />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-4 relative z-10">Courier</div>
                <div className="font-bold text-lg mb-3 relative z-10 text-[#FDFBF7]">DHL Express</div>
                <div className="text-[#E9A020] font-mono text-[13px] font-semibold tracking-widest bg-[#131A2A] px-3 py-2 rounded-xl inline-block border border-white/10 relative z-10 shadow-inner">
                  <span className="text-white/20 tracking-[0.3em] mr-1">••••</span>7741
                </div>
              </div>

              {/* Payment Tile */}
              <div className="bg-white rounded-[2rem] p-7 shadow-[0_12px_30px_rgb(139,130,122,0.06)] border border-[#EBE5DE]/80">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#9A9289] mb-4">Payment</div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.5)]"></div>
                  <div className="font-bold text-[#2B2520] text-lg">Confirmed</div>
                </div>
                <div className="text-[13px] text-[#5A524A] font-bold flex items-center gap-2 bg-[#FDFBF7] inline-flex px-3 py-1.5 rounded-xl border border-[#EBE5DE]/60">
                  <CreditCard size={16} className="text-[#3B5E99]" strokeWidth={2.5} /> Crypto (USDT)
                </div>
              </div>
            </div>

            {/* Delivery Tile */}
            <div className="bg-white rounded-[2rem] p-7 shadow-[0_12px_30px_rgb(139,130,122,0.06)] border border-[#EBE5DE]/80 flex items-start gap-5">
              <div className="w-12 h-12 rounded-2xl bg-[#FDFBF7] flex items-center justify-center shrink-0 border border-[#EBE5DE]/60 shadow-sm">
                <MapPin size={22} className="text-[#3B5E99]" strokeWidth={2} />
              </div>
              <div className="pt-0.5">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#9A9289] mb-3">Delivery Address</div>
                <div className="text-[#2B2520] font-bold text-[17px] mb-1.5">A. Rivera</div>
                <div className="text-[#6C6359] text-[15px] leading-relaxed font-medium">
                  148 Harbour Lane<br />
                  Bristol BS1 4RN<br />
                  United Kingdom
                </div>
              </div>
            </div>

            {/* Totals Tile */}
            <div className="bg-[#1C2538] text-white rounded-[2.5rem] p-8 shadow-xl border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[radial-gradient(circle_at_top_right,rgba(59,94,153,0.2)_0%,transparent_70%)] rounded-bl-full pointer-events-none"></div>
              
              <div className="space-y-4 mb-7 relative z-10">
                <div className="flex justify-between text-[15px]">
                  <span className="text-[#B5C2D9] font-medium">Products</span>
                  <span className="font-bold text-[#FDFBF7]">$200.00</span>
                </div>
                <div className="flex justify-between text-[15px]">
                  <span className="text-[#B5C2D9] font-medium">Shipping</span>
                  <span className="font-bold text-[#FDFBF7]">$18.00</span>
                </div>
                <div className="flex justify-between text-[15px]">
                  <span className="text-[#B5C2D9] font-medium">Tip</span>
                  <span className="font-bold text-[#FDFBF7]">$10.00</span>
                </div>
              </div>
              
              <div className="pt-6 border-t border-white/10 flex flex-col gap-1.5 mb-3 relative z-10">
                <div className="flex justify-between items-end">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#B5C2D9]">Grand Total</span>
                  <span className="text-[2rem] font-bold text-[#FDFBF7] tracking-tight leading-none">$228.00</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-[15px] pt-3 bg-[#131A2A] px-5 py-3 rounded-2xl mt-5 relative z-10 shadow-inner">
                <span className="text-[#B5C2D9] font-medium">Amount Due</span>
                <span className="text-[#22c55e] font-bold">$0.00</span>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              <button className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#3B5E99] text-white font-bold text-[15px] hover:bg-[#2F4A7A] transition-colors shadow-md shadow-[#3B5E99]/20">
                <Download size={18} strokeWidth={2.5} /> Receipt PDF
              </button>
              <button className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white text-[#3B5E99] font-bold text-[15px] border border-[#EBE5DE] hover:bg-[#FDFBF7] transition-colors shadow-sm shadow-[#EBE5DE]/40">
                <RotateCcw size={18} strokeWidth={2.5} /> Order Again
              </button>
              <button className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#FDFBF7]/50 text-[#6C6359] font-bold text-[15px] hover:bg-[#F6F3EC] hover:text-[#2B2520] transition-colors border border-dashed border-[#DED6CC]">
                <Edit3 size={18} strokeWidth={2.5} /> Edit Order
              </button>
              <button className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#FDFBF7]/50 text-[#ef4444] font-bold text-[15px] hover:bg-[#FEF2F2] transition-colors border border-dashed border-[#ef4444]/20 hover:border-[#ef4444]/40">
                <XCircle size={18} strokeWidth={2.5} /> Cancel Order
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
