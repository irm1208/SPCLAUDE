import { useState } from "react";
import {
  Package, Users, FlaskConical, Syringe, Scale, LineChart,
  TestTube, HeartPulse, ShoppingBag, User, Bell, Search,
  ChevronRight, LayoutDashboard, TrendingUp, Activity,
  Cpu, Zap
} from "lucide-react";

type Section = "home" | "shop" | "orders" | "groups" | "health" | "compounds" | "blood-tests" | "glp1" | "plotter" | "lab-pool" | "profile";

const NAV_GROUPS = [
  { label: "SYS",    items: [{ id: "home" as Section, label: "Dashboard", icon: LayoutDashboard }] },
  { label: "TXN",    items: [{ id: "shop" as Section, label: "Catalogue", icon: ShoppingBag }, { id: "orders" as Section, label: "Orders", icon: Package }, { id: "groups" as Section, label: "Group Buys", icon: Users }] },
  { label: "BIO",    items: [{ id: "health" as Section, label: "Health", icon: HeartPulse }, { id: "blood-tests" as Section, label: "Haematology", icon: FlaskConical }, { id: "compounds" as Section, label: "Compounds", icon: Syringe }, { id: "glp1" as Section, label: "GLP-1", icon: Scale }, { id: "plotter" as Section, label: "Plotter", icon: LineChart }] },
  { label: "LAB",    items: [{ id: "lab-pool" as Section, label: "Lab Pool", icon: TestTube }] },
];

const TOP_NAV = [
  { id: "home" as Section, label: "DASH", icon: LayoutDashboard },
  { id: "shop" as Section, label: "SHOP", icon: ShoppingBag },
  { id: "orders" as Section, label: "ORDERS", icon: Package },
  { id: "groups" as Section, label: "GROUPS", icon: Users },
  { id: "health" as Section, label: "HEALTH", icon: HeartPulse },
];

const SECTION_TITLES: Record<Section, string> = {
  home: "Dashboard", shop: "Catalogue", orders: "Orders", groups: "Group Buys", health: "Health",
  compounds: "Compounds", "blood-tests": "Haematology", glp1: "GLP-1 Log",
  plotter: "Cycle Plotter", "lab-pool": "Lab Pool", profile: "Profile",
};

// Dark techno palette
const D = {
  bg: "#080E1A",
  surface: "#0D1626",
  surface2: "#121E30",
  border: "#1E2E44",
  borderBright: "#2A3F5C",
  cyan: "#22D3EE",
  cyanDim: "#0E7490",
  text: "#E2EAF4",
  muted: "#4A6080",
  green: "#10B981",
  amber: "#F59E0B",
};

function Scanlines() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 opacity-[0.025]"
      style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)",
      }}
    />
  );
}

