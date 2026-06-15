import { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, MessageCircle, ArrowRight,
  Clock, Users,
} from "lucide-react";

// VIBE: Clinical Precision
//
// Emotional register: pharmaceutical trust, lab discipline, cool authority.
// Near-black with zero blue warmth. Accents desaturated to near-mint.
// Cards are flatter — the data is what matters, not the chrome.
// CTAs are outlined on the secondary cards; only the two primaries fill.

const C = {
  bg: "#080B0D",
  border: "rgba(255,255,255,0.06)",
  text: "#E8EDF2",
  sub: "rgba(232,237,242,0.5)",
  muted: "rgba(232,237,242,0.25)",
};

const LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
};

export function VibeClinicalPrecision() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: C.bg, color: C.text, fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace", maxWidth: 390, margin: "0 auto" }}
    >
      {/* Header — monospaced, stark */}
      <header className="flex items-center justify-between px-4 py-2.5" style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: "nowrap", letterSpacing: "0.02em" }}>SALT & PEPS</div>
        <button
          className="flex items-center gap-1.5 px-3 rounded-lg font-bold flex-shrink-0"
          style={{ background: "transparent", color: C.sub, border: "1px solid rgba(255,255,255,0.14)", height: 32, fontSize: 11, letterSpacing: "0.05em" }}
        >
          <User className="w-3 h-3" /> LOGIN
        </button>
      </header>

      {/* Countdown — minimal bar */}
      <div className="flex items-center justify-between px-4 py-1.5" style={{ background: "#0A0E11", borderBottom: "1px solid rgba(56,189,248,0.1)" }}>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" style={{ color: "rgba(56,189,248,0.6)" }} />
          <div>
            <div style={{ ...LABEL, color: C.muted }}>Group buy closes</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: "0.01em" }}>28 Oct 2026</div>
          </div>
        </div>
        <div className="text-right">
          <div style={{ ...LABEL, color: C.muted }}>Remaining</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(56,189,248,0.8)", letterSpacing: "0.01em" }}>7 months</div>
        </div>
      </div>

      <main className="flex-1 flex flex-col px-4 pb-24 mt-3">

        {/* Primary pair — flat with accent left border */}
        <div className="grid grid-cols-2 gap-2.5 mb-2.5">
          {[
            {
              accent: "#38BDF8",
              accentDim: "rgba(56,189,248,0.1)",
              label: "New customer", LabelIcon: ShoppingBag,
              title: "Place an order", sub: "Browse products and checkout",
              ctaLabel: "Group Buy Login", CtaIcon: Users,
              cardBg: "#0D1218",
              border: "rgba(56,189,248,0.15)",
              ctaBg: "linear-gradient(135deg, #0369A1, #075985)",
              ctaGlow: "rgba(3,105,161,0.3)",
            },
            {
              accent: "#A78BFA",
              accentDim: "rgba(167,139,250,0.1)",
              label: "Single Vials", LabelIcon: FlaskConical,
              title: "The Lonely Vial", sub: "No kits, no minimums",
              ctaLabel: "Browse the Shop", CtaIcon: FlaskConical,
              cardBg: "#0E0C18",
              border: "rgba(167,139,250,0.15)",
              ctaBg: "linear-gradient(135deg, #5B21B6, #4C1D95)",
              ctaGlow: "rgba(91,33,182,0.3)",
            },
          ].map(card => (
            <button
              key={card.title}
              className="flex flex-col rounded-2xl p-4 text-left relative overflow-hidden"
              style={{ background: card.cardBg, border: `1px solid ${card.border}`, minHeight: 168, borderTop: `2px solid ${card.accent}` }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-3 relative z-10" style={{ background: card.accentDim }}>
                <card.LabelIcon style={{ color: card.accent, width: 13, height: 13 }} />
              </div>
              <div style={{ ...LABEL, color: card.accent, marginBottom: 5 }} className="relative z-10">{card.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.25, marginBottom: 4, letterSpacing: "-0.01em" }} className="relative z-10">{card.title}</div>
              <div style={{ fontSize: 10.5, color: C.sub, lineHeight: 1.5, marginBottom: 14 }} className="relative z-10">{card.sub}</div>
              <div
                className="w-full flex items-center justify-center gap-1.5 rounded-lg font-bold text-white mt-auto relative z-10"
                style={{ background: card.ctaBg, height: 38, fontSize: 11, letterSpacing: "0.02em", boxShadow: `0 4px 14px ${card.ctaGlow}` }}
              >
                <card.CtaIcon className="w-3 h-3" /> {card.ctaLabel}
              </div>
            </button>
          ))}
        </div>

        {/* Manage — slim compact row */}
        <button
          className="w-full flex items-center gap-3 px-4 rounded-xl mb-2.5 text-left"
          style={{ background: "#0D1318", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "2px solid rgba(251,146,60,0.5)", height: 52 }}
        >
          <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "rgba(234,88,12,0.12)" }}>
            <Search style={{ color: "#FB923C", width: 12, height: 12 }} />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ ...LABEL, color: "rgba(251,146,60,0.7)", marginBottom: 1 }}>Returning</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Manage your order</div>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md font-bold flex-shrink-0" style={{ background: "rgba(234,88,12,0.12)", color: "#FB923C", fontSize: 11 }}>
            My Orders <ArrowRight style={{ width: 11, height: 11 }} />
          </div>
        </button>

        {/* Draft notice */}
        <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl mb-2.5" style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)" }}>
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#FBBF24" }} />
          <span style={{ flex: 1, textAlign: "left", fontSize: 12, color: C.sub, fontWeight: 500 }}>Draft waiting · 1 item</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#FBBF24" }}>Resume →</span>
        </button>

        {/* Lab Reports — outlined CTA */}
        <div className="w-full rounded-2xl p-4 mb-2.5 text-left" style={{ background: "#090E12", border: "1px solid rgba(56,189,248,0.1)", borderTop: "2px solid rgba(56,189,248,0.4)" }}>
          <div className="flex items-center gap-2 mb-2">
            <TestTube className="w-3 h-3" style={{ color: "rgba(56,189,248,0.7)" }} />
            <span style={{ ...LABEL, color: "rgba(56,189,248,0.7)" }}>Quality Assurance</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2, letterSpacing: "-0.01em" }}>Lab Reports</div>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 10 }}>Independent Janoshik CoA tests — 352+ reports from supplier Uther</div>
          <button className="w-full flex items-center justify-center gap-2 rounded-lg font-bold" style={{ background: "transparent", border: "1px solid rgba(56,189,248,0.35)", color: "#38BDF8", height: 36, fontSize: 11 }}>
            <TestTube className="w-3 h-3" /> Browse Lab Results
          </button>
        </div>

        {/* Safety Calculator — outlined CTA */}
        <div className="w-full rounded-2xl p-4 mb-2.5 text-left" style={{ background: "#090D0F", border: "1px solid rgba(74,222,128,0.08)", borderTop: "2px solid rgba(74,222,128,0.35)" }}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-3 h-3" style={{ color: "rgba(74,222,128,0.7)" }} />
            <span style={{ ...LABEL, color: "rgba(74,222,128,0.7)" }}>Endotoxin & BAC Safety</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2, letterSpacing: "-0.01em" }}>Safety Calculator</div>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 10 }}>Calculate endotoxin limits and BAC water safety for your reconstituted peptides</div>
          <button className="w-full flex items-center justify-center gap-2 rounded-lg font-bold" style={{ background: "transparent", border: "1px solid rgba(74,222,128,0.3)", color: "#4ADE80", height: 36, fontSize: 11 }}>
            <ShieldCheck className="w-3 h-3" /> Open Safety Calculator
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
          <a href="#" className="flex items-center gap-1.5" style={{ color: "rgba(56,189,248,0.7)", fontSize: 11, letterSpacing: "0.02em" }}>
            <MessageCircle className="w-3 h-3" /><span>@urbanblend789</span>
          </a>
          <div className="flex items-center gap-1 px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: "0.06em" }}>USDT · ETH</span>
          </div>
        </div>
      </main>

      {/* Nav */}
      <nav className="fixed bottom-0 left-1/2" style={{ transform: "translateX(-50%)", width: 390, background: C.bg, borderTop: `1px solid ${C.border}`, paddingBottom: 14 }}>
        <div className="flex justify-around pt-2">
          {[{ id: "home", icon: Home, label: "Home" }, { id: "protocols", icon: FileText, label: "Protocols" }, { id: "calc", icon: Calculator, label: "Calc" }, { id: "account", icon: User, label: "Account" }].map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg"
                style={{ background: active ? "rgba(56,189,248,0.08)" : "transparent", border: active ? "1px solid rgba(56,189,248,0.15)" : "1px solid transparent", minWidth: 60 }}>
                <t.icon className="w-5 h-5" style={{ color: active ? "#38BDF8" : C.muted }} />
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? "#38BDF8" : C.muted, letterSpacing: "0.05em" }}>{t.label.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
