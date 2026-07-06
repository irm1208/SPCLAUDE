import React from "react";
import { ArrowLeft, Printer, RotateCcw, Pencil, XSquare } from "lucide-react";

export function StatementReceipt() {
  return (
    <div className="min-h-[100dvh] bg-[#e8e6df] text-[#1a1a1a] p-4 flex justify-center font-mono selection:bg-[#1a1a1a] selection:text-[#e8e6df]">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        .font-receipt {
          font-family: 'Space Mono', monospace;
        }
        .leader-dots {
          flex-grow: 1;
          border-bottom: 2px dotted #1a1a1a;
          margin: 0 8px;
          position: relative;
          top: -6px;
        }
        .receipt-edge {
          background-image: radial-gradient(#e8e6df 4px, transparent 5px);
          background-size: 16px 16px;
          background-position: -8px -8px;
          height: 16px;
          width: 100%;
          position: absolute;
          left: 0;
        }
        .receipt-edge-top { top: -8px; }
        .receipt-edge-bottom { bottom: -8px; transform: rotate(180deg); }
      `}} />
      
      <div className="w-full max-w-[430px] font-receipt text-sm leading-relaxed flex flex-col gap-6 pt-4 pb-12">
        {/* Nav */}
        <button className="flex items-center gap-2 text-xs uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#e8e6df] self-start px-2 py-1 transition-colors border border-transparent hover:border-[#1a1a1a]">
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </button>

        {/* Receipt Body */}
        <div className="bg-[#f5f4f0] shadow-sm relative p-6 pt-10 pb-10 border border-[#d1cfc7]">
          {/* Jagged edges via css could be added, but simple border is cleaner and less gimmicky, let's keep it sharp and paper-like */}
          
          <div className="text-center mb-8 border-b-2 border-black pb-8">
            <h1 className="text-2xl font-bold tracking-[0.2em] uppercase mb-1">Salt & Peps</h1>
            <p className="text-xs uppercase tracking-widest text-neutral-600">Peptide Dispensary</p>
            <div className="mt-6 flex flex-col items-center gap-1 text-xs">
              <p>Statement of Account</p>
              <p>Customer Copy</p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Identity */}
            <section className="space-y-1">
              <div className="flex justify-between">
                <span className="uppercase text-neutral-500">Order No.</span>
                <span className="font-bold">SP-7K42</span>
              </div>
              <div className="flex justify-between">
                <span className="uppercase text-neutral-500">Date</span>
                <span>02 JUL 2026</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="uppercase text-neutral-500">Status</span>
                <span className="border-2 border-black px-2 py-0.5 font-bold uppercase tracking-widest transform -rotate-2">
                  Shipped
                </span>
              </div>
            </section>

            <div className="border-t border-dashed border-black/40"></div>

            {/* Tracking Progress */}
            <section className="space-y-3">
              <span className="uppercase text-neutral-500 block">Fulfillment Journey</span>
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-4 text-center">[X]</span>
                  <span className="line-through text-neutral-500">Ordered</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-4 text-center">[X]</span>
                  <span className="line-through text-neutral-500">Paid</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-4 text-center">[X]</span>
                  <span className="line-through text-neutral-500">Packed</span>
                </div>
                <div className="flex items-center gap-3 font-bold text-base">
                  <span className="w-4 text-center">[-]</span>
                  <span className="uppercase underline decoration-2 underline-offset-4">Shipped</span>
                </div>
                <div className="flex items-center gap-3 text-neutral-400">
                  <span className="w-4 text-center">[ ]</span>
                  <span>Delivered</span>
                </div>
              </div>
            </section>

            <div className="border-t border-dashed border-black/40"></div>

            {/* Items */}
            <section>
              <span className="uppercase text-neutral-500 block mb-4">Itemized Charges</span>
              <div className="space-y-2">
                <div className="flex items-end">
                  <div className="whitespace-nowrap">BPC-157 5mg &times;2</div>
                  <div className="leader-dots"></div>
                  <div>$70.00</div>
                </div>
                <div className="flex items-end">
                  <div className="whitespace-nowrap">TB-500 5mg &times;1</div>
                  <div className="leader-dots"></div>
                  <div>$42.00</div>
                </div>
                <div className="flex items-end">
                  <div className="whitespace-nowrap">Semaglutide 5mg &times;1</div>
                  <div className="leader-dots"></div>
                  <div>$58.00</div>
                </div>
                <div className="flex items-end">
                  <div className="whitespace-nowrap">GHK-Cu 50mg &times;1</div>
                  <div className="leader-dots"></div>
                  <div>$30.00</div>
                </div>
              </div>
            </section>

            {/* Summary */}
            <section className="border-t-2 border-black pt-4">
              <div className="space-y-1">
                <div className="flex items-end text-neutral-600">
                  <div>Products</div>
                  <div className="leader-dots"></div>
                  <div>$200.00</div>
                </div>
                <div className="flex items-end text-neutral-600">
                  <div>Shipping</div>
                  <div className="leader-dots"></div>
                  <div>$18.00</div>
                </div>
                <div className="flex items-end text-neutral-600">
                  <div>Tip</div>
                  <div className="leader-dots"></div>
                  <div>$10.00</div>
                </div>
                <div className="flex items-end font-bold text-base mt-2 pt-2">
                  <div className="uppercase tracking-wider">Grand Total</div>
                  <div className="leader-dots"></div>
                  <div>$228.00</div>
                </div>
                <div className="flex items-end font-bold text-lg pt-4">
                  <div className="uppercase tracking-wider">Amount Due</div>
                  <div className="leader-dots"></div>
                  <div>$0.00</div>
                </div>
              </div>
            </section>

            <div className="relative flex justify-center py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dashed border-black/40"></div>
              </div>
              <div className="relative bg-[#f5f4f0] px-4 font-bold text-3xl text-black border-4 border-black p-1 transform rotate-[-5deg] opacity-80 mix-blend-multiply">
                PAID IN FULL
              </div>
            </div>

            {/* Meta */}
            <section className="space-y-4 text-xs">
              <div>
                <span className="uppercase text-neutral-500 block mb-1">Payment Method</span>
                <p>Crypto (USDT) &mdash; CONFIRMED</p>
              </div>
              
              <div>
                <span className="uppercase text-neutral-500 block mb-1">Delivery Method</span>
                <p>Express Courier (DHL)</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="uppercase text-neutral-500">TRK:</span>
                  <span className="bg-black text-[#f5f4f0] px-2 py-0.5">•••• •••• 7741</span>
                </div>
              </div>

              <div>
                <span className="uppercase text-neutral-500 block mb-1">Ship To</span>
                <p className="leading-tight uppercase">
                  A. Rivera<br/>
                  148 Harbour Lane<br/>
                  Bristol BS1 4RN<br/>
                  United Kingdom
                </p>
              </div>
            </section>

          </div>
          
          {/* Footer Barcode decoration */}
          <div className="mt-12 flex flex-col items-center border-t-2 border-black pt-4">
            <div className="h-12 w-full max-w-[240px] flex items-stretch gap-[2px] opacity-70">
              {/* Fake barcode lines */}
              {[...Array(40)].map((_, i) => (
                <div key={i} className="bg-black h-full" style={{ width: `${((i * 7) % 4) + 1}px` }}></div>
              ))}
            </div>
            <span className="text-[10px] tracking-[0.3em] mt-2">THK-U-SP-7K42</span>
          </div>
        </div>

        {/* Actions - Placed outside the receipt to act as terminal/desk controls */}
        <div className="flex flex-col gap-3 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center justify-center gap-2 bg-[#1a1a1a] text-[#e8e6df] p-4 border-2 border-[#1a1a1a] hover:bg-[#e8e6df] hover:text-[#1a1a1a] transition-colors group">
              <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-xs uppercase tracking-wider font-bold">Save PDF</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 bg-transparent text-[#1a1a1a] p-4 border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#e8e6df] transition-colors group">
              <RotateCcw className="w-5 h-5 group-hover:-rotate-90 transition-transform duration-300" />
              <span className="text-xs uppercase tracking-wider font-bold text-center">Order<br/>Again</span>
            </button>
          </div>
          
          <button className="flex items-center justify-center gap-2 bg-transparent text-[#1a1a1a] p-3 border-2 border-dashed border-[#1a1a1a] hover:border-solid hover:bg-neutral-200 transition-colors">
            <Pencil className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-bold">Edit Order</span>
          </button>
          
          <button className="flex items-center justify-center gap-2 text-neutral-500 hover:text-red-700 p-3 mt-4 transition-colors">
            <XSquare className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider underline underline-offset-4 decoration-dashed">Cancel Order</span>
          </button>
        </div>
      </div>
    </div>
  );
}
