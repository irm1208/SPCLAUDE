import { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, MessageCircle, ArrowRight,
  Clock, Users,
} from "lucide-react";

// REFINEMENT 2: "Elevated"
//
// Same fixes as RefinedTight, plus stronger visual craft:
// • Cards get a 2px colored top border accent — strong section identity signal
// • Primary pair cards: icon in a coloured badge circle rather than inline
// • Title sizes up slightly (16px primary pair, 15px secondary cards)
// • Manage card's secondary action is outside the card — cleaner separation
// • Nav gets an active pill background, not just underline
// • Footer pay method uses a pill tag instead of plain text
// • Consistent glow under primary pair CTA buttons

const C = {
  bg: "#0B0F17",
  border: "rgba(255,255,255,0.07)",
  text: "#F8FAFC",
  sub: "rgba(255,255,255,0.55)",
  muted: "rgba(255,255,255,0.28)",
};

const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

export function RefinedElevated() {
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
          style={{ background: "rgba(59,130,246,0.15)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.22)", height: 34, fontSize: 13 }}
        >
          <User className="w-3.5 h-3.5" /> Login
        </button>
      </header>

      {/* Countdown */}
      <div className="flex items-center justify-between px-4 py-2" style={{ background: "#0C1420", borderBottom: "1px solid rgba(59,130,246,0.1)" }}>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" style={{ color: "#60A5FA" }} />
          <div>
            <div style={{ ...LABEL, color: C.muted }}>Group buy closes</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>28 Oct 2026</div>
          </div>
        </div>
        <div className="text-right">
          <div style={{ ...LABEL, color: C.muted }}>Remaining</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#60A5FA" }}>7 months</div>
        </div>
      </div>

      <main className="flex-1 flex flex-col px-4 pb-24 mt-3">

        {/* Primary pair — icon badge + top accent border */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            {
              accent: "#3B82F6",
              accentDim: "rgba(59,130,246,0.15)",
              label: "New customer", LabelIcon: ShoppingBag,
              title: "Place an order", sub: "Browse products and checkout",
              ctaLabel: "Group Buy Login", CtaIcon: Users,
              cardBg: "linear-gradient(180deg, #0F172A 0%, #1A2D4A 100%)",
              border: "rgba(59,130,246,0.2)",
              ctaBg: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
              ctaGlow: "rgba(59,130,246,0.3)",
            },
            {
              accent: "#8B5CF6",
              accentDim: "rgba(139,92,246,0.15)",
              label: "Single Vials", LabelIcon: FlaskConical,
              title: "The Lonely Vial", sub: "No kits, no minimums",
              ctaLabel: "Browse the Shop", CtaIcon: FlaskConical,
              cardBg: "linear-gradient(180deg, #120A2E 0%, #1E1048 100%)",
              border: "rgba(139,92,246,0.2)",
              ctaBg: "linear-gradient(135deg, #7C3AED, #5B21B6)",
              ctaGlow: "rgba(139,92,246,0.3)",
            },
          ].map(card => (
            <button
              key={card.title}
              className="flex flex-col rounded-3xl p-4 text-left relative overflow-hidden"
              style={{
                background: card.cardBg,
                border: `1px solid ${card.border}`,
                minHeight: 168,
                borderTop: `2px solid ${card.accent}`,
              }}
            >
              {/* Subtle top orb matching accent */}
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${card.accentDim} 0%, transparent 70%)`, transform: "translate(30%, -30%)" }} />

              {/* Icon badge */}
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3 relative z-10" style={{ background: card.accentDim, border: `1px solid ${card.border}` }}>
                <card.LabelIcon style={{ color: card.accent, width: 14, height: 14 }} />
              </div>

              <div style={{ ...LABEL, color: card.accent, marginBottom: 6 }} className="relative z-10">{card.label}</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 4 }} className="relative z-10">{card.title}</div>
              <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.5, marginBottom: 14 }} className="relative z-10">{card.sub}</div>
              <div
                className="w-full flex items-center justify-center gap-1.5 rounded-xl font-bold text-white mt-auto relative z-10"
                style={{
                  background: card.ctaBg,
                  height: 40,
                  fontSize: 12,
                  boxShadow: `0 4px 14px ${card.ctaGlow}`,
                }}
              >
                <card.CtaIcon className="w-3.5 h-3.5" /> {card.ctaLabel}
              </div>
            </button>
          ))}
        </div>

        {/* Manage — compact row, not a full card */}
        <button
          className="w-full flex items-center gap-3 px-4 rounded-2xl mb-3 text-left"
          style={{ background: "linear-gradient(90deg, #1A2B3C, #243547)", border: "1px solid rgba(251,146,60,0.2)", borderLeft: "3px solid rgba(251,146,60,0.7)", height: 56 }}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(234,88,12,0.18)" }}>
            <Search style={{ color: "#FB923C", width: 13, height: 13 }} />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ ...LABEL, color: "#FB923C", marginBottom: 1 }}>Returning</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Manage your order</div>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold flex-shrink-0" style={{ background: "rgba(234,88,12,0.18)", color: "#FB923C", fontSize: 12 }}>
            My Orders <ArrowRight style={{ width: 12, height: 12 }} />
          </div>
        </button>

        {/* Draft notice */}
        <button
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-3"
          style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.22)" }}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#FBBF24", boxShadow: "0 0 5px #FBBF24" }} />
          <span style={{ flex: 1, textAlign: "left", fontSize: 13, color: C.sub, fontWeight: 500 }}>Draft waiting · 1 item</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#FBBF24" }}>Resume →</span>
        </button>

        {/* Lab Reports — top accent border */}
        <button
          className="w-full rounded-3xl p-5 mb-3 text-left overflow-hidden"
          style={{ background: "linear-gradient(180deg, #0A1628 0%, #0F2240 100%)", border: "1px solid rgba(59,130,246,0.12)", borderTop: "2px solid rgba(14,165,233,0.5)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TestTube className="w-3.5 h-3.5" style={{ color: "#38BDF8" }} />
            <span style={{ ...LABEL, color: "#38BDF8" }}>Quality Assurance</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text, marginBottom: 3 }}>Lab Reports</div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>Independent Janoshik CoA tests — 352+ reports from supplier Uther</div>
          <div className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white" style={{ background: "linear-gradient(135deg, #0EA5E9, #0284C7)", height: 40, fontSize: 12, boxShadow: "0 4px 12px rgba(14,165,233,0.25)" }}>
            <TestTube className="w-3.5 h-3.5" /> Browse Lab Results
          </div>
        </button>

        {/* Safety Calculator — top accent border */}
        <button
          className="w-full rounded-3xl p-5 mb-3 text-left overflow-hidden"
          style={{ background: "linear-gradient(180deg, #0A1F2E 0%, #0D2B20 100%)", border: "1px solid rgba(34,197,94,0.1)", borderTop: "2px solid rgba(34,197,94,0.45)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#4ADE80" }} />
            <span style={{ ...LABEL, color: "#4ADE80" }}>Endotoxin & BAC Safety</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text, marginBottom: 3 }}>Safety Calculator</div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>Calculate endotoxin limits and BAC water safety for your reconstituted peptides</div>
          <div className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white" style={{ background: "linear-gradient(135deg, #16A34A, #15803D)", height: 40, fontSize: 12, boxShadow: "0 4px 12px rgba(22,163,74,0.22)" }}>
            <ShieldCheck className="w-3.5 h-3.5" /> Open Safety Calculator
          </div>
        </button>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
          <a href="#" className="flex items-center gap-1.5" style={{ color: "#2AABEE", fontSize: 12 }}>
            <MessageCircle className="w-3 h-3" /><span className="font-semibold">@urbanblend789</span>
          </a>
          {/* Pay method as a pill tag */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>USDT · ETH</span>
          </div>
        </div>
      </main>

      {/* Nav — active pill */}
      <nav className="fixed bottom-0 left-1/2" style={{ transform: "translateX(-50%)", width: 390, background: C.bg, borderTop: `1px solid ${C.border}`, paddingBottom: 14 }}>
        <div className="flex justify-around pt-2">
          {[{ id: "home", icon: Home, label: "Home" }, { id: "protocols", icon: FileText, label: "Protocols" }, { id: "calc", icon: Calculator, label: "Calc" }, { id: "account", icon: User, label: "Account" }].map(t => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl"
                style={{ background: active ? "rgba(59,130,246,0.1)" : "transparent", border: active ? "1px solid rgba(59,130,246,0.18)" : "1px solid transparent", minWidth: 60 }}
              >
                <t.icon className="w-5 h-5" style={{ color: active ? "#60A5FA" : C.muted }} />
                <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? "#60A5FA" : C.muted }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
