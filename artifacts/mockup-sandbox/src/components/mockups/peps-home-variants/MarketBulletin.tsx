import React, { useState, useEffect } from "react";
import { 
  Activity, 
  Clock, 
  ShieldCheck, 
  Terminal, 
  Calculator, 
  FileText, 
  Search,
  AlertTriangle,
  Beaker,
  ChevronRight,
  TrendingUp,
  ArrowUpRight
} from "lucide-react";

// --- Mock Data ---

const INVENTORY = [
  { id: 1, compound: "RETATRUTIDE", mg: 10, price: 20.00, lot: "621650", age: 12, status: "TESTED", trend: "up" },
  { id: 2, compound: "TIRZEPATIDE", mg: 15, price: 35.00, lot: "621651", age: 5, status: "PENDING", trend: "flat" },
  { id: 3, compound: "TIRZEPATIDE", mg: 10, price: 28.00, lot: "621649", age: 28, status: "TESTED", trend: "down" },
  { id: 4, compound: "BPC-157", mg: 5, price: 15.00, lot: "621645", age: 45, status: "TESTED", trend: "up" },
  { id: 5, compound: "CJC-1295", mg: 2, price: 12.00, lot: "621630", age: 60, status: "TESTED", trend: "flat" },
  { id: 6, compound: "IPAMORELIN", mg: 2, price: 14.00, lot: "621631", age: 60, status: "TESTED", trend: "flat" },
  { id: 7, compound: "SEMAGLUTIDE", mg: 5, price: 25.00, lot: "621660", age: 2, status: "TESTED", trend: "up" },
];

const TABS = [
  { id: "market", label: "MKT_BOARD" },
  { id: "lonely", label: "SINGLE_VIAL" },
  { id: "acc", label: "ACCESSORIES" },
  { id: "lab", label: "LAB_REPORTS" },
  { id: "proto", label: "PROTOCOLS" },
];

const UTILITIES = [
  { id: "dose", label: "DOSE_CALC", icon: Calculator, desc: "Reconstitution Vol" },
  { id: "endo", label: "ENDO_CALC", icon: AlertTriangle, desc: "EU/kg Safety" },
  { id: "lookup", label: "ORDER_TRK", icon: Search, desc: "Track by Code" },
];

