import React, { useState } from 'react';
import { 
  PackageSearch, 
  FlaskConical, 
  Calculator, 
  TestTube2, 
  ArrowRight,
  Menu,
  User,
  Home,
  BookOpen,
  Settings,
  Clock
} from 'lucide-react';

// Hardcoded data
const GB_CLOSE_DATE = "Oct 28 2026";
const GB_REMAINING = "7 months";
const PRODUCT_COUNT = "128+";
const LAB_REPORT_COUNT = "352+";

export function LauncherGrid() {
  const [hasDraft, setHasDraft] = useState(true);

  return (
    <div className="flex justify-center w-full min-h-screen bg-neutral-900 text-slate-100 font-sans p-4">
      {/* Mobile Device Container (390px) */}
      <div className="w-[390px] h-[844px] bg-[#0A0F1E] rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative border-[8px] border-neutral-800 ring-1 ring-neutral-700">
        
        {/* TopNav */}
        <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white">S</div>
            <span className="font-bold text-lg tracking-tight text-slate-50">Salt & Peps</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-slate-300 rounded-full border border-slate-700 flex items-center gap-1.5">
              <span>GBP</span>
            </button>
            <button className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User size={16} />
            </button>
          </div>
        </div>

        {/* Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-20 no-scrollbar">
          
          {/* Header Area */}
          <div className="px-5 pt-6 pb-4">
            <h1 className="text-2xl font-bold text-white mb-1">Welcome back.</h1>
            <p className="text-sm text-slate-400">
              Group buy closes {GB_CLOSE_DATE} ({GB_REMAINING} left)
            </p>
          </div>

          <div className="px-5 space-y-4">
            
            {/* Primary Action Row - Place Order / Continue Draft */}
            <button 
              onClick={() => setHasDraft(!hasDraft)}
              className={`w-full h-16 rounded-2xl flex items-center justify-between px-5 transition-all shadow-lg active:scale-[0.98] ${
                hasDraft 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-orange-500/20' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/20'
              }`}
            >
              <div className="flex flex-col items-start">
                <span className="text-white font-bold text-lg">
                  {hasDraft ? 'Continue Draft' : 'Place New Order'}
                </span>
                {hasDraft && (
                  <span className="text-amber-100 text-xs font-medium">3 items in cart</span>
                )}
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hasDraft ? 'bg-amber-400/30' : 'bg-white/20'}`}>
                <ArrowRight size={18} className="text-white" />
              </div>
            </button>

            {/* 2x2 Tools Grid */}
            <div className="grid grid-cols-2 gap-3">
              
              {/* Find/Manage Order */}
              <button className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-4 flex flex-col items-start text-left active:scale-[0.98] transition-transform h-[140px] hover:bg-slate-800">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-auto">
                  <PackageSearch size={22} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200 text-[15px] leading-tight mb-1">Find Order</h3>
                  <p className="text-xs text-slate-400 leading-tight">Track & manage your shipments</p>
                </div>
              </button>

              {/* Lab Reports */}
              <button className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-4 flex flex-col items-start text-left active:scale-[0.98] transition-transform h-[140px] hover:bg-slate-800">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-auto">
                  <FlaskConical size={22} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200 text-[15px] leading-tight mb-1">Lab Reports</h3>
                  <p className="text-xs text-slate-400 leading-tight">{LAB_REPORT_COUNT} Janoshik tests</p>
                </div>
              </button>

              {/* Safety Calculator */}
              <button className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-4 flex flex-col items-start text-left active:scale-[0.98] transition-transform h-[140px] hover:bg-slate-800">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center mb-auto">
                  <Calculator size={22} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200 text-[15px] leading-tight mb-1">Safety Calc</h3>
                  <p className="text-xs text-slate-400 leading-tight">Reconstitution & dosing math</p>
                </div>
              </button>

              {/* The Lonely Vial */}
              <button className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-4 flex flex-col items-start text-left active:scale-[0.98] transition-transform h-[140px] hover:bg-slate-800">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center mb-auto">
                  <TestTube2 size={22} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200 text-[15px] leading-tight mb-1">Lonely Vial</h3>
                  <p className="text-xs text-slate-400 leading-tight">Domestic fast-shipping</p>
                </div>
              </button>

            </div>

            {/* Catalog Preview / Footer */}
            <div className="mt-8 pt-6 border-t border-slate-800/80">
              <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-300">Browse Catalog</p>
                  <p className="text-xs text-blue-400/70 mt-0.5">{PRODUCT_COUNT} items available</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>

            {/* Status Footer */}
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-400 border border-slate-700">
                <Clock size={12} className="text-blue-400" />
                <span>Closes {GB_CLOSE_DATE}</span>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-2">
                @SaltAndPeps
              </p>
            </div>

          </div>
        </div>

        {/* BottomTabs */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-2 pb-5 z-20">
          <button className="flex flex-col items-center justify-center w-16 gap-1 text-blue-500">
            <Home size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center justify-center w-16 gap-1 text-slate-400 hover:text-slate-300">
            <BookOpen size={22} />
            <span className="text-[10px] font-medium">Protocols</span>
          </button>
          <button className="flex flex-col items-center justify-center w-16 gap-1 text-slate-400 hover:text-slate-300">
            <Calculator size={22} />
            <span className="text-[10px] font-medium">Calc</span>
          </button>
          <button className="flex flex-col items-center justify-center w-16 gap-1 text-slate-400 hover:text-slate-300">
            <User size={22} />
            <span className="text-[10px] font-medium">Account</span>
          </button>
        </div>

      </div>
    </div>
  );
}
