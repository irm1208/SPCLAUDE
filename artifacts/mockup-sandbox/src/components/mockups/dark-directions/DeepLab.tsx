import React from 'react';
import { ShoppingCart, FlaskConical, BookOpen, Microscope, Calculator, MessageSquare, ArrowRight, Activity, Beaker } from 'lucide-react';

export function DeepLab() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#EDEDED] font-sans selection:bg-[#222] selection:text-white flex overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');
        
        .font-sans { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'Space Mono', monospace; }
        
        .glow-hero {
          background: radial-gradient(circle at 50% 0%, rgba(20, 40, 60, 0.15), transparent 70%);
        }
        
        .glow-cta {
          box-shadow: 0 0 40px -10px rgba(0, 150, 255, 0.2);
        }
        
        .border-micro {
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}} />

      {/* Sidebar - Precision Instrumentation */}
      <aside className="w-64 border-r border-white/5 flex flex-col justify-between p-6 bg-[#080808] z-10 shrink-0">
        <div>
          {/* Brand */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-mono font-bold text-sm tracking-tighter">
              S&P
            </div>
            <span className="font-semibold tracking-wide text-sm uppercase">Salt & Peps</span>
          </div>

          {/* Navigation */}
          <nav className="space-y-10">
            <div>
              <div className="font-mono text-[10px] uppercase text-white/40 mb-4 tracking-widest flex items-center gap-2">
                <span className="w-2 h-[1px] bg-white/20"></span> Shop
              </div>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors group">
                    <ShoppingCart className="w-4 h-4 text-white/30 group-hover:text-white/70" />
                    Group Buy
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors group">
                    <FlaskConical className="w-4 h-4 text-white/30 group-hover:text-white/70" />
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
                  <a href="#" className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors group">
                    <Activity className="w-4 h-4 text-white/30 group-hover:text-white/70" />
                    Protocols
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors group">
                    <BookOpen className="w-4 h-4 text-white/30 group-hover:text-white/70" />
                    Learning Hub
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors group">
                    <Microscope className="w-4 h-4 text-white/30 group-hover:text-white/70" />
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
                  <a href="#" className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors group">
                    <Calculator className="w-4 h-4 text-white/30 group-hover:text-white/70" />
                    Calculator
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors group">
                    <MessageSquare className="w-4 h-4 text-white/30 group-hover:text-white/70" />
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
            <button className="text-sm font-medium text-white/60 hover:text-white transition-colors text-left font-mono">
              [ LOGIN ]
            </button>
            <button className="text-sm font-medium text-white hover:text-white transition-colors text-left flex items-center gap-2 group font-mono">
              [ SIGN_UP ] <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative glow-hero h-screen">
        {/* Subtle grid background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="max-w-5xl mx-auto px-12 py-20 relative z-10">
          
          {/* Hero Section */}
          <header className="mb-24">
            <div className="font-mono text-xs text-[#0096FF] mb-6 tracking-widest uppercase">Sys_Init // Protocol 01</div>
            <h1 className="text-6xl font-light tracking-tight leading-[1.1] mb-6">
              Precision synthesized.<br />
              <span className="text-white/40">Verified by science.</span>
            </h1>
            <p className="text-lg text-white/50 max-w-xl font-light mb-10 leading-relaxed">
              High-purity research compounds accessed via collective purchasing power. Transparent testing, strict quality controls.
            </p>
          </header>

          {/* Callout: Community Pools */}
          <section className="mb-24">
            <div className="border-micro bg-[#0A0A0B] p-8 flex items-center justify-between group hover:border-white/10 transition-colors relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0096FF]/40 group-hover:bg-[#0096FF] transition-colors"></div>
              
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#0096FF] animate-pulse"></div>
                  <h2 className="text-lg font-medium">Community Testing Pools</h2>
                </div>
                <p className="text-white/50 text-sm">Lab test peptides as a group — split the cost.</p>
              </div>

              <button className="glow-cta bg-white text-black px-6 py-3 text-sm font-medium hover:bg-white/90 transition-all flex items-center gap-2">
                View pools <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* Section: Single Vials */}
          <section>
            <div className="flex items-end justify-between mb-8 pb-4 border-b border-white/5">
              <div>
                <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">Inventory_Status: Online</div>
                <h2 className="text-2xl font-light">Single vials — in stock now</h2>
              </div>
              <button className="text-sm text-white/50 hover:text-white transition-colors flex items-center gap-2 font-mono">
                [ BROWSE_ALL ] <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Product Card 1 */}
              <div className="border-micro bg-[#080808] hover:bg-[#0A0A0C] transition-colors p-6 flex flex-col group">
                <div className="flex justify-between items-start mb-12">
                  <Beaker className="w-6 h-6 text-white/20 group-hover:text-white/50 transition-colors" />
                  <div className="font-mono text-[10px] text-white/30 text-right">
                    VOL: 10ml<br/>
                    QTY: 25x
                  </div>
                </div>
                <div className="mt-auto">
                  <h3 className="text-sm font-medium mb-1 leading-snug">25x Genetek Bac Water Ampoules</h3>
                  <div className="font-mono text-xs text-white/50 mb-6">GTK-BAC-25</div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-lg font-light">£12.50</span>
                    <button className="font-mono text-[10px] uppercase border border-white/10 px-3 py-1.5 hover:bg-white hover:text-black transition-colors">
                      Add_Cart
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Card 2 */}
              <div className="border-micro bg-[#080808] hover:bg-[#0A0A0C] transition-colors p-6 flex flex-col group">
                <div className="flex justify-between items-start mb-12">
                  <Beaker className="w-6 h-6 text-white/20 group-hover:text-white/50 transition-colors" />
                  <div className="font-mono text-[10px] text-white/30 text-right">
                    VOL: 10ml<br/>
                    QTY: 50x
                  </div>
                </div>
                <div className="mt-auto">
                  <h3 className="text-sm font-medium mb-1 leading-snug">50x Genetek Bac Water Ampoules</h3>
                  <div className="font-mono text-xs text-white/50 mb-6">GTK-BAC-50</div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-lg font-light">£25.00</span>
                    <button className="font-mono text-[10px] uppercase border border-white/10 px-3 py-1.5 hover:bg-white hover:text-black transition-colors">
                      Add_Cart
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Card 3 */}
              <div className="border-micro bg-[#080808] hover:bg-[#0A0A0C] transition-colors p-6 flex flex-col group">
                <div className="flex justify-between items-start mb-12">
                  <Beaker className="w-6 h-6 text-white/20 group-hover:text-white/50 transition-colors" />
                  <div className="font-mono text-[10px] text-white/30 text-right">
                    VOL: 10ml<br/>
                    QTY: 1x
                  </div>
                </div>
                <div className="mt-auto">
                  <h3 className="text-sm font-medium mb-1 leading-snug">Genetek BAC Water 10ml Ampoule</h3>
                  <div className="font-mono text-xs text-white/50 mb-6">GTK-BAC-01</div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-lg font-light">£1.50</span>
                    <button className="font-mono text-[10px] uppercase border border-white/10 px-3 py-1.5 hover:bg-white hover:text-black transition-colors">
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
