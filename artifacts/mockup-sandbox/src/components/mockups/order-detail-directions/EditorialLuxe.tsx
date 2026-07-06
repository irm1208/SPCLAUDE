import React from "react";
import { ArrowLeft, Check, Download, FileText, Package, RefreshCw, X } from "lucide-react";

export function EditorialLuxe() {
  return (
    <div 
      className="min-h-screen w-full font-sans antialiased text-[#1c1a17] selection:bg-[#1a3324] selection:text-[#f7f4ed]"
      style={{ 
        backgroundColor: "#f7f4ed",
        fontFamily: "'DM Sans', sans-serif" 
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap');
        
        .font-serif {
          font-family: 'Playfair Display', serif;
        }
      `}} />

      <div className="max-w-[460px] mx-auto w-full px-6 py-10">
        
        {/* Header / Nav */}
        <button className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#6c665e] hover:text-[#1c1a17] transition-colors mb-12">
          <ArrowLeft className="w-3 h-3" />
          <span>Return to Orders</span>
        </button>

        {/* Identity */}
        <header className="mb-14">
          <div className="flex justify-between items-baseline mb-4">
            <h1 className="font-serif text-4xl tracking-tight">Order SP-7K42</h1>
            <span className="text-xs uppercase tracking-widest text-[#1a3324]">Paid</span>
          </div>
          <p className="text-sm text-[#6c665e] tracking-wide">Placed on 2 Jul 2026</p>
        </header>

        {/* Progress */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-serif text-2xl italic text-[#1a3324]">Shipped</h2>
            <span className="text-xs font-medium tracking-widest">75% Complete</span>
          </div>
          
          <div className="relative w-full h-[1px] bg-[#dfd9ce] mb-8">
            <div className="absolute top-0 left-0 h-full bg-[#1a3324] transition-all duration-1000 ease-in-out" style={{ width: '75%' }}></div>
            
            {/* Dots */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 flex justify-between w-full px-[1px]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1a3324]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#1a3324]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#1a3324]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#1a3324]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#dfd9ce]" />
            </div>
          </div>
          
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-[#6c665e]">
            <span className="text-[#1a3324]">Ordered</span>
            <span className="text-[#1a3324]">Paid</span>
            <span className="text-[#1a3324]">Packed</span>
            <span className="text-[#1a3324]">Shipped</span>
            <span>Delivered</span>
          </div>
        </section>

        <hr className="border-t border-[#dfd9ce] mb-12" />

        {/* Items */}
        <section className="mb-12">
          <h3 className="text-xs uppercase tracking-widest text-[#6c665e] mb-6">Apothecary</h3>
          
          <ul className="space-y-4">
            {[
              { name: "BPC-157", dose: "5mg", qty: 2, price: "70.00" },
              { name: "TB-500", dose: "5mg", qty: 1, price: "42.00" },
              { name: "Semaglutide", dose: "5mg", qty: 1, price: "58.00" },
              { name: "GHK-Cu", dose: "50mg", qty: 1, price: "30.00" },
            ].map((item, i) => (
              <li key={i} className="flex justify-between items-baseline group cursor-default">
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-lg text-[#1c1a17]">{item.name}</span>
                  <span className="text-xs text-[#6c665e]">{item.dose}</span>
                </div>
                <div className="flex items-baseline gap-4">
                  <span className="text-xs text-[#6c665e]">×{item.qty}</span>
                  <span className="font-serif text-lg text-[#1a3324] w-16 text-right">${item.price}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <hr className="border-t border-[#dfd9ce] mb-8" />

        {/* Summary */}
        <section className="mb-14">
          <div className="space-y-3 mb-6 text-sm">
            <div className="flex justify-between text-[#6c665e]">
              <span>Products</span>
              <span className="font-serif text-base text-[#1c1a17]">$200.00</span>
            </div>
            <div className="flex justify-between text-[#6c665e]">
              <span>Shipping</span>
              <span className="font-serif text-base text-[#1c1a17]">$18.00</span>
            </div>
            <div className="flex justify-between text-[#6c665e]">
              <span>Gratuity</span>
              <span className="font-serif text-base text-[#1c1a17]">$10.00</span>
            </div>
          </div>
          
          <div className="flex justify-between items-baseline pt-4 border-t border-[#dfd9ce]">
            <span className="text-xs uppercase tracking-widest text-[#1c1a17]">Grand Total</span>
            <span className="font-serif text-3xl text-[#1a3324]">${"228.00"}</span>
          </div>
          <div className="flex justify-between items-baseline pt-2">
            <span className="text-xs text-[#6c665e]">Amount Due</span>
            <span className="font-serif text-xl text-[#6c665e]">$0.00</span>
          </div>
        </section>

        {/* Logistics & Payment */}
        <section className="grid grid-cols-2 gap-8 mb-16">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-[#6c665e] mb-4">Payment</h3>
            <p className="font-serif text-lg mb-1">USDT Crypto</p>
            <p className="text-xs text-[#1a3324] flex items-center gap-1">
              <Check className="w-3 h-3" /> Confirmed
            </p>
          </div>
          
          <div>
            <h3 className="text-xs uppercase tracking-widest text-[#6c665e] mb-4">Tracking</h3>
            <p className="font-serif text-lg mb-1">Express DHL</p>
            <p className="text-xs tracking-wider text-[#6c665e] font-mono">•••• •••• 7741</p>
          </div>

          <div className="col-span-2 mt-2">
            <h3 className="text-xs uppercase tracking-widest text-[#6c665e] mb-4">Shipping Destination</h3>
            <address className="not-italic text-sm leading-relaxed text-[#1c1a17]">
              <span className="font-serif text-lg block mb-1">A. Rivera</span>
              148 Harbour Lane<br />
              Bristol BS1 4RN<br />
              United Kingdom
            </address>
          </div>
        </section>

        {/* Actions */}
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button className="h-12 border border-[#dfd9ce] flex items-center justify-center gap-2 text-xs uppercase tracking-widest hover:border-[#1a3324] hover:text-[#1a3324] transition-colors">
              <RefreshCw className="w-3 h-3" />
              <span>Order Again</span>
            </button>
            <button className="h-12 border border-[#dfd9ce] flex items-center justify-center gap-2 text-xs uppercase tracking-widest hover:border-[#1a3324] hover:text-[#1a3324] transition-colors">
              <FileText className="w-3 h-3" />
              <span>Edit Order</span>
            </button>
          </div>
          
          <button className="w-full h-12 bg-[#1a3324] text-[#f7f4ed] flex items-center justify-center gap-2 text-xs uppercase tracking-widest hover:bg-[#112419] transition-colors">
            <Download className="w-3 h-3" />
            <span>Save Invoice PDF</span>
          </button>
          
          <div className="pt-8 flex justify-center">
            <button className="text-[10px] uppercase tracking-widest text-[#a8a196] hover:text-red-900 transition-colors flex items-center gap-1">
              <X className="w-3 h-3" />
              <span>Cancel Order</span>
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
