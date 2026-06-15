import React from "react";
import {
  Search,
  FileText,
  Calculator,
  FlaskConical,
  Home,
  BookOpen,
  User,
  LogOut,
  ArrowRight,
  Clock,
  ChevronRight,
  ShieldCheck,
  Package,
  CreditCard
} from "lucide-react";

export function GroupBuyHero() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-900 p-4 font-sans">
      <div className="w-[390px] h-[844px] bg-[#F8FAFC] overflow-hidden relative shadow-2xl rounded-[40px] border-[8px] border-black flex flex-col">
        {/* Top Nav */}
        <div className="bg-[#0F172A] text-white px-4 py-3 flex justify-between items-center z-20 shrink-0">
          <div className="font-bold text-lg tracking-tight">Salt & Peps</div>
          <div className="flex items-center gap-3">
            <button className="text-xs font-semibold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors">
              GBP £
            </button>
            <button className="text-xs font-semibold text-slate-300 hover:text-white transition-colors">
              Login
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20 no-scrollbar">
          {/* Hero Section */}
          <div className="relative bg-gradient-to-br from-[#0F172A] via-[#1e1b4b] to-[#4c1d95] text-white pt-10 pb-12 px-6 shadow-lg">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col h-full justify-center">
              <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-violet-200 w-fit mb-4 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                Order Window Open
              </div>
              
              <h1 className="text-4xl font-extrabold leading-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-violet-200">
                Group Buy Closes <br />Oct 28, 2026
              </h1>
              
              <div className="flex flex-col gap-2 mb-8">
                <div className="flex items-center gap-2 text-violet-200 text-sm">
                  <Clock size={16} className="text-violet-300" />
                  <span>7 months remaining</span>
                </div>
                <div className="flex items-center gap-2 text-violet-200 text-sm">
                  <FlaskConical size={16} className="text-violet-300" />
                  <span>128+ peptides available</span>
                </div>
              </div>

              <button className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all flex items-center justify-between group">
                <span className="text-lg">Join the Order</span>
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* How it Works Strip */}
          <div className="px-6 py-6 bg-white border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">How it Works</h3>
            <div className="flex justify-between items-center relative">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
              
              <div className="flex flex-col items-center gap-2 relative z-10 bg-white px-2">
                <div className="w-10 h-10 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center text-slate-500">
                  <FileText size={18} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">Join<br/>spreadsheet</span>
              </div>
              
              <div className="flex flex-col items-center gap-2 relative z-10 bg-white px-2">
                <div className="w-10 h-10 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center text-slate-500">
                  <Package size={18} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">Select<br/>products</span>
              </div>
              
              <div className="flex flex-col items-center gap-2 relative z-10 bg-white px-2">
                <div className="w-10 h-10 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center text-slate-500">
                  <CreditCard size={18} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">Pay &<br/>ship</span>
              </div>
            </div>
          </div>

          {/* Member Tools (Horizontal Scroll) */}
          <div className="py-8">
            <div className="px-6 mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Member Tools</h2>
            </div>
            
            <div className="flex overflow-x-auto gap-4 px-6 pb-6 pt-2 no-scrollbar snap-x">
              
              {/* Manage Order */}
              <button className="snap-start shrink-0 w-[140px] bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col gap-4 text-left transition-transform hover:-translate-y-1 group">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#EA580C] flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                  <Search size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1">Find / Manage</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">Track existing orders</p>
                </div>
              </button>

              {/* Lab Reports */}
              <button className="snap-start shrink-0 w-[140px] bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col gap-4 text-left transition-transform hover:-translate-y-1 group">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-[#0EA5E9] flex items-center justify-center group-hover:bg-cyan-100 transition-colors">
                  <ShieldCheck size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1">Lab Reports</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">352+ verified tests</p>
                </div>
              </button>

              {/* Safety Calculator */}
              <button className="snap-start shrink-0 w-[140px] bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col gap-4 text-left transition-transform hover:-translate-y-1 group">
                <div className="w-12 h-12 rounded-2xl bg-green-50 text-[#16A34A] flex items-center justify-center group-hover:bg-green-100 transition-colors">
                  <Calculator size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1">Safety Calc</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">Dose measurement</p>
                </div>
              </button>

              {/* The Lonely Vial */}
              <button className="snap-start shrink-0 w-[140px] bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col gap-4 text-left transition-transform hover:-translate-y-1 group">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 text-[#7C3AED] flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                  <FlaskConical size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1">Lonely Vial</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">Domestic stock</p>
                </div>
              </button>

            </div>
          </div>
          
        </div>

        {/* Bottom Tabs */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-between items-center z-20 pb-safe">
          <button className="flex flex-col items-center gap-1 text-[#0F172A]">
            <Home size={24} className="fill-current" />
            <span className="text-[10px] font-bold">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
            <BookOpen size={24} />
            <span className="text-[10px] font-semibold">Protocols</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
            <Calculator size={24} />
            <span className="text-[10px] font-semibold">Calc</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
            <User size={24} />
            <span className="text-[10px] font-semibold">Account</span>
          </button>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}} />
      </div>
    </div>
  );
}

export default GroupBuyHero;
