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

export function BentoBold() {
  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans relative">
      {/* Background Gradient Header - Harder angles, deeper color */}
      <div className="absolute top-0 left-0 w-full h-[380px] bg-[linear-gradient(180deg,#1B3164_0%,#1B3A7A_100%)] rounded-b-none z-0 border-b-8 border-[#E9A020]"></div>

      <div className="relative z-10 max-w-[1150px] mx-auto pt-10 pb-24 px-8">
        
        {/* Header Content */}
        <div className="flex items-start justify-between text-white mb-10">
          <div>
            <button className="flex items-center gap-2 text-[#E9A020] hover:text-white mb-6 text-sm font-black uppercase tracking-[0.1em] transition-colors">
              <ChevronLeft size={18} strokeWidth={3} /> BACK TO ORDERS
            </button>
            <h1 className="text-5xl font-black tracking-tighter mb-2 text-white drop-shadow-md">SP-7K42</h1>
            <p className="text-[#8A9AAA] text-sm font-bold uppercase tracking-widest">Placed on 2 Jul 2026</p>
          </div>
          <div className="text-right pt-12">
            <div className="text-sm font-black uppercase tracking-[0.25em] text-white/50 mb-2">Order Details</div>
          </div>
        </div>

        {/* Bento Grid Layout - tighter gap, crisp corners */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* PRIMARY COLUMN (Left) */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* Status Bento Tile - Expansive & Dark-Forward */}
            <div className="bg-[#1C2B3D] rounded-xl p-8 shadow-2xl border-l-4 border-[#E9A020]">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-[#E9A020] flex items-center justify-center rounded-lg shadow-[4px_4px_0px_#1B3164] border-2 border-[#1B3164]">
                    <Truck size={28} className="text-[#1B3164]" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">Current Status</div>
                    <div className="text-white font-black text-3xl tracking-tight leading-none">SHIPPED</div>
                  </div>
                </div>
                <div className="bg-[#E9A020] text-[#1B3164] text-sm font-black uppercase tracking-wider px-5 py-2 rounded-md border-2 border-[#1B3164] shadow-[4px_4px_0px_#1B3164]">
                  75% Complete
                </div>
              </div>

              {/* Progress Track (Crisp, High Contrast) */}
              <div className="relative mt-12 mb-4 px-4">
                <div className="absolute top-1/2 left-8 right-8 h-2.5 -translate-y-1/2 bg-[#162231] rounded-full overflow-hidden border-y border-white/5 shadow-inner">
                  <div className="absolute top-0 left-0 bottom-0 w-[75%] bg-[#E9A020]"></div>
                </div>
                
                <div className="relative flex justify-between">
                  {/* Ordered */}
                  <div className="flex flex-col items-center gap-3 z-10 w-16">
                    <div className="w-7 h-7 rounded bg-[#22c55e] flex items-center justify-center border-2 border-[#1C2B3D] shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
                      <CheckCircle2 size={16} className="text-[#1C2B3D]" strokeWidth={3} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/80">Ordered</span>
                  </div>
                  {/* Paid */}
                  <div className="flex flex-col items-center gap-3 z-10 w-16">
                    <div className="w-7 h-7 rounded bg-[#22c55e] flex items-center justify-center border-2 border-[#1C2B3D] shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
                      <CheckCircle2 size={16} className="text-[#1C2B3D]" strokeWidth={3} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/80">Paid</span>
                  </div>
                  {/* Packed */}
                  <div className="flex flex-col items-center gap-3 z-10 w-16">
                    <div className="w-7 h-7 rounded bg-[#22c55e] flex items-center justify-center border-2 border-[#1C2B3D] shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
                      <CheckCircle2 size={16} className="text-[#1C2B3D]" strokeWidth={3} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/80">Packed</span>
                  </div>
                  {/* Shipped (Current) */}
                  <div className="flex flex-col items-center gap-3 z-10 w-16">
                    <div className="w-8 h-8 rounded bg-[#E9A020] flex items-center justify-center border-2 border-[#1C2B3D] shadow-[3px_3px_0px_rgba(0,0,0,0.5)] scale-110">
                      <div className="w-2.5 h-2.5 bg-[#1C2B3D] rounded-sm"></div>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#E9A020]">Shipped</span>
                  </div>
                  {/* Delivered */}
                  <div className="flex flex-col items-center gap-3 z-10 w-16">
                    <div className="w-7 h-7 rounded bg-[#162231] border-2 border-white/10 shadow-[2px_2px_0px_rgba(0,0,0,0.3)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/30">Delivered</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Bento Tile - High Contrast Light */}
            <div className="bg-white rounded-xl p-8 shadow-[8px_8px_0px_rgba(27,58,122,0.05)] border-2 border-[#1B3A7A]/10">
              <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-[#1B3A7A]/5">
                <div className="text-sm font-black uppercase tracking-widest text-[#1B3A7A]">Order Items</div>
                <div className="bg-[#1B3164] text-white font-black text-xs uppercase tracking-widest px-4 py-1.5 rounded border border-[#1B3A7A]">4 Items</div>
              </div>
              
              <div className="space-y-3">
                {[
                  { name: 'BPC-157', dose: '5mg', qty: 2, price: '$70.00' },
                  { name: 'TB-500', dose: '5mg', qty: 1, price: '$42.00' },
                  { name: 'Semaglutide', dose: '5mg', qty: 1, price: '$58.00' },
                  { name: 'GHK-Cu', dose: '50mg', qty: 1, price: '$30.00' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between group p-4 rounded-lg bg-[#F8FAFC] border-2 border-transparent hover:border-[#1B3A7A] hover:shadow-[4px_4px_0px_#1B3A7A] transition-all">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-white border-2 border-[#1B3A7A]/20 flex items-center justify-center shrink-0 rounded group-hover:border-[#1B3A7A] group-hover:bg-[#1B3A7A] transition-colors">
                        <Package size={24} className="text-[#1B3A7A] group-hover:text-white transition-colors" strokeWidth={2.5} />
                      </div>
                      <div>
                        <div className="text-[#0F1F38] font-black text-lg flex items-center gap-3 mb-1 uppercase tracking-tight">
                          {item.name}
                          <span className="text-[10px] px-2 py-0.5 bg-[#E9A020] text-[#0F1F38] font-black border border-[#0F1F38] rounded-sm">{item.dose}</span>
                        </div>
                        <div className="text-[#6B7280] text-xs font-bold uppercase tracking-wider">Qty: <span className="text-[#0F1F38]">{item.qty}</span></div>
                      </div>
                    </div>
                    <div className="text-[#0F1F38] font-black text-xl tracking-tight">{item.price}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* SECONDARY COLUMN (Right Sidebar) */}
          <div className="lg:col-span-4 space-y-5">
            
            <div className="grid grid-cols-2 gap-5">
              {/* Tracking Tile */}
              <div className="bg-[#2D6BCC] text-white rounded-xl p-6 shadow-[4px_4px_0px_#1B3164] border-2 border-[#1B3164] relative overflow-hidden group">
                <div className="absolute -top-6 -right-6 p-4 opacity-20 rotate-12 transition-transform group-hover:rotate-6 group-hover:scale-110">
                  <Truck size={100} strokeWidth={1.5} />
                </div>
                <div className="text-[11px] font-black uppercase tracking-[0.15em] text-[#1B3164] mb-3 relative z-10 bg-[#E9A020] inline-block px-2 py-0.5 rounded-sm">Courier</div>
                <div className="font-black text-xl tracking-tight mb-3 relative z-10 drop-shadow-md">DHL Express</div>
                <div className="text-[#1B3164] font-mono text-sm font-bold tracking-widest bg-white px-3 py-1.5 rounded border border-[#1B3164] inline-block shadow-[2px_2px_0px_#1B3164] relative z-10">
                  <span className="text-[#1B3164]/40 tracking-[0.2em] mr-1">••••</span>7741
                </div>
              </div>

              {/* Payment Tile */}
              <div className="bg-white rounded-xl p-6 shadow-[4px_4px_0px_rgba(27,58,122,0.1)] border-2 border-[#1B3A7A]/10 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.15em] text-[#8A9AAA] mb-3">Payment</div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-[#22c55e] border-2 border-[#0F1F38] shadow-[1px_1px_0px_#0F1F38]"></div>
                    <div className="font-black text-[#0F1F38] text-lg uppercase tracking-tight">Confirmed</div>
                  </div>
                </div>
                <div className="text-[11px] text-[#0F1F38] font-black uppercase tracking-wider flex items-center gap-2 bg-[#F0F4F8] inline-flex px-3 py-2 rounded border border-[#1B3A7A]/20">
                  <CreditCard size={16} className="text-[#2D6BCC]" strokeWidth={2.5} /> CRYPTO (USDT)
                </div>
              </div>
            </div>

            {/* Delivery Tile */}
            <div className="bg-white rounded-xl p-6 shadow-[8px_8px_0px_rgba(27,58,122,0.05)] border-2 border-[#1B3A7A]/10 flex items-start gap-5">
              <div className="w-12 h-12 bg-[#F0F4F8] flex items-center justify-center shrink-0 border-2 border-[#1B3A7A] rounded-lg shadow-[3px_3px_0px_#1B3A7A]">
                <MapPin size={24} className="text-[#1B3A7A]" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.15em] text-[#8A9AAA] mb-2">Delivery Address</div>
                <div className="text-[#0F1F38] font-black text-lg mb-1 uppercase tracking-tight">A. Rivera</div>
                <div className="text-[#374151] text-sm font-bold leading-relaxed uppercase">
                  148 Harbour Lane<br />
                  Bristol BS1 4RN<br />
                  United Kingdom
                </div>
              </div>
            </div>

            {/* Totals Tile */}
            <div className="bg-[#1B3164] text-white rounded-xl p-8 shadow-[8px_8px_0px_#0F1F38] border-2 border-[#0F1F38] relative overflow-hidden">
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#2D6BCC]/20 rounded-full blur-3xl"></div>
              
              <div className="space-y-4 mb-6 relative z-10">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60 font-bold uppercase tracking-wider">Products</span>
                  <span className="font-black text-lg">$200.00</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60 font-bold uppercase tracking-wider">Shipping</span>
                  <span className="font-black text-lg">$18.00</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#E9A020] font-bold uppercase tracking-wider">Tip</span>
                  <span className="font-black text-lg text-[#E9A020]">$10.00</span>
                </div>
              </div>
              
              <div className="pt-6 border-t-2 border-white/10 flex flex-col gap-2 mb-2 relative z-10">
                <div className="flex justify-between items-end">
                  <span className="text-[12px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">Grand Total</span>
                  <span className="text-4xl font-black text-white tracking-tighter">$228.00</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 bg-[#0F1F38] px-5 py-3 rounded border-2 border-white/5 mt-5 relative z-10">
                <span className="text-white/70 font-black text-xs uppercase tracking-widest">Amount Due</span>
                <span className="text-[#22c55e] font-black text-xl">$0.00</span>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button className="flex items-center justify-center gap-2 py-4 rounded-lg bg-[#E9A020] text-[#0F1F38] font-black text-xs uppercase tracking-wider hover:bg-[#F5B03B] transition-transform active:scale-95 shadow-[4px_4px_0px_#0F1F38] border-2 border-[#0F1F38]">
                <Download size={18} strokeWidth={2.5} /> Receipt PDF
              </button>
              <button className="flex items-center justify-center gap-2 py-4 rounded-lg bg-[#2D6BCC] text-white font-black text-xs uppercase tracking-wider hover:bg-[#3B7BE0] transition-transform active:scale-95 shadow-[4px_4px_0px_#0F1F38] border-2 border-[#0F1F38]">
                <RotateCcw size={18} strokeWidth={2.5} /> Order Again
              </button>
              <button className="flex items-center justify-center gap-2 py-3.5 rounded-lg bg-white text-[#1B3A7A] font-black text-xs uppercase tracking-wider hover:bg-[#F0F4F8] transition-transform active:scale-95 border-2 border-[#1B3A7A] shadow-[4px_4px_0px_rgba(27,58,122,0.15)]">
                <Edit3 size={18} strokeWidth={2.5} /> Edit Order
              </button>
              <button className="flex items-center justify-center gap-2 py-3.5 rounded-lg bg-white text-[#ef4444] font-black text-xs uppercase tracking-wider hover:bg-red-50 transition-transform active:scale-95 border-2 border-[#ef4444] shadow-[4px_4px_0px_rgba(239,68,68,0.15)]">
                <XCircle size={18} strokeWidth={2.5} /> Cancel Order
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
