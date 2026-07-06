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

export function BentoQuiet() {
  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans relative text-[#1B3A7A]">
      {/* Quiet Header Background */}
      <div className="absolute top-0 left-0 w-full h-[360px] bg-[#131B2B] z-0"></div>

      <div className="relative z-10 max-w-[1150px] mx-auto pt-12 pb-24 px-8">
        
        {/* Header Content */}
        <div className="flex items-start justify-between text-[#F8F9FB] mb-12">
          <div>
            <button className="flex items-center gap-2 text-white/50 hover:text-white mb-8 text-xs font-medium tracking-[0.1em] transition-colors">
              <ChevronLeft size={14} strokeWidth={1.5} /> BACK TO ORDERS
            </button>
            <h1 className="text-3xl font-light tracking-wide mb-3">SP-7K42</h1>
            <p className="text-white/40 text-sm font-light tracking-wide">Placed on 2 Jul 2026</p>
          </div>
          <div className="text-right pt-12">
            <div className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/30 mb-2">Order Details</div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* PRIMARY COLUMN (Left) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Status Bento Tile - Expansive */}
            <div className="bg-white rounded-2xl p-10 shadow-[0_4px_24px_rgb(0,0,0,0.02)] border border-[#E5E7EB]">
              <div className="flex items-center justify-between mb-14">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 flex items-center justify-center border border-[#E5E7EB] rounded-full">
                    <Truck size={20} strokeWidth={1.5} className="text-[#1B3A7A]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#9CA3AF] mb-2">Current Status</div>
                    <div className="text-[#1B3A7A] font-light text-2xl tracking-wide">Shipped</div>
                  </div>
                </div>
                <div className="text-[#1B3A7A] text-[11px] font-medium tracking-widest uppercase px-4 py-2 border border-[#E5E7EB] rounded-full">
                  75% Complete
                </div>
              </div>

              {/* Progress Track */}
              <div className="relative mt-8 mb-4 px-6">
                <div className="absolute top-1/2 left-10 right-10 h-[1px] -translate-y-1/2 bg-[#E5E7EB]">
                  <div className="absolute top-0 left-0 bottom-0 w-[75%] bg-[#1B3A7A]"></div>
                </div>
                
                <div className="relative flex justify-between">
                  {/* Ordered */}
                  <div className="flex flex-col items-center gap-4 z-10 w-16">
                    <div className="w-5 h-5 rounded-full bg-white border border-[#1B3A7A] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1B3A7A]"></div>
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[#4B5563]">Ordered</span>
                  </div>
                  {/* Paid */}
                  <div className="flex flex-col items-center gap-4 z-10 w-16">
                    <div className="w-5 h-5 rounded-full bg-white border border-[#1B3A7A] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1B3A7A]"></div>
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[#4B5563]">Paid</span>
                  </div>
                  {/* Packed */}
                  <div className="flex flex-col items-center gap-4 z-10 w-16">
                    <div className="w-5 h-5 rounded-full bg-white border border-[#1B3A7A] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1B3A7A]"></div>
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[#4B5563]">Packed</span>
                  </div>
                  {/* Shipped (Current) */}
                  <div className="flex flex-col items-center gap-4 z-10 w-16">
                    <div className="w-5 h-5 rounded-full bg-white border border-[#1B3A7A] flex items-center justify-center shadow-[0_0_0_4px_rgba(27,58,122,0.05)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1B3A7A]"></div>
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[#1B3A7A]">Shipped</span>
                  </div>
                  {/* Delivered */}
                  <div className="flex flex-col items-center gap-4 z-10 w-16">
                    <div className="w-5 h-5 rounded-full bg-white border border-[#E5E7EB]"></div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">Delivered</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Bento Tile */}
            <div className="bg-white rounded-2xl p-10 shadow-[0_4px_24px_rgb(0,0,0,0.02)] border border-[#E5E7EB]">
              <div className="flex items-center justify-between mb-8">
                <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#9CA3AF]">Order Items</div>
                <div className="text-[#6B7280] font-medium text-[11px] tracking-wider uppercase">4 Items</div>
              </div>
              
              <div className="space-y-2">
                {[
                  { name: 'BPC-157', dose: '5mg', qty: 2, price: '$70.00' },
                  { name: 'TB-500', dose: '5mg', qty: 1, price: '$42.00' },
                  { name: 'Semaglutide', dose: '5mg', qty: 1, price: '$58.00' },
                  { name: 'GHK-Cu', dose: '50mg', qty: 1, price: '$30.00' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-4 border-b border-[#F3F4F6] last:border-0">
                    <div className="flex items-center gap-6">
                      <div className="text-[#1B3A7A] font-light text-sm tracking-wide w-32">
                        {item.name}
                      </div>
                      <div className="text-[#9CA3AF] text-xs font-light">{item.dose}</div>
                      <div className="text-[#9CA3AF] text-xs font-light">Qty: {item.qty}</div>
                    </div>
                    <div className="text-[#1B3A7A] font-light tracking-wide text-sm">{item.price}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* SECONDARY COLUMN (Right Sidebar) */}
          <div className="lg:col-span-4 space-y-8">
            
            <div className="grid grid-cols-2 gap-4">
              {/* Tracking Tile */}
              <div className="bg-[#192336] text-white rounded-2xl p-8 border border-[#2A374C] relative overflow-hidden">
                <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/40 mb-4">Courier</div>
                <div className="font-light text-sm tracking-wide mb-3">DHL Express</div>
                <div className="text-white/60 font-mono text-[10px] tracking-widest inline-block">
                  <span className="text-white/20 mr-1">••••</span>7741
                </div>
              </div>

              {/* Payment Tile */}
              <div className="bg-white rounded-2xl p-8 shadow-[0_4px_24px_rgb(0,0,0,0.02)] border border-[#E5E7EB]">
                <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#9CA3AF] mb-4">Payment</div>
                <div className="font-light text-[#1B3A7A] text-sm tracking-wide mb-3">Confirmed</div>
                <div className="text-[11px] text-[#6B7280] font-light tracking-wide">
                  Crypto (USDT)
                </div>
              </div>
            </div>

            {/* Delivery Tile */}
            <div className="bg-white rounded-2xl p-8 shadow-[0_4px_24px_rgb(0,0,0,0.02)] border border-[#E5E7EB]">
              <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#9CA3AF] mb-5">Delivery Address</div>
              <div className="text-[#1B3A7A] font-light tracking-wide text-sm mb-2">A. Rivera</div>
              <div className="text-[#6B7280] text-xs font-light leading-relaxed tracking-wide">
                148 Harbour Lane<br />
                Bristol BS1 4RN<br />
                United Kingdom
              </div>
            </div>

            {/* Totals Tile */}
            <div className="bg-[#192336] text-white rounded-2xl p-8 border border-[#2A374C]">
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-xs tracking-wide">
                  <span className="text-white/40 font-light">Products</span>
                  <span className="font-light">$200.00</span>
                </div>
                <div className="flex justify-between text-xs tracking-wide">
                  <span className="text-white/40 font-light">Shipping</span>
                  <span className="font-light">$18.00</span>
                </div>
                <div className="flex justify-between text-xs tracking-wide">
                  <span className="text-white/40 font-light">Tip</span>
                  <span className="font-light">$10.00</span>
                </div>
              </div>
              
              <div className="pt-6 border-t border-white/10 mb-4">
                <div className="flex justify-between items-end">
                  <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/40">Grand Total</span>
                  <span className="text-xl font-light tracking-wide text-white">$228.00</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs tracking-wide pt-4">
                <span className="text-white/40 font-light">Amount Due</span>
                <span className="text-[#E9A020] font-light">$0.00</span>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 py-4 rounded-xl bg-white text-[#1B3A7A] font-light tracking-wide text-xs border border-[#E5E7EB] hover:border-[#1B3A7A] transition-colors">
                <Download size={14} strokeWidth={1.5} /> Receipt PDF
              </button>
              <button className="flex items-center justify-center gap-2 py-4 rounded-xl bg-white text-[#1B3A7A] font-light tracking-wide text-xs border border-[#E5E7EB] hover:border-[#1B3A7A] transition-colors">
                <RotateCcw size={14} strokeWidth={1.5} /> Order Again
              </button>
              <button className="flex items-center justify-center gap-2 py-4 rounded-xl bg-transparent text-[#6B7280] font-light tracking-wide text-xs hover:text-[#1B3A7A] transition-colors">
                <Edit3 size={14} strokeWidth={1.5} /> Edit Order
              </button>
              <button className="flex items-center justify-center gap-2 py-4 rounded-xl bg-transparent text-[#9CA3AF] font-light tracking-wide text-xs hover:text-[#EF4444] transition-colors">
                <XCircle size={14} strokeWidth={1.5} /> Cancel Order
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
