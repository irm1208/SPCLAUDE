import React from "react";

export function RadicalReduction() {
  return (
    <div className="w-[820px] min-h-screen bg-[#0D1117] text-white flex flex-col justify-between p-12 font-sans overflow-hidden relative mx-auto selection:bg-[#9B6AF0] selection:text-white">
      {/* Decorative subtle gradient or noise could go here, but prompt asks for almost nothing. */}
      
      {/* Top subtle border/indicator */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-[#333] to-transparent opacity-50"></div>

      {/* Header / Top Spacing */}
      <div className="w-full flex justify-between items-start opacity-0 animate-in fade-in duration-1000 fill-mode-forwards">
         {/* Could put a subtle indicator here, but let's keep it empty to force center focus */}
      </div>

      {/* Main Center Content */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
        
        {/* Brand Mark */}
        <div className="flex flex-col items-center mb-24 animate-in slide-in-from-bottom-4 fade-in duration-1000 fill-mode-forwards" style={{ animationDelay: "200ms" }}>
          <div className="w-10 h-10 rounded-sm bg-[#161B22] border border-[#222] flex items-center justify-center mb-6 group hover:bg-[#9B6AF0] hover:border-[#9B6AF0] transition-colors duration-700 cursor-default">
            <span className="font-mono text-sm text-[#666] group-hover:text-white transition-colors duration-700">S&amp;P</span>
          </div>
          <h1 className="text-[10px] tracking-[0.4em] uppercase text-[#555] font-light">Peps Anonymous</h1>
        </div>

        {/* Number Grid */}
        <div className="grid grid-cols-2 gap-x-40 gap-y-20 text-center mb-24 w-full px-12">
          
          <div className="flex flex-col items-center justify-center animate-in slide-in-from-bottom-4 fade-in duration-1000 fill-mode-forwards" style={{ animationDelay: "400ms" }}>
            <span className="text-7xl font-mono tracking-tighter text-[#EAEAEA] font-light leading-none mb-4">52</span>
            <span className="text-[10px] text-[#555] uppercase tracking-widest">vials in stock</span>
          </div>

          <div className="flex flex-col items-center justify-center animate-in slide-in-from-bottom-4 fade-in duration-1000 fill-mode-forwards" style={{ animationDelay: "500ms" }}>
            <span className="text-7xl font-mono tracking-tighter text-[#EAEAEA] font-light leading-none mb-4">352</span>
            <span className="text-[10px] text-[#555] uppercase tracking-widest">lab reports</span>
          </div>

          <div className="flex flex-col items-center justify-center animate-in slide-in-from-bottom-4 fade-in duration-1000 fill-mode-forwards" style={{ animationDelay: "600ms" }}>
            <span className="text-7xl font-mono tracking-tighter text-[#EAEAEA] font-light leading-none mb-4">30+</span>
            <span className="text-[10px] text-[#555] uppercase tracking-widest">peptides</span>
          </div>

          <div className="flex flex-col items-center justify-center animate-in slide-in-from-bottom-4 fade-in duration-1000 fill-mode-forwards" style={{ animationDelay: "700ms" }}>
            <span className="text-7xl font-mono tracking-tighter text-[#EAEAEA] font-light leading-none mb-4">0</span>
            <span className="text-[10px] text-[#555] uppercase tracking-widest">failed tests</span>
          </div>

        </div>

        {/* CTA Area */}
        <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 fade-in duration-1000 fill-mode-forwards" style={{ animationDelay: "900ms" }}>
          <button className="px-10 py-3 border border-[#333] text-xs tracking-widest text-[#777] uppercase hover:border-[#9B6AF0] hover:text-white hover:bg-[#9B6AF0]/5 transition-all duration-500 rounded-sm mb-12">
            Enter
          </button>

          {/* Trust Chips - Text Only */}
          <div className="text-[10px] text-[#444] font-mono tracking-wider flex items-center gap-3">
            <span>JANOSHIK TESTED</span>
            <span className="text-[#333]">&middot;</span>
            <span>BAC SAFE</span>
            <span className="text-[#333]">&middot;</span>
            <span>USDT</span>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full flex justify-between items-end text-[10px] text-[#333] font-mono uppercase tracking-widest opacity-0 animate-in fade-in duration-1000 fill-mode-forwards" style={{ animationDelay: "1200ms" }}>
        <div>@urbanblend789</div>
        <div className="text-right hover:text-[#555] transition-colors cursor-pointer">Member access</div>
      </footer>
    </div>
  );
}
