import React from "react";
import { Link } from "wouter";
import { 
  Package, 
  FlaskConical, 
  Calculator, 
  Search, 
  BookOpen, 
  ShieldCheck, 
  Droplet, 
  Plus, 
  ArrowRight,
  Menu,
  X,
  CreditCard,
  Microscope,
  Home,
  User,
  LogOut
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Internal data
const VIAL_PRODUCTS = [
  { id: "v1", name: "Semaglutide", size: "10mg", price: 55.00, stock: "In stock", color: "from-slate-500/10 to-slate-900/10" },
  { id: "v2", name: "Tirzepatide", size: "10mg", price: 65.00, stock: "In stock", color: "from-slate-500/10 to-slate-900/10" },
  { id: "v3", name: "Retatrutide", size: "10mg", price: 85.00, stock: "Low stock", color: "from-slate-500/10 to-slate-900/10" },
  { id: "v4", name: "BPC-157", size: "5mg", price: 40.00, stock: "In stock", color: "from-slate-500/10 to-slate-900/10" },
  { id: "v5", name: "GHK-Cu", size: "50mg", price: 45.00, stock: "In stock", color: "from-slate-500/10 to-slate-900/10" },
  { id: "v6", name: "MOTS-c", size: "10mg", price: 60.00, stock: "In stock", color: "from-slate-500/10 to-slate-900/10" },
];

export function DarkLuxury() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-[#08080C] text-[#E2E8F0] font-sans overflow-hidden selection:bg-indigo-500/30">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Inter:wght@300;400;500&display=swap');
        
        .font-display { font-family: 'Outfit', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
        
        /* Custom scrollbar for webkit */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1E1E2A; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #2D2D3D; }
      `}} />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#08080C]/90 backdrop-blur-xl border-b border-white/[0.04] z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#141420] to-[#08080C] border border-white/[0.08] flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-[#C4B5FD]" />
          </div>
          <span className="font-display text-lg tracking-widest font-light text-white">S&P</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -mr-2 text-slate-400 hover:text-white transition-colors">
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-72 bg-[#0C0C12] border-r border-white/[0.04] flex flex-col
        transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Area */}
        <div className="h-32 flex items-center px-10 border-b border-white/[0.02]">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1E1B4B] to-[#141420] border border-white/[0.06] flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                <FlaskConical className="w-3.5 h-3.5 text-[#C4B5FD]" />
              </div>
              <span className="font-display text-xl tracking-[0.2em] font-light text-white">S&P</span>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 ml-11 font-display">Peps Anonymous</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-10 px-6 font-body text-sm space-y-10">
          <div className="space-y-4">
            <div className="px-4 text-[10px] font-display uppercase tracking-[0.15em] text-slate-600 mb-2">Platform</div>
            <div className="space-y-1">
              <Link href="#" className="flex items-center gap-4 px-4 py-3 text-slate-300 hover:text-white hover:bg-white/[0.02] rounded-xl transition-all group">
                <Home className="w-4 h-4 text-slate-500 group-hover:text-[#C4B5FD] transition-colors" />
                <span className="tracking-wide">Dashboard</span>
              </Link>
              <Link href="#" className="flex items-center gap-4 px-4 py-3 bg-white/[0.03] text-white rounded-xl border border-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Package className="w-4 h-4 text-[#C4B5FD]" />
                <span className="tracking-wide">Vial Shop</span>
              </Link>
              <Link href="#" className="flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/[0.02] rounded-xl transition-all group">
                <ShieldCheck className="w-4 h-4 text-slate-500 group-hover:text-[#C4B5FD] transition-colors" />
                <span className="tracking-wide">Lab Reports</span>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <div className="px-4 text-[10px] font-display uppercase tracking-[0.15em] text-slate-600 mb-2">Research Tools</div>
            <div className="space-y-1">
              <Link href="#" className="flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/[0.02] rounded-xl transition-all group">
                <Calculator className="w-4 h-4 text-slate-500 group-hover:text-[#C4B5FD] transition-colors" />
                <span className="tracking-wide">Calculators</span>
              </Link>
              <Link href="#" className="flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/[0.02] rounded-xl transition-all group">
                <BookOpen className="w-4 h-4 text-slate-500 group-hover:text-[#C4B5FD] transition-colors" />
                <span className="tracking-wide">Protocols</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* User Area */}
        <div className="p-6 border-t border-white/[0.02]">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/[0.02] transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1A1A24] border border-white/[0.05] flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-200">Member</span>
                <span className="text-[10px] text-slate-500">ID: 88392</span>
              </div>
            </div>
            <LogOut className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
          </div>
        </div>
      </aside>

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative pt-16 lg:pt-0">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 lg:px-12 pb-32">
          
          {/* Banner */}
          <div className="py-8 flex justify-center">
            <div className="inline-flex items-center gap-6 px-6 py-2.5 rounded-full border border-indigo-500/20 bg-indigo-500/[0.02] text-xs font-display tracking-widest backdrop-blur-sm">
              <span className="text-white/60">GROUP BUY CLOSES <span className="text-white font-medium">NOV 15</span></span>
              <span className="w-1 h-1 rounded-full bg-indigo-500/50" />
              <span className="text-[#C4B5FD]">REMAINING 6 MONTHS</span>
            </div>
          </div>

          {/* Hero Section */}
          <div className="py-24 flex flex-col items-center text-center relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
            
            <h1 className="font-display text-5xl md:text-7xl font-light tracking-tight text-white mb-6 leading-none">
              Salt & Peps
            </h1>
            <p className="font-body text-lg text-slate-400 font-light max-w-xl mx-auto leading-relaxed mb-12">
              Curated peptide research compounds. Uncompromising quality standards, transparent testing, and refined protocols.
            </p>

            <div className="flex flex-wrap justify-center gap-4 text-xs font-body font-medium">
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/[0.06] bg-white/[0.01] text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C4B5FD]" />
                Janoshik Tested
              </div>
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/[0.06] bg-white/[0.01] text-slate-300">
                <Droplet className="w-3.5 h-3.5 text-[#C4B5FD]" />
                BAC Safe
              </div>
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/[0.06] bg-white/[0.01] text-slate-300">
                <CreditCard className="w-3.5 h-3.5 text-[#C4B5FD]" />
                USDT Payments
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent my-12" />

          {/* Available Now Grid */}
          <div className="py-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <h2 className="font-display text-2xl font-light tracking-wide text-white mb-2">Available Collection</h2>
                <p className="text-sm text-slate-500 font-body">Ready to ship. Verified purity.</p>
              </div>
              <Button variant="outline" className="rounded-full bg-transparent border-white/[0.08] hover:bg-white/[0.03] text-slate-300 h-10 px-6 font-display tracking-widest text-xs uppercase">
                View Catalog
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {VIAL_PRODUCTS.map((product) => (
                <div key={product.id} className="group relative rounded-[2rem] bg-[#0E0E15] border border-white/[0.03] p-8 overflow-hidden hover:border-indigo-500/20 transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-duration-500" />
                  
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-12">
                      <Badge variant="outline" className="bg-transparent border-white/[0.08] text-[10px] uppercase font-display tracking-widest text-slate-400 rounded-full px-3 py-1">
                        {product.stock}
                      </Badge>
                      <div className="w-10 h-10 rounded-full bg-[#141420] border border-white/[0.04] flex items-center justify-center">
                        <Droplet className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="text-sm text-slate-500 font-body mb-2">{product.size}</div>
                      <h3 className="font-display text-xl tracking-wide text-slate-200 mb-6 group-hover:text-white transition-colors">{product.name}</h3>
                      
                      <div className="flex items-center justify-between pt-6 border-t border-white/[0.04]">
                        <div className="font-body text-xl font-light tabular-nums text-white">
                          ${product.price.toFixed(2)}
                        </div>
                        <button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent my-12" />

          {/* Explore Section */}
          <div className="py-12">
            <h2 className="font-display text-2xl font-light tracking-wide text-white mb-12 text-center">Curated Collections</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: "The Lonely Vial", subtitle: "Single Vials", icon: Droplet, desc: "Curated individual preparations for precise research." },
                { title: "Accessories", subtitle: "Essential Kit", icon: Package, desc: "Surgical-grade tools and preparatory materials." },
                { title: "Lab Reports", subtitle: "Quality Assurance", icon: Microscope, desc: "Unredacted analytical data and purity verification." },
                { title: "Protocols", subtitle: "Pepedia", icon: BookOpen, desc: "Peer-reviewed literature and administration guides." }
              ].map((item, i) => (
                <div key={i} className="flex flex-col md:flex-row items-center gap-8 p-8 rounded-[2rem] bg-[#0A0A0F] border border-white/[0.02] hover:bg-[#0E0E15] transition-colors group cursor-pointer">
                  <div className="w-16 h-16 shrink-0 rounded-2xl bg-[#141420] border border-white/[0.04] flex items-center justify-center group-hover:scale-110 group-hover:border-indigo-500/20 transition-all duration-500">
                    <item.icon className="w-6 h-6 text-slate-400 group-hover:text-[#C4B5FD] transition-colors" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <div className="text-[10px] uppercase font-display tracking-[0.2em] text-indigo-400/60 mb-2">{item.subtitle}</div>
                    <h3 className="font-display text-xl text-slate-200 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-500 font-body leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-white/[0.08] flex items-center justify-center shrink-0 text-slate-400 group-hover:bg-white group-hover:text-black group-hover:border-white transition-all duration-300">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Utilities */}
          <div className="py-24">
            <div className="max-w-2xl mx-auto rounded-[2.5rem] bg-gradient-to-b from-[#141420] to-[#0A0A0F] border border-white/[0.04] p-12 text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.05),transparent_70%)] pointer-events-none" />
              
              <h2 className="font-display text-2xl font-light tracking-wide text-white mb-10 relative z-10">Research Utilities</h2>
              
              <div className="flex flex-wrap justify-center gap-4 relative z-10">
                <Button variant="outline" className="rounded-full bg-[#08080C] border-white/[0.08] hover:bg-white text-slate-300 hover:text-black h-12 px-8 font-body font-light transition-all duration-300 group">
                  <Calculator className="w-4 h-4 mr-3 opacity-50 group-hover:opacity-100" />
                  Dose Calculator
                </Button>
                <Button variant="outline" className="rounded-full bg-[#08080C] border-white/[0.08] hover:bg-white text-slate-300 hover:text-black h-12 px-8 font-body font-light transition-all duration-300 group">
                  <FlaskConical className="w-4 h-4 mr-3 opacity-50 group-hover:opacity-100" />
                  Endotoxin Calc
                </Button>
                <Button variant="outline" className="rounded-full bg-[#08080C] border-white/[0.08] hover:bg-white text-slate-300 hover:text-black h-12 px-8 font-body font-light transition-all duration-300 group">
                  <Search className="w-4 h-4 mr-3 opacity-50 group-hover:opacity-100" />
                  Order Lookup
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="pt-12 pb-6 border-t border-white/[0.02] flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500 font-body">
            <p>© 2026 Salt & Peps. For research purposes only.</p>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-slate-300 transition-colors">Terms</Link>
              <Link href="#" className="hover:text-slate-300 transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-slate-300 transition-colors">Contact</Link>
            </div>
          </footer>

        </div>
      </main>
    </div>
  );
}
