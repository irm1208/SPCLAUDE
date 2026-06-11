import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Filter, 
  Search, 
  X, 
  Star, 
  ShieldCheck, 
  MapPin, 
  ExternalLink,
  MessageCircle,
  AlertCircle,
  Check
} from 'lucide-react';

// --- Types & Data ---
type Product = {
  id: string;
  name: string;
  abbreviation: string;
  price: number;
  currency: string;
  category: string;
  stock: number;
  seller: {
    name: string;
    rating: number;
    reviews: number;
  };
  shipsTo: string;
  batch: string;
  coaUrl: string;
  contact: string;
};

const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Retatrutide 10mg',
    abbreviation: 'RT',
    price: 65.00,
    currency: 'USDT',
    category: 'Peptides',
    stock: 5,
    seller: {
      name: 'BioLabs Inc',
      rating: 4.9,
      reviews: 124
    },
    shipsTo: 'Worldwide',
    batch: 'B-4492',
    coaUrl: '#',
    contact: '@biolabs_tg'
  },
  {
    id: 'p2',
    name: 'Tirzepatide 15mg',
    abbreviation: 'TZ',
    price: 85.00,
    currency: 'USDT',
    category: 'Peptides',
    stock: 12,
    seller: {
      name: 'Apex Peptides',
      rating: 4.7,
      reviews: 89
    },
    shipsTo: 'US & Canada',
    batch: 'T-1022',
    coaUrl: '#',
    contact: '@apex_peps'
  },
  {
    id: 'p3',
    name: 'BPC-157 5mg',
    abbreviation: 'BP',
    price: 25.00,
    currency: 'USDT',
    category: 'Recovery',
    stock: 0,
    seller: {
      name: 'HealWell Labs',
      rating: 4.8,
      reviews: 210
    },
    shipsTo: 'Worldwide',
    batch: 'H-991',
    coaUrl: '#',
    contact: '@healwell_tg'
  },
  {
    id: 'p4',
    name: 'Semaglutide 5mg',
    abbreviation: 'SG',
    price: 45.00,
    currency: 'USDT',
    category: 'Peptides',
    stock: 45,
    seller: {
      name: 'BioLabs Inc',
      rating: 4.9,
      reviews: 124
    },
    shipsTo: 'Worldwide',
    batch: 'S-7721',
    coaUrl: '#',
    contact: '@biolabs_tg'
  }
];

const FILTERS = {
  categories: ['Peptides', 'Recovery', 'Nootropics', 'Amino Acids'],
  sellers: ['BioLabs Inc', 'Apex Peptides', 'HealWell Labs', 'Quantum Chem'],
  countries: ['Worldwide', 'US Only', 'EU Only', 'US & Canada'],
  payments: ['Crypto (USDT)', 'Bank Transfer', 'Credit Card']
};

// --- Components ---

