import React, { useState } from 'react';
import {
  Search,
  ShoppingCart,
  FlaskConical,
  BookOpen,
  FileText,
  Activity,
  Calculator,
  Package,
  Menu,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowRight,
  Plus,
  Send,
  Moon,
  Sun
} from 'lucide-react';

const INVENTORY = [
  { id: "621650", name: "Retatrutide 10mg", mg: "10", price: "$20.00", inStock: true },
  { id: "8a3f21", name: "Semaglutide 5mg", mg: "5", price: "$18.00", inStock: true },
  { id: "c7d849", name: "BPC-157 5mg", mg: "5", price: "$15.00", inStock: true },
  { id: "e1b293", name: "TB-500 10mg", mg: "10", price: "$22.00", inStock: false },
  { id: "f40a17", name: "GLP-1 Fragment 2mg", mg: "2", price: "$12.00", inStock: true },
];

const NAV_ITEMS = [
  { label: 'Home', icon: Package, active: true },
  { label: 'Lonely Vial', icon: FlaskConical },
  { label: 'Accessories', icon: ShoppingCart },
  { label: 'Lab Reports', icon: FileText },
  { label: 'Protocols', icon: BookOpen },
  { label: 'Safety Calc', icon: Activity },
  { label: 'My Orders', icon: Package },
  { label: 'Dose Calc', icon: Calculator },
];

