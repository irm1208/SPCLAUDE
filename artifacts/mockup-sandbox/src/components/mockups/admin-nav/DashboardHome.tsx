import { useState } from "react";
import {
  Home, BarChart3, Bell, Package, Users, ShoppingBag,
  UserCheck, TestTube, Settings, MessageSquare, ClipboardList,
  TrendingUp, TrendingDown, ArrowRight, AlertTriangle,
  ShoppingCart, Clock, DollarSign, UserPlus, CheckCircle2,
  MoreHorizontal, Zap
} from "lucide-react";

type Section = "dashboard" | "analytics" | "orders" | "accounts" | "roles" | "alerts" | "settings";

const NAV_ITEMS: { id: Section; label: string; icon: React.FC<any> }[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "orders", label: "Orders", icon: Package },
  { id: "accounts", label: "Members", icon: Users },
  { id: "roles", label: "Roles", icon: UserCheck },
  { id: "settings", label: "Settings", icon: Settings },
];

function SparkLine({ up = true }: { up?: boolean }) {
  const color = up ? "#22c55e" : "#ef4444";
  const d = up
    ? "M0,20 C10,18 20,12 30,10 S50,4 60,2"
    : "M0,2 C10,4 20,10 30,12 S50,18 60,20";
  return (
    <svg width="60" height="22" viewBox="0 0 60 22" fill="none">
      <path d={d} stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const ACTIVITY = [
  { icon: ShoppingCart, color: "text-orange-400", bg: "bg-orange-400/10", title: "Order #1094 placed", sub: "@marcus_fit · £148", time: "3m" },
  { icon: UserPlus, color: "text-blue-400", bg: "bg-blue-400/10", title: "New member joined", sub: "@peptide_pete", time: "12m" },
  { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400/10", title: "Order #1091 dispatched", sub: "Tracking added", time: "34m" },
  { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10", title: "Payment failed", sub: "Order #1089 · retry", time: "1h" },
  { icon: UserCheck, color: "text-purple-400", bg: "bg-purple-400/10", title: "Reshipper approved", sub: "@jakemr promoted", time: "2h" },
];

const TOP_PRODUCTS = [
  { name: "BPC-157 5mg", orders: 38, revenue: "£1,140" },
  { name: "TB-500 5mg", orders: 29, revenue: "£870" },
  { name: "Semaglutide 5mg", orders: 24, revenue: "£960" },
  { name: "Tirzepatide 10mg", orders: 18, revenue: "£1,080" },
];

export function DashboardHome() {
  const [active, setActive] = useState<Section>("dashboard");

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-white font-sans overflow-hidden">
      {/* Slim sidebar */}
      <aside className="w-48 flex-shrink-0 border-r border-white/8 flex flex-col bg-[#111111] py-4">
        <div className="px-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
              <span className="text-xs font-black text-white">PA</span>
            </div>
            <span className="text-sm font-bold">Admin</span>
          </div>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                active === id
                  ? "bg-orange-500 text-white font-medium"
                  : "text-white/50 hover:bg-white/6 hover:text-white/80"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
              {id === "alerts" && (
                <span className="ml-auto text-[9px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">3</span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-4 pt-4 border-t border-white/8 mt-auto">
          <p className="text-[10px] text-white/30">superadmin</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 border-b border-white/8 bg-[#111111] flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Good morning</h1>
            <p className="text-xs text-white/40 mt-0.5">Here's what's happening right now</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              <Zap className="w-3.5 h-3.5" />
              Quick Action
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 bg-[#0f0f0f]">
          {/* KPI row */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: "Revenue (30d)", value: "£14,280", delta: "+12%", up: true, icon: DollarSign },
              { label: "Orders", value: "94", delta: "+8 pending", up: true, icon: ShoppingCart },
              { label: "New Members", value: "31", delta: "+4 today", up: true, icon: UserPlus },
              { label: "Avg Order", value: "£152", delta: "-3% vs last mo", up: false, icon: TrendingDown },
            ].map(({ label, value, delta, up, icon: Icon }) => (
              <div key={label} className="bg-[#161616] border border-white/8 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <Icon className="w-4 h-4 text-white/30" />
                  <SparkLine up={up} />
                </div>
                <p className="text-2xl font-bold mb-0.5">{value}</p>
                <p className="text-xs text-white/40">{label}</p>
                <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-medium ${up ? "text-green-400" : "text-red-400"}`}>
                  {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  {delta}
                </div>
              </div>
            ))}
          </div>

          {/* Middle row: activity + top products */}
          <div className="grid grid-cols-5 gap-4 mb-4">
            {/* Activity feed */}
            <div className="col-span-3 bg-[#161616] border border-white/8 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Live Activity</h3>
                <button className="text-[10px] text-orange-500 flex items-center gap-0.5 hover:underline">All <ArrowRight className="w-2.5 h-2.5" /></button>
              </div>
              <div className="space-y-2">
                {ACTIVITY.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                      <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/80 truncate">{item.title}</p>
                      <p className="text-[10px] text-white/35 truncate">{item.sub}</p>
                    </div>
                    <span className="text-[10px] text-white/25 flex-shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top products */}
            <div className="col-span-2 bg-[#161616] border border-white/8 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Top Products</h3>
                <MoreHorizontal className="w-3.5 h-3.5 text-white/25" />
              </div>
              <div className="space-y-3">
                {TOP_PRODUCTS.map((p, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/70 truncate pr-2">{p.name}</span>
                      <span className="text-xs text-white/50 flex-shrink-0">{p.revenue}</span>
                    </div>
                    <div className="w-full h-1 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${(p.orders / 38) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom: alerts banner */}
          <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-3.5 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/80"><span className="font-semibold text-red-400">3 alerts</span> need attention — 2 failed payments, 1 flagged order</p>
            </div>
            <button className="text-xs text-red-400 font-medium flex items-center gap-1 flex-shrink-0 hover:underline">
              Review <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
