import React, { useState } from "react";
import {
  LayoutDashboard, ReceiptText, UsersRound, HeartPulse, ClipboardList,
  Search, Bell, ChevronRight, Store, Plus, Sparkles,
  FlaskConical, ArrowUp, Syringe, Package, ArrowRight, Activity, Clock
} from "lucide-react";

import './_group.css';

// ─── Mock Data ──────────────────────────────────────────────────────────

const iso = (msFromNow: number) => new Date(Date.now() + msFromNow).toISOString();
const daysAgo = (n: number) => iso(-n * 86_400_000);
const daysAhead = (n: number) => iso(n * 86_400_000);

const MOCK_ORDERS = [
  {
    id: "o1", code: "SP-10488", status: "Shipped", grandTotal: 148.0, currency: "GBP",
    createdAt: daysAgo(1), deliveryMethod: "Royal Mail 24",
    lineItems: [
      { productName: "Tirzepatide 10mg", quantity: 2 },
      { productName: "Bacteriostatic Water 10ml", quantity: 1 },
    ],
  },
  {
    id: "o2", code: "SP-10471", status: "Submitted", grandTotal: 176.0, currency: "GBP",
    createdAt: daysAgo(3), deliveryMethod: "Royal Mail 48",
    lineItems: [
      { productName: "CJC-1295 / Ipamorelin 10mg", quantity: 2 },
      { productName: "Insulin Syringes 1ml", quantity: 1 },
    ],
  },
  {
    id: "o3", code: "SP-10455", status: "Processing", grandTotal: 89.5, currency: "GBP",
    createdAt: daysAgo(6), deliveryMethod: "DPD Next Day",
    lineItems: [{ productName: "BPC-157 5mg", quantity: 3 }],
  },
];

const MOCK_COMPOUNDS = [
  {
    id: "c1", compoundName: "Tirzepatide", compoundType: "Peptide",
    doseAmount: "5", doseUnit: "mg", frequency: "Once weekly", route: "Subcutaneous",
    startDate: daysAgo(42), endDate: null,
  },
  {
    id: "c2", compoundName: "Testosterone Enanthate", compoundType: "TRT",
    doseAmount: "125", doseUnit: "mg", frequency: "Twice weekly", route: "IM",
    startDate: daysAgo(68), endDate: null,
  },
  {
    id: "c3", compoundName: "BPC-157", compoundType: "Peptide",
    doseAmount: "250", doseUnit: "mcg", frequency: "Daily", route: "Subcutaneous",
    startDate: daysAgo(21), endDate: null,
  },
];

const MOCK_GROUP_BUYS = [
  { id: "g1", name: "Tirzepatide Bulk — March Round", status: "active", closeDate: daysAhead(5), organiserId: "u_self", productCount: 4 },
  { id: "g2", name: "Retatrutide Collective", status: "active", closeDate: daysAhead(12), organiserId: null, productCount: 2 },
];

function daysSince(iso: string) {
  const start = new Date((iso.length <= 10 ? iso + "T00:00:00" : iso)).getTime();
  return Math.max(0, Math.round((Date.now() - start) / 86_400_000));
}

// ─── Theme & Colors ─────────────────────────────────────────────────────

const theme = {
  bg: "#f6f8fb", // Very light tinted indigo/lavender air
  panel: "rgba(255, 255, 255, 0.7)", 
  panelSolid: "#ffffff",
  border: "rgba(99, 102, 241, 0.12)", // Soft indigo border
  borderStrong: "rgba(99, 102, 241, 0.2)",
  text: "#1e1b4b", // Deepest indigo
  textSoft: "#4338ca", // Mid indigo
  subtle: "#818cf8", // Lighter indigo
  accent: "#4f46e5", // Primary brand indigo
  accentSoft: "rgba(79, 70, 229, 0.06)",
};

