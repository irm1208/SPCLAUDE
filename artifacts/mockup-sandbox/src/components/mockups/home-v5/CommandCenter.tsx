import React, { useState, useEffect } from "react";
import { 
  Activity, 
  ArrowRight, 
  BarChart3, 
  Clock, 
  Database, 
  FlaskConical, 
  ShieldAlert, 
  ShoppingCart, 
  TerminalSquare, 
  TrendingUp,
  Users
} from "lucide-react";
import { Button } from "../../ui/button";

export function CommandCenter() {
  const [time, setTime] = useState(new Date());
  
  // Fake countdown for effect
  const [countdown, setCountdown] = useState(72 * 3600 + 14 * 60 + 33);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const cd = setInterval(() => setCountdown(prev => prev > 0 ? prev - 1 : 0), 1000);
    return () => {
      clearInterval(timer);
      clearInterval(cd);
    };
  }, []);

  const formatCountdown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}H ${m.toString().padStart(2, '0')}M ${s.toString().padStart(2, '0')}S`;
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-300 font-sans selection:bg-[#f59e0b] selection:text-black overflow-x-hidden">
      {/* CSS Grid Background Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, #1e293b 1px, transparent 1px),
            linear-gradient(to bottom, #1e293b 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Top Navigation Bar - Terminal Style */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0a0e1a]/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-2 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[#f59e0b]">
              <TerminalSquare size={14} />
              <span className="font-bold tracking-wider">SYS.TERMINAL // PEP-EX</span>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <span className="px-2 py-1 bg-slate-800/50 rounded border border-slate-700/50 text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                NETWORK: STABLE
              </span>
              <span className="px-2 py-1 bg-slate-800/50 rounded border border-slate-700/50">
                LATENCY: 14ms
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span>VOL: 24.5k USDT</span>
            <span className="text-[#f59e0b]">{time.toISOString().split('T')[1].slice(0, 8)} UTC</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
        
        {/* Hero: Active GB Dashboard */}
        <section className="border border-slate-800 bg-slate-900/40 backdrop-blur-sm relative overflow-hidden">
          {/* Decorative Corner Accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#f59e0b]"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#f59e0b]"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#f59e0b]"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#f59e0b]"></div>

          <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
            <div className="space-y-4 flex-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 text-xs font-mono font-bold tracking-widest uppercase">
                <Activity size={12} />
                Live Allocation
              </div>
              
              <div>
                <h1 className="text-3xl md:text-5xl font-light text-white tracking-tight font-mono mb-2">
                  BPC-157 + TB-500 <span className="text-slate-500">BLEND</span>
                </h1>
                <div className="flex items-center gap-4 text-sm font-mono">
                  <span className="text-emerald-400">STATUS: ACCEPTING</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-300">TGT: 100 VIALS</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-300">MIN: 10 VIALS</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 bg-[#0a0e1a] p-4 border border-slate-800 w-full lg:w-auto">
              <div className="text-center sm:text-left">
                <div className="text-xs font-mono text-slate-500 mb-1">TIME REMAINING</div>
                <div className="text-3xl font-mono text-white tracking-wider tabular-nums">
                  {formatCountdown(countdown)}
                </div>
              </div>
              
              <div className="hidden sm:block w-px h-12 bg-slate-800"></div>
              
              <div className="text-center sm:text-left">
                <div className="text-xs font-mono text-slate-500 mb-1">MARKET PRICE</div>
                <div className="text-3xl font-mono text-[#f59e0b] tabular-nums">
                  $0.40<span className="text-sm text-slate-500">/mg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Allocation Progress Bar */}
          <div className="px-6 md:px-8 pb-6 md:pb-8">
            <div className="flex justify-between text-xs font-mono mb-2">
              <span className="text-white">ALLOCATION PROGRESS</span>
              <span className="text-[#f59e0b]">48 / 100 FILLED (48%)</span>
            </div>
            <div className="h-4 bg-[#0a0e1a] border border-slate-800 w-full overflow-hidden flex">
              <div className="h-full bg-gradient-to-r from-[#f59e0b]/50 to-[#f59e0b] w-[48%] relative">
                {/* Diagonal stripes on progress bar */}
                <div className="absolute inset-0 opacity-20" 
                     style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, #000 5px, #000 10px)' }}>
                </div>
              </div>
              {/* Markers */}
              <div className="w-[2%] h-full bg-[#f59e0b] animate-pulse"></div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button className="bg-[#f59e0b] hover:bg-[#f59e0b]/90 text-black px-8 py-4 font-mono font-bold tracking-wider text-sm transition-all flex items-center gap-2 group">
                SECURE YOUR ALLOCATION
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* 3-Column Layout for secondary info */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Column: Secondary GBs */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h2 className="text-sm font-mono text-white tracking-widest flex items-center gap-2">
                <Database size={14} className="text-[#f59e0b]" />
                SECONDARY MARKETS
              </h2>
              <button className="text-xs font-mono text-slate-500 hover:text-white transition-colors">VIEW ALL_</button>
            </div>

            <div className="space-y-3">
              {/* GB Row 1 */}
              <div className="group border border-slate-800 bg-slate-900/30 hover:bg-slate-800/50 transition-colors p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-mono text-white text-lg">Tirzepatide</h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACCEPTING</span>
                  </div>
                  <div className="text-xs font-mono text-slate-500 flex items-center gap-3">
                    <span>CAP: 200</span>
                    <span>•</span>
                    <span>MIN: 10</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 w-full sm:w-auto">
                  <div className="flex-1 sm:flex-none">
                    <div className="text-[10px] font-mono text-slate-500 mb-1">FILLED</div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-[#0a0e1a] border border-slate-800">
                        <div className="h-full bg-slate-400 w-[15%]"></div>
                      </div>
                      <span className="text-xs font-mono text-white">15%</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-slate-500 mb-1">PRICE</div>
                    <div className="font-mono text-white">$1.20<span className="text-slate-500 text-xs">/mg</span></div>
                  </div>
                </div>
              </div>

              {/* GB Row 2 */}
              <div className="group border border-slate-800 bg-slate-900/30 hover:bg-slate-800/50 transition-colors p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-mono text-white text-lg">GHK-Cu Serum</h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20">CLOSING SOON</span>
                  </div>
                  <div className="text-xs font-mono text-slate-500 flex items-center gap-3">
                    <span>CAP: 50</span>
                    <span>•</span>
                    <span>MIN: 5</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 w-full sm:w-auto">
                  <div className="flex-1 sm:flex-none">
                    <div className="text-[10px] font-mono text-slate-500 mb-1">FILLED</div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-[#0a0e1a] border border-slate-800">
                        <div className="h-full bg-[#f59e0b] w-[85%]"></div>
                      </div>
                      <span className="text-xs font-mono text-white">85%</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-slate-500 mb-1">PRICE</div>
                    <div className="font-mono text-white">$4.50<span className="text-slate-500 text-xs">/mg</span></div>
                  </div>
                </div>
              </div>
              
              {/* GB Row 3 */}
              <div className="group border border-slate-800 bg-slate-900/30 opacity-60 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-mono text-white text-lg">Semaglutide</h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 border border-slate-700">FULFILLED</span>
                  </div>
                  <div className="text-xs font-mono text-slate-500 flex items-center gap-3">
                    <span>AWAITING MANUFACTURE</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 w-full sm:w-auto">
                  <div className="flex-1 sm:flex-none">
                    <div className="text-[10px] font-mono text-slate-500 mb-1">FILLED</div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-[#0a0e1a] border border-slate-800">
                        <div className="h-full bg-slate-600 w-[100%]"></div>
                      </div>
                      <span className="text-xs font-mono text-white">100%</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-slate-500 mb-1">PRICE</div>
                    <div className="font-mono text-slate-400">$0.85<span className="text-slate-600 text-xs">/mg</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            
            {/* Testing Pools Table */}
            <div className="border border-slate-800 bg-slate-900/40">
              <div className="p-3 border-b border-slate-800 bg-slate-900/80 flex items-center gap-2">
                <FlaskConical size={14} className="text-[#f59e0b]" />
                <h2 className="text-xs font-mono text-white tracking-widest">COMMUNITY TESTING POOLS</h2>
              </div>
              <div className="p-0">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 bg-[#0a0e1a]/50">
                      <th className="p-3 font-normal">ASSET</th>
                      <th className="p-3 font-normal text-right">PARTICIPANTS</th>
                      <th className="p-3 font-normal text-right">ACT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 text-white">Testosterone + TRT Panel</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-slate-300">
                          <Users size={10} className="text-slate-500" />
                          12
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button className="text-[#f59e0b] hover:text-white transition-colors">JOIN</button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 text-white">BPC-157 Purity Verification</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-slate-300">
                          <Users size={10} className="text-slate-500" />
                          34
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button className="text-[#f59e0b] hover:text-white transition-colors">JOIN</button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/30 transition-colors opacity-50">
                      <td className="p-3 text-slate-400">Tirzepatide Concentration</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-slate-500">
                          <Users size={10} className="text-slate-600" />
                          50
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-slate-500 text-[10px]">FULL</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Buy / Spot Market */}
            <div className="border border-slate-800 bg-slate-900/40">
              <div className="p-3 border-b border-slate-800 bg-slate-900/80 flex items-center gap-2">
                <ShoppingCart size={14} className="text-[#f59e0b]" />
                <h2 className="text-xs font-mono text-white tracking-widest">SPOT MARKET // SINGLES</h2>
              </div>
              <div className="p-0">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 bg-[#0a0e1a]/50">
                      <th className="p-3 font-normal">ITEM</th>
                      <th className="p-3 font-normal text-right">PRICE (USDT)</th>
                      <th className="p-3 font-normal text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr className="hover:bg-slate-800/30 transition-colors group">
                      <td className="p-3 text-white">BPC-157 5mg vial</td>
                      <td className="p-3 text-right text-emerald-400">$28.00</td>
                      <td className="p-3 text-right">
                        <button className="px-2 py-1 bg-slate-800 text-white hover:bg-[#f59e0b] hover:text-black transition-colors border border-slate-700 opacity-0 group-hover:opacity-100">BUY</button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/30 transition-colors group">
                      <td className="p-3 text-white">TB-500 5mg vial</td>
                      <td className="p-3 text-right text-emerald-400">$32.00</td>
                      <td className="p-3 text-right">
                        <button className="px-2 py-1 bg-slate-800 text-white hover:bg-[#f59e0b] hover:text-black transition-colors border border-slate-700 opacity-0 group-hover:opacity-100">BUY</button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/30 transition-colors group">
                      <td className="p-3 text-white">Bacteriostatic Water 30ml</td>
                      <td className="p-3 text-right text-emerald-400">$12.00</td>
                      <td className="p-3 text-right">
                        <button className="px-2 py-1 bg-slate-800 text-white hover:bg-[#f59e0b] hover:text-black transition-colors border border-slate-700 opacity-0 group-hover:opacity-100">BUY</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="p-3 text-center border-t border-slate-800 bg-[#0a0e1a]/50">
                   <button className="text-[10px] font-mono text-slate-500 hover:text-[#f59e0b] transition-colors">ACCESS FULL SPOT MARKET →</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12 py-6 text-center text-xs font-mono text-slate-600 bg-[#0a0e1a]">
        <p>ALL DATA RENDERED IN REAL-TIME. EXCLUSIVE ACCESS ONLY.</p>
      </footer>
    </div>
  );
}
