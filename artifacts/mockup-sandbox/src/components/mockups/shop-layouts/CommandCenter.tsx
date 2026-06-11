import React, { useState } from 'react';
import { 
  Search, SlidersHorizontal, ChevronDown, Check,
  ShoppingCart, User, PlusCircle, ExternalLink,
  FileText, ShieldCheck, MapPin, Package, DollarSign,
  Info, AlertTriangle, ArrowRight
} from 'lucide-react';

const PRODUCTS = [
  {
    id: 1,
    name: "Retatrutide 10mg",
    category: "Peptides",
    price: 65.00,
    currency: "USDT",
    stock: 5,
    seller: "AlphaLabs",
    rating: 4.9,
    shipsTo: "Worldwide",
    batch: "RET-2024-01",
    hasCoa: true,
    contact: "@AlphaLabs_Support",
    manufacturer: "Qingdao"
  },
  {
    id: 2,
    name: "BPC-157 5mg",
    category: "Recovery",
    price: 25.00,
    currency: "USDC",
    stock: 12,
    seller: "PeptidePros",
    rating: 4.7,
    shipsTo: "US/EU Only",
    batch: "BPC-8892",
    hasCoa: true,
    contact: "@PepPros",
    manufacturer: "Sino"
  },
  {
    id: 3,
    name: "Tirzepatide 30mg",
    category: "Peptides",
    price: 110.00,
    currency: "BTC",
    stock: 2,
    seller: "AlphaLabs",
    rating: 4.9,
    shipsTo: "Worldwide",
    batch: "TIR-2024-03",
    hasCoa: false,
    contact: "@AlphaLabs_Support",
    manufacturer: "Qingdao"
  }
];

