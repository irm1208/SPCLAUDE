import React, { useState } from 'react';
import { 
  Search, Sun, Moon, ShoppingCart, Home, Beaker, 
  Settings, FileText, ClipboardList, ShieldAlert, 
  Package, Calculator, MessageCircle, ChevronRight, 
  ShieldCheck, Droplet, Star, ArrowRight, Shield, Award, CheckCircle2, Lock
} from 'lucide-react';

const inventory = [
  { id: "621650", name: "Retatrutide 10mg", mg: "10", price: "$20.00", inStock: true },
  { id: "8a3f21", name: "Semaglutide 5mg", mg: "5", price: "$18.00", inStock: true },
  { id: "c7d849", name: "BPC-157 5mg", mg: "5", price: "$15.00", inStock: true },
  { id: "e1b293", name: "TB-500 10mg", mg: "10", price: "$22.00", inStock: false },
  { id: "f40a17", name: "GLP-1 Fragment 2mg", mg: "2", price: "$12.00", inStock: true },
];

const navItems = [
  { icon: Home, label: 'Home', active: true },
  { icon: Package, label: 'Lonely Vial' },
  { icon: Settings, label: 'Accessories' },
  { icon: FileText, label: 'Lab Reports' },
  { icon: ClipboardList, label: 'Protocols' },
  { icon: ShieldAlert, label: 'Safety Calc' },
  { icon: ShoppingCart, label: 'My Orders' },
  { icon: Calculator, label: 'Dose Calc' },
];

