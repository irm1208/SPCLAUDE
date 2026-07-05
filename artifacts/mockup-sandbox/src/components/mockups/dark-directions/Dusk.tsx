import React from 'react';
import { ShoppingCart, FlaskConical, BookOpen, Microscope, Calculator, MessageSquare, ArrowRight, Activity, Beaker, ShieldCheck } from 'lucide-react';

export function Dusk() {
  return (
    <div className="min-h-screen bg-[#222336] text-[#F4F4F8] font-sans selection:bg-[#7b80ff]/30 selection:text-white flex overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
        
        .font-sans { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'Space Mono', monospace; }
        
        :root {
          --dusk-light: rgba(123, 128, 255, 0.15);
          --dusk-bright: rgba(150, 160, 255, 0.25);
        }

        .ambient-canvas {
          position: relative;
        }

        .ambient-pool-hero {
          position: absolute;
          top: -15vh;
          left: 50%;
          transform: translateX(-50%);
          width: 90vw;
          height: 90vh;
          background: radial-gradient(ellipse at 50% 10%, #36385a 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        .ambient-pool-products {
          position: absolute;
          top: 40vh;
          left: 10vw;
          width: 80vw;
          height: 80vh;
          background: radial-gradient(ellipse at 50% 50%, #2e304f 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .border-hairline {
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .panel-surface {
          background: rgba(43, 45, 68, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 4px 24px -10px rgba(0, 0, 0, 0.2);
        }

        .hover-lift {
          transition: transform 0.3s ease, background 0.3s ease, border-color 0.3s ease;
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          background: rgba(52, 54, 82, 0.8);
          border-color: rgba(123, 128, 255, 0.3);
        }
      `}} />

      {/* Sidebar - Precision Instrumentation but lighter/indigo */}
      <aside className="w-64 border-r border-white/10 flex flex-col justify-between p-6 bg-[#1e1f30]/80 backdrop-blur-xl z-20 shrink-0 shadow-[4px_0_24px_-10px_rgba(0,0,0,0.3)]">
        <div>
          {/* Brand */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-8 h-8 bg-[#f4f4f8] text-[#1e1f30] flex items-center justify-center font-mono font-bold text-sm tracking-tighter shadow-md">
              S&P
            </div>
            <span className="font-semibold tracking-wide text-sm uppercase text-white/90">Salt & Peps</span>
          </div>

          {/* Navigation */}
          <nav className="space-y-10">
            <div>
              <div className="font-mono text-[10px] uppercase text-[#a5a7c9] mb-4 tracking-widest flex items-center gap-2">
                <span className="w-2 h-[1px] bg-[#7b80ff]/50"></span> Shop
              </div>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-[#b8bad9] hover:text-white transition-colors group">
                    <ShoppingCart className="w-4 h-4 text-[#8a8dc4] group-hover:text-[#9ea3ff] transition-colors" />
                    Group Buy
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-[#b8bad9] hover:text-white transition-colors group">
                    <FlaskConical className="w-4 h-4 text-[#8a8dc4] group-hover:text-[#9ea3ff] transition-colors" />
                    Lonely Vial
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase text-[#a5a7c9] mb-4 tracking-widest flex items-center gap-2">
                <span className="w-2 h-[1px] bg-[#7b80ff]/50"></span> Research
              </div>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-[#b8bad9] hover:text-white transition-colors group">
                    <Activity className="w-4 h-4 text-[#8a8dc4] group-hover:text-[#9ea3ff] transition-colors" />
                    Protocols
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-[#b8bad9] hover:text-white transition-colors group">
                    <BookOpen className="w-4 h-4 text-[#8a8dc4] group-hover:text-[#9ea3ff] transition-colors" />
                    Learning Hub
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-[#b8bad9] hover:text-white transition-colors group">
                    <Microscope className="w-4 h-4 text-[#8a8dc4] group-hover:text-[#9ea3ff] transition-colors" />
                    Lab Tests
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase text-[#a5a7c9] mb-4 tracking-widest flex items-center gap-2">
                <span className="w-2 h-[1px] bg-[#7b80ff]/50"></span> Tools
              </div>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-[#b8bad9] hover:text-white transition-colors group">
                    <Calculator className="w-4 h-4 text-[#8a8dc4] group-hover:text-[#9ea3ff] transition-colors" />
                    Calculator
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-[#b8bad9] hover:text-white transition-colors group">
                    <MessageSquare className="w-4 h-4 text-[#8a8dc4] group-hover:text-[#9ea3ff] transition-colors" />
                    Feedback
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        {/* User Actions */}
        <div className="pt-6 border-t border-white/10">
          <div className="flex flex-col gap-3">
            <button className="text-sm font-medium text-[#a5a7c9] hover:text-white transition-colors text-left font-mono">
              [ LOGIN ]
            </button>
            <button className="text-sm font-medium text-[#c0c4ff] hover:text-white transition-colors text-left flex items-center gap-2 group font-mono">
              [ SIGN_UP ] <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative ambient-canvas h-screen bg-[#222336]">
        <div className="ambient-pool-hero" />
        <div className="ambient-pool-products" />
        
        {/* Very subtle noise/grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="max-w-5xl mx-auto px-12 py-24 relative z-10">
          
          {/* Hero Section */}
          <header className="mb-24">
            <div className="flex items-center gap-3 mb-8">
              <div className="font-mono text-[10px] text-[#9ea3ff] tracking-widest uppercase border border-[#7b80ff]/30 px-2 py-1 rounded-sm bg-[#7b80ff]/10">
                Sys_Init // Protocol 01
              </div>
              <div className="h-[1px] w-12 bg-[#7b80ff]/30"></div>
            </div>
            
            <h1 className="text-[4rem] font-light tracking-tight leading-[1.05] mb-6 text-white text-shadow-md">
              Precision synthesized.<br />
              <span className="text-white/60">Verified by science.</span>
            </h1>
            <p className="text-lg text-[#c8cae3] max-w-xl font-light mb-10 leading-relaxed">
              High-purity research compounds accessed via collective purchasing power. Transparent testing, strict quality controls.
            </p>
          </header>

          {/* Callout: Community Pools */}
          <section className="mb-24">
            <div className="border-hairline panel-surface p-8 flex items-center justify-between group hover:border-[#7b80ff]/50 transition-all relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#7b80ff]/60 group-hover:bg-[#9ea3ff] transition-colors"></div>
              
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full border border-[#7b80ff]/30 bg-[#7b80ff]/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#9ea3ff]" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#9ea3ff] animate-pulse shadow-[0_0_10px_rgba(158,163,255,0.8)]"></div>
                    <h2 className="text-lg font-medium text-white">Community Testing Pools</h2>
                  </div>
                  <p className="text-[#a5a7c9] text-sm font-light">Lab test peptides as a group — split the cost.</p>
                </div>
              </div>

              <button className="bg-[#f4f4f8] text-[#1e1f30] px-6 py-3 text-sm font-semibold hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all flex items-center gap-2 rounded-sm font-mono uppercase tracking-wide">
                View pools <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* Section: Single Vials */}
          <section>
            <div className="flex items-end justify-between mb-8 pb-4 border-b border-white/10">
              <div>
                <div className="font-mono text-[10px] text-[#a5a7c9] uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#4ade80] rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span> Inventory_Status: Online
                </div>
                <h2 className="text-2xl font-light text-white">Single vials — in stock now</h2>
              </div>
              <button className="text-sm text-[#a5a7c9] hover:text-white transition-colors flex items-center gap-2 font-mono group">
                [ BROWSE_ALL ] <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Product Card 1 */}
              <div className="border-hairline panel-surface hover-lift p-6 flex flex-col group relative overflow-hidden rounded-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#7b80ff]/10 blur-2xl group-hover:bg-[#7b80ff]/20 transition-colors"></div>
                <div className="flex justify-between items-start mb-10 relative z-10">
                  <Beaker className="w-5 h-5 text-[#8a8dc4] group-hover:text-[#9ea3ff] transition-colors" />
                  <div className="font-mono text-[10px] text-[#a5a7c9] text-right">
                    VOL: 10ml<br/>
                    QTY: 25x
                  </div>
                </div>
                <div className="mt-auto relative z-10">
                  <h3 className="text-sm font-medium mb-1 leading-snug text-white/90 group-hover:text-white transition-colors">25x Genetek Bac Water Ampoules</h3>
                  <div className="font-mono text-xs text-[#a5a7c9] mb-6">GTK-BAC-25</div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <span className="text-lg font-light text-white">£12.50</span>
                    <button className="font-mono text-[10px] uppercase border border-[#7b80ff]/30 text-[#c0c4ff] px-3 py-1.5 hover:bg-[#7b80ff]/20 hover:text-white transition-colors rounded-sm">
                      Add_Cart
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Card 2 */}
              <div className="border-hairline panel-surface hover-lift p-6 flex flex-col group relative overflow-hidden rounded-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#7b80ff]/10 blur-2xl group-hover:bg-[#7b80ff]/20 transition-colors"></div>
                <div className="flex justify-between items-start mb-10 relative z-10">
                  <Beaker className="w-5 h-5 text-[#8a8dc4] group-hover:text-[#9ea3ff] transition-colors" />
                  <div className="font-mono text-[10px] text-[#a5a7c9] text-right">
                    VOL: 10ml<br/>
                    QTY: 50x
                  </div>
                </div>
                <div className="mt-auto relative z-10">
                  <h3 className="text-sm font-medium mb-1 leading-snug text-white/90 group-hover:text-white transition-colors">50x Genetek Bac Water Ampoules</h3>
                  <div className="font-mono text-xs text-[#a5a7c9] mb-6">GTK-BAC-50</div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <span className="text-lg font-light text-white">£25.00</span>
                    <button className="font-mono text-[10px] uppercase border border-[#7b80ff]/30 text-[#c0c4ff] px-3 py-1.5 hover:bg-[#7b80ff]/20 hover:text-white transition-colors rounded-sm">
                      Add_Cart
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Card 3 */}
              <div className="border-hairline panel-surface hover-lift p-6 flex flex-col group relative overflow-hidden rounded-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#7b80ff]/10 blur-2xl group-hover:bg-[#7b80ff]/20 transition-colors"></div>
                <div className="flex justify-between items-start mb-10 relative z-10">
                  <Beaker className="w-5 h-5 text-[#8a8dc4] group-hover:text-[#9ea3ff] transition-colors" />
                  <div className="font-mono text-[10px] text-[#a5a7c9] text-right">
                    VOL: 10ml<br/>
                    QTY: 1x
                  </div>
                </div>
                <div className="mt-auto relative z-10">
                  <h3 className="text-sm font-medium mb-1 leading-snug text-white/90 group-hover:text-white transition-colors">Genetek BAC Water 10ml Ampoule</h3>
                  <div className="font-mono text-xs text-[#a5a7c9] mb-6">GTK-BAC-01</div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <span className="text-lg font-light text-white">£1.50</span>
                    <button className="font-mono text-[10px] uppercase border border-[#7b80ff]/30 text-[#c0c4ff] px-3 py-1.5 hover:bg-[#7b80ff]/20 hover:text-white transition-colors rounded-sm">
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