export function MarketBulletin() {
  const [activeTab, setActiveTab] = useState("market");
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-400 font-mono selection:bg-amber-500/30">
      
      {/* TOP SYSTEM BAR */}
      <header className="border-b border-zinc-800 bg-[#0a0a0a] px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-amber-500 font-bold">
            <Terminal className="w-4 h-4" />
            <span>PEPS_ANONYMOUS_OS v2.4</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-zinc-800"></div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-sm bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-300 border border-zinc-700">
              SP
            </div>
            <span className="text-zinc-300">@urbanblend789</span>
            <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded-sm text-[9px] border border-zinc-700 uppercase">
              MEMBER
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[10px] sm:text-xs">
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">SYS_TIME:</span>
            <span className="text-amber-500 w-16">{time}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">SESS_CLOSE:</span>
            <span className="text-zinc-300">28-OCT-26</span>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="p-2 sm:p-4 max-w-[1600px] mx-auto flex flex-col gap-4">
        
        {/* TAB NAVIGATION (ASSET CLASSES) */}
        <nav className="flex overflow-x-auto no-scrollbar border-b border-zinc-800 pb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-bold whitespace-nowrap uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === tab.id 
                  ? "border-amber-500 text-amber-500 bg-amber-500/5" 
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* LEFT/MAIN: INVENTORY TERMINAL */}
          <div className="lg:col-span-9 flex flex-col gap-4">
            
            {/* SESSION HEADER */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-[#0a0a0a] border border-zinc-800 p-3 flex flex-col justify-between">
                <span className="text-[10px] text-zinc-500 mb-1">MKT_STATUS</span>
                <span className="text-emerald-500 flex items-center gap-1 font-bold text-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  OPEN (GB)
                </span>
              </div>
              <div className="bg-[#0a0a0a] border border-zinc-800 p-3 flex flex-col justify-between">
                <span className="text-[10px] text-zinc-500 mb-1">TIME_REMAINING</span>
                <span className="text-amber-500 font-bold text-sm">184 DAYS</span>
              </div>
              <div className="bg-[#0a0a0a] border border-zinc-800 p-3 flex flex-col justify-between">
                <span className="text-[10px] text-zinc-500 mb-1">TOTAL_VOL_LOTS</span>
                <span className="text-zinc-200 font-bold text-sm">1,450</span>
              </div>
              <div className="bg-[#0a0a0a] border border-zinc-800 p-3 flex flex-col justify-between">
                <span className="text-[10px] text-zinc-500 mb-1">REQ_ACCESS_TIER</span>
                <span className="text-zinc-200 font-bold text-sm">L1_MEMBER</span>
              </div>
            </div>

            {/* DATA TABLE */}
            <div className="bg-[#0a0a0a] border border-zinc-800 overflow-hidden flex flex-col flex-1">
              <div className="p-2 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-300">LIVE_INVENTORY // SPOT_RATES</span>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                    <ShieldCheck className="w-3 h-3" /> JANOSHIK_VERIFIED
                  </span>
                </div>
              </div>
              
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] text-zinc-500 uppercase bg-[#080808]">
                      <th className="p-3 font-normal">Compound</th>
                      <th className="p-3 font-normal text-right">Size</th>
                      <th className="p-3 font-normal text-right">Spot_Px</th>
                      <th className="p-3 font-normal text-right">$/mg</th>
                      <th className="p-3 font-normal">Batch_Lot</th>
                      <th className="p-3 font-normal text-right">Age(d)</th>
                      <th className="p-3 font-normal">Status</th>
                      <th className="p-3 font-normal w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-zinc-800/50">
                    {INVENTORY.map((item) => (
                      <tr 
                        key={item.id} 
                        className="hover:bg-zinc-900/50 transition-colors group cursor-pointer"
                      >
                        <td className="p-3 font-bold text-zinc-200 flex items-center gap-2">
                          {item.compound}
                          {item.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                          {item.trend === 'down' && <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />}
                        </td>
                        <td className="p-3 text-right text-amber-500">{item.mg}mg</td>
                        <td className="p-3 text-right">${item.price.toFixed(2)}</td>
                        <td className="p-3 text-right text-zinc-500">${(item.price / item.mg).toFixed(2)}</td>
                        <td className="p-3 text-zinc-400 font-mono tracking-wider">{item.lot}</td>
                        <td className="p-3 text-right text-zinc-500">{item.age}</td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.5 text-[9px] border rounded-sm font-bold tracking-wider ${
                            item.status === 'TESTED' 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-800 rounded text-amber-500 transition-all">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>

          {/* RIGHT SIDEBAR: TICKERS & UTILITIES */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            
            {/* QUICK UTILITIES */}
            <div className="bg-[#0a0a0a] border border-zinc-800">
              <div className="p-2 border-b border-zinc-800 bg-zinc-900/50">
                <span className="text-xs font-bold text-zinc-300">SYS_UTILITIES</span>
              </div>
              <div className="p-2 flex flex-col gap-2">
                {UTILITIES.map((tool) => (
                  <button 
                    key={tool.id}
                    className="flex items-center justify-between p-3 border border-zinc-800 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-900 border border-zinc-800 group-hover:border-amber-500/30 group-hover:text-amber-500 text-zinc-400 transition-colors">
                        <tool.icon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-300 group-hover:text-amber-500 transition-colors">{tool.label}</span>
                        <span className="text-[10px] text-zinc-500">{tool.desc}</span>
                      </div>
                    </div>
                    <ArrowUpRight className="w-3 h-3 text-zinc-600 group-hover:text-amber-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            {/* TRUST SIGNALS TICKER */}
            <div className="bg-[#0a0a0a] border border-zinc-800">
              <div className="p-2 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-2">
                <Activity className="w-3 h-3 text-amber-500" />
                <span className="text-xs font-bold text-zinc-300">NET_STATUS</span>
              </div>
              <div className="p-4 flex flex-col gap-3 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">■</span>
                  <div>
                    <span className="text-zinc-300 block">PAYMENT_GATEWAY</span>
                    <span className="text-[10px] text-zinc-500">USDT (TRC20) Online</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">■</span>
                  <div>
                    <span className="text-zinc-300 block">3RD_PARTY_LAB</span>
                    <span className="text-[10px] text-zinc-500">Janoshik API Connected (352+ CoAs)</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">■</span>
                  <div>
                    <span className="text-zinc-300 block">BAC_WATER</span>
                    <span className="text-[10px] text-zinc-500">Hospira Safe-Source verified</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* TERMINAL LOG */}
            <div className="flex-1 bg-black border border-zinc-800 font-mono text-[10px] p-3 text-zinc-500 overflow-hidden flex flex-col justify-end min-h-[120px]">
              <p>{'>'} INIT PEPS_OS...</p>
              <p>{'>'} SECURE_CONN ESTABLISHED</p>
              <p>{'>'} FETCHING INVENTORY [GB-2026]...</p>
              <p>{'>'} 7 RECORDS SYNCED</p>
              <p className="text-amber-500 flex items-center gap-1">
                {'>'} AWAITING_CMD <span className="w-1.5 h-3 bg-amber-500 animate-pulse inline-block"></span>
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