export function IndigoAir() {
  const [activeTab, setActiveTab] = useState("home");
  const [heroQ, setHeroQ] = useState("");
  const [heroFocused, setHeroFocused] = useState(false);

  const navItems = [
    { id: "home", label: "Dashboard", Icon: LayoutDashboard },
    { id: "orders", label: "Orders", Icon: ReceiptText },
    { id: "groups", label: "Group Buys", Icon: UsersRound },
    { id: "health", label: "Health Hub", Icon: HeartPulse },
    { id: "lab", label: "Lab Tests", Icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen flex text-indigo-950 font-sans" style={{ backgroundColor: theme.bg }}>
      
      {/* Sidebar - Minimal, elegant lines */}
      <aside className="w-[260px] shrink-0 flex flex-col backdrop-blur-xl" style={{ borderRight: `1px solid ${theme.border}`, background: theme.panel }}>
        <div className="h-20 flex items-center px-8 border-b" style={{ borderColor: theme.border }}>
          <span className="font-bold text-[19px] tracking-tight" style={{ color: theme.accent }}>Salt<span className="text-indigo-300 font-medium px-0.5">&amp;</span>Peps</span>
        </div>
        
        <div className="px-5 py-6 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-300 mb-4 px-3">Overview</p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg transition-all"
                  style={{
                    background: active ? theme.accentSoft : "transparent",
                    color: active ? theme.accent : theme.textSoft,
                    fontWeight: active ? 600 : 500
                  }}
                >
                  <item.Icon className="w-[18px] h-[18px]" style={{ opacity: active ? 1 : 0.6 }} />
                  <span className="text-[13.5px] tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6 border-t" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md flex items-center justify-center text-white text-[13px] font-bold shadow-sm" style={{ background: `linear-gradient(135deg, ${theme.accent}, #818cf8)` }}>
              IW
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[13.5px] font-semibold tracking-tight text-indigo-950">ironwolf_88</span>
              <span className="text-[12px] text-indigo-500 font-medium">£42.50 credits</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Topbar */}
        <header className="h-20 flex items-center justify-between px-10 border-b backdrop-blur-md sticky top-0 z-10" style={{ background: "rgba(246, 248, 251, 0.7)", borderColor: theme.border }}>
          <div className="flex items-center gap-8">
            <h1 className="text-[22px] font-semibold tracking-tight text-indigo-950">Dashboard</h1>
            <div className="hidden md:flex gap-6 text-[13.5px] font-medium text-indigo-400">
              <span className="text-indigo-900">Today</span>
              <span className="hover:text-indigo-700 cursor-pointer transition-colors">Last 7 Days</span>
              <span className="hover:text-indigo-700 cursor-pointer transition-colors">30 Days</span>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Search orders, compounds..." 
                className="w-64 pl-9 pr-4 py-2 bg-white/60 border rounded-lg text-[13px] font-medium focus:outline-none focus:bg-white transition-all shadow-sm placeholder-indigo-300"
                style={{ borderColor: theme.border }}
              />
            </div>
            <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/60 border shadow-sm hover:bg-white transition-colors" style={{ borderColor: theme.border }}>
              <Bell className="w-[16px] h-[16px] text-indigo-500" />
            </button>
            <button className="h-9 px-4 flex items-center justify-center gap-2 rounded-lg text-white text-[13px] font-semibold shadow-sm hover:opacity-90 transition-opacity" style={{ background: theme.accent }}>
              <Store className="w-4 h-4" />
              Shop
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-10 pb-20 max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-10">
            
            {/* Left/Main Column */}
            <div className="xl:col-span-8 space-y-10">
              
              {/* Sage AI Area - Premium, Glowing, Superhuman-esque */}
              <div className="relative rounded-2xl overflow-hidden shadow-sm" style={{ background: theme.panelSolid, border: `1px solid ${theme.border}` }}>
                {/* Soft ambient glows */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-50 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 opacity-70 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#eef2ff] rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4 opacity-60 pointer-events-none" />
                
                <div className="relative px-10 py-10 flex flex-col justify-center items-center text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-6 shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  
                  <h2 className="text-[34px] font-medium tracking-tight text-indigo-950 mb-3">
                    Hello, ironwolf_88.
                  </h2>
                  <p className="text-[16px] text-indigo-500 font-medium">Ask Sage anything about your health journey.</p>
                  
                  <div className="w-full max-w-lg mt-8 relative group">
                    <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-[0.08] group-focus-within:opacity-[0.15] transition-opacity rounded-xl" />
                    <div className="relative flex items-center bg-white border shadow-sm rounded-xl p-1.5 transition-all focus-within:ring-2 focus-within:border-indigo-400" style={{ borderColor: theme.border, ringColor: theme.accentSoft }}>
                      <div className="w-10 h-10 flex items-center justify-center text-indigo-300">
                        <Sparkles className="w-[18px] h-[18px]" />
                      </div>
                      <input
                        type="text"
                        value={heroQ}
                        onChange={e => setHeroQ(e.target.value)}
                        onFocus={() => setHeroFocused(true)}
                        onBlur={() => setHeroFocused(false)}
                        placeholder="Analyse my recent bloodwork..."
                        className="flex-1 bg-transparent border-none outline-none text-[15px] font-medium placeholder-indigo-300 px-2 text-indigo-950"
                      />
                      <button className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 transition-colors opacity-90">
                        <ArrowUp className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 mt-5">
                    {["Review a protocol", "My compounds summary"].map(chip => (
                      <button key={chip} className="px-4 py-1.5 rounded-md bg-white border text-[12.5px] font-semibold text-indigo-500 hover:text-indigo-800 hover:bg-indigo-50/50 transition-all" style={{ borderColor: theme.border }}>
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Huge Confident Stats - Webflow style */}
              <div className="grid grid-cols-4 gap-6">
                {[
                  { label: "Active Orders", value: "3", sub: "2 arriving this week" },
                  { label: "Compounds", value: "4", sub: "1 protocol active" },
                  { label: "Lab Reports", value: "12", sub: "Last test 14 days ago" },
                  { label: "Group Buys", value: "2", sub: "1 closing soon" },
                ].map(stat => (
                  <div key={stat.label} className="flex flex-col border-l-2 pl-4" style={{ borderColor: theme.borderStrong }}>
                    <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-indigo-400 mb-1">{stat.label}</span>
                    <span className="text-[44px] font-light tracking-tighter leading-none text-indigo-950">{stat.value}</span>
                    <span className="text-[12.5px] text-indigo-500 mt-2 font-medium">{stat.sub}</span>
                  </div>
                ))}
              </div>

              {/* Orders Table - Elegant & disciplined */}
              <div>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <h3 className="text-[20px] font-semibold tracking-tight text-indigo-950">Recent Orders</h3>
                    <p className="text-[13.5px] text-indigo-500 font-medium mt-1">Track your active deliveries</p>
                  </div>
                  <button className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    View All <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: theme.border }}>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b" style={{ borderColor: theme.border, background: "rgba(246, 248, 251, 0.4)" }}>
                        <th className="px-6 py-4 text-[11.5px] font-bold text-indigo-400 uppercase tracking-widest">Order ID</th>
                        <th className="px-6 py-4 text-[11.5px] font-bold text-indigo-400 uppercase tracking-widest">Items</th>
                        <th className="px-6 py-4 text-[11.5px] font-bold text-indigo-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[11.5px] font-bold text-indigo-400 uppercase tracking-widest">Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: theme.border }}>
                      {MOCK_ORDERS.map(o => {
                        const first = o.lineItems[0]?.productName;
                        const more = o.lineItems.length - 1;
                        return (
                          <tr key={o.id} className="hover:bg-indigo-50/20 transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-[13.5px] font-mono text-indigo-700 font-semibold">{o.code}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[13.5px] font-medium text-indigo-900">{first}{more > 0 ? <span className="text-indigo-400 ml-1">+{more}</span> : ""}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-[4px] text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700">
                                {o.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[13.5px] font-medium text-indigo-500">{o.deliveryMethod}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right Column / Side Widgets */}
            <div className="xl:col-span-4 space-y-8">
              
              {/* My Compounds Carousel -> Re-imagined as a disciplined list to avoid generic cards */}
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[16px] font-semibold tracking-tight text-indigo-950">Active Compounds</h3>
                  <button className="w-8 h-8 rounded-md bg-white border flex items-center justify-center text-indigo-600 shadow-sm hover:bg-indigo-50" style={{ borderColor: theme.border }}><Plus className="w-4 h-4" /></button>
                </div>
                
                <div className="space-y-3">
                  {MOCK_COMPOUNDS.map(c => {
                    const days = daysSince(c.startDate);
                    const pct = Math.min(100, Math.round((days / 84) * 100));
                    return (
                      <div key={c.id} className="bg-white rounded-xl border p-4 shadow-sm relative overflow-hidden group" style={{ borderColor: theme.border }}>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-[30px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        
                        <div className="flex items-start justify-between relative z-10 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-50/80 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                              <Syringe className="w-[18px] h-[18px]" />
                            </div>
                            <div>
                              <p className="text-[14.5px] font-semibold text-indigo-950 leading-none mb-1.5">{c.compoundName}</p>
                              <div className="flex items-center gap-1.5 text-[12.5px] text-indigo-500 font-medium leading-none">
                                <span>{c.doseAmount}{c.doseUnit}</span>
                                <span className="opacity-50">•</span>
                                <span>{c.frequency}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-4 relative z-10">
                          <div className="flex-1 h-1.5 bg-indigo-50 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-indigo-400 tabular-nums">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group Buys Panel */}
              <div className="bg-white rounded-xl border shadow-sm p-6" style={{ borderColor: theme.border }}>
                <h3 className="text-[16px] font-semibold tracking-tight text-indigo-950 mb-4">Active Group Buys</h3>
                
                <div className="space-y-4">
                  {MOCK_GROUP_BUYS.map(g => (
                    <div key={g.id} className="group cursor-pointer">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[14px] font-semibold text-indigo-900 group-hover:text-indigo-600 transition-colors">{g.name}</span>
                        <ChevronRight className="w-4 h-4 text-indigo-300 group-hover:text-indigo-600 transition-colors" />
                      </div>
                      <div className="flex justify-between items-center text-[12.5px] text-indigo-500 font-medium">
                        <span>{g.productCount} products</span>
                        <span className="text-amber-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Closes in {daysSince(g.closeDate || '')}d
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button className="w-full mt-6 py-2.5 rounded-lg border border-dashed text-[13px] font-semibold text-indigo-600 hover:bg-indigo-50/50 transition-colors" style={{ borderColor: theme.borderStrong }}>
                  Browse All Pools
                </button>
              </div>

            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
