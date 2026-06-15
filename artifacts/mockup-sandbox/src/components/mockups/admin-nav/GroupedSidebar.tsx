import { useState } from "react";
import {
  Home, BarChart3, Bell, Package, Users, ShoppingBag,
  UserCheck, Truck, TestTube, Settings, MessageSquare,
  ClipboardList, ChevronRight, Search, User, TrendingUp,
  AlertTriangle, CheckCircle2, Clock, DollarSign
} from "lucide-react";

type Section = "dashboard" | "analytics" | "alerts" | "orders" | "group-buys" | "accounts" | "roles" | "lab-tests" | "settings" | "telegram" | "audit-log";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { id: "dashboard" as Section, label: "Dashboard", icon: Home },
      { id: "analytics" as Section, label: "Analytics", icon: BarChart3 },
    ]
  },
  {
    label: "Commerce",
    items: [
      { id: "orders" as Section, label: "Orders", icon: Package },
      { id: "group-buys" as Section, label: "Group Buys", icon: ShoppingBag },
    ]
  },
  {
    label: "Members",
    items: [
      { id: "accounts" as Section, label: "Accounts", icon: Users },
      { id: "roles" as Section, label: "Roles", icon: UserCheck },
    ]
  },
  {
    label: "Operations",
    items: [
      { id: "alerts" as Section, label: "Alerts", icon: Bell },
      { id: "lab-tests" as Section, label: "Lab & Blood Tests", icon: TestTube },
      { id: "telegram" as Section, label: "Telegram", icon: MessageSquare },
      { id: "audit-log" as Section, label: "Audit Log", icon: ClipboardList },
    ]
  },
  {
    label: "System",
    items: [
      { id: "settings" as Section, label: "Settings", icon: Settings },
    ]
  }
];

const KPI_TILES = [
  { label: "Pending Orders", value: "12", delta: "+3 today", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
  { label: "New Members", value: "8", delta: "this week", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
  { label: "Revenue (30d)", value: "£4,280", delta: "+12%", icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
  { label: "Unread Alerts", value: "3", delta: "2 urgent", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
];

const RECENT_ALERTS = [
  { type: "order", msg: "Order #1092 awaiting dispatch", time: "2m ago", urgent: true },
  { type: "member", msg: "New reshipper application — @jakemr", time: "14m ago", urgent: false },
  { type: "payment", msg: "Failed payment on order #1089", time: "1h ago", urgent: true },
];

export function GroupedSidebar() {
  const [active, setActive] = useState<Section>("dashboard");

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-white/8 flex flex-col bg-[#111111]">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
              <span className="text-xs font-black text-white">PA</span>
            </div>
            <span className="text-sm font-bold text-white">Admin</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-white/8">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-white/30" />
            <span className="text-xs text-white/30">Search...</span>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30 px-2 mb-1">{group.label}</p>
              {group.items.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors text-sm mb-0.5 ${
                    active === id
                      ? "bg-orange-500/15 text-orange-400 font-medium"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{label}</span>
                  {id === "alerts" && (
                    <span className="ml-auto bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">3</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-white/8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <span className="text-xs text-white/50">superadmin</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="px-6 py-3.5 border-b border-white/8 flex items-center justify-between bg-[#111111]">
          <div>
            <h1 className="text-base font-semibold text-white">Dashboard</h1>
            <p className="text-xs text-white/40">Overview · Today, 22 Apr 2026</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="w-4 h-4 text-white/40" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0f0f0f]">
          {/* KPI tiles */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {KPI_TILES.map(({ label, value, delta, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-xl border border-white/8 bg-[#161616] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-white/40">{label}</span>
                  <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
                <p className="text-xs text-white/30">{delta}</p>
              </div>
            ))}
          </div>

          {/* Recent alerts + Quick links row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Recent alerts */}
            <div className="col-span-2 rounded-xl border border-white/8 bg-[#161616] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wide">Recent Alerts</h3>
                <button className="text-[10px] text-orange-500 hover:underline">View all</button>
              </div>
              <div className="space-y-2">
                {RECENT_ALERTS.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-white/3 hover:bg-white/5 transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${a.urgent ? "bg-red-500" : "bg-white/20"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/80">{a.msg}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{a.time}</p>
                    </div>
                    <ChevronRight className="w-3 h-3 text-white/20 flex-shrink-0 mt-0.5" />
                  </div>
                ))}
              </div>
            </div>

            {/* Quick nav */}
            <div className="rounded-xl border border-white/8 bg-[#161616] p-4">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-3">Quick Access</h3>
              <div className="space-y-1.5">
                {[
                  { label: "New Order", icon: Package, color: "text-orange-400" },
                  { label: "Add Member", icon: Users, color: "text-blue-400" },
                  { label: "Run Analytics", icon: TrendingUp, color: "text-green-400" },
                  { label: "Review Alerts", icon: AlertTriangle, color: "text-red-400" },
                  { label: "Approve Roles", icon: CheckCircle2, color: "text-purple-400" },
                ].map(({ label, icon: Icon, color }) => (
                  <button key={label} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-white/5 transition-colors group">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                    <span className="text-xs text-white/60 group-hover:text-white/90">{label}</span>
                    <ChevronRight className="w-3 h-3 text-white/20 ml-auto" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
