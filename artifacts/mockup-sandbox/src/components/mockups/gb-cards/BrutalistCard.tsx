import React from 'react';

export function BrutalistCard() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6 selection:bg-black selection:text-white"
      style={{ backgroundColor: '#FF3B00' }}
    >
      <div 
        className="w-full max-w-[400px] bg-white relative flex flex-col"
        style={{
          border: '3px solid black',
          boxShadow: '12px 12px 0px 0px black'
        }}
      >
        {/* Header Name */}
        <div className="p-4 overflow-visible relative border-b-[3px] border-black">
          <h2 
            className="text-[40px] leading-[0.9] font-black uppercase tracking-tighter"
            style={{ 
              fontFamily: 'Impact, sans-serif',
              transform: 'scaleX(1.1)',
              transformOrigin: 'left center',
              width: '110%'
            }}
          >
            Uther April<br/>Group Buy
          </h2>
        </div>

        {/* Status Band */}
        <div className="bg-black text-white py-3 px-4 border-b-[3px] border-black font-mono font-bold text-center tracking-[0.25em] text-[15px]">
          STATUS: ACTIVE
        </div>

        {/* Data Grid */}
        <div className="grid grid-cols-2 bg-black gap-[3px] border-b-[3px] border-black p-[3px]">
          <div className="bg-white p-2" style={{ border: '1px solid black' }}>
            <div className="font-bold text-[11px] uppercase tracking-wider">Manufacturer</div>
            <div className="text-[15px]">Uther</div>
          </div>
          <div className="bg-white p-2" style={{ border: '1px solid black' }}>
            <div className="font-bold text-[11px] uppercase tracking-wider">Country</div>
            <div className="text-[15px]">UK</div>
          </div>
          <div className="bg-white p-2" style={{ border: '1px solid black' }}>
            <div className="font-bold text-[11px] uppercase tracking-wider">Organiser</div>
            <div className="text-[15px]">Admin</div>
          </div>
          <div className="bg-white p-2" style={{ border: '1px solid black' }}>
            <div className="font-bold text-[11px] uppercase tracking-wider">Products</div>
            <div className="text-[15px]">1 (USD)</div>
          </div>
        </div>

        {/* Close Date */}
        <div className="p-8 border-b-[3px] border-black flex flex-col items-center justify-center bg-white relative">
          <div 
            className="absolute inset-0 opacity-[0.05] pointer-events-none" 
            style={{ backgroundImage: 'linear-gradient(black 1px, transparent 1px), linear-gradient(90deg, black 1px, transparent 1px)', backgroundSize: '15px 15px' }}
          ></div>
          <div className="text-[64px] font-black leading-none uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>
            APR 22
          </div>
          <div className="text-[16px] font-black mt-3 bg-black text-white px-4 py-1 uppercase tracking-widest">
            8D LEFT
          </div>
        </div>

        {/* Info text */}
        <div className="p-4 border-b-[3px] border-black font-serif italic text-[16px] text-center leading-snug bg-white">
          "Order will be made for peptides in stock"
        </div>

        {/* CTA Container */}
        <div className="p-6 bg-white">
          <button 
            className="w-full bg-black text-white font-black text-[28px] py-4 uppercase tracking-widest hover:bg-[#FF3B00] hover:text-black active:translate-x-1 active:translate-y-1 transition-none"
            style={{
              border: '3px solid black',
              boxShadow: '6px 6px 0px 0px black'
            }}
          >
            ORDER NOW
          </button>
        </div>
      </div>
    </div>
  );
}
