import React, { useState } from 'react';
import { 
  Home, 
  FlaskConical, 
  Calculator, 
  User, 
  Search, 
  FileText, 
  ShieldAlert, 
  Dna,
  ChevronRight,
  ShoppingCart,
  Clock
} from 'lucide-react';

export function StatusDashboard() {
  const [hasDraft] = useState(true);

  return (
    <div className="flex justify-center bg-neutral-900 min-h-screen p-4 sm:p-8 font-sans">
      <div className="w-[390px] h-[844px] bg-[#F0F4F8] rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative border-[8px] border-neutral-800">
        
        {/* TopNav */}
        <div className="bg-[#0F172A] text-white px-5 pt-12 pb-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center">
              <Dna className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Salt & Peps</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-2 py-1 rounded bg-white/10 text-xs font-medium text-white/80">
              GBP
            </div>
            <button className="text-sm font-medium hover:text-blue-400 transition-colors">
              Login
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-24">
          
          {/* Hero Section */}
          <div className="bg-[#0F172A] rounded-b-3xl px-5 pb-8 pt-4 shadow-md">
            {hasDraft ? (
              <button className="w-full text-left bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-50"></div>
                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
                      <span className="text-orange-400 text-xs font-bold tracking-wider uppercase">Active Draft</span>
                    </div>
                    <h2 className="text-white text-xl font-bold mb-1">Draft in progress</h2>
                    <p className="text-slate-400 text-sm mb-4">3 items · ~$245.00</p>
                    <div className="flex items-center text-blue-400 font-medium text-sm">
                      Resume Order <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 text-blue-400">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                </div>
              </button>
            ) : (
              <button className="w-full text-left bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 hover:opacity-90 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-white/20 text-white px-2 py-0.5 rounded text-xs font-bold tracking-wider uppercase">Welcome</span>
                </div>
                <h2 className="text-white text-xl font-bold mb-1">New to Salt & Peps?</h2>
                <p className="text-blue-100 text-sm mb-4">Join 128+ others in the current group buy.</p>
                <div className="flex items-center text-white font-medium text-sm">
                  Start your first order <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            )}
          </div>

          {/* Banner */}
          <div className="px-5 -mt-4 relative z-10">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500">Uther Group Buy Closes</p>
                <p className="text-sm font-bold text-slate-800">Oct 28 2026 <span className="text-slate-400 font-normal">(7 mo remaining)</span></p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-5 mt-6">
            <h3 className="text-sm font-bold text-slate-800 mb-4 px-1">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 h-24 hover:bg-slate-50 transition-colors hover:border-orange-200 group">
                <Search className="w-6 h-6 text-orange-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-slate-700">Find Order</span>
              </button>
              
              <button className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 h-24 hover:bg-slate-50 transition-colors hover:border-cyan-200 group">
                <div className="relative">
                  <FileText className="w-6 h-6 text-cyan-500 group-hover:scale-110 transition-transform" />
                  <div className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full">352+</div>
                </div>
                <span className="text-xs font-semibold text-slate-700">Lab Reports</span>
              </button>
              
              <button className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 h-24 hover:bg-slate-50 transition-colors hover:border-green-200 group">
                <ShieldAlert className="w-6 h-6 text-green-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-slate-700 text-center leading-tight">Safety<br/>Calculator</span>
              </button>
              
              <button className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-2 h-24 hover:bg-slate-50 transition-colors hover:border-violet-200 group">
                <FlaskConical className="w-6 h-6 text-violet-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-slate-700 text-center leading-tight">The Lonely<br/>Vial</span>
              </button>
            </div>
          </div>

        </div>

        {/* BottomTabs */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex justify-between items-center absolute bottom-0 left-0 right-0 z-20 pb-8">
          <button className="flex flex-col items-center gap-1 text-blue-600">
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
            <Dna className="w-6 h-6" />
            <span className="text-[10px] font-medium">Protocols</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
            <Calculator className="w-6 h-6" />
            <span className="text-[10px] font-medium">Calc</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
            <User className="w-6 h-6" />
            <span className="text-[10px] font-medium">Account</span>
          </button>
        </div>

      </div>
    </div>
  );
}
