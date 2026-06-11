import React, { useState } from "react";
import { 
  Clock, Beaker, ShieldCheck, CreditCard, ChevronRight, 
  Calculator, Activity, Search, Package, FlaskConical, 
  FileText, BookOpen, User, LogOut, Settings, LayoutGrid,
  Plus
} from "lucide-react";

const products = [
  { name: "Semaglutide", mg: "10", price: "$55.00", stock: "In stock" },
  { name: "Tirzepatide", mg: "10", price: "$65.00", stock: "In stock" },
  { name: "Tirzepatide", mg: "15", price: "$75.00", stock: "In stock" },
  { name: "Tirzepatide", mg: "30", price: "$110.00", stock: "In stock" },
  { name: "Retatrutide", mg: "10", price: "$70.00", stock: "In stock" },
  { name: "Cagrilintide", mg: "5", price: "$60.00", stock: "Low stock" },
];

const exploreCards = [
  { title: "The Lonely Vial", subtitle: "Single Vials", icon: Package },
  { title: "Accessories", subtitle: "Essential Kit", icon: FlaskConical },
  { title: "Lab Reports", subtitle: "Quality Assurance", icon: FileText },
  { title: "Protocols", subtitle: "Pepedia", icon: BookOpen },
];

const utilities = [
  { title: "Dose Calculator", icon: Calculator },
  { title: "Endotoxin Calc", icon: Activity },
  { title: "Order Lookup", icon: Search },
];

export function StarkClinical() {
  return (
    <div className="flex h-[100dvh] w-full bg-[#05080A] text-slate-300 font-sans selection:bg-cyan-500/30 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[224px] shrink-0 border-r border-slate-800/60 bg-[#0A0F14] flex flex-col h-full">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 text-cyan-400">
            <Beaker className="w-5 h-5" />
            <span className="font-['Outfit'] font-medium tracking-wide text-sm uppercase">Salt & Peps</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
          <div>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3 px-2">Shop</div>
            <nav className="space-y-0.5">
              <a href="#" className="flex items-center gap-3 px-2 py-2 text-sm text-cyan-400 bg-cyan-950/20 rounded-md border border-cyan-900/30">
                <LayoutGrid className="w-4 h-4" />
                <span>Available Now</span>
              </a>
              <a href="#" className="flex items-center gap-3 px-2 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                <Package className="w-4 h-4" />
                <span>Single Vials</span>
              </a>
              <a href="#" className="flex items-center gap-3 px-2 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                <FlaskConical className="w-4 h-4" />
                <span>Accessories</span>
              </a>
            </nav>
          </div>

          <div className="h-px w-full bg-slate-800/50" />

          <div>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3 px-2">Tools</div>
            <nav className="space-y-0.5">
              <a href="#" className="flex items-center gap-3 px-2 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                <FileText className="w-4 h-4" />
                <span>Lab Reports</span>
              </a>
              <a href="#" className="flex items-center gap-3 px-2 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                <BookOpen className="w-4 h-4" />
                <span>Protocols</span>
              </a>
              <a href="#" className="flex items-center gap-3 px-2 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                <Calculator className="w-4 h-4" />
                <span>Calculators</span>
              </a>
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800/60 bg-[#0A0F14]">
          <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-slate-800/30 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center border border-slate-700">
              <User className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-200 truncate">Researcher_01</div>
              <div className="text-[10px] font-mono text-slate-500 truncate">ID: 8492-A</div>
            </div>
            <LogOut className="w-4 h-4 text-slate-600" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-[#05080A]">
        {/* Banner */}
        <div className="bg-cyan-950/30 border-b border-cyan-900/50 py-2.5 px-6 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono text-cyan-400 tracking-wider">GROUP BUY CLOSES: 2024-11-15</span>
          </div>
          <div className="text-xs font-mono text-cyan-500/70 border border-cyan-900/50 bg-cyan-950/20 px-2 py-0.5 rounded">
            REMAINING: 6 MONTHS
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-8 py-10 space-y-12">
          {/* Hero */}
          <section className="text-center py-8 border border-slate-800/60 bg-[#0A0F14]/50 rounded-md relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/10 via-transparent to-transparent pointer-events-none"></div>
            <div className="relative z-10">
              <h1 className="font-['Outfit'] text-5xl font-light text-slate-100 tracking-tight mb-2">Salt & Peps</h1>
              <p className="text-slate-400 font-mono text-sm tracking-widest uppercase mb-6">Peps Anonymous</p>
              
              <div className="w-12 h-px bg-cyan-500/30 mx-auto mb-8"></div>
              
              <p className="text-slate-500 text-sm max-w-lg mx-auto mb-10 leading-relaxed">
                High-purity research peptides for independent clinical study. 
                Strictly not for human consumption.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border border-slate-800 rounded-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] font-mono text-slate-300 tracking-wider">JANOSHIK TESTED</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border border-slate-800 rounded-sm">
                  <Beaker className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] font-mono text-slate-300 tracking-wider">BAC SAFE</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border border-slate-800 rounded-sm">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] font-mono text-slate-300 tracking-wider">USDT PAYMENTS</span>
                </div>
              </div>
            </div>
          </section>

          {/* Grid */}
          <section>
            <div className="flex items-center justify-between mb-6 border-b border-slate-800/60 pb-4">
              <h2 className="font-['Outfit'] text-xl font-light text-slate-200">Available Now</h2>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-900 px-2 py-1 rounded border border-slate-800">
                Live Inventory
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {products.map((p, i) => (
                <div key={i} className="group flex items-center justify-between p-3 bg-[#0A0F14] border border-slate-800/60 rounded-md hover:border-cyan-900/50 hover:bg-slate-900/80 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded flex items-center justify-center shrink-0">
                      <Beaker className="w-4 h-4 text-cyan-500/50" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-slate-200 font-medium">{p.name}</h3>
                        <span className="text-xs font-mono text-slate-500">{p.mg}mg</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Status: <span className={p.stock === 'In stock' ? 'text-cyan-400' : 'text-amber-400'}>{p.stock}</span></span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-mono text-slate-300">{p.price}</div>
                    </div>
                    <button className="w-8 h-8 rounded bg-cyan-950/30 border border-cyan-900/50 flex items-center justify-center text-cyan-400 hover:bg-cyan-900/50 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Explore */}
          <section>
            <h2 className="font-['Outfit'] text-xl font-light text-slate-200 mb-6 border-b border-slate-800/60 pb-4">Research Modules</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {exploreCards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <a key={i} href="#" className="block p-4 bg-[#0A0F14] border border-slate-800/60 rounded-md hover:border-slate-700 transition-colors group">
                    <Icon className="w-5 h-5 text-slate-500 mb-4 group-hover:text-cyan-400 transition-colors" />
                    <h3 className="text-sm font-medium text-slate-300 mb-1">{card.title}</h3>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{card.subtitle}</p>
                  </a>
                );
              })}
            </div>
          </section>

          {/* Utilities */}
          <section>
            <h2 className="font-['Outfit'] text-xl font-light text-slate-200 mb-6 border-b border-slate-800/60 pb-4">Quick Utilities</h2>
            <div className="flex flex-wrap gap-3">
              {utilities.map((util, i) => {
                const Icon = util.icon;
                return (
                  <button key={i} className="flex items-center gap-3 px-4 py-2.5 bg-[#0A0F14] border border-slate-800/60 rounded-md hover:bg-slate-900 transition-colors group">
                    <Icon className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                    <span className="text-sm text-slate-300">{util.title}</span>
                    <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
