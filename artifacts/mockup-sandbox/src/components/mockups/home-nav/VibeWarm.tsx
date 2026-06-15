import { useState } from "react";
import {
  Package, Users, FlaskConical, Syringe, Scale, LineChart,
  TestTube, HeartPulse, ShoppingBag, User, Bell, Search,
  ChevronRight, LayoutDashboard, TrendingUp, Leaf
} from "lucide-react";

type Section = "home" | "shop" | "orders" | "groups" | "health" | "compounds" | "blood-tests" | "glp1" | "plotter" | "lab-pool" | "profile";

const NAV_GROUPS = [
  { label: "Start here",  items: [{ id: "home" as Section, label: "My Hub", icon: LayoutDashboard }] },
  { label: "Shop",        items: [{ id: "shop" as Section, label: "Browse", icon: ShoppingBag }, { id: "orders" as Section, label: "Orders", icon: Package }, { id: "groups" as Section, label: "Group Buys", icon: Users }] },
  { label: "Wellness",    items: [{ id: "health" as Section, label: "Health Hub", icon: HeartPulse }, { id: "blood-tests" as Section, label: "Blood Tests", icon: FlaskConical }, { id: "compounds" as Section, label: "Compounds", icon: Syringe }, { id: "glp1" as Section, label: "GLP-1 Tracker", icon: Scale }, { id: "plotter" as Section, label: "Cycle Plotter", icon: LineChart }] },
  { label: "Community",   items: [{ id: "lab-pool" as Section, label: "Lab Pool", icon: TestTube }] },
];

const TOP_NAV = [
  { id: "home" as Section,   label: "Hub",    icon: LayoutDashboard },
  { id: "shop" as Section,   label: "Shop",   icon: ShoppingBag },
  { id: "orders" as Section, label: "Orders", icon: Package },
  { id: "groups" as Section, label: "Groups", icon: Users },
  { id: "health" as Section, label: "Health", icon: HeartPulse },
];

const SECTION_TITLES: Record<Section, string> = {
  home: "My Hub", shop: "Browse", orders: "My Orders", groups: "Group Buys", health: "Health",
  compounds: "Compounds", "blood-tests": "Blood Tests", glp1: "GLP-1 Tracker",
  plotter: "Cycle Plotter", "lab-pool": "Lab Pool", profile: "Profile",
};

// Warm palette
const C = {
  cream: "#FEFBF3",
  paper: "#F7F3EB",
  border: "#E8DFD0",
  muted: "#A89880",
  text: "#2D2318",
  accent: "#C17B4A",   // terracotta
  sage: "#5C7A5E",     // sage green
  blush: "#E8C4A8",
};

