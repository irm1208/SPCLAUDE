import React from 'react';
import { ShoppingCart, FlaskConical, BookOpen, Microscope, Calculator, MessageSquare, ArrowRight, Activity, Beaker, ShieldCheck } from 'lucide-react';

export function Graphite() {
  return (
    <div className="min-h-screen bg-[#28282A] text-[#F5F5F7] font-sans flex overflow-hidden selection:bg-[#FF9F0A]/30 selection:text-white">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Mono:wght@400;500&display=swap');
        
        .font-sans { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'Space Mono', monospace; }
        
        .graphite-surface {
          background-color: #323234;
          border: 1px solid #48484A;
        }
        
        .graphite-elevated {
          background-color: #404044;
          border: 1px solid #5C5C60;
        }

        .graphite-sidebar {
          background-color: #2C2C2E;
          border-right: 1px solid #3A3A3C;
        }
      `}} />

      {/* Sidebar - Precision Instrumentation */}
      <aside className="w-64 graphite-sidebar flex flex-col justify-between p-6 z-20 shrink-0">
        <div>
          {/* Brand */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-8 h-8 bg-[#F5F5F7] text-[#1C1C1E] flex items-center justify-center font-mono font-bold text-sm tracking-tighter shadow-sm">
              S&P
            </div>
            <span className="font-semibold tracking-wide text-sm uppercase text-[#F5F5F7]">Salt & Peps</span>
          </div>

          {/* Navigation */}
          <nav className="space-y-10">
            <div>
              <div className="font-mono text-[10px] uppercase text-[#8E8E93] mb-4 tracking-widest flex items-center gap-2">
                <span className="w-2 h-[1px] bg-[#FF9F0A]"></span> Shop
              </div>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-[#AEAEB2] hover:text-[#F5F5F7] transition-colors group">
                    <ShoppingCart className="w-4 h-4 text-[#8E8E93] group-hover:text-[#FF9F0A] transition-colors" />
                    Group Buy
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-[#AEAEB2] hover:text-[#F5F5F7] transition-colors group">
                    <FlaskConical className="w-4 h-4 text-[#8E8E93] group-hover:text-[#FF9F0A] transition-colors" />
                    Lonely Vial
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase text-[#8E8E93] mb-4 tracking-widest flex items-center gap-2">
                <span className="w-2 h-[1px] bg-[#FF9F0A]"></span> Research
              </div>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-[#AEAEB2] hover:text-[#F5F5F7] transition-colors group">
                    <Activity className="w-4 h-4 text-[#8E8E93] group-hover:text-[#FF9F0A] transition-colors" />
                    Protocols
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-[#AEAEB2] hover:text-[#F5F5F7] transition-colors group">
                    <BookOpen className="w-4 h-4 text-[#8E8E93] group-hover:text-[#FF9F0A] transition-colors" />
                    Learning Hub
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-[#AEAEB2] hover:text-[#F5F5F7] transition-colors group">
                    <Microscope className="w-4 h-4 text-[#8E8E93] group-hover:text-[#FF9F0A] transition-colors" />
                    Lab Tests
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-mono text-[10px] uppercase text-[#8E8E93] mb-4 tracking-widest flex items-center gap-2">
                <span className="w-2 h-[1px] bg-[#FF9F0A]"></span> Tools
              </div>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-[#AEAEB2] hover:text-[#F5F5F7] transition-colors group">
                    <Calculator className="w-4 h-4 text-[#8E8E93] group-hover:text-[#FF9F0A] transition-colors" />
                    Calculator
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center gap-3 text-sm text-[#AEAEB2] hover:text-[#F5F5F7] transition-colors group">
                    <MessageSquare className="w-4 h-4 text-[#8E8E93] group-hover:text-[#FF9F0A] transition-colors" />
                    Feedback
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        {/* User Actions */}
        <div className="pt-6 border-t border-[#3A3A3C]">
          <div className="flex flex-col gap-3">
            <button className="text-sm font-medium text-[#AEAEB2] hover:text-[#F5F5F7] transition-colors text-left font-mono">
              [ LOGIN ]
            </button>
            <button className="text-sm font-medium text-[#FF9F0A] hover:text-[#FFB340] transition-colors text-left flex items-center gap-2 group font-mono">
              [ SIGN_UP ] <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative h-screen">
        <div className="max-w-5xl mx-auto px-12 py-24 relative z-10">
          
          {/* Hero Section */}
          <header className="mb-28">
            <div className="flex items-center gap-3 mb-8">
              <div className="font-mono text-[10px] text-[#FF9F0A] tracking-widest uppercase border border-[#FF9F0A]/30 px-2 py-1 rounded-sm bg-[#FF9F0A]/10">
                Sys_Init // Protocol 01
              </div>
              <div className="h-[1px] w-12 bg-[#FF9F0A]/30"></div>
            </div>
            
            <h1 className="text-6xl font-medium tracking-tight leading-[1.1] mb-6 text-[#F5F5F7]">
              Precision synthesized.<br />
              <span className="text-[#8E8E93]">Verified by science.</span>
            </h1>
            <p className="text-lg text-[#AEAEB2] max-w-xl font-normal mb-10 leading-relaxed">
              High-purity research compounds accessed via collective purchasing power. Transparent testing, strict quality controls.
            </p>
          </header>

          {/* Callout: Community Pools */}
          <section className="mb-28">
            <div className="graphite-surface p-8 flex items-center justify-between group hover:border-[#FF9F0A]/50 transition-all relative overflow-hidden rounded-sm">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#FF9F0A]"></div>
              
              <div className="flex items-center gap-6 pl-2">
                <div className="w-12 h-12 rounded-full border border-[#FF9F0A]/20 bg-[#FF9F0A]/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#FF9F0A]" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg font-medium text-[#F5F5F7]">Community Testing Pools</h2>
                  </div>
                  <p className="text-[#AEAEB2] text-sm font-normal">Lab test peptides as a group — split the cost.</p>
                </div>
              </div>

              <button className="bg-[#F5F5F7] text-[#1C1C1E] px-6 py-3 text-sm font-semibold hover:bg-white transition-all flex items-center gap-2 rounded-sm font-mono uppercase tracking-wide shadow-sm">
                View pools <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* Section: Single Vials */}
          <section>
            <div className="flex items-end justify-between mb-8 pb-4 border-b border-[#3A3A3C]">
              <div>
                <div className="font-mono text-[10px] text-[#8E8E93] uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#32D74B] rounded-full"></span> Inventory_Status: Online
                </div>
                <h2 className="text-2xl font-medium text-[#F5F5F7]">Single vials — in stock now</h2>
              </div>
              <button className="text-sm text-[#AEAEB2] hover:text-[#F5F5F7] transition-colors flex items-center gap-2 font-mono group">
                [ BROWSE_ALL ] <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Product Card 1 */}
              <div className="graphite-surface hover:border-[#8E8E93] transition-colors p-6 flex flex-col group rounded-sm shadow-sm">
                <div className="flex justify-between items-start mb-10">
                  <div className="w-10 h-10 rounded-sm bg-[#404044] flex items-center justify-center border border-[#48484A] group-hover:border-[#FF9F0A]/50 transition-colors">
                    <Beaker className="w-5 h-5 text-[#AEAEB2] group-hover:text-[#FF9F0A] transition-colors" />
                  </div>
                  <div className="font-mono text-[10px] text-[#8E8E93] text-right">
                    VOL: 10ml<br/>
                    QTY: 25x
                  </div>
                </div>
                <div className="mt-auto">
                  <h3 className="text-sm font-medium mb-1 leading-snug text-[#F5F5F7]">25x Genetek Bac Water Ampoules</h3>
                  <div className="font-mono text-xs text-[#8E8E93] mb-6">GTK-BAC-25</div>
                  <div className="flex items-center justify-between pt-4 border-t border-[#48484A]">
                    <span className="text-lg font-medium text-[#F5F5F7]">£12.50</span>
                    <button className="font-mono text-[10px] uppercase border border-[#5C5C60] px-3 py-1.5 hover:bg-[#404044] hover:text-[#F5F5F7] transition-colors rounded-sm text-[#AEAEB2]">
                      Add_Cart
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Card 2 */}
              <div className="graphite-surface hover:border-[#8E8E93] transition-colors p-6 flex flex-col group rounded-sm shadow-sm">
                <div className="flex justify-between items-start mb-10">
                  <div className="w-10 h-10 rounded-sm bg-[#404044] flex items-center justify-center border border-[#48484A] group-hover:border-[#FF9F0A]/50 transition-colors">
                    <Beaker className="w-5 h-5 text-[#AEAEB2] group-hover:text-[#FF9F0A] transition-colors" />
                  </div>
                  <div className="font-mono text-[10px] text-[#8E8E93] text-right">
                    VOL: 10ml<br/>
                    QTY: 50x
                  </div>
                </div>
                <div className="mt-auto">
                  <h3 className="text-sm font-medium mb-1 leading-snug text-[#F5F5F7]">50x Genetek Bac Water Ampoules</h3>
                  <div className="font-mono text-xs text-[#8E8E93] mb-6">GTK-BAC-50</div>
                  <div className="flex items-center justify-between pt-4 border-t border-[#48484A]">
                    <span className="text-lg font-medium text-[#F5F5F7]">£25.00</span>
                    <button className="font-mono text-[10px] uppercase border border-[#5C5C60] px-3 py-1.5 hover:bg-[#404044] hover:text-[#F5F5F7] transition-colors rounded-sm text-[#AEAEB2]">
                      Add_Cart
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Card 3 */}
              <div className="graphite-surface hover:border-[#8E8E93] transition-colors p-6 flex flex-col group rounded-sm shadow-sm">
                <div className="flex justify-between items-start mb-10">
                  <div className="w-10 h-10 rounded-sm bg-[#404044] flex items-center justify-center border border-[#48484A] group-hover:border-[#FF9F0A]/50 transition-colors">
                    <Beaker className="w-5 h-5 text-[#AEAEB2] group-hover:text-[#FF9F0A] transition-colors" />
                  </div>
                  <div className="font-mono text-[10px] text-[#8E8E93] text-right">
                    VOL: 10ml<br/>
                    QTY: 1x
                  </div>
                </div>
                <div className="mt-auto">
                  <h3 className="text-sm font-medium mb-1 leading-snug text-[#F5F5F7]">Genetek BAC Water 10ml Ampoule</h3>
                  <div className="font-mono text-xs text-[#8E8E93] mb-6">GTK-BAC-01</div>
                  <div className="flex items-center justify-between pt-4 border-t border-[#48484A]">
                    <span className="text-lg font-medium text-[#F5F5F7]">£1.50</span>
                    <button className="font-mono text-[10px] uppercase border border-[#5C5C60] px-3 py-1.5 hover:bg-[#404044] hover:text-[#F5F5F7] transition-colors rounded-sm text-[#AEAEB2]">
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
