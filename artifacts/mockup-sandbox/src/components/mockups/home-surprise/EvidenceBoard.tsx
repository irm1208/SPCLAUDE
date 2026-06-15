import { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, MessageCircle, ArrowRight,
  Clock, Users,
} from "lucide-react";

// SURPRISE AXIS: Cards are not the organizing system.
//
// FULL-BLEED SECTIONS — full-width background zones replace cards.
//
// Instead of cards with padding and borders, each section takes up
// the full width of the screen with its own background color band.
// No lateral margins on section backgrounds. Content still has 20px padding.
// This creates clear visual zones WITHOUT any card chrome at all.
// Like a landing page rather than an app. Sections feel like rooms.
//
// What this challenges: the assumption that margin/padding + border = section.

const C = {
  bg: "#0B0F17",
  text: "#F8FAFC",
  sub: "rgba(255,255,255,0.55)",
  muted: "rgba(255,255,255,0.28)",
};

const LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
};

export function EvidenceBoard() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: C.bg, color: C.text, fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3" style={{ background: "#0D1117", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, whiteSpace: "nowrap" }}>Salt & Peps</div>
        <button className="flex items-center gap-1.5 px-3 rounded-xl font-bold flex-shrink-0"
          style={{ background: "rgba(59,130,246,0.15)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.22)", height: 34, fontSize: 13 }}>
          <User className="w-3.5 h-3.5" /> Login
        </button>
      </header>

      {/* Countdown — full bleed amber tint band */}
      <div className="flex items-center justify-between px-5 py-2.5" style={{ background: "#0E1320", borderBottom: "1px solid rgba(59,130,246,0.1)" }}>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" style={{ color: "#60A5FA" }} />
          <div>
            <div style={{ ...LABEL, color: C.muted }}>Group buy closes</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>28 Oct 2026</div>
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#60A5FA" }}>7 months left</div>
      </div>

      <main className="flex-1 flex flex-col pb-24">

        {/* Group Buy — full-bleed blue zone */}
        <button className="w-full text-left px-5 py-6" style={{ background: "linear-gradient(180deg, #0D1729 0%, #111E38 100%)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-1.5 mb-3">
            <ShoppingBag style={{ color: "#93C5FD", width: 12, height: 12 }} />
            <span style={{ ...LABEL, color: "#93C5FD" }}>New Customer</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.text, lineHeight: 1.1, marginBottom: 6, letterSpacing: "-0.02em" }}>Place an order</div>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 18, lineHeight: 1.6 }}>Browse 128+ peptide products and checkout via group buy</div>
          <div className="flex items-center justify-center gap-2 rounded-2xl font-bold text-white"
            style={{ background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", height: 48, fontSize: 14, boxShadow: "0 6px 20px rgba(59,130,246,0.3)" }}>
            <Users className="w-4 h-4" /> Group Buy Login
          </div>
        </button>

        {/* Lonely Vial — full-bleed purple zone, no gap between */}
        <button className="w-full text-left px-5 py-6" style={{ background: "linear-gradient(180deg, #100A28 0%, #180F3C 100%)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-1.5 mb-3">
            <FlaskConical style={{ color: "#A78BFA", width: 12, height: 12 }} />
            <span style={{ ...LABEL, color: "#A78BFA" }}>Single Vials</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.text, lineHeight: 1.1, marginBottom: 6, letterSpacing: "-0.02em" }}>The Lonely Vial</div>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 18, lineHeight: 1.6 }}>No kits, no minimums — buy exactly one vial of anything</div>
          <div className="flex items-center justify-center gap-2 rounded-2xl font-bold text-white"
            style={{ background: "linear-gradient(135deg, #7C3AED, #5B21B6)", height: 48, fontSize: 14, boxShadow: "0 6px 20px rgba(139,92,246,0.3)" }}>
            <FlaskConical className="w-4 h-4" /> Browse the Shop
          </div>
        </button>

        {/* Manage — full-bleed teal zone, noticeably smaller */}
        <button className="w-full flex items-center gap-4 px-5 py-4 text-left"
          style={{ background: "#111E26", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <Search style={{ color: "#FB923C", width: 16, height: 16, flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <div style={{ ...LABEL, color: "rgba(251,146,60,0.7)", marginBottom: 2 }}>Returning</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Manage your order</div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0" style={{ color: "#FB923C", fontSize: 13, fontWeight: 700 }}>
            My Orders <ArrowRight style={{ width: 13, height: 13 }} />
          </div>
        </button>

        {/* Draft — full-bleed amber band */}
        <div className="flex items-center gap-3 px-5 py-3" style={{ background: "rgba(251,191,36,0.07)", borderBottom: "1px solid rgba(251,191,36,0.12)" }}>
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#FBBF24", boxShadow: "0 0 4px #FBBF24" }} />
          <span style={{ flex: 1, fontSize: 12, color: C.sub }}>Draft waiting · 1 item</span>
          <button style={{ fontSize: 12, fontWeight: 700, color: "#FBBF24", flexShrink: 0 }}>Resume →</button>
        </div>

        {/* Lab Reports — full-bleed deep blue zone */}
        <button className="w-full text-left px-5 py-5"
          style={{ background: "#090F1E", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <TestTube style={{ color: "#38BDF8", width: 12, height: 12 }} />
            <span style={{ ...LABEL, color: "#38BDF8" }}>Quality Assurance</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 3, letterSpacing: "-0.01em" }}>Lab Reports</div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 1.6 }}>Independent Janoshik CoA tests — 352+ reports from supplier Uther</div>
          <div className="flex items-center justify-center gap-2 rounded-xl font-bold text-white"
            style={{ background: "linear-gradient(135deg, #0EA5E9, #0284C7)", height: 40, fontSize: 12 }}>
            <TestTube className="w-3.5 h-3.5" /> Browse Lab Results
          </div>
        </button>

        {/* Safety Calc — full-bleed deep green zone */}
        <button className="w-full text-left px-5 py-5"
          style={{ background: "#081510", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldCheck style={{ color: "#4ADE80", width: 12, height: 12 }} />
            <span style={{ ...LABEL, color: "#4ADE80" }}>Endotoxin & BAC Safety</span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 3, letterSpacing: "-0.01em" }}>Safety Calculator</div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 1.6 }}>Calculate endotoxin limits and BAC water safety for your reconstituted peptides</div>
          <div className="flex items-center justify-center gap-2 rounded-xl font-bold text-white"
            style={{ background: "linear-gradient(135deg, #16A34A, #15803D)", height: 40, fontSize: 12 }}>
            <ShieldCheck className="w-3.5 h-3.5" /> Open Safety Calculator
          </div>
        </button>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4" style={{ background: C.bg }}>
          <a href="#" className="flex items-center gap-1.5" style={{ color: "#2AABEE", fontSize: 12 }}>
            <MessageCircle className="w-3 h-3" /><span className="font-semibold">@urbanblend789</span>
          </a>
          <span style={{ fontSize: 11, color: C.muted }}>USDT · ETH</span>
        </div>
      </main>

      {/* Nav */}
      <nav className="fixed bottom-0 left-1/2" style={{ transform: "translateX(-50%)", width: 390, background: "#0D1117", borderTop: "1px solid rgba(255,255,255,0.06)", paddingBottom: 14 }}>
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
