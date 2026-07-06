import React from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

export function NativeGrouped() {
  return (
    <div 
      className="min-h-screen w-full font-sans pb-12" 
      style={{ backgroundColor: '#f2f2f7', color: '#000000', WebkitFontSmoothing: 'antialiased' }}
    >
      {/* Navigation Bar */}
      <div className="pt-12 pb-2 px-2 flex items-center justify-between sticky top-0 bg-[#f2f2f7]/80 backdrop-blur-xl z-10">
        <button className="flex items-center gap-1 text-[#007aff] px-2 py-1 active:opacity-50 transition-opacity">
          <ChevronLeft className="w-6 h-6 -ml-2" strokeWidth={2.5} />
          <span className="text-[17px]">Orders</span>
        </button>
      </div>

      {/* Large Title */}
      <div className="px-4 pt-2 pb-4">
        <h1 className="text-[34px] font-bold tracking-tight leading-tight">Order SP-7K42</h1>
      </div>

      <div className="space-y-6 px-4">
        {/* Status Group */}
        <section>
          <div className="bg-white rounded-[10px] overflow-hidden">
            <div className="flex items-center justify-between px-4 min-h-[44px] border-b border-[#c6c6c8]/50 last:border-0">
              <span className="text-[17px]">Status</span>
              <span className="text-[17px] text-[#8e8e93]">Shipped</span>
            </div>
            <div className="flex items-center justify-between px-4 min-h-[44px] border-b border-[#c6c6c8]/50 last:border-0">
              <span className="text-[17px]">Date Placed</span>
              <span className="text-[17px] text-[#8e8e93]">2 Jul 2026</span>
            </div>
            <div className="flex items-center justify-between px-4 min-h-[44px] border-b border-[#c6c6c8]/50 last:border-0">
              <span className="text-[17px]">Payment</span>
              <span className="text-[17px] text-[#8e8e93]">Paid</span>
            </div>
          </div>
          <p className="px-4 mt-2 text-[13px] text-[#6e6e73] leading-snug">
            Your order is 75% complete: Ordered → Paid → Packed → <strong className="text-black font-medium">Shipped</strong> → Delivered.
          </p>
        </section>

        {/* Items Group */}
        <section>
          <h2 className="px-4 pb-1.5 text-[13px] uppercase tracking-wider text-[#6e6e73]">Items</h2>
          <div className="bg-white rounded-[10px] overflow-hidden">
            <div className="flex flex-col py-2 px-4 border-b border-[#c6c6c8]/50 last:border-0 min-h-[44px] justify-center">
              <div className="flex justify-between items-center">
                <span className="text-[17px] font-medium">BPC-157 5mg</span>
                <span className="text-[17px] text-[#8e8e93]">$70.00</span>
              </div>
              <div className="text-[15px] text-[#8e8e93]">Qty: 2</div>
            </div>
            <div className="flex flex-col py-2 px-4 border-b border-[#c6c6c8]/50 last:border-0 min-h-[44px] justify-center">
              <div className="flex justify-between items-center">
                <span className="text-[17px] font-medium">TB-500 5mg</span>
                <span className="text-[17px] text-[#8e8e93]">$42.00</span>
              </div>
              <div className="text-[15px] text-[#8e8e93]">Qty: 1</div>
            </div>
            <div className="flex flex-col py-2 px-4 border-b border-[#c6c6c8]/50 last:border-0 min-h-[44px] justify-center">
              <div className="flex justify-between items-center">
                <span className="text-[17px] font-medium">Semaglutide 5mg</span>
                <span className="text-[17px] text-[#8e8e93]">$58.00</span>
              </div>
              <div className="text-[15px] text-[#8e8e93]">Qty: 1</div>
            </div>
            <div className="flex flex-col py-2 px-4 border-b border-[#c6c6c8]/50 last:border-0 min-h-[44px] justify-center">
              <div className="flex justify-between items-center">
                <span className="text-[17px] font-medium">GHK-Cu 50mg</span>
                <span className="text-[17px] text-[#8e8e93]">$30.00</span>
              </div>
              <div className="text-[15px] text-[#8e8e93]">Qty: 1</div>
            </div>
          </div>
        </section>

        {/* Payment & Summary */}
        <section>
          <h2 className="px-4 pb-1.5 text-[13px] uppercase tracking-wider text-[#6e6e73]">Summary</h2>
          <div className="bg-white rounded-[10px] overflow-hidden">
            <div className="flex items-center justify-between px-4 min-h-[44px] border-b border-[#c6c6c8]/50 last:border-0">
              <span className="text-[17px]">Products</span>
              <span className="text-[17px]">$200.00</span>
            </div>
            <div className="flex items-center justify-between px-4 min-h-[44px] border-b border-[#c6c6c8]/50 last:border-0">
              <span className="text-[17px]">Shipping</span>
              <span className="text-[17px]">$18.00</span>
            </div>
            <div className="flex items-center justify-between px-4 min-h-[44px] border-b border-[#c6c6c8]/50 last:border-0">
              <span className="text-[17px]">Tip</span>
              <span className="text-[17px]">$10.00</span>
            </div>
            <div className="flex items-center justify-between px-4 min-h-[44px] border-b border-[#c6c6c8]/50 last:border-0 font-semibold">
              <span className="text-[17px]">Grand Total</span>
              <span className="text-[17px]">$228.00</span>
            </div>
            <div className="flex items-center justify-between px-4 min-h-[44px] border-b border-[#c6c6c8]/50 last:border-0">
              <span className="text-[17px]">Amount Due</span>
              <span className="text-[17px] text-[#8e8e93]">$0.00</span>
            </div>
            <div className="flex items-center justify-between px-4 min-h-[44px] border-b border-[#c6c6c8]/50 last:border-0">
              <span className="text-[17px]">Method</span>
              <span className="text-[17px] text-[#8e8e93]">Crypto (USDT)</span>
            </div>
          </div>
        </section>

        {/* Delivery Group */}
        <section>
          <h2 className="px-4 pb-1.5 text-[13px] uppercase tracking-wider text-[#6e6e73]">Delivery</h2>
          <div className="bg-white rounded-[10px] overflow-hidden">
            <div className="flex items-center justify-between px-4 min-h-[44px] border-b border-[#c6c6c8]/50 last:border-0">
              <span className="text-[17px]">Courier</span>
              <span className="text-[17px] text-[#8e8e93]">Express (DHL)</span>
            </div>
            <div className="flex flex-col py-2 px-4 border-b border-[#c6c6c8]/50 last:border-0 min-h-[44px] justify-center">
              <span className="text-[17px]">Ship To</span>
              <span className="text-[15px] text-[#8e8e93] mt-0.5 leading-snug">
                A. Rivera<br/>
                148 Harbour Lane<br/>
                Bristol BS1 4RN<br/>
                United Kingdom
              </span>
            </div>
            <button className="w-full flex items-center justify-between px-4 min-h-[44px] border-b border-[#c6c6c8]/50 last:border-0 active:bg-[#e5e5ea] transition-colors text-left">
              <span className="text-[17px]">Tracking Number</span>
              <div className="flex items-center gap-1">
                <span className="text-[17px] text-[#8e8e93]">•••• •••• 7741</span>
                <ChevronRight className="w-5 h-5 text-[#c6c6c8]" />
              </div>
            </button>
          </div>
        </section>

        {/* Actions Group */}
        <section className="pt-2">
          <div className="bg-white rounded-[10px] overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 min-h-[44px] border-b border-[#c6c6c8]/50 last:border-0 active:bg-[#e5e5ea] transition-colors text-left">
              <span className="text-[17px] text-[#007aff]">Save PDF Receipt</span>
            </button>
            <button className="w-full flex items-center justify-between px-4 min-h-[44px] border-b border-[#c6c6c8]/50 last:border-0 active:bg-[#e5e5ea] transition-colors text-left">
              <span className="text-[17px] text-[#007aff]">Edit Order</span>
            </button>
            <button className="w-full flex items-center justify-between px-4 min-h-[44px] border-b border-[#c6c6c8]/50 last:border-0 active:bg-[#e5e5ea] transition-colors text-left">
              <span className="text-[17px] text-[#007aff]">Place Another Order</span>
            </button>
          </div>
        </section>

        <section className="pt-2">
          <div className="bg-white rounded-[10px] overflow-hidden">
            <button className="w-full flex items-center justify-center px-4 min-h-[44px] active:bg-[#e5e5ea] transition-colors">
              <span className="text-[17px] text-[#ff3b30]">Cancel Order</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
