import React, { useState } from "react";
import { 
  Search, 
  Home, 
  Package, 
  Beaker, 
  BookOpen, 
  Calculator, 
  Activity, 
  Search as SearchIcon,
  ShoppingCart,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PRODUCTS = [
  { id: "621650", name: "Retatrutide 10mg", category: "GLP-1", mg: "10", price: "$20.00", inStock: true, lotTag: "TESTED" },
  { id: "8a3f21", name: "Semaglutide 5mg", category: "GLP-1", mg: "5", price: "$18.00", inStock: true, lotTag: "TESTED" },
  { id: "c7d849", name: "BPC-157 5mg", category: "Repair", mg: "5", price: "$15.00", inStock: true, lotTag: "TESTED" },
  { id: "e1b293", name: "TB-500 10mg", category: "Repair", mg: "10", price: "$22.00", inStock: false, lotTag: "COA" },
  { id: "f40a17", name: "GLP-1 Fragment 2mg", category: "GLP-1", mg: "2", price: "$12.00", inStock: true, lotTag: "TESTED" },
  { id: "a91c55", name: "Ipamorelin 5mg", category: "GH", mg: "5", price: "$16.00", inStock: true, lotTag: "TESTED" },
];

const RESOURCES = [
  { label: "The Lonely Vial", sub: "Single-vial, no minimums", icon: Package, path: "/shop" },
  { label: "Accessories", sub: "BAC water, prep kits", icon: ShoppingCart, path: "/accessories" },
  { label: "Lab Reports", sub: "352+ Janoshik CoAs", icon: Beaker, path: "/tests" },
  { label: "Protocols", sub: "30+ peptide guides", icon: BookOpen, path: "/protocols" },
];

const UTILITIES = [
  { label: "Dose Calculator", sub: "Reconstitution volumes", icon: Calculator, path: "/calculator" },
  { label: "Endotoxin Calc", sub: "EU/kg safety threshold", icon: Activity, path: "/endotoxin" },
  { label: "Order Lookup", sub: "Track by order code", icon: SearchIcon, path: "/lookup" },
];

export function SearchFirst() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<Record<string, number>>({});

  const categories = ["All", "GLP-1", "Repair", "GH Peptides"];

  const filteredProducts = PRODUCTS.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesCategory = true;
    if (activeCategory !== "All") {
      if (activeCategory === "GH Peptides") {
        matchesCategory = product.category === "GH";
      } else {
        matchesCategory = product.category === activeCategory;
      }
    }

    return matchesSearch && matchesCategory;
  });

  const addToCart = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[id] > 1) {
        newCart[id]--;
      } else {
        delete newCart[id];
      }
      return newCart;
    });
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-['Inter'] overflow-hidden">
      {/* Narrow Sidebar */}
      <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-8 z-10 shadow-sm">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl cursor-pointer">
          S
        </div>
        <nav className="flex flex-col gap-6 w-full items-center">
          <button className="p-3 text-blue-600 bg-blue-50 rounded-xl transition-colors group relative">
            <Search className="w-5 h-5" />
          </button>
          <button className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors">
            <Home className="w-5 h-5" />
          </button>
          <button className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors relative">
            <ShoppingCart className="w-5 h-5" />
            {Object.values(cart).reduce((a, b) => a + b, 0) > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white"></span>
            )}
          </button>
          <button className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors">
            <Activity className="w-5 h-5" />
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Sticky Search Header */}
        <div className="pt-10 pb-6 px-10 bg-white border-b border-slate-200 shadow-sm z-10 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-2xl text-lg text-slate-900 placeholder-slate-400 focus:ring-0 focus:border-blue-500 transition-colors bg-slate-50/50 hover:bg-white focus:bg-white"
                placeholder="Find a compound..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                    ${activeCategory === cat 
                      ? "bg-slate-900 text-white shadow-md" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Results */}
        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex justify-between items-end">
              <h2 className="text-xl font-semibold text-slate-800">
                {searchQuery ? "Search Results" : activeCategory === "All" ? "All Compounds" : `${activeCategory} Compounds`}
              </h2>
              <span className="text-slate-500 text-sm">{filteredProducts.length} items</span>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">No compounds found</h3>
                <p className="text-slate-500">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-shadow flex flex-col group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">{product.category}</span>
                        <h3 className="font-bold text-slate-900 text-lg leading-tight">{product.name}</h3>
                      </div>
                      <Badge variant="outline" className={`bg-blue-50 text-blue-700 border-blue-200 flex-shrink-0 ml-2`}>
                        {product.lotTag}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-6">
                      <span className="text-2xl font-bold text-slate-900">{product.price}</span>
                      {!product.inStock && (
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Out of stock
                        </span>
                      )}
                    </div>

                    <div className="mt-auto">
                      {cart[product.id] ? (
                        <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1 border border-slate-200">
                          <button 
                            onClick={() => removeFromCart(product.id)}
                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-semibold w-8 text-center">{cart[product.id]}</span>
                          <button 
                            onClick={() => addToCart(product.id)}
                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => addToCart(product.id)}
                          disabled={!product.inStock}
                          className={`w-full rounded-xl py-6 font-semibold ${product.inStock ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 text-slate-400'}`}
                          variant={product.inStock ? "default" : "secondary"}
                        >
                          {product.inStock ? "Add to Order" : "Notify Me"}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Rail - Resources */}
      <div className="w-[280px] bg-white border-l border-slate-200 overflow-y-auto flex-shrink-0 shadow-sm z-10">
        <div className="p-6">
          <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Resources</h3>
            <div className="flex flex-col gap-1">
              {RESOURCES.map((item, i) => (
                <button key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group">
                  <div className="bg-slate-100 text-slate-500 p-2 rounded-lg group-hover:bg-white group-hover:text-blue-600 transition-colors shadow-sm">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{item.label}</div>
                    <div className="text-xs text-slate-500">{item.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Utilities</h3>
            <div className="flex flex-col gap-1">
              {UTILITIES.map((item, i) => (
                <button key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group">
                  <div className="bg-slate-100 text-slate-500 p-2 rounded-lg group-hover:bg-white group-hover:text-blue-600 transition-colors shadow-sm">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{item.label}</div>
                    <div className="text-xs text-slate-500">{item.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> All batches tested
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every compound is verified by Janoshik before shipping.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
