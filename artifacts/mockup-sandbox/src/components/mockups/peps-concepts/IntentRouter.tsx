import React, { useState } from "react";
import { Package, Search, BookOpen, ChevronRight, FileText, Activity, Beaker, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRODUCTS = [
  { id: "621650", name: "Retatrutide 10mg", category: "GLP-1", mg: "10", price: "$20.00", inStock: true, lotTag: "TESTED" },
  { id: "8a3f21", name: "Semaglutide 5mg", category: "GLP-1", mg: "5", price: "$18.00", inStock: true, lotTag: "TESTED" },
  { id: "c7d849", name: "BPC-157 5mg", category: "Repair", mg: "5", price: "$15.00", inStock: true, lotTag: "TESTED" },
  { id: "e1b293", name: "TB-500 10mg", category: "Repair", mg: "10", price: "$22.00", inStock: false, lotTag: "COA" },
  { id: "f40a17", name: "GLP-1 Fragment 2mg", category: "GLP-1", mg: "2", price: "$12.00", inStock: true, lotTag: "TESTED" },
  { id: "a91c55", name: "Ipamorelin 5mg", category: "GH", mg: "5", price: "$16.00", inStock: true, lotTag: "TESTED" },
];

const RESOURCES = [
  { label: "The Lonely Vial", sub: "Single-vial, no minimums", path: "/shop", icon: Package },
  { label: "Accessories", sub: "BAC water, prep kits", path: "/accessories", icon: Beaker },
  { label: "Lab Reports", sub: "352+ Janoshik CoAs", path: "/tests", icon: FileText },
  { label: "Protocols", sub: "30+ peptide guides", path: "/protocols", icon: BookOpen },
];

const UTILITIES = [
  { label: "Dose Calculator", sub: "Reconstitution volumes", path: "/calculator", icon: Activity },
  { label: "Endotoxin Calc", sub: "EU/kg safety threshold", path: "/endotoxin", icon: ShieldCheck },
];

type Intent = "browse" | "track" | "resources" | null;

export function IntentRouter() {
  const [activeIntent, setActiveIntent] = useState<Intent>(null);

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-['Inter'] text-slate-900 selection:bg-blue-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FDFDFD]/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveIntent(null)}>
            <div className="w-8 h-8 bg-[#2D6BCC] rounded-lg flex items-center justify-center text-white font-bold tracking-tighter">
              S&P
            </div>
            <span className="font-['Space_Mono'] font-bold text-lg tracking-tight">Salt & Peps</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-slate-500 hover:text-[#2D6BCC] hidden sm:flex">
              Support
            </Button>
            <Button className="bg-[#2D6BCC] hover:bg-[#2152A6] text-white rounded-full px-6 shadow-sm shadow-blue-500/20">
              Join Telegram
            </Button>
          </div>
        </div>
      </header>

      {/* Trust Strip */}
      <div className="bg-slate-50 border-b border-slate-100 py-2.5">
        <div className="max-w-6xl mx-auto px-6 flex justify-center items-center gap-x-8 gap-y-2 flex-wrap text-xs font-medium text-slate-500 tracking-wide uppercase">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> UK Based</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-[#2D6BCC]" /> Janoshik Tested</span>
          <span className="flex items-center gap-1.5">USDT Payments</span>
          <span className="flex items-center gap-1.5">Discreet Dispatch</span>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center">
        
        {/* Hero Copy (shrinks when intent is active) */}
        <div className={`text-center transition-all duration-500 ease-out flex flex-col items-center ${activeIntent ? "mb-10 scale-95 opacity-90" : "mb-16 scale-100 opacity-100"}`}>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4 max-w-2xl">
            {activeIntent === null ? "What are you looking for?" : 
             activeIntent === "browse" ? "Research Inventory" :
             activeIntent === "track" ? "Track Your Order" :
             "Resources & Guides"}
          </h1>
          {activeIntent === null && (
            <p className="text-lg text-slate-500 max-w-xl">
              Select an option below to continue to the UK's most transparent peptide collective.
            </p>
          )}
        </div>

        {/* Intent Cards */}
        <div className={`grid w-full transition-all duration-500 ease-out gap-4 ${
          activeIntent 
            ? "grid-cols-3 max-w-3xl mb-12" 
            : "grid-cols-1 md:grid-cols-3 max-w-5xl gap-6"
        }`}>
          
          <IntentCard 
            icon={<Package className={activeIntent === "browse" ? "w-5 h-5" : "w-8 h-8"} />}
            title="Browse Inventory"
            subtitle="View in-stock peptides"
            isActive={activeIntent === "browse"}
            isCompact={activeIntent !== null}
            onClick={() => setActiveIntent("browse")}
          />
          
          <IntentCard 
            icon={<Search className={activeIntent === "track" ? "w-5 h-5" : "w-8 h-8"} />}
            title="Track Order"
            subtitle="Enter your PIN to check status"
            isActive={activeIntent === "track"}
            isCompact={activeIntent !== null}
            onClick={() => setActiveIntent("track")}
          />
          
          <IntentCard 
            icon={<BookOpen className={activeIntent === "resources" ? "w-5 h-5" : "w-8 h-8"} />}
            title="Resources"
            subtitle="CoAs, guides & calculators"
            isActive={activeIntent === "resources"}
            isCompact={activeIntent !== null}
            onClick={() => setActiveIntent("resources")}
          />
        </div>

        {/* Expanded Content Area */}
        <div className={`w-full max-w-5xl transition-all duration-500 ease-out origin-top ${
          activeIntent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none absolute"
        }`}>
          
          {/* Browse Section */}
          {activeIntent === "browse" && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input placeholder="Search compounds..." className="pl-9 bg-white border-slate-200 focus-visible:ring-[#2D6BCC]" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-9">GLP-1</Button>
                  <Button variant="outline" size="sm" className="h-9">Repair</Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Compound</th>
                      <th className="px-6 py-4 hidden sm:table-cell">Category</th>
                      <th className="px-6 py-4 text-right">Price</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {PRODUCTS.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                            <span className="font-['Space_Mono'] bg-slate-100 px-1.5 rounded text-[10px]">{p.id}</span>
                            <span className="flex items-center text-emerald-600 font-medium">
                              <ShieldCheck className="w-3 h-3 mr-1" /> {p.lotTag}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {p.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-['Space_Mono'] font-medium text-slate-900">
                          {p.price}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {p.inStock ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> In Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Out of Stock
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant={p.inStock ? "default" : "outline"}
                            size="sm"
                            disabled={!p.inStock}
                            className={p.inStock ? "bg-[#2D6BCC] hover:bg-[#2152A6]" : ""}
                          >
                            Add
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Track Section */}
          {activeIntent === "track" && (
            <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Search className="w-8 h-8 text-[#2D6BCC]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Locate your order</h3>
                <p className="text-slate-500 mb-8 text-sm">Enter your Telegram username and the unique 6-digit PIN provided at checkout.</p>
                
                <div className="space-y-4 text-left">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Telegram Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">@</span>
                      <Input className="pl-8 bg-slate-50/50 border-slate-200 focus-visible:ring-[#2D6BCC] h-12" placeholder="username" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Order PIN</label>
                    <Input className="bg-slate-50/50 border-slate-200 focus-visible:ring-[#2D6BCC] h-12 font-['Space_Mono'] tracking-widest text-center text-lg" placeholder="••••••" maxLength={6} />
                  </div>
                  <Button className="w-full h-12 bg-[#2D6BCC] hover:bg-[#2152A6] text-base mt-2">
                    Lookup Order
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Resources Section */}
          {activeIntent === "resources" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#2D6BCC]" /> Knowledge Base
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {RESOURCES.map((res, i) => (
                    <div key={i} className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-[#2D6BCC]/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-36">
                      <div>
                        <res.icon className="w-6 h-6 text-slate-400 mb-3 group-hover:text-[#2D6BCC] transition-colors" />
                        <h4 className="font-semibold text-slate-900">{res.label}</h4>
                        <p className="text-sm text-slate-500 mt-1">{res.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#2D6BCC]" /> Tools & Calculators
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                  {UTILITIES.map((util, i) => (
                    <div key={i} className="group bg-slate-50 border border-slate-200 rounded-xl p-5 hover:bg-white hover:border-[#2D6BCC]/50 hover:shadow-md transition-all cursor-pointer flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-[#2D6BCC]/30">
                        <util.icon className="w-5 h-5 text-slate-500 group-hover:text-[#2D6BCC]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{util.label}</h4>
                        <p className="text-sm text-slate-500">{util.sub}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#2D6BCC] transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

interface IntentCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  isActive: boolean;
  isCompact: boolean;
  onClick: () => void;
}

function IntentCard({ icon, title, subtitle, isActive, isCompact, onClick }: IntentCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`
        relative overflow-hidden cursor-pointer rounded-2xl border transition-all duration-300
        ${isActive 
          ? "bg-[#2D6BCC] border-[#2D6BCC] shadow-lg shadow-blue-500/20 text-white" 
          : "bg-white border-slate-200 hover:border-[#2D6BCC]/40 hover:shadow-md text-slate-900"
        }
        ${isCompact ? "p-4 flex-row items-center gap-4" : "p-8 flex-col items-start gap-6"}
        flex
      `}
    >
      <div className={`
        rounded-xl flex items-center justify-center shrink-0 transition-colors
        ${isActive ? "bg-white/20 text-white" : "bg-slate-50 text-[#2D6BCC]"}
        ${isCompact ? "w-12 h-12" : "w-16 h-16"}
      `}>
        {icon}
      </div>
      
      <div className="flex-1">
        <h3 className={`font-bold tracking-tight ${isCompact ? "text-sm md:text-base" : "text-xl md:text-2xl mb-2"}`}>
          {title}
        </h3>
        <p className={`${isActive ? "text-blue-100" : "text-slate-500"} ${isCompact ? "text-xs hidden md:block" : "text-base"}`}>
          {subtitle}
        </p>
      </div>

      {!isCompact && (
        <div className={`
          absolute right-6 bottom-6 w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300
          ${isActive ? "bg-white/20 translate-x-2 opacity-0" : "bg-slate-50 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"}
        `}>
          <ArrowRight className="w-5 h-5 text-[#2D6BCC]" />
        </div>
      )}
    </div>
  );
}
