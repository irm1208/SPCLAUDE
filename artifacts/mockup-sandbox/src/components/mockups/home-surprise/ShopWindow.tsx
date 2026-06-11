import React, { useState } from "react";
import { Search, SlidersHorizontal, ChevronDown, Check, Beaker, ShoppingBag, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

const products = [
  { id: 1, name: "BPC-157", size: "5mg", price: 35, stock: "In Stock", color: "from-blue-500/20 to-blue-500/5", iconColor: "text-blue-400" },
  { id: 2, name: "TB-500", size: "5mg", price: 45, stock: "In Stock", color: "from-indigo-500/20 to-indigo-500/5", iconColor: "text-indigo-400" },
  { id: 3, name: "Semaglutide", size: "5mg", price: 80, stock: "Low Stock", color: "from-violet-500/20 to-violet-500/5", iconColor: "text-violet-400" },
  { id: 4, name: "Tirzepatide", size: "10mg", price: 110, stock: "Pre-Order", color: "from-purple-500/20 to-purple-500/5", iconColor: "text-purple-400" },
  { id: 5, name: "CJC-1295 w/ DAC", size: "2mg", price: 30, stock: "In Stock", color: "from-teal-500/20 to-teal-500/5", iconColor: "text-teal-400" },
  { id: 6, name: "GHK-Cu", size: "50mg", price: 40, stock: "In Stock", color: "from-cyan-500/20 to-cyan-500/5", iconColor: "text-cyan-400" },
  { id: 7, name: "Epithalon", size: "10mg", price: 25, stock: "In Stock", color: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-400" },
  { id: 8, name: "PT-141", size: "10mg", price: 35, stock: "In Stock", color: "from-rose-500/20 to-rose-500/5", iconColor: "text-rose-400" },
  { id: 9, name: "Retatrutide", size: "10mg", price: 150, stock: "Pre-Order", color: "from-fuchsia-500/20 to-fuchsia-500/5", iconColor: "text-fuchsia-400" },
  { id: 10, name: "Ipamorelin", size: "5mg", price: 25, stock: "In Stock", color: "from-sky-500/20 to-sky-500/5", iconColor: "text-sky-400" },
  { id: 11, name: "Tesamorelin", size: "5mg", price: 30, stock: "Low Stock", color: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-400" },
  { id: 12, name: "MOTS-c", size: "10mg", price: 55, stock: "In Stock", color: "from-orange-500/20 to-orange-500/5", iconColor: "text-orange-400" },
];

export function ShopWindow() {
  const [filter, setFilter] = useState("All");

  return (
    <div className="min-h-screen bg-[#0D1117] text-white flex justify-center font-sans selection:bg-[#22B8D4]/30">
      <div className="w-[820px] relative pb-32">
        {/* Top Bar */}
        <div className="pt-8 pb-6 px-6 sticky top-0 z-20 bg-[#0D1117]/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1DBF85] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#1DBF85]"></span>
              </div>
              <span className="text-sm text-gray-400 font-medium">
                Available Now · 52 vials · Last updated 3 min ago
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#1DBF85]" /> Janoshik CoA
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#1DBF85]" /> USDT Only
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex bg-[#161B22] p-1 rounded-lg border border-white/5">
              {["All", "In Stock", "Pre-Order"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    filter === f
                      ? "bg-[#22B8D4]/10 text-[#22B8D4] shadow-sm"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Search inventory..." 
                  className="bg-[#161B22] border border-white/5 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#22B8D4]/50 focus:ring-1 focus:ring-[#22B8D4]/50 w-48 transition-all"
                />
              </div>
              <Select defaultValue="price-asc">
                <SelectTrigger className="w-[140px] bg-[#161B22] border-white/5 h-9 text-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-white/10 text-white">
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="name">Name: A to Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="p-6 grid grid-cols-3 gap-5">
          {products.map((product) => (
            <div 
              key={product.id} 
              className="bg-[#161B22] rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-colors group flex flex-col relative overflow-hidden"
            >
              {/* Top info */}
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${product.color} flex items-center justify-center border border-white/5`}>
                  <Beaker className={`w-6 h-6 ${product.iconColor}`} />
                </div>
                {product.stock === "Pre-Order" && (
                  <Badge variant="secondary" className="bg-[#E09328]/10 text-[#E09328] hover:bg-[#E09328]/20 border-0 text-[10px] uppercase tracking-wider font-semibold">
                    Pre-Order
                  </Badge>
                )}
                {product.stock === "Low Stock" && (
                  <Badge variant="secondary" className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-0 text-[10px] uppercase tracking-wider font-semibold">
                    Low Stock
                  </Badge>
                )}
              </div>

              {/* Product Details */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-[#22B8D4] transition-colors">{product.name}</h3>
                <div className="text-sm text-gray-400 font-medium mb-4">{product.size}</div>
              </div>

              {/* Price & Action */}
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-white">${product.price}</span>
                  <span className="text-xs text-gray-500 font-medium">USDT</span>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="bg-white/5 hover:bg-[#22B8D4] hover:text-white text-gray-300 h-8 px-3 rounded-lg transition-all gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Checkout Bar */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[772px] z-50 pointer-events-none px-6">
          <div className="bg-[#22B8D4] text-[#0D1117] rounded-2xl p-1 shadow-2xl shadow-[#22B8D4]/20 pointer-events-auto flex items-center justify-between pl-6 pr-2">
            <div className="flex items-center gap-4">
              <div className="relative">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 bg-[#0D1117] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  2
                </span>
              </div>
              <div>
                <div className="font-semibold leading-tight">2 items selected</div>
                <div className="text-sm font-medium opacity-80 leading-tight">BPC-157 (5mg), Retatrutide (10mg)</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right mr-2">
                <div className="font-bold text-lg leading-tight">$185.00</div>
                <div className="text-xs font-semibold opacity-80 leading-tight">USDT Total</div>
              </div>
              <Button className="bg-[#0D1117] hover:bg-black text-white rounded-xl h-12 px-6 font-semibold text-base gap-2">
                Checkout
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
