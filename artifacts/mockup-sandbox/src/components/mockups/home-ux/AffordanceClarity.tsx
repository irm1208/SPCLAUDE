import React, { useState } from "react";
import {
  User,
  History,
  ClipboardList,
  FlaskConical,
  Layers,
  Link as LinkIcon,
  PenTool,
  GraduationCap,
  Shield,
  Hash,
  ArrowRight,
  ChevronRight,
  ShoppingCart,
  Menu,
} from "lucide-react";

export function AffordanceClarity() {
  const [activeNav, setActiveNav] = useState("home");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const navItems = [
    { id: "home", icon: User, label: "Account" },
    { id: "history", icon: History, label: "Orders" },
    { id: "clipboard", icon: ClipboardList, label: "Group Buys" },
    { id: "flask", icon: FlaskConical, label: "Testing" },
    { id: "layers", icon: Layers, label: "Protocols" },
    { id: "link", icon: LinkIcon, label: "Sources" },
    { id: "pen", icon: PenTool, label: "Reviews" },
    { id: "graduation", icon: GraduationCap, label: "Learn" },
    { id: "shield", icon: Shield, label: "Verification" },
    { id: "hash", icon: Hash, label: "Community" },
  ];

  const vials = [
    { id: 1, name: "Retatrutide 10mg", price: "$45.00", status: "In Stock" },
    { id: 2, name: "Tirzepatide 15mg", price: "$55.00", status: "In Stock" },
    { id: 3, name: "Semaglutide 10mg", price: "$35.00", status: "Low Stock" },
    { id: 4, name: "BPC-157 5mg", price: "$25.00", status: "In Stock" },
    { id: 5, name: "TB-500 5mg", price: "$30.00", status: "In Stock" },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-28 bg-white border-r border-slate-200 pt-6 pb-4 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.05)] z-10">
        <div className="flex flex-col gap-2 px-3">
          {navItems.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`group flex flex-col items-center justify-center py-3 px-1 rounded-lg transition-all duration-200 relative ${
                  isActive
                    ? "bg-blue-50 text-[#1e3a6e]"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
                aria-label={item.label}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#2563EB] rounded-r-md" />
                )}
                <item.icon
                  className={`w-6 h-6 mb-1.5 transition-transform duration-200 ${
                    isActive ? "scale-110 stroke-[2.5px]" : "group-hover:scale-110"
                  }`}
                />
                <span className={`text-[11px] font-medium text-center leading-tight ${
                  isActive ? "text-[#1e3a6e]" : ""
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
          <div className="text-sm font-bold tracking-widest text-[#1e3a6e]">
            PEPS ANONYMOUS
          </div>
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="p-2 bg-slate-100 rounded-md text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 space-y-16">
          
          {/* Hero Section */}
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-4">
              <div className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold tracking-widest rounded-full uppercase">
                Peps Anonymous
              </div>
              <h1 className="text-5xl md:text-6xl font-serif text-[#1e3a6e] font-bold leading-tight">
                Join the next <br className="hidden md:block" /> group buy.
              </h1>
              <p className="text-lg text-slate-700 max-w-xl font-medium leading-relaxed">
                Member-only pricing on bulk peptide orders. <br className="hidden md:block" />
                Pay securely in USDT.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button className="group relative flex items-center justify-center gap-3 bg-[#1e3a6e] hover:bg-[#152a50] text-white px-8 py-0 h-[52px] rounded-xl font-semibold text-lg transition-all duration-300 shadow-[0_4px_14px_rgba(30,58,110,0.3)] hover:shadow-[0_6px_20px_rgba(30,58,110,0.4)] hover:-translate-y-0.5 overflow-hidden">
                <span className="relative z-10">View active group buys</span>
                <ArrowRight className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              </button>
              
              <button className="flex items-center justify-center px-8 py-0 h-[52px] rounded-xl font-medium text-slate-600 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200">
                Sign up / Log in
              </button>
            </div>
          </section>

          {/* Testing Pools Card - Entire Card as a Button */}
          <section className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 fill-mode-both">
            <button className="w-full group text-left bg-white border-2 border-blue-100 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300 hover:border-[#2563EB] hover:shadow-[0_8px_30px_-4px_rgba(37,99,235,0.15)] hover:-translate-y-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="flex items-start md:items-center gap-5 relative z-10">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-[#2563EB] transition-colors duration-300">
                  <FlaskConical className="w-7 h-7 text-[#2563EB] group-hover:text-white transition-colors duration-300" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-[#1e3a6e] transition-colors">Community Testing Pools</h2>
                  <p className="text-slate-600 font-medium">
                    <span className="text-[#2563EB] font-bold">1 pool</span> currently open for contributions
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[#2563EB] font-semibold text-lg relative z-10 bg-blue-50 px-5 py-2.5 rounded-lg group-hover:bg-[#2563EB] group-hover:text-white transition-all duration-300 w-fit">
                View pools
                <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </button>
          </section>

          {/* Single Vials Section */}
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Single vials — in stock now</h2>
                <p className="text-slate-600 font-medium mt-1">Try a compound before committing to a full kit.</p>
              </div>
              <button className="text-[#2563EB] font-semibold hover:text-[#1e3a6e] flex items-center gap-1 group transition-colors px-3 py-2 rounded-lg hover:bg-blue-50 -ml-3 md:ml-0">
                Browse all vials
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>

            <div className="flex overflow-x-auto pb-6 -mx-6 px-6 gap-5 snap-x snap-mandatory scrollbar-hide">
              {vials.map((vial) => (
                <button 
                  key={vial.id}
                  className="group flex-none w-[180px] sm:w-[200px] bg-white border border-slate-200 rounded-xl p-4 text-left transition-all duration-300 hover:border-[#2563EB] hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.1)] hover:-translate-y-1 snap-start relative flex flex-col h-full"
                >
                  <div className="mb-4 bg-slate-50 aspect-square rounded-lg flex items-center justify-center relative overflow-hidden">
                    {/* Placeholder for vial image */}
                    <div className="w-12 h-24 bg-gradient-to-b from-slate-200 to-slate-300 rounded-sm shadow-sm opacity-50 group-hover:scale-105 transition-transform duration-500" />
                    
                    {/* Affordance overlay on image */}
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        View Details
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-auto space-y-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight mb-1 group-hover:text-[#2563EB] transition-colors">{vial.name}</h3>
                      <div className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {vial.status}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-bold text-[#1e3a6e]">{vial.price}</span>
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white transition-colors duration-300 shadow-sm">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
          
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
