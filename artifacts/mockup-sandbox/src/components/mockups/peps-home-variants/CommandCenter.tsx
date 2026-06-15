import React, { useState } from "react";
import { 
  Plus, 
  Minus, 
  ShoppingCart, 
  Clock, 
  ShieldCheck, 
  Activity, 
  Search, 
  FlaskConical, 
  BookOpen, 
  Calculator, 
  Droplets,
  Package,
  ActivitySquare,
  ShieldAlert
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// --- Mock Data ---
const INVENTORY = [
  { id: "RET-10", name: "Retatrutide", dose: "10mg", price: 20.00, lot: "621650", status: "TESTED", stock: "high" },
  { id: "RET-15", name: "Retatrutide", dose: "15mg", price: 28.50, lot: "621651", status: "TESTED", stock: "high" },
  { id: "TIR-10", name: "Tirzepatide", dose: "10mg", price: 18.00, lot: "882103", status: "LOW", stock: "low" },
  { id: "TIR-30", name: "Tirzepatide", dose: "30mg", price: 42.00, lot: "882104", status: "OOS", stock: "out" },
  { id: "BPC-05", name: "BPC-157", dose: "5mg", price: 12.00, lot: "109552", status: "TESTED", stock: "high" },
  { id: "TB-500", name: "TB-500", dose: "5mg", price: 14.50, lot: "109553", status: "TESTED", stock: "high" },
  { id: "CJC-12", name: "CJC-1295 no DAC", dose: "2mg", price: 16.00, lot: "441209", status: "LOW", stock: "low" },
  { id: "IPA-02", name: "Ipamorelin", dose: "2mg", price: 15.00, lot: "441210", status: "TESTED", stock: "high" },
];

const NAVIGATION = [
  { icon: Package, label: "The Lonely Vial", desc: "Single vials" },
  { icon: Droplets, label: "Accessories", desc: "BAC & prep" },
  { icon: ActivitySquare, label: "Lab Reports", desc: "352+ CoAs" },
  { icon: BookOpen, label: "Protocols", desc: "30+ guides" },
];

const UTILITIES = [
  { icon: Calculator, label: "Dose Calc" },
  { icon: FlaskConical, label: "Endotoxin" },
  { icon: Search, label: "Order Lookup" },
];

export function CommandCenter() {
  const [cart, setCart] = useState<Record<string, number>>({});

  const addToCart = (id: string) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[id] > 1) {
        newCart[id]--;
      } else {
        delete newCart[id];
      }
      return newCart;
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [id, qty]) => {
      const item = INVENTORY.find(i => i.id === id);
      return total + (item?.price || 0) * qty;
    }, 0);
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 font-sans selection:bg-slate-200">
      {/* Top Bar - User & Status */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-mono text-xs font-bold">
            <AvatarFallback className="rounded-md bg-transparent">SP</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-tight text-slate-900 uppercase">PEPS ANONYMOUS</span>
            <span className="text-[10px] text-slate-500 font-mono">@urbanblend789</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 px-2 font-mono text-xs bg-slate-50">
            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
            {totalItems > 0 ? (
              <span className="font-bold text-blue-600">${getCartTotal().toFixed(2)} ({totalItems})</span>
            ) : (
              <span className="text-slate-400">EMPTY</span>
            )}
          </Button>
        </div>
      </header>

      {/* Countdown Hero */}
      <section className="bg-slate-900 text-slate-50 px-4 py-6 border-b border-slate-800">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xs font-mono text-slate-400 mb-1 flex items-center uppercase tracking-widest">
              <Activity className="h-3 w-3 mr-1.5 text-emerald-400" />
              Live Group Buy
            </h1>
            <div className="text-2xl font-bold tracking-tight">Autumn Intake</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1">Closes In</div>
            <div className="flex gap-1.5 font-mono text-lg font-light">
              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">182</span>
              <span className="text-slate-600">:</span>
              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">14</span>
              <span className="text-slate-600">:</span>
              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">45</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals Bar */}
      <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 flex items-center justify-between text-[10px] font-mono text-emerald-800 uppercase overflow-x-auto whitespace-nowrap hide-scrollbar">
        <span className="flex items-center"><ShieldCheck className="h-3 w-3 mr-1" /> CoA Tested</span>
        <span className="mx-2 text-emerald-200">•</span>
        <span className="flex items-center"><Droplets className="h-3 w-3 mr-1" /> BAC-Safe</span>
        <span className="mx-2 text-emerald-200">•</span>
        <span className="flex items-center"><ActivitySquare className="h-3 w-3 mr-1" /> Janoshik</span>
      </div>

      {/* Main Inventory Terminal */}
      <main className="p-4 space-y-6 pb-24">
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Inventory Terminal</h2>
            <Badge variant="outline" className="font-mono text-[9px] px-1.5 py-0 border-slate-200 text-slate-500 rounded-sm">LIVE SYNC</Badge>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              <div>Compound / Lot</div>
              <div className="text-right w-16">Status</div>
              <div className="text-right w-20">Action</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-100">
              {INVENTORY.map((item) => (
                <div key={item.id} className={`grid grid-cols-[1fr_auto_auto] gap-2 p-3 items-center transition-colors ${item.stock === 'out' ? 'bg-slate-50/50 opacity-60' : 'hover:bg-slate-50/50'}`}>
                  
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="font-bold text-slate-900 text-sm truncate">{item.name}</span>
                      <span className="text-xs text-slate-500">{item.dose}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-slate-400">LOT {item.lot}</span>
                      <span className="text-slate-300">|</span>
                      <span className="font-medium text-slate-700">${item.price.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="w-16 text-right flex justify-end">
                    {item.status === 'TESTED' && (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[9px] px-1.5 py-0 font-mono rounded-sm">TESTED</Badge>
                    )}
                    {item.status === 'LOW' && (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[9px] px-1.5 py-0 font-mono rounded-sm">LOW</Badge>
                    )}
                    {item.status === 'OOS' && (
                      <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none text-[9px] px-1.5 py-0 font-mono rounded-sm">OOS</Badge>
                    )}
                  </div>

                  <div className="w-20 flex justify-end">
                    {item.stock === 'out' ? (
                      <Button disabled variant="outline" size="sm" className="h-7 w-full text-[10px] font-mono rounded-md border-slate-200">
                        NONE
                      </Button>
                    ) : cart[item.id] ? (
                      <div className="flex items-center bg-slate-900 rounded-md h-7 w-full overflow-hidden">
                        <button onClick={() => removeFromCart(item.id)} className="flex-1 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-[10px] font-mono font-bold text-white w-6 text-center">{cart[item.id]}</span>
                        <button onClick={() => addToCart(item.id)} className="flex-1 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => addToCart(item.id)} 
                        variant="outline" 
                        size="sm" 
                        className="h-7 w-full text-[10px] font-mono font-bold border-slate-300 text-slate-700 hover:border-slate-900 hover:bg-slate-900 hover:text-white transition-all rounded-md shadow-sm"
                      >
                        ADD
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Destinations */}
        <div className="grid grid-cols-2 gap-3">
          {NAVIGATION.map((nav) => (
            <Card key={nav.label} className="border-slate-200 shadow-sm hover:border-slate-300 transition-colors cursor-pointer rounded-lg">
              <CardContent className="p-3 flex items-start gap-3">
                <div className="p-2 bg-slate-100 rounded-md text-slate-600 shrink-0">
                  <nav.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 mb-0.5">{nav.label}</div>
                  <div className="text-[10px] text-slate-500 leading-tight">{nav.desc}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Utilities */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">Utilities</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {UTILITIES.map((util) => (
              <Button key={util.label} variant="outline" className="shrink-0 h-9 rounded-md border-slate-200 text-slate-600 text-xs px-3 shadow-sm hover:bg-slate-50">
                <util.icon className="h-3.5 w-3.5 mr-2 text-slate-400" />
                {util.label}
              </Button>
            ))}
          </div>
        </div>

      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}

export default CommandCenter;
