import React, { useState } from "react";
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  ChevronDown, 
  Check, 
  FileText, 
  MessageCircle, 
  ShieldCheck, 
  Globe, 
  AlertCircle,
  Clock,
  ArrowRightLeft
} from "lucide-react";

export function ScanList() {
  const [currency, setCurrency] = useState<"USD" | "GBP">("USD");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>("Category");

  const products = [
    {
      id: 1,
      name: "Retatrutide 10mg",
      price: 20.00,
      currency: "USDT",
      category: "Peptides",
      stock: 5,
      seller: "OptimumLabs",
      rating: 4.9,
      shipsTo: "Worldwide",
      batch: "RET-8821",
      hasCoa: true,
      contact: "@optimum_support",
      status: "low_stock"
    },
    {
      id: 2,
      name: "BPC-157 5mg",
      price: 15.50,
      currency: "USDT",
      category: "Peptides",
      stock: 142,
      seller: "HealTech",
      rating: 5.0,
      shipsTo: "US/UK/EU",
      batch: "BPC-9011",
      hasCoa: true,
      contact: "@healtech",
      status: "in_stock"
    },
    {
      id: 3,
      name: "Tirzepatide 15mg",
      price: 38.00,
      currency: "USDT",
      category: "Peptides",
      stock: 0,
      seller: "MedSupply",
      rating: 4.7,
      shipsTo: "Worldwide",
      batch: "TIR-4412",
      hasCoa: false,
      contact: "@medsupply_bot",
      status: "out_of_stock"
    },
    {
      id: 4,
      name: "Tesamorelin 10mg",
      price: 42.00,
      currency: "USDT",
      category: "Peptides",
      stock: 12,
      seller: "OptimumLabs",
      rating: 4.9,
      shipsTo: "Worldwide",
      batch: "TES-1102",
      hasCoa: true,
      contact: "@optimum_support",
      status: "in_stock"
    }
  ];

  const filters = [
    "Category", "Seller", "Peptide", "Country", "Manufacturer", "Payment"
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#071640] to-[#1B3A7A] text-white sticky top-0 z-20 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#2D6BCC]"></div>
                The Lonely Vial
              </h1>
              <p className="text-xs text-slate-300 font-medium tracking-wide uppercase opacity-80 mt-0.5">Single vials · No kits</p>
            </div>
            
            <div className="hidden md:flex items-center gap-4 ml-4 text-sm text-slate-200 border-l border-white/10 pl-6">
              <button className="hover:text-white transition-colors">My Account</button>
              <button className="hover:text-white transition-colors">Sell with us</button>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center bg-black/20 rounded-md p-1 border border-white/10">
              <button 
                onClick={() => setCurrency("USD")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-sm transition-all ${currency === "USD" ? "bg-white text-[#1B3A7A] shadow-sm" : "text-slate-300 hover:text-white"}`}
              >
                $ USD
              </button>
              <button 
                onClick={() => setCurrency("GBP")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-sm transition-all ${currency === "GBP" ? "bg-white text-[#1B3A7A] shadow-sm" : "text-slate-300 hover:text-white"}`}
              >
                £ GBP
              </button>
            </div>
            
            <button className="relative p-2 text-slate-200 hover:text-white transition-colors">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#2D6BCC] text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-[#1B3A7A]">
                3
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between text-sm overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 border-r border-slate-200 pr-3 mr-1">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-700">Filter</span>
            </div>
            
            {filters.map(filter => (
              <button 
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors whitespace-nowrap
                  ${activeFilter === filter 
                    ? "bg-[#1B3A7A]/10 border-[#1B3A7A]/30 text-[#1B3A7A]" 
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
              >
                {filter}
                <ChevronDown className="w-3 h-3 opacity-50" />
              </button>
            ))}
          </div>

          <div className="flex items-center pl-4 border-l border-slate-200 ml-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${inStockOnly ? 'bg-[#1B3A7A] border-[#1B3A7A]' : 'border border-slate-300 bg-white group-hover:border-[#1B3A7A]'}`}>
                {inStockOnly && <Check className="w-3 h-3 text-white" />}
              </div>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={inStockOnly}
                onChange={() => setInStockOnly(!inStockOnly)}
              />
              <span className="text-xs font-medium text-slate-700 whitespace-nowrap">In Stock Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="max-w-7xl mx-auto w-full px-4 pt-6 pb-2">
        <div className="grid grid-cols-12 gap-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-4">Product & Details</div>
          <div className="col-span-3">Seller Info</div>
          <div className="col-span-2">Verification</div>
          <div className="col-span-3 text-right">Price & Action</div>
        </div>
      </div>

      {/* Product List */}
      <main className="max-w-7xl mx-auto w-full px-4 pb-12 flex-1">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {products.map((product, idx) => (
            <div 
              key={product.id} 
              className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors hover:bg-slate-50
                ${idx !== products.length - 1 ? 'border-b border-slate-100' : ''}
                ${product.status === 'out_of_stock' ? 'opacity-60 grayscale-[0.5]' : ''}
              `}
            >
              {/* Product & Details */}
              <div className="col-span-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">{product.name}</h3>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-semibold tracking-wide uppercase">
                    {product.category}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-xs">
                  {product.status === 'low_stock' && (
                    <span className="flex items-center gap-1 text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded">
                      <AlertCircle className="w-3 h-3" />
                      Only {product.stock} left
                    </span>
                  )}
                  {product.status === 'in_stock' && (
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <Check className="w-3 h-3" />
                      In Stock
                    </span>
                  )}
                  {product.status === 'out_of_stock' && (
                    <span className="flex items-center gap-1 text-red-600 font-medium">
                      <Clock className="w-3 h-3" />
                      Out of Stock
                    </span>
                  )}
                  
                  <span className="text-slate-400 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {product.shipsTo}
                  </span>
                </div>
              </div>

              {/* Seller Info */}
              <div className="col-span-3 flex flex-col gap-1.5 justify-center border-l border-slate-100 pl-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[#1B3A7A] hover:underline cursor-pointer">{product.seller}</span>
                  <div className="flex items-center gap-0.5 bg-[#1B3A7A]/5 text-[#1B3A7A] px-1.5 py-0.5 rounded text-[10px] font-bold">
                    <span>★</span> {product.rating}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MessageCircle className="w-3 h-3" />
                  <a href="#" className="hover:text-[#2D6BCC] hover:underline">{product.contact}</a>
                </div>
              </div>

              {/* Verification */}
              <div className="col-span-2 flex flex-col gap-1.5 justify-center border-l border-slate-100 pl-4">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
                  <span className="text-slate-400">Batch:</span> 
                  <span className="font-semibold bg-slate-100 px-1 rounded">{product.batch}</span>
                </div>
                {product.hasCoa ? (
                  <a href="#" className="flex items-center gap-1.5 text-xs font-medium text-[#2D6BCC] hover:underline w-fit">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    View COA
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <FileText className="w-3.5 h-3.5 opacity-50" />
                    No COA
                  </span>
                )}
              </div>

              {/* Price & Action */}
              <div className="col-span-3 flex items-center justify-between border-l border-slate-100 pl-4">
                <div className="flex flex-col">
                  <div className="flex items-end gap-1">
                    <span className="text-lg font-bold text-slate-900 leading-none">
                      ${currency === "GBP" ? (product.price * 0.79).toFixed(2) : product.price.toFixed(2)}
                    </span>
                    <span className="text-xs font-medium text-slate-500 pb-0.5">{product.currency}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    disabled={product.status === 'out_of_stock'}
                    className="p-2 border border-slate-200 text-slate-600 rounded hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add to Cart"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                  <button 
                    disabled={product.status === 'out_of_stock'}
                    className="px-4 py-2 bg-[#1B3A7A] hover:bg-[#071640] text-white text-sm font-semibold rounded shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
