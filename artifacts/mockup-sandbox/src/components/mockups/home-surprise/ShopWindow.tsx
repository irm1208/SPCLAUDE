import { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, MessageCircle, ChevronRight,
  Clock, Users,
} from "lucide-react";

// SURPRISE AXIS: Cards are not the organizing system.
//
// COMMAND MENU — a settings/command-palette metaphor.
//
// Every action is a row: left color badge + title + optional sub + right chevron.
// The two primary actions get a larger badge, bolder title (18px), and a colored
// right action instead of a chevron. All other rows are 52px height.
// No full-width CTA buttons anywhere. No card chrome. No gradients on rows.
// Sections are separated by flush section headers, like iOS Settings.
// Dense, functional, zero decoration. The color lives only in the badge circles.
//
// What this challenges: that actions need big CTA buttons to feel clickable.

const C = {
  bg: "#0B0F17",
  surface: "#111827",
  border: "rgba(255,255,255,0.06)",
  text: "#F8FAFC",
  sub: "rgba(255,255,255,0.55)",
  muted: "rgba(255,255,255,0.28)",
};

const SECTION: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "rgba(255,255,255,0.28)",
  paddingLeft: 20,
  paddingRight: 20,
  paddingTop: 20,
  paddingBottom: 8,
};

export function ShopWindow() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: C.bg, color: C.text, fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3" style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, whiteSpace: "nowrap" }}>Salt & Peps</div>
        <button className="flex items-center gap-1.5 px-3 rounded-xl font-bold flex-shrink-0"
          style={{ background: "rgba(59,130,246,0.15)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.22)", height: 34, fontSize: 13 }}>
          <User className="w-3.5 h-3.5" /> Login
        </button>
      </header>

      {/* Countdown — a single badge-style status bar */}
      <div className="flex items-center justify-between px-5 py-2.5" style={{ background: "#0E1320", borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)" }}>
            <Clock style={{ color: "#60A5FA", width: 12, height: 12 }} />
          </div>
          <span style={{ fontSize: 13, color: C.sub }}>Group buy closes <strong style={{ color: C.text }}>28 Oct 2026</strong></span>
        </div>
        <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.15)", color: "#60A5FA", fontSize: 11, fontWeight: 700 }}>7 mo</span>
      </div>

      <main className="flex-1 flex flex-col pb-24">

        {/* BUY section */}
        <div style={SECTION}>Buy</div>
        <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>

          {/* Group Buy — hero row */}
          <button className="w-full flex items-center gap-4 px-5 text-left" style={{ height: 68, borderBottom: `1px solid ${C.border}` }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
              <Users style={{ color: "#fff", width: 18, height: 18 }} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Group Buy Login</div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 1 }}>Browse 128+ products and checkout</div>
            </div>
            <ChevronRight style={{ color: "#3B82F6", width: 18, height: 18, flexShrink: 0 }} />
          </button>

          {/* Lonely Vial — hero row */}
          <button className="w-full flex items-center gap-4 px-5 text-left" style={{ height: 68 }}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #7C3AED, #5B21B6)" }}>
              <FlaskConical style={{ color: "#fff", width: 18, height: 18 }} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>The Lonely Vial</div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 1 }}>No kits, no minimums · single vials</div>
            </div>
            <ChevronRight style={{ color: "#8B5CF6", width: 18, height: 18, flexShrink: 0 }} />
          </button>
        </div>

        {/* MANAGE section */}
        <div style={SECTION}>Manage</div>
        <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>

          <button className="w-full flex items-center gap-3 px-5 text-left" style={{ height: 52, borderBottom: `1px solid ${C.border}` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(234,88,12,0.18)" }}>
              <ShoppingBag style={{ color: "#FB923C", width: 15, height: 15 }} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>My Orders</div>
              <div style={{ fontSize: 11, color: C.muted }}>Track, edit, pay, upload InPost QR</div>
            </div>
            <ChevronRight style={{ color: C.muted, width: 16, height: 16, flexShrink: 0 }} />
          </button>

          <button className="w-full flex items-center gap-3 px-5 text-left" style={{ height: 52 }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.07)" }}>
              <Search style={{ color: C.muted, width: 14, height: 14 }} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 14, fontWeight: 600, color: C.sub }}>Find order by code</div>
            </div>
            <ChevronRight style={{ color: C.muted, width: 16, height: 16, flexShrink: 0 }} />
          </button>
        </div>

        {/* Draft inline — not a section, just a banner */}
        <button className="w-full flex items-center gap-3 px-5 py-2.5" style={{ background: "rgba(251,191,36,0.06)", borderTop: `1px solid rgba(251,191,36,0.1)`, borderBottom: `1px solid rgba(251,191,36,0.1)` }}>
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#FBBF24" }} />
          <span style={{ flex: 1, fontSize: 12, color: C.sub }}>Draft waiting · 1 item</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#FBBF24" }}>Resume →</span>
        </button>

        {/* RESOURCES section */}
        <div style={SECTION}>Resources</div>
        <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>

          <button className="w-full flex items-center gap-3 px-5 text-left" style={{ height: 52, borderBottom: `1px solid ${C.border}` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(14,165,233,0.15)" }}>
              <TestTube style={{ color: "#38BDF8", width: 15, height: 15 }} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Lab Reports</div>
              <div style={{ fontSize: 11, color: C.muted }}>352+ Janoshik CoA tests</div>
            </div>
            <ChevronRight style={{ color: C.muted, width: 16, height: 16, flexShrink: 0 }} />
          </button>

          <button className="w-full flex items-center gap-3 px-5 text-left" style={{ height: 52 }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(34,197,94,0.15)" }}>
              <ShieldCheck style={{ color: "#4ADE80", width: 15, height: 15 }} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Safety Calculator</div>
              <div style={{ fontSize: 11, color: C.muted }}>Endotoxin & BAC water limits</div>
            </div>
            <ChevronRight style={{ color: C.muted, width: 16, height: 16, flexShrink: 0 }} />
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 mt-5">
          <a href="#" className="flex items-center gap-1.5" style={{ color: "#2AABEE", fontSize: 12 }}>
            <MessageCircle className="w-3 h-3" /><span className="font-semibold">@urbanblend789</span>
          </a>
          <span style={{ fontSize: 11, color: C.muted }}>USDT · ETH</span>
        </div>
      </main>

      {/* Nav */}
      <nav className="fixed bottom-0 left-1/2" style={{ transform: "translateX(-50%)", width: 390, background: C.bg, borderTop: `1px solid ${C.border}`, paddingBottom: 14 }}>
        <div className="flex justify-around pt-2">
          {[{ id: "home", icon: Home, label: "Home" }, { id: "protocols", icon: FileText, label: "Protocols" }, { id: "calc", icon: Calculator, label: "Calc" }, { id: "account", icon: User, label: "Account" }].map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl"
                style={{ background: active ? "rgba(59,130,246,0.1)" : "transparent", border: active ? "1px solid rgba(59,130,246,0.15)" : "1px solid transparent", minWidth: 60 }}>
                <t.icon className="w-5 h-5" style={{ color: active ? "#60A5FA" : C.muted }} />
                <span style={{ fontSize: 11, fontWeight: active ? 700 : 400, color: active ? "#60A5FA" : C.muted }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
