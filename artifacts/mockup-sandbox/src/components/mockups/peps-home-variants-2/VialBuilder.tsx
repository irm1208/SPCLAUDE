import React, { useState } from 'react';
import { Minus, Plus, ShoppingCart, TestTube, Search, FileText, FlaskConical, Beaker, Zap, ShieldCheck, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Product {
  id: string;
  name: string;
  dosage: string;
  price: number;
  lot: string;
  status: 'TESTED' | 'LOW_STOCK' | 'COMING_SOON';
  description: string;
}

const products: Product[] = [
  {
    id: 'ret-10',
    name: 'Retatrutide',
    dosage: '10mg',
    price: 20.00,
    lot: 'LOT 621650',
    status: 'TESTED',
    description: 'Triple agonist (GLP-1, GIP, GCGR)'
  },
  {
    id: 'bpc-15',
    name: 'BPC-157',
    dosage: '10mg',
    price: 15.00,
    lot: 'LOT 621651',
    status: 'LOW_STOCK',
    description: 'Body Protection Compound'
  },
  {
    id: 'tir-15',
    name: 'Tirzepatide',
    dosage: '15mg',
    price: 25.00,
    lot: 'PENDING',
    status: 'COMING_SOON',
    description: 'Dual agonist (GLP-1, GIP)'
  },
  {
    id: 'epi-10',
    name: 'Epithalon',
    dosage: '10mg',
    price: 18.00,
    lot: 'PENDING',
    status: 'COMING_SOON',
    description: 'Telomerase activator'
  }
];

export function VialBuilder() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState('vials');

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      const newCart = { ...prev };
      if (next === 0) {
        delete newCart[id];
      } else {
        newCart[id] = next;
      }
      return newCart;
    });
  };

  const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = products.find(p => p.id === id);
    return sum + (product ? product.price * qty : 0);
  }, 0);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50 font-sans pb-24">
      {/* Top Nav Area */}
      <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-indigo-900/50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-indigo-600 flex items-center justify-center font-black text-white">
              S&P
            </div>
            <span className="font-bold tracking-tight text-white">PEPS ANONYMOUS</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-slate-900 px-2 py-1 rounded-full border border-slate-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              @urbanblend789
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex px-2 pb-2 gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'vials', icon: TestTube, label: 'Builder' },
            { id: 'reports', icon: FileText, label: 'Lab Reports' },
            { id: 'protocols', icon: FlaskConical, label: 'Protocols' },
            { id: 'utilities', icon: Zap, label: 'Utilities' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Group Buy Status */}
        <div className="px-4 py-3 bg-indigo-950/30 border-t border-indigo-900/30">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-indigo-200 font-medium">Group Buy: Oct 2026 Batch</span>
            <span className="text-indigo-400 font-mono">6mo remaining</span>
          </div>
          <Progress value={35} className="h-1.5 bg-indigo-950 [&>div]:bg-indigo-500" />
        </div>
      </header>

      <main className="flex-1 p-4">
        {activeTab === 'vials' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-white tracking-tight">Select Compounds</h1>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] uppercase">
                  <ShieldCheck className="w-3 h-3 mr-1" /> CoA Tested
                </Badge>
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px] uppercase">
                  USDT Only
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map(product => {
                const qty = cart[product.id] || 0;
                const isSelected = qty > 0;
                const isComingSoon = product.status === 'COMING_SOON';

                return (
                  <Card 
                    key={product.id} 
                    className={`relative overflow-hidden transition-all duration-300 border-2 ${
                      isComingSoon ? 'opacity-60 grayscale-[0.5] border-slate-800 bg-slate-900/50' :
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-950/40 shadow-[0_0_30px_rgba(79,70,229,0.15)] ring-1 ring-indigo-500/50' 
                        : 'border-slate-800 bg-slate-900 hover:border-indigo-500/30'
                    }`}
                  >
                    {/* Decorative Background Elements */}
                    <div className="absolute -right-12 -top-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <CardContent className="p-0">
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-xl font-bold text-white tracking-tight">{product.name}</h3>
                              <span className="bg-slate-800 text-slate-300 text-xs px-1.5 py-0.5 rounded font-mono font-bold">
                                {product.dosage}
                              </span>
                            </div>
                            <p className="text-sm text-slate-400">{product.description}</p>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-lg font-black text-emerald-400">
                              ${product.price.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">USDT</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-6">
                          <div className="flex flex-col gap-1">
                            {product.status === 'TESTED' && (
                              <Badge className="w-fit bg-emerald-500 hover:bg-emerald-600 text-[10px] font-bold">
                                TESTED • JANOSHIK
                              </Badge>
                            )}
                            {product.status === 'LOW_STOCK' && (
                              <Badge variant="destructive" className="w-fit text-[10px] font-bold">
                                LOW STOCK
                              </Badge>
                            )}
                            {product.status === 'COMING_SOON' && (
                              <Badge variant="secondary" className="w-fit text-[10px] font-bold bg-slate-800">
                                <Clock className="w-3 h-3 mr-1" /> COMING SOON
                              </Badge>
                            )}
                            <span className="text-[10px] text-slate-500 font-mono uppercase mt-1">
                              {product.lot}
                            </span>
                          </div>

                          {!isComingSoon && (
                            <div className={`flex items-center rounded-full p-1 transition-colors ${isSelected ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className={`h-8 w-8 rounded-full ${isSelected ? 'text-white hover:bg-indigo-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                onClick={() => updateQuantity(product.id, -1)}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <div className={`w-8 text-center font-bold font-mono ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                {qty}
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className={`h-8 w-8 rounded-full ${isSelected ? 'text-white hover:bg-indigo-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                onClick={() => updateQuantity(product.id, 1)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {activeTab !== 'vials' && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
              <TestTube className="w-8 h-8 text-indigo-500 opacity-50" />
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-2">Area Restricted</h3>
            <p className="text-sm text-slate-500 max-w-[250px]">
              Navigate back to Builder to construct your order.
            </p>
          </div>
        )}
      </main>

      {/* Sticky Bottom Cart Bar */}
      <div className={`fixed bottom-0 left-0 right-0 z-30 transition-transform duration-300 ease-in-out ${totalItems > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="bg-indigo-950/90 backdrop-blur-xl border-t border-indigo-500/30 p-4 pb-safe shadow-[0_-10px_40px_rgba(79,70,229,0.2)]">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-indigo-300 font-medium mb-0.5">Your Order</span>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-white leading-none">${totalPrice.toFixed(2)}</span>
                <span className="text-xs text-indigo-400 font-mono mb-1">USDT</span>
              </div>
              <span className="text-[10px] text-indigo-200/70 mt-1">{totalItems} vial{totalItems !== 1 ? 's' : ''} selected</span>
            </div>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold h-12 px-6 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] w-full sm:w-auto">
              Checkout <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VialBuilder;