export function GridGallery() {
  const [currency, setCurrency] = useState<'$ USD' | '£ GBP'>('$ USD');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>(['Peptides', 'Worldwide']);
  const [cartCount, setCartCount] = useState(2);

  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-[#1B3A7A]">The Lonely Vial</h1>
            <span className="text-xs text-slate-500 font-medium">Single vials · No kits</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center text-sm font-medium text-slate-600 border border-slate-200 rounded-md overflow-hidden">
              <button 
                className={`px-3 py-1 ${currency === '$ USD' ? 'bg-slate-100 text-[#1B3A7A]' : 'hover:bg-slate-50'}`}
                onClick={() => setCurrency('$ USD')}
              >
                $ USD
              </button>
              <button 
                className={`px-3 py-1 ${currency === '£ GBP' ? 'bg-slate-100 text-[#1B3A7A]' : 'hover:bg-slate-50'}`}
                onClick={() => setCurrency('£ GBP')}
              >
                £ GBP
              </button>
            </div>
            
            <button className="relative p-2 text-slate-600 hover:text-[#1B3A7A] transition-colors">
              <ShoppingBag className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-[#2D6BCC] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by peptide, seller, or batch..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2D6BCC] focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsFilterOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilters.length > 0 && (
                <span className="bg-[#1B3A7A] text-white text-xs px-2 py-0.5 rounded-full ml-1">
                  {activeFilters.length}
                </span>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-4 text-sm font-medium text-[#2D6BCC]">
              <a href="#" className="hover:underline">My Account</a>
              <a href="#" className="hover:underline">Sell with us</a>
            </div>
          </div>
        </div>

        {/* Active Filters Bubbles */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-sm text-slate-500 mr-1">Active:</span>
            {activeFilters.map(filter => (
              <span key={filter} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#1B3A7A] text-sm font-medium rounded-full border border-blue-100">
                {filter}
                <button onClick={() => toggleFilter(filter)} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button 
              onClick={() => setActiveFilters([])}
              className="text-sm text-slate-500 hover:text-slate-700 ml-2 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {PRODUCTS.map(product => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow group">
              {/* Card Color Block Header */}
              <div className="h-32 bg-gradient-to-br from-[#071640] to-[#1B3A7A] relative p-4 flex flex-col justify-between items-start overflow-hidden text-white">
                <div className="absolute -bottom-6 -right-4 text-[120px] font-black opacity-10 leading-none pointer-events-none select-none">
                  {product.abbreviation}
                </div>
                <div className="relative z-10 w-full flex justify-between items-start">
                  <span className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider">
                    {product.category}
                  </span>
                  {product.stock > 0 && product.stock <= 5 && (
                    <span className="flex items-center gap-1 text-xs font-medium bg-orange-500 text-white px-2 py-1 rounded">
                      <AlertCircle className="w-3 h-3" />
                      Only {product.stock} left
                    </span>
                  )}
                  {product.stock === 0 && (
                    <span className="text-xs font-medium bg-red-500/80 backdrop-blur-md text-white px-2 py-1 rounded">
                      Out of Stock
                    </span>
                  )}
                </div>
                <div className="relative z-10">
                  <div className="text-3xl font-bold tracking-tight">
                    ${product.price.toFixed(2)}
                    <span className="text-sm font-medium text-white/70 ml-1">{product.currency}</span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-[#2D6BCC] transition-colors">{product.name}</h3>
                
                <div className="space-y-2 mb-6 flex-1">
                  {/* Seller info */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span className="font-medium">{product.seller.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-medium text-slate-700">{product.seller.rating}</span>
                      <span className="text-xs">({product.seller.reviews})</span>
                    </div>
                  </div>

                  {/* Shipping & Contact */}
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {product.shipsTo}
                    </div>
                    <a href="#" className="flex items-center gap-1.5 hover:text-[#2D6BCC]">
                      <MessageCircle className="w-4 h-4 text-slate-400" />
                      {product.contact}
                    </a>
                  </div>

                  {/* Batch & COA */}
                  <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                    <span className="text-slate-500">Batch: <span className="font-mono text-slate-700">{product.batch}</span></span>
                    <a href={product.coaUrl} className="flex items-center gap-1 text-[#2D6BCC] font-medium hover:underline">
                      View COA <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 mt-auto">
                  <button 
                    disabled={product.stock === 0}
                    className="w-full py-2.5 px-3 bg-white border border-[#2D6BCC] text-[#2D6BCC] font-semibold rounded-lg hover:bg-blue-50 focus:ring-2 focus:ring-[#2D6BCC] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-white"
                  >
                    Add to Cart
                  </button>
                  <button 
                    disabled={product.stock === 0}
                    className="w-full py-2.5 px-3 bg-[#1B3A7A] hover:bg-[#071640] text-white font-semibold rounded-lg focus:ring-2 focus:ring-[#1B3A7A] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:hover:bg-[#1B3A7A]"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Filter Drawer Overlay */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-[#1B3A7A] flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </h2>
              <button 
                onClick={() => setIsFilterOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Category */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Category</h3>
                <div className="space-y-2.5">
                  {FILTERS.categories.map(cat => (
                    <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${activeFilters.includes(cat) ? 'bg-[#2D6BCC] border-[#2D6BCC] text-white' : 'border-slate-300 bg-white group-hover:border-[#2D6BCC]'}`}>
                        {activeFilters.includes(cat) && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <input 
                        type="checkbox" 
                        className="sr-only"
                        checked={activeFilters.includes(cat)}
                        onChange={() => toggleFilter(cat)}
                      />
                      <span className="text-slate-700 group-hover:text-slate-900">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Seller */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Seller</h3>
                <div className="space-y-2.5">
                  {FILTERS.sellers.map(seller => (
                    <label key={seller} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${activeFilters.includes(seller) ? 'bg-[#2D6BCC] border-[#2D6BCC] text-white' : 'border-slate-300 bg-white group-hover:border-[#2D6BCC]'}`}>
                        {activeFilters.includes(seller) && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <input 
                        type="checkbox" 
                        className="sr-only"
                        checked={activeFilters.includes(seller)}
                        onChange={() => toggleFilter(seller)}
                      />
                      <span className="text-slate-700 group-hover:text-slate-900">{seller}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* In Stock Only Toggle */}
              <div className="pt-4 border-t border-slate-100">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="font-bold text-slate-900">In Stock Only</span>
                  <div className="relative inline-flex items-center h-6 rounded-full w-11 transition-colors bg-[#2D6BCC]">
                    <span className="inline-block w-4 h-4 transform transition-transform translate-x-6 bg-white rounded-full" />
                  </div>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-slate-50">
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setActiveFilters([])}
                  className="px-4 py-3 text-slate-700 font-semibold hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Reset
                </button>
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="px-4 py-3 bg-[#1B3A7A] hover:bg-[#071640] text-white font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Show Results
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
