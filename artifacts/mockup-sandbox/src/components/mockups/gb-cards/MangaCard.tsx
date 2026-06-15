import React from 'react';
import { Clock } from 'lucide-react';

export function MangaCard() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#1A1A2E' }}>
      {/* Card Container */}
      <div 
        className="relative w-full max-w-sm bg-white overflow-hidden font-sans"
        style={{ 
          border: '3px solid black',
          backgroundImage: 'radial-gradient(circle, #3B4DBF 1.5px, transparent 1.5px)',
          backgroundSize: '8px 8px',
          boxShadow: '8px 8px 0 rgba(0,0,0,1)'
        }}
      >
        {/* Top Caption Box */}
        <div className="absolute top-0 left-0 bg-[#FFE600] border-b-[3px] border-r-[3px] border-black px-3 py-1 z-30">
          <span className="font-black tracking-tighter uppercase text-sm" style={{ fontWeight: 900 }}>ACTION REQUIRED!</span>
        </div>

        {/* Speed Lines Header Section */}
        <div 
          className="relative pt-16 pb-10 flex items-center justify-center border-b-[3px] border-black overflow-hidden bg-white"
          style={{
            background: 'repeating-conic-gradient(from 0deg at 50% 50%, #ffffff 0deg 8deg, #e5e7eb 8deg 16deg)'
          }}
        >
          {/* Starburst Wrapper to handle stroke effect */}
          <div className="absolute top-3 right-3 z-20 w-[72px] h-[72px] transform rotate-12">
            <div 
              className="absolute inset-0 bg-black translate-x-[2px] translate-y-[2px]"
              style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}
            />
            <div 
              className="absolute inset-0 bg-black -translate-x-[2px] -translate-y-[2px]"
              style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}
            />
            <div 
              className="absolute inset-0 bg-black translate-x-[2px] -translate-y-[2px]"
              style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}
            />
            <div 
              className="absolute inset-0 bg-black -translate-x-[2px] translate-y-[2px]"
              style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}
            />
            <div 
              className="absolute inset-0 bg-[#FFE600] flex flex-col items-center justify-center"
              style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}
            >
              <span className="font-black text-[11px] leading-none mt-1">APR</span>
              <span className="font-black text-xl leading-none">22</span>
            </div>
          </div>

          {/* Title */}
          <h2 
            className="relative z-10 text-4xl leading-[0.85] font-black text-white text-center uppercase px-4 transform -skew-x-6"
            style={{ 
              textShadow: '3px 3px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 3px 0 0 #000, 0 3px 0 #000',
              fontFamily: 'Impact, "Arial Black", sans-serif'
            }}
          >
            UTHER<br/>APRIL<br/>GROUP BUY
          </h2>
        </div>

        {/* Content Area */}
        <div className="p-5 space-y-4">
          
          {/* Status Bubble */}
          <div className="flex justify-start -mt-9 relative z-20">
            <div className="bg-[#4ADE80] border-[3px] border-black px-4 py-1.5 font-black uppercase text-sm transform -rotate-3 shadow-[3px_3px_0_0_#000]">
              ACTIVE!
            </div>
          </div>

          {/* Narrator Box: Stats */}
          <div className="bg-white border-[3px] border-black p-3 shadow-[4px_4px_0_0_#000] relative">
            <div className="absolute top-0 right-0 w-4 h-4 border-l-[3px] border-b-[3px] border-black bg-[#FFE600] transform translate-x-[3px] -translate-y-[3px]" />
            <div className="space-y-1.5 text-xs font-bold uppercase">
              <div className="flex justify-between items-center border-b-2 border-dashed border-gray-300 pb-1">
                <span>Manufacturer: Uther</span>
                <span>[UK]</span>
              </div>
              <div className="flex justify-between items-center border-b-2 border-dashed border-gray-300 pb-1">
                <span>Organiser: Admin</span>
                <span>1 Product (USD)</span>
              </div>
              <div className="flex justify-between items-center text-red-600 pt-0.5">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4 stroke-[3]" /> CLOSES APR 22</span>
                <span className="bg-red-600 text-white px-2 py-0.5 transform -skew-x-6">8D LEFT</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button className="w-full bg-[#FFE600] border-[3px] border-black py-3 flex items-center justify-center font-black text-3xl italic uppercase transform hover:-translate-y-1 transition-transform shadow-[5px_5px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-[0_0_0_0_#000] mt-2">
            ORDER!!
          </button>

          {/* Narrator Box: Info */}
          <div className="bg-white border-[3px] border-black p-2 text-xs italic text-center font-bold">
            Order will be made for peptides in stock
          </div>
        </div>
      </div>
    </div>
  );
}
