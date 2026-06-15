import React, { useState } from "react";
import { ArrowRight, Beaker, CheckCircle2, ChevronRight, FileText, FlaskConical, Search, ShieldCheck, ShoppingBag } from "lucide-react";
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
  { label: "The Lonely Vial", sub: "Single-vial, no minimums", path: "/shop" },
  { label: "Accessories", sub: "BAC water, prep kits", path: "/accessories" },
  { label: "Lab Reports", sub: "352+ Janoshik CoAs", path: "/tests" },
  { label: "Protocols", sub: "30+ peptide guides", path: "/protocols" },
];

const UTILITIES = [
  { label: "Dose Calculator", sub: "Reconstitution volumes", path: "/calculator" },
  { label: "Endotoxin Calc", sub: "EU/kg safety threshold", path: "/endotoxin" },
  { label: "Order Lookup", sub: "Track by order code", path: "/lookup" },
];

export function Editorial() {
  const [cart, setCart] = useState<string[]>([]);

  const handleAdd = (id: string) => {
    setCart((prev) => [...prev, id]);
  };

  const featuredProduct = PRODUCTS[0];
  const inStockProducts = PRODUCTS.slice(1).filter((p) => p.inStock);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 font-['Inter'] flex flex-col items-center">
      {/* App Container - Constrained Width for Readability */}
      <div className="w-full max-w-[1280px] mx-auto bg-white min-h-screen shadow-sm border-x border-zinc-100 flex flex-col">
        
        {/* MASTHEAD */}
        <header className="px-8 py-10 border-b border-zinc-200 flex flex-col items-center relative">
          <div className="absolute top-10 left-8 text-xs font-medium tracking-widest text-zinc-500 uppercase">
            April 2026 · Issue 12
          </div>
          <div className="absolute top-10 right-8 text-xs font-medium tracking-widest text-zinc-500 uppercase">
            @urbanblend789
          </div>
          
          <h1 className="text-5xl md:text-6xl font-['Playfair_Display'] font-bold tracking-widest text-zinc-900 mt-8 mb-4 text-center">
            PEPS ANONYMOUS
          </h1>
          <p className="text-sm text-zinc-500 tracking-wide uppercase">
            Curated Compounds • Independently Verified
          </p>
        </header>

        <main className="flex-1 px-8 py-16 flex flex-col gap-24">
          
          {/* HERO FEATURE */}
          <section className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
              <span className="w-8 h-[1px] bg-zinc-300"></span>
              <h2 className="text-xl font-['Playfair_Display'] font-medium italic text-zinc-800">
                Featured This Batch
              </h2>
            </div>
            
            <div className="border border-zinc-200 bg-white p-8 md:p-12 flex flex-col md:flex-row gap-12 group hover:border-[#1B3A7A]/30 transition-colors duration-500">
              <div className="flex-1 flex flex-col items-start justify-center">
                <div className="flex items-center gap-3 mb-6">
                  <Badge variant="outline" className="rounded-none border-zinc-300 text-zinc-600 font-normal tracking-wide text-xs px-3 py-1">
                    {featuredProduct.category}
                  </Badge>
                  <div className="flex items-center text-xs font-medium tracking-widest text-[#1B3A7A] bg-[#1B3A7A]/5 px-2 py-1">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    {featuredProduct.lotTag}
                  </div>
                </div>
                
                <h3 className="text-4xl md:text-5xl font-['Playfair_Display'] font-semibold text-zinc-900 mb-4 leading-tight">
                  {featuredProduct.name}
                </h3>
                
                <p className="text-zinc-600 text-lg leading-relaxed mb-8 max-w-lg">
                  GLP-1 agonist. Independently verified by Janoshik, lot #32342. A profound metabolic tool demonstrating exceptional purity in this month's synthesis run.
                </p>
                
                <div className="flex items-center gap-6 mt-auto">
                  <span className="text-3xl font-['Playfair_Display']">{featuredProduct.price}</span>
                  <Button 
                    onClick={() => handleAdd(featuredProduct.id)}
                    className="bg-[#1B3A7A] hover:bg-[#122858] text-white rounded-none px-8 py-6 text-sm tracking-widest uppercase transition-all"
                  >
                    {cart.includes(featuredProduct.id) ? "Added" : "Order Now"}
                  </Button>
                </div>
              </div>
              
              <div className="w-full md:w-1/3 aspect-square md:aspect-auto bg-zinc-50 border border-zinc-100 flex items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-multiply"></div>
                <div className="w-32 h-48 border border-zinc-200 bg-white/50 backdrop-blur-sm shadow-sm flex items-center justify-center relative z-10">
                   <div className="text-center">
                     <FlaskConical className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                     <div className="text-[10px] font-['Space_Mono'] text-zinc-400">10MG VIAL</div>
                   </div>
                </div>
              </div>
            </div>
          </section>

          {/* IN STOCK CAROUSEL */}
          <section className="flex flex-col gap-8">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <span className="w-8 h-[1px] bg-zinc-300"></span>
                 <h2 className="text-xl font-['Playfair_Display'] font-medium italic text-zinc-800">
                   In Stock Now
                 </h2>
               </div>
               <div className="text-sm font-medium tracking-widest text-[#1B3A7A] uppercase cursor-pointer hover:underline underline-offset-4">
                 View All →
               </div>
             </div>
             
             {/* Horizontal scroll container */}
             <div className="flex overflow-x-auto pb-8 -mx-8 px-8 gap-6 snap-x hide-scrollbar">
               {inStockProducts.map((product) => (
                 <div 
                   key={product.id} 
                   className="min-w-[280px] w-[280px] snap-start border border-zinc-200 bg-white p-6 flex flex-col group hover:border-[#1B3A7A]/30 transition-colors"
                 >
                   <div className="flex justify-between items-start mb-12">
                     <div className="flex items-center text-[10px] font-bold tracking-widest text-[#1B3A7A] bg-[#1B3A7A]/5 px-2 py-0.5">
                       <ShieldCheck className="w-3 h-3 mr-1" />
                       {product.lotTag}
                     </div>
                     <span className="text-sm font-['Playfair_Display'] italic text-zinc-500">{product.mg}mg</span>
                   </div>
                   
                   <h4 className="text-xl font-['Playfair_Display'] font-semibold text-zinc-900 mb-2">
                     {product.name.split(' ')[0]}
                   </h4>
                   <p className="text-xs text-zinc-500 uppercase tracking-wider mb-6">
                     {product.category}
                   </p>
                   
                   <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-4">
                     <span className="text-lg font-['Playfair_Display']">{product.price}</span>
                     <button 
                       onClick={() => handleAdd(product.id)}
                       className="text-xs font-semibold tracking-widest uppercase text-[#1B3A7A] hover:text-[#122858] transition-colors flex items-center"
                     >
                       {cart.includes(product.id) ? "Added" : "Add +"}
                     </button>
                   </div>
                 </div>
               ))}
             </div>
          </section>

          {/* TWO COLUMN RESOURCES & UTILITIES */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 py-8 border-t border-zinc-200">
            {/* Resources */}
            <div>
               <h2 className="text-2xl font-['Playfair_Display'] font-medium text-zinc-900 mb-8">
                 This Month's Resources
               </h2>
               <div className="flex flex-col">
                 {RESOURCES.map((item, i) => (
                   <a 
                     key={i}
                     href="#"
                     onClick={(e) => e.preventDefault()}
                     className="group flex items-start gap-4 py-5 border-b border-zinc-100 last:border-0"
                   >
                     <ArrowRight className="w-4 h-4 mt-1 text-zinc-300 group-hover:text-[#1B3A7A] transition-colors" />
                     <div>
                       <div className="text-base font-medium text-zinc-900 group-hover:text-[#1B3A7A] transition-colors mb-1">
                         {item.label}
                       </div>
                       <div className="text-sm text-zinc-500 font-['Playfair_Display'] italic">
                         {item.sub}
                       </div>
                     </div>
                   </a>
                 ))}
               </div>
            </div>
            
            {/* Utilities */}
            <div>
               <h2 className="text-2xl font-['Playfair_Display'] font-medium text-zinc-900 mb-8">
                 Quick Tools
               </h2>
               <div className="flex flex-col">
                 {UTILITIES.map((item, i) => (
                   <a 
                     key={i}
                     href="#"
                     onClick={(e) => e.preventDefault()}
                     className="group flex items-start gap-4 py-5 border-b border-zinc-100 last:border-0"
                   >
                     <ArrowRight className="w-4 h-4 mt-1 text-zinc-300 group-hover:text-[#1B3A7A] transition-colors" />
                     <div>
                       <div className="text-base font-medium text-zinc-900 group-hover:text-[#1B3A7A] transition-colors mb-1">
                         {item.label}
                       </div>
                       <div className="text-sm text-zinc-500 font-['Playfair_Display'] italic">
                         {item.sub}
                       </div>
                     </div>
                   </a>
                 ))}
               </div>
            </div>
          </section>

        </main>

        {/* FOOTER */}
        <footer className="border-t border-zinc-200 px-8 py-12 flex flex-col md:flex-row justify-between items-center gap-6 text-sm">
          <p className="text-zinc-500 font-['Playfair_Display'] italic text-center md:text-left">
            All batches independently tested by Janoshik Analytical. CoA on every lot.
          </p>
          
          <div className="flex items-center gap-8">
            <a href="#" className="font-medium tracking-widest uppercase text-zinc-900 hover:text-[#1B3A7A] text-xs transition-colors">
              Telegram
            </a>
            <a href="#" className="font-medium tracking-widest uppercase text-[#1B3A7A] hover:text-[#122858] text-xs transition-colors flex items-center">
              Member Access <ChevronRight className="w-3 h-3 ml-1" />
            </a>
          </div>
        </footer>
        
      </div>
    </div>
  );
}
