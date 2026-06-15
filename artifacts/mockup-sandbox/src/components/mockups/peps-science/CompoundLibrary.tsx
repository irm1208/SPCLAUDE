import React, { useState } from "react";
import {
  FlaskConical,
  Microscope,
  ClipboardList,
  ShieldCheck,
  ExternalLink,
  Plus,
  Minus,
  Home,
  Droplets,
  BookMarked,
  Hash,
  ShieldAlert,
  Box,
  ReceiptText,
  MessageCircle,
  CheckCircle2,
  ChevronRight,
  Search,
  ShoppingCart
} from "lucide-react";

const PRODUCTS = [
  { id: "621650", name: "Retatrutide 10mg", mechanism: "GLP-1 / GIP / glucagon tri-agonist", category: "Weight Management", mg: "10", price: "$20.00", inStock: true, janoshikId: "26WQNEWELZ5T", testDate: "Mar 2026", purity: ">98%", batchId: "32342" },
  { id: "8a3f21", name: "Semaglutide 5mg", mechanism: "GLP-1 receptor agonist", category: "Weight Management", mg: "5", price: "$18.00", inStock: true, janoshikId: "84KQMRWELX2P", testDate: "Mar 2026", purity: ">97%", batchId: "31189" },
  { id: "c7d849", name: "BPC-157 5mg", mechanism: "Peptide body protection compound", category: "Repair & Recovery", mg: "5", price: "$15.00", inStock: true, janoshikId: "91HLPTWENY7R", testDate: "Feb 2026", purity: ">99%", batchId: "30041" },
  { id: "e1b293", name: "TB-500 5mg", mechanism: "Thymosin beta-4 fragment", category: "Repair & Recovery", mg: "10", price: "$22.00", inStock: false, janoshikId: "73JQNSWENZ4T", testDate: "Jan 2026", purity: ">98%", batchId: "29870" },
  { id: "f40a17", name: "GLP-1 Fragment 2mg", mechanism: "GLP-1 7-36 amide fragment", category: "Weight Management", mg: "2", price: "$12.00", inStock: true, janoshikId: "55RQPTWELO9S", testDate: "Mar 2026", purity: ">97%", batchId: "31654" },
  { id: "a91c55", name: "Ipamorelin 5mg", mechanism: "Growth hormone secretagogue", category: "Growth & Performance", mg: "5", price: "$16.00", inStock: true, janoshikId: "62TQVSWELN3U", testDate: "Feb 2026", purity: ">99%", batchId: "30887" },
];

