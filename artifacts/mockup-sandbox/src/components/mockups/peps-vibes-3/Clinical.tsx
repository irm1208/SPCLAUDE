import React, { useState } from "react";
import { 
  Search, 
  FlaskConical, 
  Box, 
  FileText, 
  BookOpen, 
  Calculator, 
  Clock, 
  Menu,
  Moon,
  Sun,
  Globe,
  Activity,
  AlertTriangle,
  Beaker,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  ShoppingCart
} from "lucide-react";

export function Clinical() {
  const [currency, setCurrency] = useState<"USD" | "GBP">("USD");
  const [darkMode, setDarkMode] = useState(false);

  const inventory = [
    { id: "621650", name: "Retatrutide 10mg", mg: "10", price: "$20.00", inStock: true },
    { id: "8a3f21", name: "Semaglutide 5mg", mg: "5", price: "$18.00", inStock: true },
    { id: "c7d849", name: "BPC-157 5mg", mg: "5", price: "$15.00", inStock: true },
    { id: "e1b293", name: "TB-500 10mg", mg: "10", price: "$22.00", inStock: false },
    { id: "f40a17", name: "GLP-1 Fragment 2mg", mg: "2", price: "$12.00", inStock: true },
  ];

  const navItems = [
    { name: "Home", icon: Box, active: true },
    { name: "Lonely Vial", icon: FlaskConical },
    { name: "Accessories", icon: Beaker },
    { name: "Lab Reports", icon: FileText },
    { name: "Protocols", icon: BookOpen },
    { name: "Safety Calc", icon: AlertTriangle },
    { name: "My Orders", icon: Clock },
    { name: "Dose Calc", icon: Calculator },
  ];

  return (
    <div className={`min-h-screen font-['Inter'] text-slate-900 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-[#F8FAFC]'}`}>
      {/* Top Header */}
      <header className="h-12 border-b border-[#DDE3EC] bg-white flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center gap-4 text-xs font-['Space_Mono'] tracking-widest text-slate-500">
          <span>SYS.STAT: ONLINE</span>
          <span className="hidden sm:inline text-[#2B7A9E]">• LATEST BATCH VERIFIED</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrency(c => c === "USD" ? "GBP" : "USD")}
            className="flex items-center gap-1.5 text-xs font-['Space_Mono'] hover:text-[#2B7A9E] transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {currency}
          </button>
          <div className="w-px h-4 bg-[#DDE3EC]"></div>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="text-slate-400 hover:text-[#2B7A9E] transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row max-w-[1600px] mx-auto">
        {/* Sidebar */}
        <aside className="w-full md:w-[240px] shrink-0 border-r border-[#DDE3EC] bg-[#F1F5F9] min-h-[calc(100vh-48px)] flex flex-col p-6">
          <div className="mb-10">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">S&amp;P<span className="text-[#2B7A9E]">.LAB</span></h1>
            <div className="mt-1 text-[10px] font-['Space_Mono'] text-slate-500 tracking-widest uppercase">ID: USR-4921-X</div>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <a 
                key={item.name}
                href="#"
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors ${
                  item.active 
                    ? "border-l-2 border-[#2B7A9E] text-[#2B7A9E] -ml-[2px]" 
                    : "text-slate-600 hover:text-slate-900 border-l-2 border-transparent -ml-[2px]"
                }`}
              >
                <item.icon className="w-4 h-4 opacity-70" />
                {item.name}
              </a>
            ))}
          </nav>

          <div className="mt-8 border border-dashed border-[#DDE3EC] p-4 bg-white/50">
            <div className="text-[10px] font-['Space_Mono'] text-slate-500 mb-1">PROMOTION</div>
            <div className="text-sm font-medium mb-2">Q4 Research Grant</div>
            <p className="text-xs text-slate-600 mb-3">Apply code GRANT15 for 15% off sequence orders &gt; $200.</p>
            <button className="text-xs font-['Space_Mono'] text-[#2B7A9E] hover:underline flex items-center gap-1">
              APPLY CODE <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-[#DDE3EC]">
            <a href="#" className="text-xs text-slate-500 hover:text-[#2B7A9E] flex items-center gap-2 transition-colors">
              <span className="w-2 h-2 rounded-none bg-[#2B7A9E]"></span>
              SECURE COMMS (TG)
            </a>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-10 flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* LEFT COLUMN - 60% */}
          <div className="w-full lg:w-[60%] flex flex-col gap-8">
            
            {/* Hero Block */}
            <div className="bg-white border border-[#DDE3EC] p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#F8FAFC] border-l border-b border-[#DDE3EC] opacity-50 flex items-center justify-center">
                 <Activity className="w-16 h-16 text-[#DDE3EC]" strokeWidth={1} />
              </div>
              
              <div className="flex items-center gap-3 mb-6">
                <span className="px-2 py-1 text-[10px] font-['Space_Mono'] text-[#2B7A9E] border border-[#2B7A9E] uppercase tracking-widest bg-blue-50/30">
                  QUALITY · TESTED · DISCREET
                </span>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-slate-900 mb-4 pr-20">
                Synthesized peptides for analytical research.
              </h2>
              
              <p className="text-slate-600 max-w-lg text-sm leading-relaxed mb-8">
                High-purity compounds manufactured under strict laboratory conditions. Third-party tested via HPLC-MS for verifiable concentration and purity. Not for human consumption.
              </p>

              <div className="flex items-center gap-6 border-t border-[#DDE3EC] pt-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#2B7A9E]" />
                  <span className="text-xs font-medium uppercase tracking-wider">HPLC Verified</span>
                </div>
                <div className="w-px h-4 bg-[#DDE3EC]"></div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider">&gt;99% Purity</span>
                </div>
              </div>
            </div>

            {/* Inventory Table */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Current Inventory</h3>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search registry..." 
                    className="pl-9 pr-4 py-1.5 text-xs border border-[#DDE3EC] bg-white w-64 focus:outline-none focus:border-[#2B7A9E] font-['Space_Mono'] placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="bg-white border border-[#DDE3EC] overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#DDE3EC]">
                      <th className="px-4 py-3 text-[10px] font-['Space_Mono'] tracking-widest text-slate-500 uppercase font-medium">SKU</th>
                      <th className="px-4 py-3 text-[10px] font-['Space_Mono'] tracking-widest text-slate-500 uppercase font-medium">Compound</th>
                      <th className="px-4 py-3 text-[10px] font-['Space_Mono'] tracking-widest text-slate-500 uppercase font-medium">Mass</th>
                      <th className="px-4 py-3 text-[10px] font-['Space_Mono'] tracking-widest text-slate-500 uppercase font-medium text-right">Price</th>
                      <th className="px-4 py-3 text-[10px] font-['Space_Mono'] tracking-widest text-slate-500 uppercase font-medium text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item.id} className="border-b border-[#DDE3EC] last:border-b-0 hover:bg-[#F0F4F8] transition-colors group">
                        <td className="px-4 py-4 text-xs font-['Space_Mono'] text-slate-400">{item.id}</td>
                        <td className="px-4 py-4 text-sm font-medium text-slate-900">{item.name}</td>
                        <td className="px-4 py-4 text-xs font-['Space_Mono'] text-slate-600">{item.mg}mg</td>
                        <td className="px-4 py-4 text-sm font-['Space_Mono'] font-bold text-slate-900 text-right">{item.price}</td>
                        <td className="px-4 py-4 text-center">
                          {item.inStock ? (
                            <button className="text-xs font-medium uppercase tracking-wider text-[#2B7A9E] border border-[#2B7A9E] px-3 py-1.5 hover:bg-[#2B7A9E] hover:text-white transition-colors">
                              Add
                            </button>
                          ) : (
                            <button disabled className="text-xs font-medium uppercase tracking-wider text-slate-400 border border-[#DDE3EC] px-3 py-1.5 bg-[#F8FAFC] cursor-not-allowed">
                              OOS
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN - 40% */}
          <div className="w-full lg:w-[40%] flex flex-col gap-6">
            
            {/* Quick Utilities */}
            <div className="bg-white border border-[#DDE3EC] p-0 flex flex-col">
              <div className="p-4 border-b border-[#DDE3EC] bg-[#F8FAFC]">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Lab Utilities</h3>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-[#DDE3EC] border-b border-[#DDE3EC]">
                <a href="#" className="p-4 flex flex-col gap-2 hover:bg-[#F0F4F8] transition-colors group">
                  <Calculator className="w-5 h-5 text-slate-400 group-hover:text-[#2B7A9E]" />
                  <span className="text-sm font-medium">Reconstitution Calc</span>
                  <span className="text-[10px] font-['Space_Mono'] text-slate-500 uppercase">Volume planning</span>
                </a>
                <a href="#" className="p-4 flex flex-col gap-2 hover:bg-[#F0F4F8] transition-colors group">
                  <AlertTriangle className="w-5 h-5 text-slate-400 group-hover:text-[#2B7A9E]" />
                  <span className="text-sm font-medium">Endotoxin Limit</span>
                  <span className="text-[10px] font-['Space_Mono'] text-slate-500 uppercase">Safety threshold</span>
                </a>
                <a href="#" className="p-4 flex flex-col gap-2 hover:bg-[#F0F4F8] transition-colors group">
                  <Search className="w-5 h-5 text-slate-400 group-hover:text-[#2B7A9E]" />
                  <span className="text-sm font-medium">Order Lookup</span>
                  <span className="text-[10px] font-['Space_Mono'] text-slate-500 uppercase">Track shipment</span>
                </a>
                <a href="#" className="p-4 flex flex-col gap-2 hover:bg-[#F0F4F8] transition-colors group">
                  <FileText className="w-5 h-5 text-slate-400 group-hover:text-[#2B7A9E]" />
                  <span className="text-sm font-medium">COA Database</span>
                  <span className="text-[10px] font-['Space_Mono'] text-slate-500 uppercase">Verify batch</span>
                </a>
              </div>
            </div>

            {/* Trust Block */}
            <div className="bg-[#1E293B] border border-[#0F172A] text-slate-300 p-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white mb-4 border-b border-slate-700 pb-3">Certificate of Analysis Directive</h3>
              <div className="space-y-4 text-sm leading-relaxed">
                <p>
                  Every lot produced by our synthesis facility undergoes independent verification before distribution. 
                </p>
                <div className="bg-slate-900/50 p-3 border border-slate-700 font-['Space_Mono'] text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-500">CURRENT BATCH:</span>
                    <span className="text-white">LOT-B7921</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-500">TESTED DATE:</span>
                    <span className="text-white">2023-11-14</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">AVERAGE PURITY:</span>
                    <span className="text-[#2B7A9E]">99.4%</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Access raw data files and chromatograms in the Lab Reports directory using your order verification code.
                </p>
              </div>
            </div>

            {/* Resources List */}
            <div className="bg-white border border-[#DDE3EC]">
              <div className="p-4 border-b border-[#DDE3EC] bg-[#F8FAFC]">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Directory</h3>
              </div>
              <ul className="divide-y divide-[#DDE3EC]">
                <li>
                  <a href="#" className="flex items-center justify-between p-4 hover:bg-[#F0F4F8] transition-colors">
                    <div className="flex items-center gap-3">
                      <FlaskConical className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium">The Lonely Vial</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center justify-between p-4 hover:bg-[#F0F4F8] transition-colors">
                    <div className="flex items-center gap-3">
                      <Beaker className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium">Lab Accessories</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center justify-between p-4 hover:bg-[#F0F4F8] transition-colors">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium">Research Protocols</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </a>
                </li>
              </ul>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
