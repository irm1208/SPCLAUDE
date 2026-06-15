import { useState } from "react";
import {
  Home, User, Menu, X,
  Package, Syringe, FlaskConical, Scale, LineChart,
  Users, ShoppingBag, TestTube, HeartPulse,
  MessageCircle, History, ChevronRight, Bell, TrendingUp
} from "lucide-react";

type Tab = "home" | "profile" | "more";

interface Category {
  label: string;
  color: string;
  items: { id: string; label: string; sub: string; icon: React.FC<any> }[];
}

const CATEGORIES: Category[] = [
  {
    label: "Shop & Orders",
    color: "#F97316",
    items: [
      { id: "shop",   label: "Browse Products", sub: "Peptides, GLP-1, TRT", icon: ShoppingBag },
      { id: "orders", label: "My Orders",        sub: "12 orders",           icon: Package },
      { id: "groups", label: "Group Buys",       sub: "3 active pools",     icon: Users },
    ]
  },
  {
    label: "Health & Wellness",
    color: "#7C3AED",
    items: [
      { id: "blood-tests", label: "Blood Tests",    sub: "2 results logged",    icon: FlaskConical },
      { id: "glp1",        label: "GLP-1 Tracker",  sub: "Last shot 3d ago",    icon: Scale },
      { id: "compounds",   label: "My Compounds",   sub: "3 active",            icon: Syringe },
      { id: "plotter",     label: "Cycle Plotter",  sub: "Active protocol",     icon: LineChart },
      { id: "health",      label: "Health Insights", sub: "Trends & analytics", icon: TrendingUp },
    ]
  },
  {
    label: "Community & Lab",
    color: "#3B82F6",
    items: [
      { id: "lab-pool",  label: "Lab Pool",    sub: "Contribute to testing", icon: TestTube },
      { id: "telegram",  label: "Telegram",    sub: "Community & alerts",    icon: MessageCircle },
      { id: "history",   label: "My History",  sub: "Past activity",         icon: History },
    ]
  },
];

const HOME_RECENT = [
  { label: "BPC-157 5mg dispatched", time: "Today", color: "#16A34A" },
  { label: "Group Buy 68% filled", time: "Yesterday", color: "#3B82F6" },
  { label: "Blood test result added", time: "Apr 19", color: "#7C3AED" },
];

export function CategoryGroups() {
  const [tab, setTab] = useState<Tab>("home");
  const [moreOpen, setMoreOpen] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>("Shop & Orders");

  const TABS = [
    { id: "home" as Tab,    label: "Home",    icon: Home },
    { id: "profile" as Tab, label: "Profile", icon: User },
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
          <p className="text-xs text-white/40">Peps Anonymous</p>
          <h1 className="text-lg font-bold">
            {tab === "home" && "My Hub"}
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
            {/* Overview stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: "12", l: "Orders", c: "#F97316", bg: "rgba(249,115,22,0.1)", Icon: Package },
                { v: "3", l: "Group Buys", c: "#3B82F6", bg: "rgba(59,130,246,0.1)", Icon: Users },
                { v: "2", l: "Blood Tests", c: "#7C3AED", bg: "rgba(124,58,237,0.1)", Icon: FlaskConical },
              ].map(s => (
                <div key={s.l} className="rounded-2xl border border-white/8 p-3 text-center" style={{ background: s.bg }}>
                  <s.Icon className="w-4.5 h-4.5 mx-auto mb-1.5" style={{ color: s.c }} />
                  <p className="text-xl font-bold">{s.v}</p>
                  <p className="text-[9px] text-white/50 mt-0.5 leading-tight">{s.l}</p>
                </div>
              ))}
            </div>

            {/* Category shortcuts — the main navigation pattern */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Navigate</p>
              {CATEGORIES.map(cat => (
                <div key={cat.label} className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedCat(expandedCat === cat.label ? null : cat.label)}
                    className="w-full flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                      <span className="text-sm font-semibold text-white/85">{cat.label}</span>
                      <span className="text-[10px] text-white/35">{cat.items.length} sections</span>
                    </div>
                    <ChevronRight
                      className="w-4 h-4 text-white/25 transition-transform"
                      style={{ transform: expandedCat === cat.label ? "rotate(90deg)" : "none" }}
                    />
                  </button>
                  {expandedCat === cat.label && (
                    <div className="border-t border-white/8">
                      {cat.items.map((item, i) => (
                        <button
                          key={item.id}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
                          style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                        >
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cat.color + "15" }}>
                            <item.icon className="w-4 h-4" style={{ color: cat.color }} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-xs font-semibold text-white/85">{item.label}</p>
                            <p className="text-[10px] text-white/35">{item.sub}</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Recent</p>
              <div className="space-y-1.5">
                {HOME_RECENT.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/4 border border-white/6">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                    <span className="text-xs text-white/75 flex-1">{r.label}</span>
                    <span className="text-[10px] text-white/30 flex-shrink-0">{r.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === "profile" && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <User className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-bold">@peptide_pete</p>
                <p className="text-xs text-white/40">Member since Jan 2025</p>
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
            {[
              { label: "Account Settings", icon: User },
              { label: "Notifications", icon: Bell },
              { label: "My History", icon: History },
            ].map(item => (
              <button key={item.label} className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/8 rounded-2xl text-left hover:bg-white/8 transition-colors">
                <item.icon className="w-4 h-4 text-white/40" />
                <span className="flex-1 text-sm text-white/80">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-white/25" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav — minimal 2+menu */}
      <nav className="flex-shrink-0 border-t border-white/10 bg-black/70 backdrop-blur-xl flex pb-8">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => { setTab(id); setMoreOpen(false); }} className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 relative">
              {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-purple-500" />}
              <Icon className="w-5 h-5" strokeWidth={active ? 2.25 : 1.75} style={{ color: active ? "#a78bfa" : "rgba(255,255,255,0.35)" }} />
              <span className="text-[10px] font-semibold" style={{ color: active ? "#a78bfa" : "rgba(255,255,255,0.35)" }}>{label}</span>
            </button>
          );
        })}
        <button onClick={() => setMoreOpen(true)} className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5">
          <Menu className="w-5 h-5" style={{ color: "rgba(255,255,255,0.35)" }} strokeWidth={1.75} />
          <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>Browse</span>
        </button>
      </nav>

      {/* Browse all sheet */}
      {moreOpen && (
        <>
          <div className="absolute inset-0 bg-black/60 z-10" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-[#1a1a1a] border-t border-white/10 rounded-t-3xl max-h-[80%] overflow-hidden flex flex-col">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 rounded-full bg-white/20" /></div>
            <div className="flex justify-between items-center px-5 py-3 border-b border-white/8 flex-shrink-0">
              <p className="text-sm font-bold">All Sections</p>
              <button onClick={() => setMoreOpen(false)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
            <div className="overflow-y-auto px-3 py-2">
              {CATEGORIES.map(cat => (
                <div key={cat.label} className="mb-3">
                  <p className="text-[10px] uppercase tracking-widest font-bold px-2 py-1.5" style={{ color: cat.color }}>{cat.label}</p>
                  {cat.items.map(item => (
                    <button key={item.id} onClick={() => setMoreOpen(false)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cat.color + "15" }}>
                        <item.icon className="w-4 h-4" style={{ color: cat.color }} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-white/85">{item.label}</p>
                        <p className="text-[10px] text-white/35">{item.sub}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="h-8 flex-shrink-0" />
          </div>
        </>
      )}
    </div>
  );
}