export function Warm() {
  const [currency, setCurrency] = useState('USD');
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="min-h-screen bg-[#FDF6EC] font-['DM_Sans'] text-[#4A3B32] flex selection:bg-[#D4872A] selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 fixed h-screen border-r border-[#E8DCC8] bg-[#FDF6EC] flex flex-col pt-8 pb-6 px-6">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4872A] to-[#E8A840] flex items-center justify-center text-white font-['Libre_Baskerville'] font-bold text-xl shadow-sm">
            S
          </div>
          <span className="font-['Libre_Baskerville'] text-lg font-bold tracking-tight text-[#2C1810]">
            Salt & Peps
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item, idx) => (
            <button
              key={idx}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                item.active 
                  ? 'bg-[#FFFDF7] text-[#D4872A] shadow-sm border border-[#E8DCC8]' 
                  : 'text-[#8C7A6B] hover:bg-[#FFFDF7] hover:text-[#4A3B32]'
              }`}
            >
              <item.icon className={`w-5 h-5 ${item.active ? 'text-[#D4872A]' : ''}`} />
              <span className="font-medium text-[15px]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-8 space-y-4">
          <div className="p-5 rounded-[16px] bg-gradient-to-br from-[#D4872A] to-[#E8A840] text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <h4 className="font-['Libre_Baskerville'] font-bold text-lg mb-2 relative z-10">Members Club</h4>
            <p className="text-sm text-white/90 mb-4 leading-relaxed relative z-10">
              Join the private channel for batch early access and deep discussions.
            </p>
            <button className="bg-white text-[#D4872A] px-4 py-2 rounded-lg text-sm font-bold w-full shadow-sm hover:shadow transition-shadow relative z-10">
              Request Invite
            </button>
          </div>

          <button className="w-full flex items-center justify-center gap-2 py-3 text-[#8C7A6B] hover:text-[#D4872A] transition-colors rounded-xl border border-transparent hover:border-[#E8DCC8] hover:bg-[#FFFDF7]">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Community Telegram</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 flex flex-col max-w-7xl mx-auto">
        {/* Header */}
        <header className="h-20 flex items-center justify-end px-10 gap-4">
          <div className="flex bg-[#FFFDF7] rounded-full p-1 border border-[#E8DCC8] shadow-sm">
            <button 
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${currency === 'USD' ? 'bg-[#FDF6EC] text-[#2C1810] shadow-sm border border-[#E8DCC8]' : 'text-[#8C7A6B]'}`}
              onClick={() => setCurrency('USD')}
            >
              USD
            </button>
            <button 
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${currency === 'GBP' ? 'bg-[#FDF6EC] text-[#2C1810] shadow-sm border border-[#E8DCC8]' : 'text-[#8C7A6B]'}`}
              onClick={() => setCurrency('GBP')}
            >
              GBP
            </button>
          </div>
          <button 
            className="w-10 h-10 rounded-full bg-[#FFFDF7] border border-[#E8DCC8] flex items-center justify-center text-[#8C7A6B] hover:text-[#D4872A] hover:bg-white shadow-sm transition-all"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* Content Layout */}
        <div className="flex flex-1 p-10 pt-4 gap-12">
          
          {/* Left Column (60%) */}
          <div className="w-[60%] space-y-10">
            {/* Hero Block */}
            <div className="space-y-6">
              <div>
                <h1 className="font-['Libre_Baskerville'] text-5xl font-bold text-[#2C1810] mb-4 tracking-tight">
                  Welcome back to<br/>Salt & Peps.
                </h1>
                <p className="text-xl text-[#6B5A4D] font-['Libre_Baskerville'] italic leading-relaxed max-w-lg">
                  Independent research compounds, batch-tested by the community, for the community.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-2 bg-[#FFFDF7] px-4 py-2 rounded-full border border-[#E8DCC8] shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-[#D4872A]" />
                  <span className="text-sm font-medium text-[#4A3B32]">Janoshik Tested</span>
                </div>
                <div className="flex items-center gap-2 bg-[#FFFDF7] px-4 py-2 rounded-full border border-[#E8DCC8] shadow-sm">
                  <Award className="w-4 h-4 text-[#D4872A]" />
                  <span className="text-sm font-medium text-[#4A3B32]">99%+ Purity</span>
                </div>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-[#FFFDF7] rounded-[24px] border border-[#E8DCC8] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-dashed border-[#E8DCC8]">
                <h2 className="font-['Libre_Baskerville'] text-2xl font-bold text-[#2C1810]">Current Batch</h2>
                <p className="text-sm text-[#8C7A6B] mt-1">Available inventory ready to ship.</p>
              </div>
              
              <div className="p-2">
                {inventory.map((item, i) => (
                  <div 
                    key={item.id} 
                    className="group flex items-center justify-between p-4 hover:bg-[#FDF6EC] rounded-[16px] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#FDF6EC] border border-[#E8DCC8] flex items-center justify-center group-hover:bg-white transition-colors">
                        <Droplet className="w-5 h-5 text-[#D4872A]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-['Libre_Baskerville'] font-bold text-[#2C1810] text-lg">
                            {item.name}
                          </span>
                          <span className="bg-[#FEF3E6] text-[#D4872A] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#F4DEC1] uppercase tracking-wider">
                            Tested
                          </span>
                        </div>
                        <div className="text-sm text-[#8C7A6B] flex items-center gap-2">
                          <span className="font-mono text-xs bg-[#FFFDF7] px-1.5 py-0.5 rounded border border-[#E8DCC8]">#{item.id}</span>
                          <span>•</span>
                          <span>{item.mg}mg vial</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="block font-bold text-lg text-[#2C1810]">{item.price}</span>
                        <span className="text-xs text-[#8C7A6B]">per vial</span>
                      </div>
                      <button 
                        disabled={!item.inStock}
                        className={`px-6 py-2.5 rounded-[12px] font-bold text-sm transition-all shadow-sm ${
                          item.inStock 
                            ? 'bg-[#D4872A] text-white hover:bg-[#C4782A] hover:shadow-md' 
                            : 'bg-[#E8DCC8] text-[#8C7A6B] cursor-not-allowed shadow-none border border-transparent'
                        }`}
                      >
                        {item.inStock ? 'Add to Cart' : 'Out of Stock'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (40%) */}
          <div className="w-[40%] space-y-8">
            
            {/* Trust Block */}
            <div className="bg-[#FFFDF7] rounded-[24px] p-8 border border-[#E8DCC8] shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Star className="w-24 h-24 text-[#D4872A]" />
              </div>
              <h3 className="font-['Libre_Baskerville'] text-xl font-bold text-[#2C1810] mb-4 relative z-10">
                About this batch
              </h3>
              <div className="space-y-4 text-[15px] leading-relaxed text-[#6B5A4D] relative z-10">
                <p>
                  Hey everyone. This month's batch just landed and the Janoshik results look exceptional across the board. 
                </p>
                <p>
                  We took extra care sourcing the Retatrutide this round. As always, everything is blind-tested before it touches the inventory. Let us know if you have any questions in the group!
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4872A] to-[#E8A840] flex items-center justify-center text-white">
                    <span className="font-['Libre_Baskerville'] font-bold italic">S</span>
                  </div>
                  <div>
                    <p className="font-bold text-[#2C1810] font-['Libre_Baskerville']">Simon</p>
                    <p className="text-xs text-[#8C7A6B]">Community Founder</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Resources List */}
            <div>
              <h3 className="font-['Libre_Baskerville'] text-lg font-bold text-[#2C1810] mb-4 px-2">
                Community Resources
              </h3>
              <div className="space-y-3">
                {[
                  { title: "The Lonely Vial", desc: "Orphaned singles at a discount", icon: Package },
                  { title: "Lab Reports", desc: "View all Janoshik testing data", icon: FileText },
                  { title: "Protocols Guide", desc: "Community-sourced dosing schedules", icon: ClipboardList },
                  { title: "Accessories", desc: "Water, pins, and prep supplies", icon: Settings },
                ].map((item, i) => (
                  <button key={i} className="w-full bg-[#FFFDF7] p-4 rounded-[16px] border border-[#E8DCC8] shadow-sm flex items-center gap-4 hover:border-[#D4872A] hover:shadow-md transition-all group text-left">
                    <div className="w-12 h-12 rounded-full bg-[#FEF3E6] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <item.icon className="w-5 h-5 text-[#D4872A]" />
                    </div>
                    <div className="flex-1">
                      <span className="block font-bold text-[#2C1810] mb-0.5">{item.title}</span>
                      <span className="block text-sm text-[#8C7A6B]">{item.desc}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#E8DCC8] group-hover:text-[#D4872A] transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Utilities */}
            <div>
              <h3 className="font-['Libre_Baskerville'] text-lg font-bold text-[#2C1810] mb-4 px-2">
                Quick Tools
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-[#FFFDF7] p-4 rounded-[16px] border border-[#E8DCC8] shadow-sm hover:border-[#D4872A] hover:shadow-md transition-all text-left group">
                  <Calculator className="w-5 h-5 text-[#D4872A] mb-3" />
                  <span className="block font-bold text-sm text-[#2C1810] mb-1">Dose Calc</span>
                  <span className="block text-xs text-[#8C7A6B]">Reconstitution math</span>
                </button>
                <button className="bg-[#FFFDF7] p-4 rounded-[16px] border border-[#E8DCC8] shadow-sm hover:border-[#D4872A] hover:shadow-md transition-all text-left group">
                  <Beaker className="w-5 h-5 text-[#D4872A] mb-3" />
                  <span className="block font-bold text-sm text-[#2C1810] mb-1">Endotoxin</span>
                  <span className="block text-xs text-[#8C7A6B]">Safety limits</span>
                </button>
                <button className="bg-[#FFFDF7] p-4 rounded-[16px] border border-[#E8DCC8] shadow-sm hover:border-[#D4872A] hover:shadow-md transition-all text-left group col-span-2 flex items-center justify-between">
                  <div>
                    <Search className="w-5 h-5 text-[#D4872A] mb-3" />
                    <span className="block font-bold text-sm text-[#2C1810] mb-1">Track Order</span>
                    <span className="block text-xs text-[#8C7A6B]">Check shipping status</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#E8DCC8] group-hover:text-[#D4872A] transition-colors" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