export function CompoundLibrary() {
  const [cart, setCart] = useState<Record<string, number>>({});

  const updateCart = (id: string, delta: number) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "Weight Management":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Repair & Recovery":
        return "bg-teal-100 text-teal-900 border-teal-200";
      case "Growth & Performance":
        return "bg-violet-100 text-violet-900 border-violet-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <div className="flex h-screen bg-[#F9FAFB] font-['Inter'] text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center text-white font-['Plus_Jakarta_Sans'] font-bold text-lg">
              SP
            </div>
            <div>
              <div className="font-['Plus_Jakarta_Sans'] font-bold text-sm tracking-tight leading-tight">SALT & PEPS</div>
              <div className="text-[10px] text-slate-500 font-['Space_Mono'] uppercase tracking-wider">Research Co.</div>
            </div>
          </div>

          <nav className="space-y-1 mb-8">
            {[
              { icon: Home, label: "Home", active: true },
              { icon: FlaskConical, label: "Compounds", active: false },
              { icon: Microscope, label: "Lab Tests", active: false },
              { icon: BookMarked, label: "Protocols", active: false },
              { icon: Box, label: "Wholesale", active: false },
            ].map((item) => (
              <a
                key={item.label}
                href="#"
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  item.active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className={`w-4 h-4 ${item.active ? "text-slate-900" : "text-slate-400"}`} />
                {item.label}
              </a>
            ))}
          </nav>

          <div className="pt-6 border-t border-slate-100">
            <nav className="space-y-1">
              {[
                { icon: ReceiptText, label: "Orders" },
                { icon: MessageCircle, label: "Support" },
              ].map((item) => (
                <a
                  key={item.label}
                  href="#"
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <item.icon className="w-4 h-4 text-slate-400" />
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-auto p-6">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-xs font-['Space_Mono'] text-slate-500 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              QUALITY ASSURANCE
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">BATCH DATE</span>
                <span className="font-medium text-slate-900">Mar 2026</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">COAs ON FILE</span>
                <span className="font-medium text-slate-900">352</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative">
        {/* Top Header/Cart Mobile */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-white font-['Plus_Jakarta_Sans'] font-bold text-sm">
            SP
          </div>
          <button className="relative p-2 text-slate-600">
            <ShoppingCart className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 bg-[#2D6BCC] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        <div className="max-w-[1280px] w-full mx-auto px-4 md:px-8 py-6 md:py-8 flex flex-col min-h-max">
          {/* Compact Hero */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase font-['Space_Mono'] tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                RESEARCH COMPOUND LIBRARY
                <span className="w-8 h-px bg-slate-300 inline-block"></span>
              </div>
              <h1 className="text-3xl md:text-[28px] font-['Plus_Jakarta_Sans'] font-bold text-slate-900 mb-2 leading-tight">
                Salt & Peps
              </h1>
              <p className="text-slate-600 text-sm md:text-base">
                Research-grade peptides. Janoshik CoA on every lot.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 md:pb-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-sm">
                <FlaskConical className="w-3.5 h-3.5 text-slate-400" />
                Lab Tested
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                COA Published
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-sm">
                <Box className="w-3.5 h-3.5 text-slate-400" />
                UK Dispatch
              </div>
            </div>
          </div>

          {/* Compound Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {PRODUCTS.map((product) => (
              <div 
                key={product.id}
                className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col ${!product.inStock ? 'opacity-60 saturate-50' : ''}`}
              >
                <div className="p-5 flex-1 flex flex-col">
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-['Space_Mono'] uppercase tracking-wider font-bold border ${getCategoryStyles(product.category)}`}>
                      {product.category}
                    </span>
                    {!product.inStock && (
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wide">
                        Out of Stock
                      </span>
                    )}
                  </div>

                  {/* Identity */}
                  <h3 className="text-lg font-['Plus_Jakarta_Sans'] font-bold text-slate-900 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-500 mb-5 leading-relaxed min-h-[36px]">
                    {product.mechanism}
                  </p>

                  <div className="w-full h-px bg-slate-100 mb-4"></div>

                  {/* Data Chips */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <div className="bg-slate-50 border border-slate-100 px-2 py-1 rounded text-xs font-['Space_Mono'] text-slate-600 flex items-center gap-1.5">
                      <Droplets className="w-3 h-3 text-slate-400" />
                      {product.mg}mg
                    </div>
                    <div className="bg-slate-50 border border-slate-100 px-2 py-1 rounded text-xs font-['Space_Mono'] text-slate-600 flex items-center gap-1.5">
                      <Hash className="w-3 h-3 text-slate-400" />
                      Batch {product.batchId}
                    </div>
                    <div className="bg-slate-50 border border-slate-100 px-2 py-1 rounded text-xs font-['Space_Mono'] text-emerald-600 font-medium flex items-center gap-1.5">
                      <Microscope className="w-3 h-3 text-emerald-500" />
                      Purity {product.purity}
                    </div>
                  </div>

                  {/* Price & Verify */}
                  <div className="mt-auto flex items-end justify-between">
                    <div>
                      <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Price per vial</div>
                      <div className="text-2xl font-bold font-['Space_Mono'] text-slate-900 tracking-tight">
                        {product.price}
                      </div>
                    </div>
                    <a href="#" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors">
                      Janoshik Verified
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Action Area */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                  {!product.inStock ? (
                    <button disabled className="w-full py-2.5 rounded-lg bg-slate-100 text-slate-400 font-medium text-sm cursor-not-allowed">
                      Out of Stock
                    </button>
                  ) : cart[product.id] ? (
                    <div className="flex items-center justify-between w-full h-10 bg-white border border-[#2D6BCC] rounded-lg overflow-hidden">
                      <button 
                        onClick={() => updateCart(product.id, -1)}
                        className="w-12 h-full flex items-center justify-center text-[#2D6BCC] hover:bg-blue-50 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="flex-1 text-center font-['Space_Mono'] font-bold text-[#2D6BCC]">
                        {cart[product.id]} in cart
                      </div>
                      <button 
                        onClick={() => updateCart(product.id, 1)}
                        className="w-12 h-full flex items-center justify-center text-[#2D6BCC] hover:bg-blue-50 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => updateCart(product.id, 1)}
                      className="w-full py-2.5 rounded-lg bg-[#2D6BCC] text-white font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Research Set
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Resource Strip */}
          <div className="mt-auto border-t border-slate-200 pt-8 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0">
              {[
                { icon: ClipboardList, title: "Lab Reports", desc: "View all Janoshik certificates" },
                { icon: BookMarked, title: "Protocols", desc: "Research dosing guidelines" },
                { icon: ShieldAlert, title: "Dose Calculator", desc: "Calculate exact reconstitutions" },
                { icon: Search, title: "Order Lookup", desc: "Track shipment & batches" }
              ].map((resource, i) => (
                <div key={i} className="flex items-start gap-3 md:px-6 md:first:pl-0 md:last:pr-0 md:border-r border-slate-200 last:border-0 cursor-pointer group">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-50 group-hover:text-[#2D6BCC] transition-colors">
                    <resource.icon className="w-5 h-5 text-slate-500 group-hover:text-[#2D6BCC] transition-colors" />
                  </div>
                  <div>
                    <div className="text-sm font-bold font-['Plus_Jakarta_Sans'] text-slate-900 mb-0.5 group-hover:text-[#2D6BCC] transition-colors flex items-center gap-1">
                      {resource.title}
                      <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-[#2D6BCC] transition-colors" />
                    </div>
                    <div className="text-xs text-slate-500">{resource.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </main>
      
      {/* Floating Cart Indicator (Desktop) */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 right-6 hidden md:flex z-50 animate-in fade-in slide-in-from-bottom-4">
          <button className="bg-slate-900 text-white shadow-xl rounded-full px-6 py-3 flex items-center gap-3 hover:bg-slate-800 transition-colors">
            <div className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-['Space_Mono']">
              {cartCount}
            </div>
            <span className="font-medium text-sm">View Cart</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
