import React, { useState } from "react";
import { 
  ChevronDown, 
  Minus, 
  Plus, 
  Droplet, 
  ShieldCheck, 
  BadgeCheck, 
  CreditCard, 
  Search,
  FlaskConical,
  BookOpen,
  Calculator,
  AlertTriangle,
  Menu
} from "lucide-react";

export function QuickOrder() {
  const [quantity, setQuantity] = useState(1);
  const [bacVolume, setBacVolume] = useState("2");
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const price = 20.00;
  const total = (price * quantity).toFixed(2);
  
  const dose = (10 / parseFloat(bacVolume || "1")).toFixed(1);

  return (
    <div className="min-h-[100dvh] bg-white text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white flex flex-col relative pb-24">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <div>
          <h1 className="text-xs font-bold tracking-widest uppercase text-zinc-900">Peps Anonymous</h1>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1">Group Buy Closes 28 Oct</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-medium text-zinc-900 border border-zinc-200">
            SP
          </div>
        </div>
      </header>

      {/* Main Order Flow */}
      <main className="flex-1 flex flex-col justify-center px-6 max-w-lg mx-auto w-full">
        <div className="space-y-12 w-full py-8">
          
          {/* Product Selection */}
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-4xl font-light tracking-tight text-zinc-900">Retatrutide</h2>
              <span className="text-2xl font-light text-zinc-400">10mg</span>
            </div>
            
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wider">
              <span className="text-zinc-900">${price.toFixed(2)} / vial</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
              <span className="text-zinc-500">Lot 621650</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
              <span className="text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Tested
              </span>
            </div>
          </div>

          {/* Quantity & Reconstitution */}
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Quantity</label>
              <div className="flex items-center border-b border-zinc-200 pb-2">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 -ml-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="flex-1 text-center text-3xl font-light">
                  {quantity}
                </div>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 -mr-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Reconstitution</label>
                <span className="text-xs text-zinc-400">{dose}mg per 0.1ml (10 units)</span>
              </div>
              <div className="flex items-center border-b border-zinc-200 pb-2">
                <input 
                  type="number" 
                  value={bacVolume}
                  onChange={(e) => setBacVolume(e.target.value)}
                  className="flex-1 text-3xl font-light bg-transparent focus:outline-none w-full"
                  placeholder="0"
                />
                <span className="text-zinc-400 text-lg">ml BAC</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-4">
            <button className="w-full bg-zinc-900 text-white h-16 flex items-center justify-between px-6 rounded-none hover:bg-zinc-800 transition-colors group">
              <span className="text-sm font-medium uppercase tracking-widest">Add to Order</span>
              <span className="text-lg font-light group-hover:translate-x-1 transition-transform">${total}</span>
            </button>
          </div>

          {/* Trust Signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[10px] uppercase tracking-wider text-zinc-400 pt-8">
            <span className="flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5" /> CoA Tested</span>
            <span className="flex items-center gap-1.5"><Droplet className="w-3.5 h-3.5" /> BAC-Safe</span>
            <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> USDT</span>
            <span className="flex items-center gap-1.5"><Search className="w-3.5 h-3.5" /> Janoshik</span>
          </div>

        </div>
      </main>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div 
          className="fixed inset-0 bg-black/5 z-40 transition-opacity"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* More Drawer */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 z-50 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${drawerOpen ? 'translate-y-0' : 'translate-y-[calc(100%-64px)]'}`}
      >
        <button 
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="w-full h-16 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-widest text-zinc-900 hover:bg-zinc-50 transition-colors"
        >
          <Menu className="w-4 h-4" />
          <span>Explore Platform</span>
        </button>
        
        <div className="px-6 pb-12 pt-4 max-w-lg mx-auto grid grid-cols-2 gap-x-8 gap-y-10">
          <div className="space-y-6">
            <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-4">Destinations</h3>
            <a href="#" className="group flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-100 transition-colors shrink-0">
                <FlaskConical className="w-4 h-4 text-zinc-900" />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-900">The Lonely Vial</div>
                <div className="text-xs text-zinc-500 mt-0.5">Single-vial orders</div>
              </div>
            </a>
            <a href="#" className="group flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-100 transition-colors shrink-0">
                <Droplet className="w-4 h-4 text-zinc-900" />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-900">Accessories</div>
                <div className="text-xs text-zinc-500 mt-0.5">BAC water & kits</div>
              </div>
            </a>
            <a href="#" className="group flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-100 transition-colors shrink-0">
                <Search className="w-4 h-4 text-zinc-900" />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-900">Lab Reports</div>
                <div className="text-xs text-zinc-500 mt-0.5">352+ Janoshik CoAs</div>
              </div>
            </a>
            <a href="#" className="group flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-100 transition-colors shrink-0">
                <BookOpen className="w-4 h-4 text-zinc-900" />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-900">Protocols</div>
                <div className="text-xs text-zinc-500 mt-0.5">30+ peptide guides</div>
              </div>
            </a>
          </div>
          
          <div className="space-y-6">
            <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-4">Utilities</h3>
            <a href="#" className="group flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-100 transition-colors shrink-0">
                <Calculator className="w-4 h-4 text-zinc-900" />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-900">Dose Calc</div>
                <div className="text-xs text-zinc-500 mt-0.5">Reconstitution math</div>
              </div>
            </a>
            <a href="#" className="group flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-100 transition-colors shrink-0">
                <AlertTriangle className="w-4 h-4 text-zinc-900" />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-900">Endotoxin</div>
                <div className="text-xs text-zinc-500 mt-0.5">EU/kg safety limits</div>
              </div>
            </a>
            <a href="#" className="group flex items-start gap-3">
              <div className="w-8 h-8 rounded bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-100 transition-colors shrink-0">
                <Search className="w-4 h-4 text-zinc-900" />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-900">Order Lookup</div>
                <div className="text-xs text-zinc-500 mt-0.5">Track by code</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
