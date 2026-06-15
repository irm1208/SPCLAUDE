import { useState } from "react";
import {
  Package, Users, FlaskConical, Syringe, Scale, LineChart,
  TestTube, HeartPulse, ShoppingBag, User, Bell, Search,
  ChevronRight, LayoutDashboard, TrendingUp, ArrowUpRight
} from "lucide-react";

type Section = "home" | "shop" | "orders" | "groups" | "health" | "compounds" | "blood-tests" | "glp1" | "plotter" | "lab-pool" | "profile";

const NAV_GROUPS = [
  { label: "OVERVIEW",   items: [{ id: "home" as Section, label: "Hub", icon: LayoutDashboard }] },
  { label: "COMMERCE",   items: [{ id: "shop" as Section, label: "Browse", icon: ShoppingBag }, { id: "orders" as Section, label: "My Orders", icon: Package }, { id: "groups" as Section, label: "Group Buys", icon: Users }] },
  { label: "HEALTH",     items: [{ id: "health" as Section, label: "Health Hub", icon: HeartPulse }, { id: "blood-tests" as Section, label: "Blood Tests", icon: FlaskConical }, { id: "compounds" as Section, label: "Compounds", icon: Syringe }, { id: "glp1" as Section, label: "GLP-1 Tracker", icon: Scale }, { id: "plotter" as Section, label: "Cycle Plotter", icon: LineChart }] },
  { label: "COMMUNITY",  items: [{ id: "lab-pool" as Section, label: "Lab Pool", icon: TestTube }] },
];

const TOP_NAV = [
  { id: "home" as Section, label: "HUB", icon: LayoutDashboard },
  { id: "shop" as Section, label: "SHOP", icon: ShoppingBag },
  { id: "orders" as Section, label: "ORDERS", icon: Package },
  { id: "groups" as Section, label: "GROUPS", icon: Users },
  { id: "health" as Section, label: "HEALTH", icon: HeartPulse },
];

const SECTION_TITLES: Record<Section, string> = {
  home: "Hub", shop: "Browse", orders: "My Orders", groups: "Group Buys", health: "Health",
  compounds: "Compounds", "blood-tests": "Blood Tests", glp1: "GLP-1 Tracker",
  plotter: "Cycle Plotter", "lab-pool": "Lab Pool", profile: "Profile",
};

