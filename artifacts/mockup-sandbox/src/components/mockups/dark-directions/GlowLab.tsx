import React from 'react';
import { ShoppingCart, FlaskConical, BookOpen, Microscope, Calculator, MessageSquare, ArrowRight, Activity, Beaker, ShieldCheck } from 'lucide-react';

export function GlowLab() {
  return (
    <div className="min-h-screen bg-[#030305] text-[#EDEDED] font-sans selection:bg-[#8C96FF]/30 selection:text-white flex overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap');
        
        .font-sans { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'Space Mono', monospace; }
        
        :root {
          --glow-indigo: rgba(140, 150, 255, 0.15);
          --glow-cyan: rgba(100, 255, 200, 0.08);
        }

        .ambient-canvas {
          position: relative;
        }

        .ambient-glow-hero {
          position: absolute;
          top: -20vh;
          left: 50%;
          transform: translateX(-50%);
          width: 80vw;
          height: 80vh;
          background: radial-gradient(circle at 50% 0%, var(--glow-indigo) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .ambient-glow-cta {
          box-shadow: 0 0 50px -10px rgba(140, 150, 255, 0.25);
        }

        .border-hairline {
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        
        .glass-panel {
          background: rgba(255, 255, 255, 0.01);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
      `}} />

      {/* Sidebar - Precision Instrumentation + Indigo depth */}
      <aside className="w-64 border-r border-white/5 flex flex-col justify-between p-6 bg-[#030305]/80 backdrop-blur-xl z-20 shrink-0">
        <div>
          {/* Brand */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-mono font-bold text-sm tracking-tighter shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              S&P
            </div>
            <span className="font-semibold tracking-wide text-sm uppercase">Salt & Peps</span>
          </div>

          {/* Navigation */}
          <nav className="space-y-10">
            <div>
              <div className="font-mono text-[10px] uppercase text-indigo-300/40 mb-4 tracking-widest flex items-center gap-2">
                <span className="w-2 h-[1px] bg-indigo-500/30"></span> Shop
              </div>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors group">
                    <ShoppingCart className="w-4 h-4 text-white/30 group-hover:text-indigo-400 transition-colors" />
                    Group Buy
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors group">
                    <FlaskConical className="w-4 h-4 text-white/30 group-hover:text-indigo-400 transition-colors" />
                    Lonely Vial
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase text-indigo-300/40 mb-4 tracking-widest flex items-center gap-2">
                <span className="w-2 h-[1px] bg-indigo-500/30"></span> Research
              </div>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors group">
                    <Activity className="w-4 h-4 text-white/30 group-hover:text-indigo-400 transition-colors" />
                    Protocols
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors group">
                    <BookOpen className="w-4 h-4 text-white/30 group-hover:text-indigo-400 transition-colors" />
                    Learning Hub
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors group">
                    <Microscope className="w-4 h-4 text-white/30 group-hover:text-indigo-400 transition-colors" />
                    Lab Tests
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase text-indigo-300/40 mb-4 tracking-widest flex items-center gap-2">
                <span className="w-2 h-[1px] bg-indigo-500/30"></span> Tools
              </div>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors group">
                    <Calculator className="w-4 h-4 text-white/30 group-hover:text-indigo-400 transition-colors" />
                    Calculator
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors group">
                    <MessageSquare className="w-4 h-4 text-white/30 group-hover:text-indigo-400 transition-colors" />
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
            <button className="text-sm font-medium text-indigo-200 hover:text-white transition-colors text-left flex items-center gap-2 group font-mono">
              [ SIGN_UP ] <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative ambient-canvas h-screen">
        <div className="ambient-glow-hero" />
        
        {/* Subtle grid background over indigo depth */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="max-w-5xl mx-auto px-12 py-24 relative z-10">
          
          {/* Hero Section */}
          <header className="mb-28">
            <div className="flex items-center gap-3 mb-8">
              <div className="font-mono text-[10px] text-indigo-400 tracking-widest uppercase border border-indigo-500/20 px-2 py-1 rounded-sm bg-indigo-500/5">
                Sys_Init // Protocol 01
              </div>
              <div className="h-[1px] w-12 bg-indigo-500/20"></div>
            </div>
            
            <h1 className="text-6xl font-light tracking-tight leading-[1.05] mb-6 text-white text-shadow-sm">
              Precision synthesized.<br />
              <span className="text-white/40">Verified by science.</span>
            </h1>
            <p className="text-lg text-white/50 max-w-xl font-light mb-10 leading-relaxed">
              High-purity research compounds accessed via collective purchasing power. Transparent testing, strict quality controls.
            </p>
          </header>

          {/* Callout: Community Pools */}
          <section className="mb-28">
            <div className="border-hairline glass-panel p-8 flex items-center justify-between group hover:border-indigo-500/30 transition-all relative overflow-hidden bg-[#050508]/40">
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-indigo-500/40 group-hover:bg-indigo-400 transition-colors"></div>
              
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full border border-indigo-500/20 bg-indigo-500/5 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(140,150,255,0.6)]"></div>
                    <h2 className="text-lg font-medium text-white/90">Community Testing Pools</h2>
                  </div>
                  <p className="text-white/50 text-sm font-light">Lab test peptides as a group — split the cost.</p>
                </div>
              </div>

              <button className="ambient-glow-cta bg-white text-black px-6 py-3 text-sm font-medium hover:bg-white/90 transition-all flex items-center gap-2 rounded-sm font-mono uppercase tracking-wide">
                View pools <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* Section: Single Vials */}
          <section>
            <div className="flex items-end justify-between mb-8 pb-4 border-b border-white/5">
              <div>
                <div className="font-mono text-[10px] text-indigo-300/40 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500/50 rounded-full"></span> Inventory_Status: Online
                </div>
                <h2 className="text-2xl font-light text-white/90">Single vials — in stock now</h2>
              </div>
              <button className="text-sm text-white/40 hover:text-white transition-colors flex items-center gap-2 font-mono group">
                [ BROWSE_ALL ] <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Product Card 1 */}
              <div className="border-hairline glass-panel bg-[#030305]/40 hover:bg-[#080810] transition-colors p-6 flex flex-col group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 blur-xl group-hover:bg-indigo-500/10 transition-colors"></div>
                <div className="flex justify-between items-start mb-10 relative z-10">
                  <Beaker className="w-5 h-5 text-white/20 group-hover:text-indigo-400 transition-colors" />
                  <div className="font-mono text-[10px] text-white/30 text-right">
                    VOL: 10ml<br/>
                    QTY: 25x
                  </div>
                </div>
                <div className="mt-auto relative z-10">
                  <h3 className="text-sm font-medium mb-1 leading-snug text-white/80 group-hover:text-white transition-colors">25x Genetek Bac Water Ampoules</h3>
                  <div className="font-mono text-xs text-white/40 mb-6">GTK-BAC-25</div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-lg font-light text-white/90">£12.50</span>
                    <button className="font-mono text-[10px] uppercase border border-white/10 px-3 py-1.5 hover:bg-white hover:text-black transition-colors rounded-sm">
                      Add_Cart
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Card 2 */}
              <div className="border-hairline glass-panel bg-[#030305]/40 hover:bg-[#080810] transition-colors p-6 flex flex-col group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 blur-xl group-hover:bg-indigo-500/10 transition-colors"></div>
                <div className="flex justify-between items-start mb-10 relative z-10">
                  <Beaker className="w-5 h-5 text-white/20 group-hover:text-indigo-400 transition-colors" />
                  <div className="font-mono text-[10px] text-white/30 text-right">
                    VOL: 10ml<br/>
                    QTY: 50x
                  </div>
                </div>
                <div className="mt-auto relative z-10">
                  <h3 className="text-sm font-medium mb-1 leading-snug text-white/80 group-hover:text-white transition-colors">50x Genetek Bac Water Ampoules</h3>
                  <div className="font-mono text-xs text-white/40 mb-6">GTK-BAC-50</div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-lg font-light text-white/90">£25.00</span>
                    <button className="font-mono text-[10px] uppercase border border-white/10 px-3 py-1.5 hover:bg-white hover:text-black transition-colors rounded-sm">
                      Add_Cart
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Card 3 */}
              <div className="border-hairline glass-panel bg-[#030305]/40 hover:bg-[#080810] transition-colors p-6 flex flex-col group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 blur-xl group-hover:bg-indigo-500/10 transition-colors"></div>
                <div className="flex justify-between items-start mb-10 relative z-10">
                  <Beaker className="w-5 h-5 text-white/20 group-hover:text-indigo-400 transition-colors" />
                  <div className="font-mono text-[10px] text-white/30 text-right">
                    VOL: 10ml<br/>
                    QTY: 1x
                  </div>
                </div>
                <div className="mt-auto relative z-10">
                  <h3 className="text-sm font-medium mb-1 leading-snug text-white/80 group-hover:text-white transition-colors">Genetek BAC Water 10ml Ampoule</h3>
                  <div className="font-mono text-xs text-white/40 mb-6">GTK-BAC-01</div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-lg font-light text-white/90">£1.50</span>
                    <button className="font-mono text-[10px] uppercase border border-white/10 px-3 py-1.5 hover:bg-white hover:text-black transition-colors rounded-sm">
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