export function CommandCenter() {
  const [currency, setCurrency] = useState<'USD' | 'GBP'>('USD');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-gradient-to-r from-[#071640] to-[#1B3A7A] text-white px-4 py-2 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-bold tracking-tight">The Lonely Vial</h1>
          <span className="text-xs text-blue-200/80 hidden sm:inline-block">Single vials · No kits</span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center bg-white/10 rounded-md p-0.5">
            <button 
              className={`px-2 py-1 rounded-sm text-xs font-medium transition-colors ${currency === 'USD' ? 'bg-white text-[#1B3A7A]' : 'text-blue-100 hover:text-white'}`}
              onClick={() => setCurrency('USD')}
            >
              $ USD
            </button>
            <button 
              className={`px-2 py-1 rounded-sm text-xs font-medium transition-colors ${currency === 'GBP' ? 'bg-white text-[#1B3A7A]' : 'text-blue-100 hover:text-white'}`}
              onClick={() => setCurrency('GBP')}
            >
              £ GBP
            </button>
          </div>

          <div className="h-4 w-px bg-white/20"></div>

          <button className="flex items-center gap-1.5 text-blue-100 hover:text-white transition-colors">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">My Account</span>
          </button>
          
          <button className="flex items-center gap-1.5 text-blue-100 hover:text-white transition-colors">
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Sell with us</span>
          </button>

          <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md transition-colors ml-2 shadow-inner">
            <ShoppingCart className="w-4 h-4" />
            <span className="font-bold">2</span>
          </button>
        </div>
      </header>

      {/* Main Content Split */}
      <div className="flex-1 flex overflow-hidden max-w-[1600px] mx-auto w-full">
        
        {/* Left Sidebar (Filters) */}
        <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 hidden md:flex flex-col h-[calc(100vh-48px)] sticky top-[48px] overflow-y-auto">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              Filters
            </div>
            <button className="text-xs text-blue-600 hover:text-blue-800 hover:underline">
              Clear all
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* Search */}
            <div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search peptides..." 
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                />
              </div>
            </div>

            {/* Quick Toggles */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${inStockOnly ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white group-hover:border-blue-400'}`}>
                  {inStockOnly && <Check className="w-3 h-3" />}
                </div>
                <span className="text-sm text-slate-700 font-medium">In Stock Only</span>
              </label>
            </div>

            {/* Category */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Category</h3>
              <div className="space-y-1.5">
                {['All', 'Peptides', 'Recovery', 'Nootropics', 'Weight Loss'].map(cat => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="category" className="hidden" onChange={() => setActiveCategory(cat === 'All' ? null : cat)} checked={cat === 'All' ? activeCategory === null : activeCategory === cat} />
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                      (cat === 'All' ? activeCategory === null : activeCategory === cat) 
                        ? 'border-blue-600' : 'border-slate-300 group-hover:border-blue-400'
                    }`}>
                      {(cat === 'All' ? activeCategory === null : activeCategory === cat) && (
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      )}
                    </div>
                    <span className={`text-sm ${
                      (cat === 'All' ? activeCategory === null : activeCategory === cat)
                        ? 'text-blue-700 font-medium' : 'text-slate-600'
                    }`}>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Seller */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Seller</h3>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-md text-sm p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option>Any Seller</option>
                <option>AlphaLabs</option>
                <option>PeptidePros</option>
                <option>BioChem</option>
              </select>
            </div>

            {/* Country */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ships From</h3>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-md text-sm p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option>Any Location</option>
                <option>Domestic (USA)</option>
                <option>China</option>
                <option>Europe</option>
              </select>
            </div>

            {/* Manufacturer */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Manufacturer</h3>
              <div className="space-y-1.5">
                {['Qingdao', 'Sino', 'Unknown'].map(mfg => (
                  <label key={mfg} className="flex items-center gap-2 cursor-pointer group">
                    <div className="w-4 h-4 rounded border border-slate-300 bg-white group-hover:border-blue-400 transition-colors flex items-center justify-center"></div>
                    <span className="text-sm text-slate-600">{mfg}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Method</h3>
              <div className="flex flex-wrap gap-1.5">
                {['Crypto', 'Bank Transfer', 'Credit Card'].map(method => (
                  <button key={method} className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-200 hover:border-slate-300 transition-colors">
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Main Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50">
          {/* Results Header */}
          <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between sticky top-[48px] z-10">
            <div className="text-sm text-slate-600">
              Showing <span className="font-bold text-slate-900">142</span> vials
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-500">Sort by:</span>
              <select className="bg-transparent border-none text-slate-800 font-medium focus:ring-0 cursor-pointer p-0">
                <option>Newest Arrivals</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Product List */}
          <div className="p-6">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-4">Product / Category</div>
                <div className="col-span-5">Details</div>
                <div className="col-span-3 text-right">Price / Actions</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100">
                {PRODUCTS.map(product => (
                  <div key={product.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-blue-50/30 transition-colors items-center group">
                    
                    {/* Col 1: Product Name & Badges */}
                    <div className="col-span-4 flex flex-col gap-1.5">
                      <div className="flex items-start justify-between">
                        <h3 className="text-base font-bold text-slate-900 leading-tight group-hover:text-blue-700 transition-colors cursor-pointer">
                          {product.name}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium uppercase tracking-wide">
                          {product.category}
                        </span>
                        {product.stock <= 5 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wide">
                            <AlertTriangle className="w-3 h-3" />
                            Only {product.stock} left
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Col 2: Metadata */}
                    <div className="col-span-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-400">Seller</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-800">{product.seller}</span>
                          <span className="text-xs text-amber-500 font-bold flex items-center bg-amber-50 px-1 rounded">★ {product.rating}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-400">Ships To</span>
                        <div className="flex items-center gap-1 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {product.shipsTo}
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-400">Batch / Quality</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1 rounded">{product.batch}</span>
                          {product.hasCoa ? (
                            <a href="#" className="text-xs text-blue-600 flex items-center gap-0.5 hover:underline">
                              <ShieldCheck className="w-3.5 h-3.5" /> COA
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 flex items-center gap-0.5">
                              <Info className="w-3.5 h-3.5" /> No COA
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-400">Contact</span>
                        <a href="#" className="text-blue-600 hover:underline text-xs truncate">
                          {product.contact}
                        </a>
                      </div>
                    </div>

                    {/* Col 3: Price & Actions */}
                    <div className="col-span-3 flex flex-col items-end justify-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold text-slate-900">
                          {currency === 'USD' ? '$' : '£'}
                          {currency === 'USD' ? product.price.toFixed(2) : (product.price * 0.79).toFixed(2)}
                          <span className="text-xs text-slate-500 ml-1 font-normal">{product.currency}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 w-full justify-end">
                        <button className="flex-1 max-w-[100px] px-3 py-1.5 border border-slate-200 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-50 hover:border-slate-300 transition-all text-center">
                          Add to Cart
                        </button>
                        <button className="flex-1 max-w-[100px] px-3 py-1.5 bg-[#2D6BCC] text-white rounded-md text-xs font-bold hover:bg-blue-700 transition-all shadow-sm text-center">
                          Buy Now
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* Pagination Placeholder */}
            <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
              <div>Showing 1-3 of 142 items</div>
              <div className="flex items-center gap-1">
                <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50" disabled>Prev</button>
                <button className="px-3 py-1 border border-slate-200 rounded bg-blue-50 text-blue-600 font-medium">1</button>
                <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50">2</button>
                <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50">3</button>
                <span className="px-2">...</span>
                <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50">Next</button>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
