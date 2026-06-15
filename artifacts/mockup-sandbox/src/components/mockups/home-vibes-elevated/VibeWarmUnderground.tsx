import { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, MessageCircle, ArrowRight,
  Clock, Users,
} from "lucide-react";

// VIBE: Warm Underground
//
// Emotional register: tight-knit community, handcrafted trust, warmth.
// Cold midnight blue → amber-tinted charcoal. Blues → amber & copper.
// Feels less like software, more like a trusted forum you earned access to.

const C = {
  bg: "#120E09",
  surface: "#1C1510",
  border: "rgba(255,220,150,0.08)",
  text: "#F5F0E8",
  sub: "rgba(245,240,232,0.55)",
  muted: "rgba(245,240,232,0.28)",
};

const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

export function VibeWarmUnderground() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: C.bg, color: C.text, fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5" style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, whiteSpace: "nowrap" }}>Salt & Peps</div>
        <button
          className="flex items-center gap-1.5 px-3 rounded-xl font-bold flex-shrink-0"
          style={{ background: "rgba(217,119,6,0.15)", color: "#FBBF24", border: "1px solid rgba(217,119,6,0.3)", height: 34, fontSize: 13 }}
        >
          <User className="w-3.5 h-3.5" /> Login
        </button>
      </header>

      {/* Countdown — warm amber tint */}
      <div className="flex items-center justify-between px-4 py-2" style={{ background: "#160F08", borderBottom: "1px solid rgba(217,119,6,0.12)" }}>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" style={{ color: "#D97706" }} />
          <div>
            <div style={{ ...LABEL, color: C.muted }}>Group buy closes</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>28 Oct 2026</div>
          </div>
        </div>
        <div className="text-right">
          <div style={{ ...LABEL, color: C.muted }}>Remaining</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#FBBF24" }}>7 months</div>
        </div>
      </div>

      <main className="flex-1 flex flex-col px-4 pb-24 mt-3">

        {/* Primary pair */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            {
              accent: "#D97706",
              accentDim: "rgba(217,119,6,0.15)",
              label: "New customer", LabelIcon: ShoppingBag,
              title: "Place an order", sub: "Browse products and checkout",
              ctaLabel: "Group Buy Login", CtaIcon: Users,
              cardBg: "linear-gradient(180deg, #1C1208 0%, #2A1C0C 100%)",
              border: "rgba(217,119,6,0.22)",
              ctaBg: "linear-gradient(135deg, #B45309, #92400E)",
              ctaGlow: "rgba(180,83,9,0.35)",
            },
            {
              accent: "#A16207",
              accentDim: "rgba(161,98,7,0.18)",
              label: "Single Vials", LabelIcon: FlaskConical,
              title: "The Lonely Vial", sub: "No kits, no minimums",
              ctaLabel: "Browse the Shop", CtaIcon: FlaskConical,
              cardBg: "linear-gradient(180deg, #1A120A 0%, #261B0F 100%)",
              border: "rgba(180,120,40,0.22)",
              ctaBg: "linear-gradient(135deg, #92400E, #78350F)",
              ctaGlow: "rgba(146,64,14,0.35)",
            },
          ].map(card => (
            <button
              key={card.title}
              className="flex flex-col rounded-3xl p-4 text-left relative overflow-hidden"
              style={{ background: card.cardBg, border: `1px solid ${card.border}`, minHeight: 168, borderTop: `2px solid ${card.accent}` }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${card.accentDim} 0%, transparent 70%)`, transform: "translate(30%, -30%)" }} />
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3 relative z-10" style={{ background: card.accentDim, border: `1px solid ${card.border}` }}>
                <card.LabelIcon style={{ color: card.accent, width: 14, height: 14 }} />
              </div>
              <div style={{ ...LABEL, color: card.accent, marginBottom: 6 }} className="relative z-10">{card.label}</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 4 }} className="relative z-10">{card.title}</div>
              <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.5, marginBottom: 14 }} className="relative z-10">{card.sub}</div>
              <div
                className="w-full flex items-center justify-center gap-1.5 rounded-xl font-bold text-white mt-auto relative z-10"
                style={{ background: card.ctaBg, height: 40, fontSize: 12, boxShadow: `0 4px 14px ${card.ctaGlow}` }}
              >
                <card.CtaIcon className="w-3.5 h-3.5" /> {card.ctaLabel}
              </div>
            </button>
          ))}
        </div>

        {/* Manage — compact row, warm sienna left border */}
        <button
          className="w-full flex items-center gap-3 px-4 rounded-2xl mb-3 text-left"
          style={{ background: "linear-gradient(90deg, #1E160E, #261C12)", border: "1px solid rgba(180,83,9,0.2)", borderLeft: "3px solid rgba(180,83,9,0.7)", height: 56 }}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(180,83,9,0.18)" }}>
            <Search style={{ color: "#FB923C", width: 13, height: 13 }} />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ ...LABEL, color: "#FB923C", marginBottom: 1 }}>Returning</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Manage your order</div>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold flex-shrink-0" style={{ background: "rgba(180,83,9,0.18)", color: "#FB923C", fontSize: 12 }}>
            My Orders <ArrowRight style={{ width: 12, height: 12 }} />
          </div>
        </button>

        {/* Draft notice */}
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-3" style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)" }}>
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#FBBF24", boxShadow: "0 0 5px #FBBF24" }} />
          <span style={{ flex: 1, textAlign: "left", fontSize: 13, color: C.sub, fontWeight: 500 }}>Draft waiting · 1 item</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#FBBF24" }}>Resume →</span>
        </button>

        {/* Lab Reports — warm green-gray tint */}
        <button className="w-full rounded-3xl p-5 mb-3 text-left overflow-hidden" style={{ background: "linear-gradient(180deg, #0E1A14 0%, #142012 100%)", border: "1px solid rgba(52,211,153,0.12)", borderTop: "2px solid rgba(52,211,153,0.4)" }}>
          <div className="flex items-center gap-2 mb-2">
            <TestTube className="w-3.5 h-3.5" style={{ color: "#6EE7B7" }} />
            <span style={{ ...LABEL, color: "#6EE7B7" }}>Quality Assurance</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text, marginBottom: 3 }}>Lab Reports</div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>Independent Janoshik CoA tests — 352+ reports from supplier Uther</div>
          <div className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white" style={{ background: "linear-gradient(135deg, #059669, #047857)", height: 40, fontSize: 12, boxShadow: "0 4px 12px rgba(5,150,105,0.25)" }}>
            <TestTube className="w-3.5 h-3.5" /> Browse Lab Results
          </div>
        </button>

        {/* Safety Calculator */}
        <button className="w-full rounded-3xl p-5 mb-3 text-left overflow-hidden" style={{ background: "linear-gradient(180deg, #0A1A14 0%, #0E1F18 100%)", border: "1px solid rgba(34,197,94,0.1)", borderTop: "2px solid rgba(34,197,94,0.38)" }}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#86EFAC" }} />
            <span style={{ ...LABEL, color: "#86EFAC" }}>Endotoxin & BAC Safety</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text, marginBottom: 3 }}>Safety Calculator</div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>Calculate endotoxin limits and BAC water safety for your reconstituted peptides</div>
          <div className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white" style={{ background: "linear-gradient(135deg, #16A34A, #15803D)", height: 40, fontSize: 12, boxShadow: "0 4px 12px rgba(22,163,74,0.2)" }}>
            <ShieldCheck className="w-3.5 h-3.5" /> Open Safety Calculator
          </div>
        </button>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
          <a href="#" className="flex items-center gap-1.5" style={{ color: "#F59E0B", fontSize: 12 }}>
            <MessageCircle className="w-3 h-3" /><span className="font-semibold">@urbanblend789</span>
          </a>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>USDT · ETH</span>
          </div>
        </div>
      </main>

      {/* Nav */}
      <nav className="fixed bottom-0 left-1/2" style={{ transform: "translateX(-50%)", width: 390, background: C.bg, borderTop: `1px solid ${C.border}`, paddingBottom: 14 }}>
        <div className="flex justify-around pt-2">
          {[{ id: "home", icon: Home, label: "Home" }, { id: "protocols", icon: FileText, label: "Protocols" }, { id: "calc", icon: Calculator, label: "Calc" }, { id: "account", icon: User, label: "Account" }].map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl"
                style={{ background: active ? "rgba(217,119,6,0.1)" : "transparent", border: active ? "1px solid rgba(217,119,6,0.2)" : "1px solid transparent", minWidth: 60 }}>
                <t.icon className="w-5 h-5" style={{ color: active ? "#FBBF24" : C.muted }} />
                <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? "#FBBF24" : C.muted }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
