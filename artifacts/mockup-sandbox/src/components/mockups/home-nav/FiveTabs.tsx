import { useState } from "react";
import {
  Home, ShoppingBag, Users, HeartPulse, User,
  Package, Syringe, FlaskConical, Scale, LineChart,
  TestTube, ChevronRight, Bell, Star, TrendingUp
} from "lucide-react";

type Tab = "home" | "shop" | "groups" | "health" | "profile";

const STAT_TILES = [
  { label: "Orders", value: "12", icon: Package, color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  { label: "Compounds", value: "3", icon: Syringe, color: "#7C3AED", bg: "rgba(124,58,237,0.12)" },
  { label: "Blood Tests", value: "2", icon: FlaskConical, color: "#16A34A", bg: "rgba(22,163,74,0.12)" },
];

const HEALTH_SECTIONS = [
  { label: "Blood Tests", sub: "2 results", icon: FlaskConical, color: "#7C3AED", bg: "rgba(124,58,237,0.12)" },
  { label: "GLP-1 Tracker", sub: "Last shot 3d ago", icon: Scale, color: "#16A34A", bg: "rgba(22,163,74,0.12)" },
  { label: "Cycle Plotter", sub: "Active protocol", icon: LineChart, color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  { label: "Health Insights", sub: "View trends", icon: TrendingUp, color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  { label: "My Compounds", sub: "3 active", icon: Syringe, color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
  { label: "Lab Pool", sub: "Contribute tests", icon: TestTube, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
];

const GROUPS = [
  { name: "BPC-157 Group Buy", spots: "12 left", progress: 68, organiser: "@ukpeptides" },
  { name: "TB-500 Pool", spots: "5 left", progress: 85, organiser: "@bio_collective" },
  { name: "Sema + Tirz Bundle", spots: "28 left", progress: 22, organiser: "@ukpeptides" },
];

export function FiveTabs() {
  const [tab, setTab] = useState<Tab>("home");

  const TABS: { id: Tab; label: string; icon: React.FC<any> }[] = [
    { id: "home",    label: "Home",    icon: Home },
    { id: "shop",    label: "Shop",    icon: ShoppingBag },
    { id: "groups",  label: "Groups",  icon: Users },
    { id: "health",  label: "Health",  icon: HeartPulse },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div className="w-[390px] h-[844px] bg-[#0d0d0d] text-white flex flex-col overflow-hidden relative font-sans">
      {/* Status bar */}
      <div className="flex justify-between items-center px-6 pt-3 pb-1 text-xs text-white/50 flex-shrink-0">
        <span>9:41</span>
        <span>●●● ▲</span>
      </div>

      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs text-white/40">Welcome back</p>
          <h1 className="text-lg font-bold">
            {tab === "home" && "Hub"}
            {tab === "shop" && "Browse"}
            {tab === "groups" && "Group Buys"}
            {tab === "health" && "Health"}
            {tab === "profile" && "Profile"}
          </h1>
        </div>
        <button className="relative w-8 h-8 rounded-full bg-white/8 flex items-center justify-center">
          <Bell className="w-4 h-4 text-white/50" />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-orange-500 rounded-full" />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {tab === "home" && (
          <>
            {/* Overview tiles */}
            <div className="grid grid-cols-3 gap-2">
              {STAT_TILES.map(t => (
                <div key={t.label} className="rounded-2xl border border-white/8 p-3 text-center" style={{ background: t.bg }}>
                  <t.icon className="w-5 h-5 mx-auto mb-1.5" style={{ color: t.color }} />
                  <p className="text-xl font-bold">{t.value}</p>
                  <p className="text-[10px] text-white/50 mt-0.5">{t.label}</p>
                </div>
              ))}
            </div>

            {/* Recent order */}
            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Recent Order</p>
              <div className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4.5 h-4.5 text-orange-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">BPC-157 5mg</p>
                  <p className="text-xs text-white/40">#1094 · Today</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/15 text-green-400">Dispatched</span>
              </div>
            </div>

            {/* Quick links */}
            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Quick Access</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Blood Tests", icon: FlaskConical, color: "#7C3AED", bg: "rgba(124,58,237,0.1)", tab: "health" as Tab },
                  { label: "Active Group", icon: Users, color: "#3B82F6", bg: "rgba(59,130,246,0.1)", tab: "groups" as Tab },
                  { label: "GLP-1 Log",   icon: Scale,       color: "#16A34A", bg: "rgba(22,163,74,0.1)",  tab: "health" as Tab },
                  { label: "Browse Shop",  icon: ShoppingBag, color: "#F97316", bg: "rgba(249,115,22,0.1)", tab: "shop" as Tab },
                ].map(q => (
                  <button key={q.label} onClick={() => setTab(q.tab)} className="rounded-2xl border border-white/8 p-3 flex items-center gap-2.5 text-left hover:bg-white/5 transition-colors" style={{ background: q.bg }}>
                    <q.icon className="w-4.5 h-4.5 flex-shrink-0" style={{ color: q.color }} />
                    <span className="text-xs font-semibold text-white/80">{q.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === "shop" && (
          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {["All", "Peptides", "GLP-1", "TRT"].map((c, i) => (
                <button key={c} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${i === 0 ? "bg-orange-500 text-white" : "bg-white/8 text-white/60"}`}>{c}</button>
              ))}
            </div>
            {[
              { name: "BPC-157 5mg", price: "£28", badge: "Popular" },
              { name: "TB-500 5mg",  price: "£30", badge: null },
              { name: "Semaglutide 5mg", price: "£40", badge: "New" },
            ].map(p => (
              <div key={p.name} className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0">
                  <Syringe className="w-5 h-5 text-white/30" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{p.name}</p>
                  {p.badge && <span className="text-[9px] font-bold bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">{p.badge}</span>}
                </div>
                <p className="text-sm font-bold text-orange-400">{p.price}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "groups" && (
          <div className="space-y-3">
            {GROUPS.map(g => (
              <div key={g.name} className="bg-white/5 border border-white/8 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{g.name}</p>
                    <p className="text-[11px] text-white/40">{g.organiser}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-500/15 text-blue-400 px-2 py-1 rounded-full flex-shrink-0 ml-2">{g.spots}</span>
                </div>
                <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${g.progress}%` }} />
                </div>
                <p className="text-[10px] text-white/35 mt-1">{g.progress}% filled</p>
              </div>
            ))}
          </div>
        )}

        {tab === "health" && (
          <div className="space-y-2">
            {HEALTH_SECTIONS.map(h => (
              <button key={h.label} className="w-full bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: h.bg }}>
                  <h.icon className="w-5 h-5" style={{ color: h.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white/90">{h.label}</p>
                  <p className="text-xs text-white/40">{h.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/25" />
              </button>
            ))}
          </div>
        )}

        {tab === "profile" && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <User className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-bold">@peptide_pete</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Star className="w-3 h-3 text-amber-400" />
                  <p className="text-xs text-white/40">Member since Jan 2025</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[{ v: "12", l: "Orders" }, { v: "3", l: "GBs" }, { v: "2", l: "Tests" }].map(s => (
                <div key={s.l} className="bg-white/5 border border-white/8 rounded-2xl p-3 text-center">
                  <p className="text-xl font-bold">{s.v}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5-tab nav — no More */}
      <nav className="flex-shrink-0 border-t border-white/10 bg-black/70 backdrop-blur-xl flex pb-8">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative">
              {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-500" />}
              <Icon className="w-5 h-5" strokeWidth={active ? 2.25 : 1.75} style={{ color: active ? "#60a5fa" : "rgba(255,255,255,0.35)" }} />
              <span className="text-[9px] font-semibold" style={{ color: active ? "#60a5fa" : "rgba(255,255,255,0.35)" }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