export function VibeWarm() {
  const [section, setSection] = useState<Section>("home");

  return (
    <div className="w-[1280px] h-[800px] flex flex-col overflow-hidden" style={{ background: C.cream, fontFamily: "'Georgia', 'Times New Roman', serif", color: C.text }}>

      {/* Top nav */}
      <header className="flex items-center gap-5 px-7 h-14 flex-shrink-0" style={{ background: C.cream, borderBottom: `1px solid ${C.border}` }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-3 flex-shrink-0">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: C.accent }}>
            <Leaf className="w-3.5 h-3.5 text-white" strokeWidth={2} />
          </div>
          <span className="text-sm font-bold" style={{ color: C.text, letterSpacing: "0.02em" }}>Peps Anonymous</span>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 rounded-full px-4 py-1.5 flex-shrink-0" style={{ background: C.paper, border: `1px solid ${C.border}`, width: 240 }}>
          <Search className="w-3.5 h-3.5" style={{ color: C.muted }} />
          <span className="text-sm" style={{ color: C.muted, fontFamily: "system-ui, sans-serif" }}>Search products...</span>
        </div>

        {/* Nav pills */}
        <nav className="flex items-center gap-1">
          {TOP_NAV.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                onClick={() => setSection(id)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  background: active ? C.accent : "transparent",
                  color: active ? "#fff" : C.muted,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        <button onClick={() => setSection("profile")} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.blush }}>
          <User className="w-4 h-4" style={{ color: C.accent }} strokeWidth={1.75} />
        </button>
        <button className="relative w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.paper, border: `1px solid ${C.border}` }}>
          <Bell className="w-3.5 h-3.5" style={{ color: C.muted }} strokeWidth={1.75} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: C.accent }} />
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 flex flex-col overflow-y-auto" style={{ background: C.paper, borderRight: `1px solid ${C.border}` }}>
          <nav className="flex-1 px-3 py-5 space-y-5">
            {NAV_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-xs px-3 mb-1.5 font-semibold" style={{ color: C.muted, fontFamily: "system-ui, sans-serif", letterSpacing: "0.04em" }}>{group.label}</p>
                {group.items.map(({ id, label, icon: Icon }) => {
                  const active = section === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setSection(id)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-sm text-left transition-all mb-0.5"
                      style={{
                        background: active ? C.blush : "transparent",
                        color: active ? C.accent : C.muted,
                        fontFamily: "system-ui, sans-serif",
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2 : 1.5} />
                      {label}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="px-4 py-4" style={{ borderTop: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: C.blush }}>
                <User className="w-3.5 h-3.5" style={{ color: C.accent }} />
              </div>
              <span className="text-xs" style={{ color: C.muted, fontFamily: "system-ui, sans-serif" }}>@peptide_pete</span>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto" style={{ background: C.cream }}>
          <div className="px-8 py-7 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6" style={{ color: C.text, letterSpacing: "-0.01em" }}>{SECTION_TITLES[section]}</h1>

            {section === "home" && (
              <div className="space-y-5">
                {/* Stat cards — warm paper cards */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Orders", value: "12", delta: "+2 this week", id: "orders" as Section, Icon: Package },
                    { label: "Group Buys", value: "3", delta: "pools active", id: "groups" as Section, Icon: Users },
                    { label: "Blood Tests", value: "2", delta: "results", id: "blood-tests" as Section, Icon: FlaskConical },
                  ].map(s => (
                    <button key={s.label} onClick={() => setSection(s.id)}
                      className="p-5 rounded-3xl text-left transition-all hover:shadow-md"
                      style={{ background: "#fff", border: `1px solid ${C.border}` }}>
                      <s.Icon className="w-5 h-5 mb-3" style={{ color: C.accent }} strokeWidth={1.5} />
                      <p className="text-3xl font-bold mb-0.5" style={{ color: C.text }}>{s.value}</p>
                      <p className="text-sm" style={{ color: C.muted, fontFamily: "system-ui, sans-serif" }}>{s.label}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-3 h-3" style={{ color: C.sage }} strokeWidth={1.5} />
                        <p className="text-xs" style={{ color: C.sage, fontFamily: "system-ui, sans-serif" }}>{s.delta}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Featured */}
                <div className="rounded-3xl p-6" style={{ background: "#FFF5EB", border: `1px solid ${C.blush}` }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: C.accent, fontFamily: "system-ui, sans-serif", letterSpacing: "0.05em", textTransform: "uppercase" }}>Featured this week</p>
                  <h3 className="text-lg font-bold mb-1" style={{ color: C.text }}>BPC-157 Bundle — Save 15%</h3>
                  <p className="text-sm mb-4" style={{ color: C.muted, fontFamily: "system-ui, sans-serif" }}>Order 3 or more vials and save automatically at checkout.</p>
                  <button onClick={() => setSection("shop")} className="rounded-full px-5 py-2 text-sm font-semibold transition-all hover:opacity-90" style={{ background: C.accent, color: "#fff", fontFamily: "system-ui, sans-serif" }}>
                    Shop the deal
                  </button>
                </div>

                {/* Recent + Quick */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-3xl p-5" style={{ background: "#fff", border: `1px solid ${C.border}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold" style={{ color: C.muted, fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>Recent Order</p>
                      <button onClick={() => setSection("orders")} className="text-xs" style={{ color: C.accent, fontFamily: "system-ui, sans-serif" }}>View all</button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#FFF5EB" }}>
                        <Package className="w-5 h-5" style={{ color: C.accent }} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: C.text }}>BPC-157 5mg</p>
                        <p className="text-xs" style={{ color: C.muted, fontFamily: "system-ui, sans-serif" }}>#1094 · Today</p>
                      </div>
                      <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#ECFDF5", color: C.sage, fontFamily: "system-ui, sans-serif" }}>Dispatched</span>
                    </div>
                  </div>

                  <div className="rounded-3xl p-5" style={{ background: "#fff", border: `1px solid ${C.border}` }}>
                    <p className="text-xs font-semibold mb-3" style={{ color: C.muted, fontFamily: "system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>Quick Access</p>
                    <div className="space-y-2">
                      {[
                        { label: "Browse Shop", id: "shop" as Section },
                        { label: "Group Buys", id: "groups" as Section },
                        { label: "Blood Tests", id: "blood-tests" as Section },
                      ].map(q => (
                        <button key={q.label} onClick={() => setSection(q.id)}
                          className="w-full flex items-center justify-between text-left py-1.5 hover:opacity-70 transition-opacity">
                          <span className="text-sm" style={{ color: C.text, fontFamily: "system-ui, sans-serif" }}>{q.label}</span>
                          <ChevronRight className="w-3.5 h-3.5" style={{ color: C.muted }} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {section !== "home" && (
              <div className="rounded-3xl p-10 text-center" style={{ background: "#fff", border: `1px solid ${C.border}` }}>
                <p className="text-sm" style={{ color: C.muted, fontFamily: "system-ui, sans-serif" }}>{SECTION_TITLES[section]} — content area</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