export function VibeTechno() {
  const [section, setSection] = useState<Section>("home");

  return (
    <div className="w-[1280px] h-[800px] flex flex-col overflow-hidden relative" style={{ background: D.bg, fontFamily: "'Courier New', 'IBM Plex Mono', monospace", color: D.text }}>
      <Scanlines />

      {/* Top bar */}
      <header className="flex items-center gap-0 h-11 flex-shrink-0 relative z-10" style={{ background: D.surface, borderBottom: `1px solid ${D.border}` }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-full flex-shrink-0" style={{ borderRight: `1px solid ${D.border}` }}>
          <div className="w-6 h-6 flex items-center justify-center relative">
            <div className="absolute inset-0" style={{ border: `1px solid ${D.cyan}` }} />
            <Cpu className="w-3.5 h-3.5" style={{ color: D.cyan }} />
          </div>
          <span className="text-[11px] font-bold tracking-widest" style={{ color: D.cyan }}>PA//SYS</span>
        </div>

        {/* System status */}
        <div className="flex items-center gap-3 px-4 h-full" style={{ borderRight: `1px solid ${D.border}` }}>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: D.green }} />
            <span className="text-[9px] tracking-widest" style={{ color: D.muted }}>LIVE</span>
          </div>
          <span className="text-[9px] tracking-widest" style={{ color: D.muted }}>09:41:22</span>
        </div>

        {/* Nav */}
        <nav className="flex items-center h-full">
          {TOP_NAV.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                onClick={() => setSection(id)}
                className="flex items-center gap-2 px-5 h-full text-[10px] tracking-widest font-bold transition-all relative"
                style={{
                  color: active ? D.cyan : D.muted,
                  borderRight: `1px solid ${D.border}`,
                  background: active ? `${D.cyan}08` : "transparent",
                }}
              >
                {active && (
                  <>
                    <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: D.cyan }} />
                    <div className="absolute top-0 left-0 right-0 h-[1px] opacity-30" style={{ background: D.cyan }} />
                  </>
                )}
                <Icon className="w-3 h-3" strokeWidth={1.5} />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center h-full">
          <button className="flex items-center gap-2 px-4 h-full" style={{ borderLeft: `1px solid ${D.border}`, color: D.muted }}>
            <Search className="w-3.5 h-3.5" />
          </button>
          <button className="relative flex items-center justify-center w-10 h-full" style={{ borderLeft: `1px solid ${D.border}`, color: D.muted }}>
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5" style={{ background: D.cyan }} />
          </button>
          <button onClick={() => setSection("profile")} className="flex items-center gap-2 px-4 h-full" style={{ borderLeft: `1px solid ${D.border}`, color: D.muted }}>
            <User className="w-3.5 h-3.5" />
            <span className="text-[9px] tracking-wider">@pete</span>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar */}
        <aside className="w-44 flex-shrink-0 flex flex-col overflow-y-auto" style={{ background: D.surface, borderRight: `1px solid ${D.border}` }}>
          <nav className="flex-1 py-3">
            {NAV_GROUPS.map(group => (
              <div key={group.label} className="mb-4">
                <p className="text-[9px] tracking-[0.2em] px-4 mb-1" style={{ color: D.cyanDim }}>// {group.label}</p>
                {group.items.map(({ id, label, icon: Icon }) => {
                  const active = section === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setSection(id)}
                      className="w-full flex items-center gap-2.5 px-4 py-1.5 text-left text-[11px] transition-all relative"
                      style={{
                        color: active ? D.cyan : D.muted,
                        background: active ? `${D.cyan}10` : "transparent",
                      }}
                    >
                      {active && <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: D.cyan }} />}
                      <Icon className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />
                      <span className="tracking-wide">{label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* System readout */}
          <div className="px-4 py-3" style={{ borderTop: `1px solid ${D.border}` }}>
            <p className="text-[9px] tracking-widest mb-1" style={{ color: D.cyanDim }}>// SESSION</p>
            <p className="text-[9px] tracking-wider" style={{ color: D.muted }}>@peptide_pete</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5" style={{ background: D.green }} />
              <p className="text-[9px] tracking-wider" style={{ color: D.green }}>AUTH OK</p>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto" style={{ background: D.bg }}>
          <div className="px-7 py-5">
            {/* Header row */}
            <div className="flex items-center justify-between mb-5 pb-3" style={{ borderBottom: `1px solid ${D.border}` }}>
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4" style={{ color: D.cyan }} />
                <h1 className="text-[11px] tracking-[0.2em] font-bold" style={{ color: D.cyan }}>{SECTION_TITLES[section].toUpperCase()}</h1>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3" style={{ color: D.cyanDim }} />
                <span className="text-[9px] tracking-widest" style={{ color: D.muted }}>SYS:NOMINAL</span>
              </div>
            </div>

            {section === "home" && (
              <div className="space-y-4">
                {/* Data readouts */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "ORDERS", value: "012", delta: "+2 / 7D", id: "orders" as Section, color: D.amber },
                    { label: "GROUP_BUYS", value: "003", delta: "ACTIVE", id: "groups" as Section, color: D.cyan },
                    { label: "BLOOD_TESTS", value: "002", delta: "LOGGED", id: "blood-tests" as Section, color: D.green },
                  ].map(s => (
                    <button key={s.label} onClick={() => setSection(s.id)}
                      className="p-4 text-left relative overflow-hidden transition-all hover:opacity-80"
                      style={{ background: D.surface, border: `1px solid ${D.border}` }}>
                      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: s.color, opacity: 0.6 }} />
                      <p className="text-[9px] tracking-[0.15em] mb-2" style={{ color: s.color }}>{s.label}</p>
                      <p className="text-4xl font-bold mb-1" style={{ color: D.text, fontVariantNumeric: "tabular-nums" }}>{s.value}</p>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-2.5 h-2.5" style={{ color: s.color }} />
                        <span className="text-[9px] tracking-widest" style={{ color: s.color }}>{s.delta}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Featured — terminal style */}
                <div className="p-4 relative" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: D.amber }} />
                    <div className="w-2 h-2 rounded-full" style={{ background: "#EC4899" }} />
                    <div className="w-2 h-2 rounded-full" style={{ background: D.green }} />
                    <span className="text-[9px] tracking-widest ml-2" style={{ color: D.muted }}>PROMO.SH</span>
                  </div>
                  <p className="text-[9px] mb-1" style={{ color: D.cyanDim }}>&gt; cat featured.txt</p>
                  <p className="text-sm font-bold" style={{ color: D.text }}>BPC-157 Bundle — 15% discount</p>
                  <p className="text-[10px] mb-3" style={{ color: D.muted }}>$QUANTITY &gt;= 3 → APPLY DISCOUNT_15PCT</p>
                  <button onClick={() => setSection("shop")} className="flex items-center gap-2 px-4 py-1.5 text-[10px] font-bold tracking-widest transition-colors hover:opacity-80" style={{ background: `${D.cyan}18`, border: `1px solid ${D.cyan}`, color: D.cyan }}>
                    <Zap className="w-3 h-3" /> EXECUTE
                  </button>
                </div>

                {/* Recent + quick */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[9px] tracking-widest" style={{ color: D.cyanDim }}>// LAST_ORDER</p>
                      <button onClick={() => setSection("orders")} className="text-[9px] tracking-wider hover:opacity-70" style={{ color: D.muted }}>ALL →</button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center" style={{ background: `${D.amber}18`, border: `1px solid ${D.amber}30` }}>
                        <Package className="w-4 h-4" style={{ color: D.amber }} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold" style={{ color: D.text }}>BPC-157 5mg</p>
                        <p className="text-[9px] tracking-wide" style={{ color: D.muted }}>#1094 · TODAY</p>
                      </div>
                      <span className="ml-auto text-[9px] font-bold tracking-widest px-2 py-0.5" style={{ background: `${D.green}18`, border: `1px solid ${D.green}40`, color: D.green }}>SENT</span>
                    </div>
                  </div>

                  <div className="p-4" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
                    <p className="text-[9px] tracking-widest mb-3" style={{ color: D.cyanDim }}>// QUICK_EXEC</p>
                    <div className="space-y-1.5">
                      {[
                        { label: "catalogue.browse()", id: "shop" as Section },
                        { label: "groups.active()", id: "groups" as Section },
                        { label: "blood.results()", id: "blood-tests" as Section },
                        { label: "glp1.log()", id: "glp1" as Section },
                      ].map(q => (
                        <button key={q.label} onClick={() => setSection(q.id)}
                          className="w-full flex items-center gap-2 py-1 text-left hover:opacity-70 transition-opacity">
                          <span className="text-[9px]" style={{ color: D.cyanDim }}>&gt;</span>
                          <span className="text-[10px] tracking-wide" style={{ color: D.muted, fontFamily: "monospace" }}>{q.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {section !== "home" && (
              <div className="p-8 text-center" style={{ background: D.surface, border: `1px solid ${D.border}` }}>
                <p className="text-[9px] tracking-widest" style={{ color: D.muted }}>// {SECTION_TITLES[section].toUpperCase()} MODULE READY</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