export function VibeClinical() {
  const [section, setSection] = useState<Section>("home");

  return (
    <div className="w-[1280px] h-[800px] bg-[#F8F8F6] flex flex-col overflow-hidden font-['IBM_Plex_Mono',_'Courier_New',_monospace]">

      {/* Top nav */}
      <header className="flex items-center gap-0 border-b border-[#DDDDD9] bg-white h-12 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-full border-r border-[#DDDDD9] flex-shrink-0">
          <div className="w-6 h-6 bg-[#1A1A1A] flex items-center justify-center">
            <span className="text-[10px] font-bold text-white tracking-tight">PA</span>
          </div>
          <span className="text-[11px] font-bold text-[#1A1A1A] tracking-widest uppercase">Peps Anonymous</span>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-4 h-full border-r border-[#DDDDD9]" style={{ width: 260 }}>
          <Search className="w-3 h-3 text-[#9A9A94]" />
          <span className="text-[11px] text-[#9A9A94] tracking-wide">Search...</span>
        </div>

        {/* Nav items */}
        <nav className="flex items-center h-full">
          {TOP_NAV.map(({ id, label }) => {
            const active = section === id;
            return (
              <button
                key={id}
                onClick={() => setSection(id)}
                className="flex items-center gap-2 px-5 h-full border-r border-[#DDDDD9] text-[10px] tracking-widest font-bold transition-colors relative"
                style={{ color: active ? "#1A1A1A" : "#9A9A94" }}
              >
                {active && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1A1A1A]" />}
                {label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-0 h-full">
          <button className="flex items-center justify-center w-12 h-full border-l border-[#DDDDD9] relative hover:bg-[#F2F2EF] transition-colors">
            <Bell className="w-3.5 h-3.5 text-[#9A9A94]" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-[#1A1A1A] rounded-full" />
          </button>
          <button onClick={() => setSection("profile")} className="flex items-center gap-2 px-4 h-full border-l border-[#DDDDD9] hover:bg-[#F2F2EF] transition-colors">
            <div className="w-5 h-5 bg-[#E8E8E4] flex items-center justify-center">
              <User className="w-3 h-3 text-[#5A5A54]" />
            </div>
            <span className="text-[10px] text-[#5A5A54] tracking-wider">@peptide_pete</span>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-48 flex-shrink-0 bg-white border-r border-[#DDDDD9] flex flex-col overflow-y-auto">
          <nav className="flex-1 py-4">
            {NAV_GROUPS.map(group => (
              <div key={group.label} className="mb-5">
                <p className="text-[9px] font-bold tracking-[0.15em] text-[#B0B0AA] px-4 mb-1">{group.label}</p>
                {group.items.map(({ id, label, icon: Icon }) => {
                  const active = section === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setSection(id)}
                      className="w-full flex items-center gap-2.5 pl-4 pr-3 py-1.5 text-left transition-colors relative"
                      style={{ color: active ? "#1A1A1A" : "#8A8A84" }}
                    >
                      {active && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#1A1A1A]" />}
                      <Icon className="w-3 h-3 flex-shrink-0" strokeWidth={active ? 2 : 1.5} />
                      <span className="text-[11px] tracking-wide font-medium">{label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-[#F8F8F6]">
          <div className="px-8 py-6">
            {/* Section header */}
            <div className="flex items-baseline gap-3 mb-6 border-b border-[#DDDDD9] pb-3">
              <h1 className="text-[13px] font-bold text-[#1A1A1A] tracking-widest uppercase">{SECTION_TITLES[section]}</h1>
              <span className="text-[10px] text-[#9A9A94] tracking-wider">22 Apr 2026 · 09:41</span>
            </div>

            {section === "home" && (
              <div className="space-y-5">
                {/* Stats — grid of data cells */}
                <div className="grid grid-cols-3 gap-px bg-[#DDDDD9] border border-[#DDDDD9]">
                  {[
                    { label: "ORDERS", value: "12", delta: "+2 this week", id: "orders" as Section },
                    { label: "GROUP BUYS", value: "03", delta: "active pools", id: "groups" as Section },
                    { label: "BLOOD TESTS", value: "02", delta: "results logged", id: "blood-tests" as Section },
                  ].map(s => (
                    <button key={s.label} onClick={() => setSection(s.id)}
                      className="bg-white p-5 text-left hover:bg-[#F2F2EF] transition-colors group">
                      <p className="text-[9px] tracking-[0.15em] text-[#9A9A94] mb-2">{s.label}</p>
                      <p className="text-3xl font-bold text-[#1A1A1A] mb-1">{s.value}</p>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-2.5 h-2.5 text-[#9A9A94]" />
                        <p className="text-[10px] text-[#9A9A94] tracking-wide">{s.delta}</p>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#DDDDD9] group-hover:text-[#1A1A1A] transition-colors mt-2" />
                    </button>
                  ))}
                </div>

                {/* Featured — stripped back */}
                <div className="border border-[#DDDDD9] bg-white p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[9px] tracking-[0.15em] text-[#9A9A94] mb-1">FEATURED</p>
                      <p className="text-sm font-bold text-[#1A1A1A] tracking-wide">BPC-157 Bundle — 15% off</p>
                      <p className="text-[11px] text-[#9A9A94] mt-0.5 tracking-wide">Order 3+ vials this week</p>
                    </div>
                    <button onClick={() => setSection("shop")} className="flex items-center gap-1.5 border border-[#1A1A1A] px-3 py-1.5 text-[10px] font-bold text-[#1A1A1A] tracking-widest hover:bg-[#1A1A1A] hover:text-white transition-colors">
                      SHOP <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Recent order */}
                <div className="border border-[#DDDDD9] bg-white">
                  <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#DDDDD9]">
                    <p className="text-[9px] tracking-[0.15em] text-[#9A9A94]">RECENT ORDER</p>
                    <button onClick={() => setSection("orders")} className="text-[9px] tracking-wider text-[#9A9A94] hover:text-[#1A1A1A] transition-colors">VIEW ALL →</button>
                  </div>
                  <div className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-[#1A1A1A] tracking-wide">BPC-157 5mg</p>
                      <p className="text-[10px] text-[#9A9A94] tracking-wide">#1094 · Today</p>
                    </div>
                    <span className="text-[9px] font-bold tracking-widest border border-[#1A1A1A] px-2.5 py-1 text-[#1A1A1A]">DISPATCHED</span>
                  </div>
                </div>

                {/* Quick access — text links only */}
                <div className="border border-[#DDDDD9] bg-white">
                  <div className="px-5 py-2.5 border-b border-[#DDDDD9]">
                    <p className="text-[9px] tracking-[0.15em] text-[#9A9A94]">QUICK ACCESS</p>
                  </div>
                  <div className="grid grid-cols-4 divide-x divide-[#DDDDD9]">
                    {[
                      { label: "BROWSE SHOP", id: "shop" as Section },
                      { label: "GROUP BUYS", id: "groups" as Section },
                      { label: "BLOOD TESTS", id: "blood-tests" as Section },
                      { label: "GLP-1 LOG", id: "glp1" as Section },
                    ].map(q => (
                      <button key={q.label} onClick={() => setSection(q.id)} className="px-4 py-3 text-left hover:bg-[#F2F2EF] transition-colors group">
                        <p className="text-[9px] tracking-[0.12em] font-bold text-[#5A5A54] group-hover:text-[#1A1A1A] transition-colors">{q.label}</p>
                        <ArrowUpRight className="w-3 h-3 text-[#DDDDD9] group-hover:text-[#1A1A1A] mt-1.5 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {section !== "home" && (
              <div className="border border-[#DDDDD9] bg-white p-8 text-center">
                <p className="text-[11px] text-[#9A9A94] tracking-widest uppercase">{SECTION_TITLES[section]} — content area</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
