import React, { useState } from "react";
import { 
  ShoppingCart, 
  Activity, 
  FileText, 
  Settings2, 
  ChevronDown, 
  Calculator, 
  Search, 
  ShieldCheck, 
  ShieldAlert,
  Zap,
  ActivitySquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const PRODUCTS = [
  { id: 1, name: "Retatrutide", dose: "10mg", price: 65, stock: 12, purity: 99.8, status: "In Stock" },
  { id: 2, name: "Tirzepatide", dose: "30mg", price: 85, stock: 4, purity: 99.6, status: "Low Stock" },
  { id: 3, name: "BPC-157", dose: "5mg", price: 35, stock: 24, purity: 99.9, status: "In Stock" },
  { id: 4, name: "TB-500", dose: "10mg", price: 45, stock: 18, purity: 99.5, status: "In Stock" },
  { id: 5, name: "Semaglutide", dose: "5mg", price: 40, stock: 0, purity: 99.7, status: "Restocking" },
  { id: 6, name: "Tesamorelin", dose: "10mg", price: 55, stock: 8, purity: 99.4, status: "In Stock" },
];

export function CommandCenter() {
  const [utilitiesOpen, setUtilitiesOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0D1117] text-slate-300 font-sans selection:bg-[#9B6AF0]/30 pb-20">
      {/* Ticker / Status Bar */}
      <div className="sticky top-0 z-50 bg-[#0D1117]/80 backdrop-blur-md border-b border-white/5 px-4 py-2 flex items-center justify-between text-[10px] sm:text-xs font-mono uppercase tracking-wider text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1DBF85] animate-pulse"></span>
            System Live
          </span>
          <span className="hidden sm:inline opacity-50">/</span>
          <span className="hidden sm:inline text-white/70">52 Vials Available</span>
        </div>
        <div className="flex items-center gap-3 text-right">
          <span className="flex items-center gap-1">
            <span className="text-[#22B8D4]">352</span> Reports
          </span>
          <span className="opacity-50">/</span>
          <span className="text-[#E09328]">BTC/USDT</span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-8">
        
        {/* Trust Signals */}
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 text-[#22B8D4] text-[10px] uppercase tracking-widest font-medium bg-[#22B8D4]/10 px-2 py-1 rounded">
            <ShieldCheck className="w-3 h-3" />
            Janoshik Tested
          </div>
          <div className="flex items-center gap-1.5 text-[#1DBF85] text-[10px] uppercase tracking-widest font-medium bg-[#1DBF85]/10 px-2 py-1 rounded">
            <ActivitySquare className="w-3 h-3" />
            BAC Safe
          </div>
          <div className="flex items-center gap-1.5 text-[#E09328] text-[10px] uppercase tracking-widest font-medium bg-[#E09328]/10 px-2 py-1 rounded">
            <Zap className="w-3 h-3" />
            USDT Ready
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 gap-3">
          {PRODUCTS.map(p => (
            <Card key={p.id} className="bg-white/[0.02] border-white/5 rounded-xl overflow-hidden hover:bg-white/[0.04] transition-colors">
              <CardContent className="p-3">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white truncate">{p.name}</h3>
                    <p className="text-xs text-slate-500">{p.dose}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border-white/10 ${p.status === 'In Stock' ? 'text-[#1DBF85]' : p.status === 'Low Stock' ? 'text-[#E09328]' : 'text-slate-500'}`}>
                    {p.status === 'In Stock' ? 'IN' : p.status === 'Low Stock' ? 'LOW' : 'OUT'}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-end mt-4">
                  <div>
                    <div className="text-lg font-bold text-white">${p.price}</div>
                    <div className="text-[10px] text-[#22B8D4] font-mono">{p.purity}%</div>
                  </div>
                  <Button size="sm" variant="secondary" className="h-7 w-7 p-0 bg-[#9B6AF0]/20 hover:bg-[#9B6AF0]/40 text-[#9B6AF0] rounded-lg" disabled={p.stock === 0}>
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Nav Dock */}
        <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 rounded-2xl p-1.5">
          <button className="flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-colors">
            <ShoppingCart className="w-5 h-5 text-[#9B6AF0]" />
            <span className="text-[10px] font-medium tracking-wide">Shop</span>
          </button>
          <button className="flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <FileText className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-wide">Lab</span>
          </button>
          <button className="flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <Activity className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-wide">Protocols</span>
          </button>
          <button className="flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <Settings2 className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-wide">Kits</span>
          </button>
        </div>

        {/* Utilities Collapsible */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
          <button 
            onClick={() => setUtilitiesOpen(!utilitiesOpen)}
            className="w-full flex justify-between items-center p-4 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-slate-400" />
              Quick Tools
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${utilitiesOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {utilitiesOpen && (
            <div className="p-4 pt-0 space-y-3 border-t border-white/5 mt-2">
              <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#9B6AF0]/20 flex items-center justify-center text-[#9B6AF0] group-hover:bg-[#9B6AF0] group-hover:text-white transition-colors">
                    <ActivitySquare className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">Dose Calculator</div>
                    <div className="text-xs text-slate-500">mcg/mg conversion</div>
                  </div>
                </div>
              </button>
              
              <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#22B8D4]/20 flex items-center justify-center text-[#22B8D4] group-hover:bg-[#22B8D4] group-hover:text-white transition-colors">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">Endotoxin Calculator</div>
                    <div className="text-xs text-slate-500">EU limits by weight</div>
                  </div>
                </div>
              </button>

              <button className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E09328]/20 flex items-center justify-center text-[#E09328] group-hover:bg-[#E09328] group-hover:text-white transition-colors">
                    <Search className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">Order Lookup</div>
                    <div className="text-xs text-slate-500">Track via order ID</div>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