export function Dark() {
  const [currency, setCurrency] = useState<'USD' | 'GBP'>('USD');
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-[#E0E0E6] font-['Plus_Jakarta_Sans'] flex flex-col md:flex-row relative overflow-hidden">
      
      {/* Background Noise Texture */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]" 
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
      ></div>

      {/* Subtle Hero Gradient */}
      <div className="pointer-events-none fixed top-0 left-[240px] right-0 h-[500px] bg-[radial-gradient(ellipse_at_top_left,rgba(201,168,76,0.03)_0%,transparent_50%)] z-0"></div>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-[240px] bg-[#0A0A0E] border-r border-[#18181E] z-10 shrink-0 h-screen sticky top-0">
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#8C712C] flex items-center justify-center text-[#0A0A0E] font-bold text-lg shadow-[0_0_15px_rgba(201,168,76,0.15)]">
              SP
            </div>
            <div>
              <div className="font-['Playfair_Display'] font-semibold text-lg leading-tight tracking-wide text-white">Member</div>
              <div className="text-xs text-[#9A9AA8]">#0824-A</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-hide">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-300 relative group
                ${item.active 
                  ? 'text-[#C9A84C] bg-[#C9A84C]/[0.05]' 
                  : 'text-[#9A9AA8] hover:text-[#E0E0E6] hover:bg-[#18181E]'
                }`}
            >
              {item.active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-[#C9A84C] rounded-r-full shadow-[0_0_8px_rgba(201,168,76,0.6)]"></div>
              )}
              <item.icon className={`w-4 h-4 ${item.active ? 'text-[#C9A84C]' : 'group-hover:text-[#E0E0E6]'}`} />
              <span className="font-medium tracking-wide">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 mt-auto">
          <div className="p-4 rounded-xl border border-[#C9A84C]/30 bg-black/60 shadow-[0_0_20px_rgba(201,168,76,0.03)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#C9A84C]/10 rounded-full blur-xl group-hover:bg-[#C9A84C]/20 transition-all"></div>
            <h4 className="text-xs font-bold text-[#C9A84C] uppercase tracking-widest mb-1 relative z-10">Vault Access</h4>
            <p className="text-xs text-[#9A9AA8] mb-3 relative z-10">Unlock rare compounds and priority shipping.</p>
            <button className="w-full py-2 bg-transparent border border-[#C9A84C]/50 text-[#C9A84C] text-xs font-semibold rounded-lg hover:bg-[#C9A84C] hover:text-[#0A0A0E] transition-colors relative z-10">
              Upgrade
            </button>
          </div>
          
          <button className="w-full flex items-center justify-center gap-2 mt-4 text-xs font-medium text-[#7D9F9F] hover:text-[#95BDBD] transition-colors">
            <Send className="w-3 h-3" />
            <span>Join Telegram</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 z-10 relative">
        {/* Top Header */}
        <header className="h-16 border-b border-[#18181E] bg-[#0A0A0E]/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="md:hidden flex items-center gap-3">
            <button className="text-[#E0E0E6]">
              <Menu className="w-5 h-5" />
            </button>
            <div className="font-['Playfair_Display'] font-semibold text-lg text-white">Salt & Peps</div>
          </div>
          
          <div className="hidden md:block text-xs font-medium text-[#9A9AA8] tracking-widest uppercase">
            Curated Research Compounds
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-[#18181E] rounded-full p-0.5 border border-[#2A2A35]">
              <button 
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${currency === 'USD' ? 'bg-[#2A2A35] text-white shadow-sm' : 'text-[#9A9AA8] hover:text-white'}`}
              >
                USD
              </button>
              <button 
                onClick={() => setCurrency('GBP')}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${currency === 'GBP' ? 'bg-[#2A2A35] text-white shadow-sm' : 'text-[#9A9AA8] hover:text-white'}`}
              >
                GBP
              </button>
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 text-[#9A9AA8] hover:text-white transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-16">
            
            {/* LEFT COLUMN (60%) */}
            <div className="flex-1 space-y-12">
              {/* Hero Block */}
              <div className="space-y-4">
                <div className="text-[10px] font-bold text-[#C9A84C] font-['Space_Mono'] tracking-[0.3em] uppercase">
                  Peps Anonymous
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-['Playfair_Display'] text-white leading-[1.1]">
                  Salt & Peps.
                </h1>
                <p className="text-[#9A9AA8] text-base md:text-lg max-w-md leading-relaxed font-light">
                  A private collection of independently tested research compounds. Pure, verified, and strictly for the initiated.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#E0E0E6] bg-[#18181E] px-3 py-1.5 rounded-md border border-[#2A2A35]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#C9A84C]" />
                    Janoshik Tested
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-[#E0E0E6] bg-[#18181E] px-3 py-1.5 rounded-md border border-[#2A2A35]">
                    <Zap className="w-3.5 h-3.5 text-[#C9A84C]" />
                    99% Purity Guarantee
                  </div>
                </div>
              </div>

              {/* Inventory Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-['Playfair_Display'] text-white">Current Vault Inventory</h2>
                  <div className="text-xs text-[#9A9AA8] font-mono">BATCH #942</div>
                </div>
                
                <div className="bg-[#18181E] rounded-2xl border border-[#2A2A35] overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#252530]">
                        <th className="px-5 py-4 text-xs font-semibold text-[#9A9AA8] uppercase tracking-wider">Compound</th>
                        <th className="px-5 py-4 text-xs font-semibold text-[#9A9AA8] uppercase tracking-wider text-center hidden sm:table-cell">Purity</th>
                        <th className="px-5 py-4 text-xs font-semibold text-[#9A9AA8] uppercase tracking-wider text-right">Price</th>
                        <th className="px-5 py-4 text-xs font-semibold text-[#9A9AA8] uppercase tracking-wider text-right w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#252530]">
                      {INVENTORY.map((item) => (
                        <tr key={item.id} className="group hover:bg-[#1E1E28] transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-medium text-[#E0E0E6] group-hover:text-white transition-colors">{item.name}</div>
                            <div className="text-xs text-[#9A9AA8] mt-0.5">{item.mg}mg • Lyophilized</div>
                          </td>
                          <td className="px-5 py-4 text-center hidden sm:table-cell">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full border border-[#C9A84C]/40 text-[10px] font-bold text-[#C9A84C] tracking-wide">
                              TESTED
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="font-['Space_Mono'] text-[#C9A84C]">{item.price}</div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button 
                              disabled={!item.inStock}
                              className={`w-full sm:w-auto inline-flex items-center justify-center gap-1 px-4 py-2 text-xs font-bold rounded-lg transition-all
                                ${item.inStock 
                                  ? 'bg-[#C9A84C] text-[#0A0A0E] hover:bg-[#D4A843] shadow-[0_0_15px_rgba(201,168,76,0.2)] hover:shadow-[0_0_20px_rgba(201,168,76,0.4)]' 
                                  : 'bg-[#2A2A35] text-[#9A9AA8] cursor-not-allowed'}`}
                            >
                              {item.inStock ? (
                                <>
                                  <Plus className="w-3 h-3" />
                                  Add
                                </>
                              ) : 'Out'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (40%) */}
            <div className="w-full lg:w-[40%] space-y-8 lg:pt-[140px]">
              
              {/* Resources List */}
              <div className="bg-[#1C1C24] rounded-2xl p-6 border border-[#2A2A35] space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2 font-['Space_Mono']">Library</h3>
                <div className="space-y-2">
                  {[
                    { title: "Lonely Vial", desc: "Singles & rare finds", icon: FlaskConical },
                    { title: "Accessories", desc: "Water & supplies", icon: ShoppingCart },
                    { title: "Lab Reports", desc: "Janoshik certificates", icon: FileText },
                    { title: "Protocols", desc: "Research guidelines", icon: BookOpen }
                  ].map((item, i) => (
                    <button key={i} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#252530] border border-transparent hover:border-[#2A2A35] transition-all group text-left">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[#C9A84C]/[0.08] flex items-center justify-center text-[#C9A84C]">
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-[#E0E0E6] group-hover:text-white">{item.title}</div>
                          <div className="text-xs text-[#9A9AA8]">{item.desc}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#C9A84C] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Utilities */}
              <div className="grid grid-cols-2 gap-4">
                <button className="flex flex-col items-center justify-center gap-2 p-5 bg-[#18181E] rounded-2xl border border-[#2A2A35] hover:border-[#C9A84C]/50 hover:bg-[#1C1C24] transition-all group">
                  <Calculator className="w-6 h-6 text-[#9A9AA8] group-hover:text-[#C9A84C] transition-colors" />
                  <span className="text-xs font-semibold text-[#E0E0E6]">Dose Calc</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 p-5 bg-[#18181E] rounded-2xl border border-[#2A2A35] hover:border-[#C9A84C]/50 hover:bg-[#1C1C24] transition-all group">
                  <Activity className="w-6 h-6 text-[#9A9AA8] group-hover:text-[#C9A84C] transition-colors" />
                  <span className="text-xs font-semibold text-[#E0E0E6]">Endotoxin</span>
                </button>
                <button className="col-span-2 flex items-center justify-between p-4 bg-[#18181E] rounded-2xl border border-[#2A2A35] hover:bg-[#1C1C24] transition-all group">
                  <div className="flex items-center gap-3">
                    <Search className="w-5 h-5 text-[#9A9AA8] group-hover:text-[#C9A84C] transition-colors" />
                    <span className="text-sm font-medium text-[#E0E0E6]">Order Lookup</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#505060] group-hover:text-[#C9A84C] transition-colors" />
                </button>
              </div>

              {/* Trust Block */}
              <div className="bg-[#18181E] rounded-2xl p-6 border border-[#2A2A35]">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex-shrink-0">
                    <div className="w-8 h-8 rounded-full border border-[#C9A84C]/30 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-[#C9A84C]" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-['Playfair_Display'] text-lg text-white mb-1">About this batch</h4>
                    <p className="text-sm text-[#9A9AA8] leading-relaxed">
                      All compounds independently tested by Janoshik Analytical. Certificates available upon request. Stored at strict temperature controls prior to dispatch.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-[#505060] pt-4 border-t border-[#18181E]">
                <span>© 2026 Peps Anonymous</span>
                <div className="flex items-center gap-4">
                  <a href="#" className="hover:text-[#7D9F9F] transition-colors">Telegram</a>
                  <a href="#" className="hover:text-[#E0E0E6] transition-colors">Member Terms</a>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
