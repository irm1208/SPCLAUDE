import React, { useState } from "react";
import { 
  Menu, Search, ShoppingCart, User, ChevronRight, 
  Beaker, ShieldCheck, CreditCard, Plus, ArrowRight,
  Package, Activity, FileText, BookOpen, Calculator,
  SearchCode, Info, Home, Droplet, Users, TestTube
} from "lucide-react";

export function WarmUnderground() {
  const [activeNav, setActiveNav] = useState("Home");

  return (
    <div className="flex h-screen bg-[#120A04] text-[#F5E6C8] font-sans selection:bg-[#B45309] selection:text-[#F5E6C8] overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap');
        .font-outfit { font-family: 'Outfit', sans-serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        .noise-bg {
          position: relative;
        }
        .noise-bg::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          opacity: 0.03;
          pointer-events: none;
          z-index: 10;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1C0F07;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #78350F;
          border-radius: 10px;
        }
      `}} />

      {/* Sidebar */}
      <aside className="w-64 bg-[#0A0502] border-r border-[#D97706]/10 flex flex-col noise-bg z-20 hidden md:flex shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-[#D97706]/10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D97706] to-[#78350F] flex items-center justify-center text-[#120A04] shadow-[0_0_15px_rgba(217,119,6,0.3)]">
            <Droplet size={20} className="fill-current" />
          </div>
          <div>
            <h1 className="font-outfit font-bold text-xl tracking-tight text-[#F5E6C8]">Salt & Peps</h1>
            <p className="text-[#D97706] text-[10px] font-medium uppercase tracking-wider">Peps Anonymous</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar flex flex-col gap-8">
          <div className="space-y-1">
            <p className="px-3 text-xs font-outfit font-semibold text-[#78350F] uppercase tracking-widest mb-3">Shop</p>
            {[
              { icon: Home, label: "Home", active: true },
              { icon: Package, label: "Available Now" },
              { icon: Users, label: "Group Buys", badge: "Live" },
              { icon: FileText, label: "Lab Reports" },
            ].map((item, i) => (
              <button 
                key={i}
                onClick={() => setActiveNav(item.label)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group
                  ${activeNav === item.label 
                    ? 'bg-[#D97706]/10 text-[#D97706]' 
                    : 'text-[#F5E6C8]/60 hover:text-[#F5E6C8] hover:bg-[#1C0F07]'}`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} className={activeNav === item.label ? 'text-[#D97706]' : 'text-[#78350F] group-hover:text-[#D97706]/70 transition-colors'} />
                  <span className="font-medium text-sm font-inter">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-full bg-[#D97706]/20 text-[#D97706] text-[10px] font-bold uppercase border border-[#D97706]/30">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <p className="px-3 text-xs font-outfit font-semibold text-[#78350F] uppercase tracking-widest mb-3">Tools</p>
            {[
              { icon: Calculator, label: "Dose Calculator" },
              { icon: Beaker, label: "Endotoxin Calc" },
              { icon: BookOpen, label: "Pepedia" },
              { icon: SearchCode, label: "Order Lookup" },
            ].map((item, i) => (
              <button 
                key={i}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#F5E6C8]/60 hover:text-[#F5E6C8] hover:bg-[#1C0F07] transition-all duration-200 group"
              >
                <item.icon size={18} className="text-[#78350F] group-hover:text-[#D97706]/70 transition-colors" />
                <span className="font-medium text-sm font-inter">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-[#D97706]/10">
          <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#1C0F07] transition-colors group">
            <div className="w-8 h-8 rounded-full bg-[#1C0F07] border border-[#D97706]/20 flex items-center justify-center text-[#D97706] group-hover:bg-[#D97706]/10">
              <User size={14} />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium font-inter text-[#F5E6C8]">Log in</p>
              <p className="text-xs text-[#78350F]">Member portal</p>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[400px] bg-[#D97706]/5 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Header (Mobile) */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-[#D97706]/10 bg-[#0A0502]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D97706] to-[#78350F] flex items-center justify-center text-[#120A04]">
              <Droplet size={16} className="fill-current" />
            </div>
            <span className="font-outfit font-bold text-lg text-[#F5E6C8]">Salt & Peps</span>
          </div>
          <button className="p-2 text-[#D97706] bg-[#1C0F07] rounded-lg">
            <Menu size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 noise-bg">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-10 pb-24">
            
            {/* Countdown Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-[#1C0F07] border border-[#D97706]/20 p-4 md:p-0 md:h-14 flex flex-col md:flex-row items-center justify-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNENzc3MDYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9zdmc+')] opacity-50"></div>
              
              <div className="flex items-center gap-3 z-10">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse"></div>
                <span className="font-outfit font-semibold text-sm tracking-widest text-[#D97706] uppercase">Group Buy Closes Oct 15</span>
              </div>
              
              <div className="hidden md:block w-px h-6 bg-[#D97706]/20 z-10"></div>
              
              <div className="flex gap-3 z-10 font-inter text-sm">
                <div className="flex items-center gap-1.5"><span className="text-[#F5E6C8] font-bold bg-[#2A170A] px-2 py-0.5 rounded-md border border-[#D97706]/10">14</span> <span className="text-[#F5E6C8]/60">Days</span></div>
                <div className="flex items-center gap-1.5"><span className="text-[#F5E6C8] font-bold bg-[#2A170A] px-2 py-0.5 rounded-md border border-[#D97706]/10">08</span> <span className="text-[#F5E6C8]/60">Hrs</span></div>
                <div className="flex items-center gap-1.5"><span className="text-[#F5E6C8] font-bold bg-[#2A170A] px-2 py-0.5 rounded-md border border-[#D97706]/10">45</span> <span className="text-[#F5E6C8]/60">Mins</span></div>
              </div>
            </div>

            {/* Hero Section */}
            <section className="relative overflow-hidden rounded-[2rem] border border-[#D97706]/15 bg-gradient-to-b from-[#1C0F07] to-[#0A0502] p-8 md:p-12 shadow-2xl">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#D97706]/10 via-transparent to-transparent opacity-50 pointer-events-none translate-x-1/3 -translate-y-1/3 rounded-full blur-3xl"></div>
              
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D97706]/10 border border-[#D97706]/20 text-[#D97706] text-xs font-bold uppercase tracking-widest mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
                  Trusted Supplier
                </div>
                
                <h2 className="font-outfit text-5xl md:text-7xl font-bold text-[#F5E6C8] tracking-tight mb-4 leading-[1.1]">
                  Peps <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D97706] to-[#B45309]">Anonymous</span>
                </h2>
                
                <p className="text-lg md:text-xl text-[#F5E6C8]/70 font-inter mb-10 max-w-lg leading-relaxed">
                  The underground collective for premium peptide research. Vetted, tested, and supplied to the community.
                </p>
                
                <div className="flex flex-wrap gap-4">
                  {[
                    { icon: ShieldCheck, text: "Janoshik Tested" },
                    { icon: Beaker, text: "BAC Safe" },
                    { icon: CreditCard, text: "USDT Payments" }
                  ].map((chip, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#120A04] border border-[#D97706]/20 shadow-inner">
                      <div className="w-6 h-6 rounded-md bg-[#D97706]/10 flex items-center justify-center text-[#D97706]">
                        <chip.icon size={14} />
                      </div>
                      <span className="text-sm font-medium font-inter text-[#F5E6C8]/90">{chip.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Product Grid */}
            <section>
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h3 className="font-outfit text-2xl font-bold text-[#F5E6C8]">Available Now</h3>
                  <p className="text-[#F5E6C8]/50 text-sm mt-1">Ready to ship from our domestic inventory.</p>
                </div>
                <button className="text-[#D97706] text-sm font-medium hover:text-[#F5E6C8] flex items-center gap-1 transition-colors">
                  View All <ChevronRight size={16} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  { name: "Semaglutide", size: "10mg", price: "$55.00", stock: true, popular: true },
                  { name: "Tirzepatide", size: "10mg", price: "$65.00", stock: true, popular: false },
                  { name: "Retatrutide", size: "10mg", price: "$85.00", stock: true, popular: true },
                  { name: "BPC-157", size: "5mg", price: "$35.00", stock: true, popular: false },
                  { name: "TB-500", size: "5mg", price: "$40.00", stock: false, popular: false },
                  { name: "GHK-Cu", size: "50mg", price: "$45.00", stock: true, popular: false },
                ].map((product, i) => (
                  <div key={i} className="group relative bg-[#1C0F07] rounded-2xl border border-[#D97706]/15 hover:border-[#D97706]/40 transition-all duration-300 overflow-hidden flex flex-col p-5">
                    
                    {product.popular && (
                      <div className="absolute top-0 right-5 transform -translate-y-px">
                        <div className="bg-[#D97706] text-[#120A04] text-[10px] font-bold px-2 py-1 rounded-b-md uppercase tracking-wider">Popular</div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start mb-8">
                      <div className="w-12 h-12 rounded-xl bg-[#2A170A] border border-[#D97706]/20 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                        <TestTube size={24} className="text-[#D97706]/80" />
                      </div>
                      
                      <div className="text-right">
                        <span className="font-outfit font-bold text-xl text-[#F5E6C8] block">{product.price}</span>
                        <span className="text-xs text-[#78350F] font-medium">per vial</span>
                      </div>
                    </div>
                    
                    <div className="mb-6 flex-1">
                      <h4 className="font-outfit font-semibold text-lg text-[#F5E6C8] group-hover:text-[#D97706] transition-colors">{product.name}</h4>
                      <p className="text-[#F5E6C8]/50 text-sm mt-1">Research grade, {product.size} purity ≥99%</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-[#D97706]/10">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${product.stock ? 'bg-[#D97706]' : 'bg-[#78350F]'}`}></div>
                        <span className="font-inter text-xs font-medium text-[#F5E6C8]/70">
                          {product.stock ? 'In stock' : 'Out of stock'}
                        </span>
                      </div>
                      
                      <button 
                        disabled={!product.stock}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          product.stock 
                            ? 'bg-[#D97706]/10 text-[#D97706] hover:bg-[#D97706] hover:text-[#120A04] border border-[#D97706]/20' 
                            : 'bg-[#120A04] text-[#78350F] border border-[#78350F]/20 cursor-not-allowed'
                        }`}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Explore Section */}
            <section>
              <h3 className="font-outfit text-xl font-bold text-[#F5E6C8] mb-5">Explore the Market</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "The Lonely Vial", sub: "Single Vials", icon: TestTube, color: "from-amber-900/40 to-orange-900/20" },
                  { title: "Accessories", sub: "Essential Kit", icon: Package, color: "from-copper-900/40 to-amber-900/20" },
                  { title: "Lab Reports", sub: "Quality Assurance", icon: FileText, color: "from-stone-800/40 to-stone-900/20" },
                  { title: "Protocols", sub: "Pepedia", icon: BookOpen, color: "from-yellow-900/40 to-amber-900/20" },
                ].map((card, i) => (
                  <button key={i} className={`flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r ${card.color} border border-[#D97706]/10 hover:border-[#D97706]/30 transition-all text-left group`}>
                    <div className="w-12 h-12 rounded-xl bg-[#120A04]/50 border border-[#D97706]/20 flex items-center justify-center text-[#D97706] shrink-0 group-hover:scale-110 transition-transform">
                      <card.icon size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-outfit font-semibold text-[#F5E6C8] text-lg">{card.title}</h4>
                      <p className="text-[#F5E6C8]/50 text-sm font-inter">{card.sub}</p>
                    </div>
                    <ArrowRight size={18} className="text-[#78350F] group-hover:text-[#D97706] group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </section>

            {/* Utilities */}
            <section className="bg-[#0A0502] rounded-2xl border border-[#D97706]/10 p-6 md:p-8">
              <h3 className="font-outfit text-sm font-bold text-[#78350F] uppercase tracking-widest mb-6">Quick Utilities</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
                {[
                  { icon: Calculator, title: "Dose Calculator", desc: "Calculate exact mg/mcg doses" },
                  { icon: Beaker, title: "Endotoxin Calc", desc: "Verify EU limits per dose" },
                  { icon: SearchCode, title: "Order Lookup", desc: "Track shipment status" }
                ].map((util, i) => (
                  <button key={i} className="flex flex-col items-start p-4 rounded-xl hover:bg-[#1C0F07] border border-transparent hover:border-[#D97706]/20 transition-all text-left group">
                    <util.icon size={20} className="text-[#D97706] mb-3 opacity-70 group-hover:opacity-100 transition-opacity" />
                    <h4 className="font-inter font-medium text-[#F5E6C8] mb-1">{util.title}</h4>
                    <p className="text-[#F5E6C8]/40 text-xs">{util.desc}</p>
                  </button>
                ))}
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
