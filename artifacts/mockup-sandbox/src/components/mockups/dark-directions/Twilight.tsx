import React from 'react';
import { ShoppingCart, FlaskConical, BookOpen, Microscope, Calculator, MessageSquare, ArrowRight, Activity, Beaker, ShieldCheck } from 'lucide-react';

export function Twilight() {
  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#1E1E24] font-sans selection:bg-[#1E1E24] selection:text-white flex overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
        
        .font-sans { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'Space Mono', monospace; }
        
        .border-hairline-dark {
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .border-hairline-light {
          border: 1px solid rgba(0, 0, 0, 0.08);
        }
        
        .glass-panel-light {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
      `}} />

      {/* Sidebar - Rich Dark Chrome */}
      <aside className="w-64 bg-[#111216] border-r border-white/5 flex flex-col justify-between p-6 shrink-0 relative z-20">
        <div>
          {/* Brand */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-mono font-bold text-sm tracking-tighter">
              S&P
            </div>
            <span className="font-semibold tracking-wide text-sm uppercase text-white">Salt & Peps</span>
          </div>

          {/* Navigation */}
          <nav className="space-y-10">
            <div>
              <div className="font-mono text-[10px] uppercase text-white/40 mb-4 tracking-widest flex items-center gap-2">
                <span className="w-2 h-[1px] bg-white/20"></span> Shop
              </div>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors group">
                    <ShoppingCart className="w-4 h-4 text-white/30 group-hover:text-white/80 transition-colors" />
                    Group Buy
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors group">
                    <FlaskConical className="w-4 h-4 text-white/30 group-hover:text-white/80 transition-colors" />
                    Lonely Vial
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase text-white/40 mb-4 tracking-widest flex items-center gap-2">
                <span className="w-2 h-[1px] bg-white/20"></span> Research
              </div>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors group">
                    <Activity className="w-4 h-4 text-white/30 group-hover:text-white/80 transition-colors" />
                    Protocols
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors group">
                    <BookOpen className="w-4 h-4 text-white/30 group-hover:text-white/80 transition-colors" />
                    Learning Hub
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors group">
                    <Microscope className="w-4 h-4 text-white/30 group-hover:text-white/80 transition-colors" />
                    Lab Tests
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase text-white/40 mb-4 tracking-widest flex items-center gap-2">
                <span className="w-2 h-[1px] bg-white/20"></span> Tools
              </div>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors group">
                    <Calculator className="w-4 h-4 text-white/30 group-hover:text-white/80 transition-colors" />
                    Calculator
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors group">
                    <MessageSquare className="w-4 h-4 text-white/30 group-hover:text-white/80 transition-colors" />
                    Feedback
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        {/* User Actions */}
        <div className="pt-6 border-t border-white/5">
          <div className="flex flex-col gap-3">
            <button className="text-sm font-medium text-white/50 hover:text-white transition-colors text-left font-mono">
              [ LOGIN ]
            </button>
            <button className="text-sm font-medium text-white/80 hover:text-white transition-colors text-left flex items-center gap-2 group font-mono">
              [ SIGN_UP ] <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative h-screen">
        
        {/* Dark Hero Band */}
        <div className="bg-[#111216] pt-24 pb-40 px-12 relative overflow-hidden">
          {/* Subtle noise/texture in the dark hero */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }}></div>
          
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="font-mono text-[10px] text-white/50 tracking-widest uppercase border border-white/10 px-2 py-1 rounded-sm bg-white/5">
                Sys_Init // Protocol 01
              </div>
              <div className="h-[1px] w-12 bg-white/20"></div>
            </div>
            
            <h1 className="text-6xl font-light tracking-tight leading-[1.05] mb-6 text-white text-shadow-sm">
              Precision synthesized.<br />
              <span className="text-white/40">Verified by science.</span>
            </h1>
            <p className="text-lg text-white/50 max-w-xl font-light leading-relaxed">
              High-purity research compounds accessed via collective purchasing power. Transparent testing, strict quality controls.
            </p>
          </div>
        </div>

        {/* Light Content Overlapping Hero */}
        <div className="px-12 -mt-20 relative z-10 max-w-5xl mx-auto pb-24">
          
          {/* Callout: Community Pools */}
          <section className="mb-16">
            <div className="border-hairline-light bg-white p-8 flex items-center justify-between group hover:border-black/20 transition-all relative overflow-hidden shadow-sm hover:shadow-md">
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#1E1E24]/20 group-hover:bg-[#1E1E24] transition-colors"></div>
              
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full border border-black/5 bg-black/[0.02] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#1E1E24]" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                    <h2 className="text-lg font-medium text-[#1E1E24]">Community Testing Pools</h2>
                  </div>
                  <p className="text-[#1E1E24]/60 text-sm font-light">Lab test peptides as a group — split the cost.</p>
                </div>
              </div>

              <button className="bg-[#111216] text-white px-6 py-3 text-sm font-medium hover:bg-black transition-all flex items-center gap-2 rounded-sm font-mono uppercase tracking-wide">
                View pools <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* Section: Single Vials */}
          <section>
            <div className="flex items-end justify-between mb-8 pb-4 border-b border-black/10">
              <div>
                <div className="font-mono text-[10px] text-black/40 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500/80 rounded-full"></span> Inventory_Status: Online
                </div>
                <h2 className="text-2xl font-medium tracking-tight text-[#1E1E24]">Single vials — in stock now</h2>
              </div>
              <button className="text-sm text-black/50 hover:text-black transition-colors flex items-center gap-2 font-mono group">
                [ BROWSE_ALL ] <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Product Card 1 */}
              <div className="border-hairline-light bg-white hover:bg-[#FAF9F6] transition-colors p-6 flex flex-col group relative overflow-hidden shadow-sm hover:shadow-md">
                <div className="flex justify-between items-start mb-10 relative z-10">
                  <Beaker className="w-5 h-5 text-black/20 group-hover:text-black/60 transition-colors" />
                  <div className="font-mono text-[10px] text-black/40 text-right">
                    VOL: 10ml<br/>
                    QTY: 25x
                  </div>
                </div>
                <div className="mt-auto relative z-10">
                  <h3 className="text-sm font-medium mb-1 leading-snug text-[#1E1E24]">25x Genetek Bac Water Ampoules</h3>
                  <div className="font-mono text-xs text-black/40 mb-6">GTK-BAC-25</div>
                  <div className="flex items-center justify-between pt-4 border-t border-black/5">
                    <span className="text-lg font-medium text-[#1E1E24]">£12.50</span>
                    <button className="font-mono text-[10px] uppercase border border-black/10 px-3 py-1.5 hover:bg-[#111216] hover:text-white transition-colors rounded-sm">
                      Add_Cart
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Card 2 */}
              <div className="border-hairline-light bg-white hover:bg-[#FAF9F6] transition-colors p-6 flex flex-col group relative overflow-hidden shadow-sm hover:shadow-md">
                <div className="flex justify-between items-start mb-10 relative z-10">
                  <Beaker className="w-5 h-5 text-black/20 group-hover:text-black/60 transition-colors" />
                  <div className="font-mono text-[10px] text-black/40 text-right">
                    VOL: 10ml<br/>
                    QTY: 50x
                  </div>
                </div>
                <div className="mt-auto relative z-10">
                  <h3 className="text-sm font-medium mb-1 leading-snug text-[#1E1E24]">50x Genetek Bac Water Ampoules</h3>
                  <div className="font-mono text-xs text-black/40 mb-6">GTK-BAC-50</div>
                  <div className="flex items-center justify-between pt-4 border-t border-black/5">
                    <span className="text-lg font-medium text-[#1E1E24]">£25.00</span>
                    <button className="font-mono text-[10px] uppercase border border-black/10 px-3 py-1.5 hover:bg-[#111216] hover:text-white transition-colors rounded-sm">
                      Add_Cart
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Card 3 */}
              <div className="border-hairline-light bg-white hover:bg-[#FAF9F6] transition-colors p-6 flex flex-col group relative overflow-hidden shadow-sm hover:shadow-md">
                <div className="flex justify-between items-start mb-10 relative z-10">
                  <Beaker className="w-5 h-5 text-black/20 group-hover:text-black/60 transition-colors" />
                  <div className="font-mono text-[10px] text-black/40 text-right">
                    VOL: 10ml<br/>
                    QTY: 1x
                  </div>
                </div>
                <div className="mt-auto relative z-10">
                  <h3 className="text-sm font-medium mb-1 leading-snug text-[#1E1E24]">Genetek BAC Water 10ml Ampoule</h3>
                  <div className="font-mono text-xs text-black/40 mb-6">GTK-BAC-01</div>
                  <div className="flex items-center justify-between pt-4 border-t border-black/5">
                    <span className="text-lg font-medium text-[#1E1E24]">£1.50</span>
                    <button className="font-mono text-[10px] uppercase border border-black/10 px-3 py-1.5 hover:bg-[#111216] hover:text-white transition-colors rounded-sm">
                      Add_Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
