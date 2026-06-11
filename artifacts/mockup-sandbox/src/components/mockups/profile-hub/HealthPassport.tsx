import React, { useState } from "react";
import { 
  Activity, 
  Beaker, 
  CreditCard, 
  FileText, 
  LogOut, 
  Settings, 
  ShieldCheck, 
  Syringe, 
  Terminal, 
  Users 
} from "lucide-react";

export function HealthPassport() {
  const [activeTab, setActiveTab] = useState("Orders");

  const tabs = ["Orders", "Compounds", "Blood Tests", "Group Buys", "Settings"];

  const recentOrders = [
    { id: "ORD-992A-44B", status: "In Transit", amount: "$345.00", date: "2024-03-12" },
    { id: "ORD-718C-92D", status: "Delivered", amount: "$120.50", date: "2024-02-28" },
    { id: "ORD-105F-33E", status: "Delivered", amount: "$890.00", date: "2024-01-15" },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-slate-300 font-sans p-4 sm:p-6 lg:p-8 selection:bg-cyan-500/30">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header / User Card */}
        <header className="relative overflow-hidden rounded-2xl bg-[#161B22] border border-slate-800/60 p-6 sm:p-8 shadow-2xl">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <ShieldCheck className="w-48 h-48 text-cyan-400" strokeWidth={1} />
          </div>
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-900/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center backdrop-blur-sm">
                <span className="text-2xl font-mono font-medium text-cyan-400">01</span>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-semibold text-white tracking-tight">@iam0121</h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono uppercase tracking-wider">
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400 font-mono">
                  <span>ID: 8842-A99</span>
                  <span className="text-slate-600">•</span>
                  <span>Member since: 2023</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:items-end gap-2">
              <div className="text-xs text-slate-500 font-mono uppercase tracking-widest">Clearance Level</div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                <span className="ml-2 text-sm font-mono text-violet-300">Tier 2</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scorecard */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Orders", value: "1", icon: Activity, color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20" },
            { label: "Group Buys", value: "2", icon: Users, color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/20" },
            { label: "Compounds", value: "3", icon: Syringe, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
            { label: "Tests Logged", value: "8", icon: Beaker, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
          ].map((stat, idx) => (
            <div key={idx} className="bg-[#161B22] border border-slate-800/60 rounded-xl p-5 hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg ${stat.bg} ${stat.border} border`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-mono text-white mb-1">{stat.value}</div>
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Navigation Tabs */}
        <nav className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 border-b border-slate-800/60">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                activeTab === tab 
                  ? "bg-slate-800/80 text-white shadow-sm" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              {tab === "Orders" && <CreditCard className="w-4 h-4" />}
              {tab === "Compounds" && <Syringe className="w-4 h-4" />}
              {tab === "Blood Tests" && <Activity className="w-4 h-4" />}
              {tab === "Group Buys" && <Users className="w-4 h-4" />}
              {tab === "Settings" && <Settings className="w-4 h-4" />}
              {tab}
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <main className="min-h-[300px]">
          {activeTab === "Orders" && (
            <div className="bg-[#161B22] border border-slate-800/60 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800/60 flex justify-between items-center bg-[#11151C]">
                <h2 className="text-sm font-mono text-slate-300 uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-500" />
                  Recent Transactions
                </h2>
                <button className="text-xs text-cyan-400 hover:text-cyan-300 font-mono uppercase tracking-wider">
                  View All
                </button>
              </div>
              <div className="divide-y divide-slate-800/60">
                {recentOrders.map((order, idx) => (
                  <div key={idx} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <div>
                        <div className="font-mono text-slate-200">{order.id}</div>
                        <div className="text-xs font-mono text-slate-500 mt-1">{order.date}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/2">
                      <div className="font-mono text-slate-300">{order.amount}</div>
                      <div className={`px-2.5 py-1 rounded border text-xs font-mono uppercase tracking-wider ${
                        order.status === "In Transit" 
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      }`}>
                        {order.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab !== "Orders" && (
            <div className="flex flex-col items-center justify-center h-64 border border-dashed border-slate-800/60 rounded-xl bg-[#161B22]/50">
              <Terminal className="w-8 h-8 text-slate-600 mb-4" />
              <div className="text-slate-400 font-mono text-sm uppercase tracking-widest">
                {activeTab} module initializing...
              </div>
            </div>
          )}
        </main>

        {/* Footer Actions */}
        <footer className="pt-6 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-4 text-sm font-mono">
          <div className="flex gap-6">
            <button className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Preferences
            </button>
            <button className="text-slate-500 hover:text-cyan-400 transition-colors flex items-center gap-2">
              <Users className="w-4 h-4" />
              Telegram Connect
            </button>
          </div>
          <button className="text-slate-500 hover:text-red-400 transition-colors flex items-center gap-2 group">
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Terminate Session
          </button>
        </footer>

      </div>
    </div>
  );
}
