import { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, MessageCircle, ArrowRight,
  Clock, Users,
} from "lucide-react";

// REFINEMENT 1: "Tight"
//
// Same structure as AccessibilityFirst. Rough edges resolved:
// • Header whitespace-nowrap — title stays on one line
// • Nested button removed — "Find order by code" is a sibling row, not inside Manage
// • All CTA buttons locked to 40px
// • Both primary cards get matching radial orb highlight
// • Section labels bumped to 11px
// • Spacing on consistent 12px rhythm throughout (mb-3)
// • Nav gets underline active indicator, not just colour

const C = {
  bg: "#0B0F17",
  surface: "#111827",
  border: "rgba(255,255,255,0.07)",
  text: "#F8FAFC",
  sub: "rgba(255,255,255,0.55)",
  muted: "rgba(255,255,255,0.3)",
};

const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
};

export function RefinedTight() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: C.bg, color: C.text, fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}
    >
      {/* Header — nowrap fix, tighter padding */}
      <header className="flex items-center justify-between px-4 py-2.5" style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, whiteSpace: "nowrap" }}>Salt & Peps</div>
        <button
          className="flex items-center gap-1.5 px-3 rounded-xl font-bold flex-shrink-0"
          style={{ background: "rgba(59,130,246,0.18)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.25)", height: 34, fontSize: 13 }}
        >
          <User className="w-3.5 h-3.5" /> Login
        </button>
      </header>

      {/* Countdown — same bg as page, just a band */}
      <div className="flex items-center justify-between px-4 py-2" style={{ background: "#0D1520", borderBottom: "1px solid rgba(59,130,246,0.12)" }}>
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

        {/* Primary pair — equal, consistent orbs both sides */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            {
              label: "New customer", labelColor: "#93C5FD",
              LabelIcon: ShoppingBag,
              title: "Place an order", sub: "Browse products and checkout",
              ctaLabel: "Group Buy Login", CtaIcon: Users,
              cardBg: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)",
              border: "rgba(59,130,246,0.22)",
              ctaBg: "linear-gradient(135deg, #3B82F6, #2563EB)",
              orb: "rgba(59,130,246,0.1)",
            },
            {
              label: "Single Vials", labelColor: "#A78BFA",
              LabelIcon: FlaskConical,
              title: "The Lonely Vial", sub: "No kits, no minimums",
              ctaLabel: "Browse the Shop", CtaIcon: FlaskConical,
              cardBg: "linear-gradient(180deg, #120A2E 0%, #1D0D45 100%)",
              border: "rgba(139,92,246,0.22)",
              ctaBg: "linear-gradient(135deg, #7C3AED, #6D28D9)",
              orb: "rgba(139,92,246,0.1)",
            },
          ].map(card => (
            <button
              key={card.title}
              className="flex flex-col rounded-3xl p-4 text-left relative overflow-hidden"
              style={{ background: card.cardBg, border: `1px solid ${card.border}`, minHeight: 160 }}
            >
              {/* Matching orb on both cards — fixes asymmetry */}
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none" style={{ background: card.orb, transform: "translate(35%, -35%)", filter: "blur(16px)" }} />
              <div className="flex items-center gap-1.5 mb-3 relative z-10">
                <card.LabelIcon className="w-3 h-3" style={{ color: card.labelColor }} />
                <span style={{ ...LABEL, color: card.labelColor }}>{card.label}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.text, lineHeight: 1.2, marginBottom: 4 }} className="relative z-10">{card.title}</div>
              <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.5, marginBottom: 14 }} className="relative z-10">{card.sub}</div>
              <div
                className="w-full flex items-center justify-center gap-1.5 rounded-xl font-bold text-white mt-auto relative z-10"
                style={{ background: card.ctaBg, height: 40, fontSize: 12 }}
              >
                <card.CtaIcon className="w-3.5 h-3.5" /> {card.ctaLabel}
              </div>
            </button>
          ))}
        </div>

        {/* Manage card — button height 40px, consistent */}
        <div className="rounded-3xl mb-3 overflow-hidden" style={{ background: "linear-gradient(180deg, #1A2B3C 0%, #2D4A5E 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="p-5">
            <div className="flex items-center gap-1.5 mb-2">
              <Search className="w-3 h-3" style={{ color: C.muted }} />
              <span style={{ ...LABEL, color: C.muted }}>Returning</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 3 }}>Manage your order</div>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 14 }}>Track, edit, pay, or upload your InPost QR code</div>
            <button
              className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white"
              style={{ background: "linear-gradient(135deg, #EA580C, #C2410C)", height: 40, fontSize: 13 }}
            >
              My Orders <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {/* Find order by code — sibling row, NOT nested button */}
          <div className="flex items-center justify-center gap-2 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <button className="flex items-center gap-2" style={{ fontSize: 12, color: C.muted }}>
              <Search className="w-3 h-3" /> Find order by code
            </button>
          </div>
        </div>

        {/* Draft notice */}
        <button
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-3"
          style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.25)" }}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#FBBF24" }} />
          <span style={{ flex: 1, textAlign: "left", fontSize: 13, color: C.sub, fontWeight: 500 }}>Draft waiting · 1 item</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#FBBF24" }}>Resume →</span>
        </button>

        {/* Lab Reports */}
        <button className="w-full rounded-3xl p-5 mb-3 text-left" style={{ background: "linear-gradient(180deg, #0A1628 0%, #0F2240 100%)", border: "1px solid rgba(59,130,246,0.14)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <TestTube className="w-3 h-3" style={{ color: "#38BDF8" }} />
            <span style={{ ...LABEL, color: "#38BDF8" }}>Quality Assurance</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text, marginBottom: 3 }}>Lab Reports</div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>Independent Janoshik CoA tests — 352+ reports from supplier Uther</div>
          <div className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white" style={{ background: "linear-gradient(135deg, #0EA5E9, #0284C7)", height: 40, fontSize: 12 }}>
            <TestTube className="w-3.5 h-3.5" /> Browse Lab Results
          </div>
        </button>

        {/* Safety Calculator */}
        <button className="w-full rounded-3xl p-5 mb-3 text-left" style={{ background: "linear-gradient(180deg, #0A1F2E 0%, #0D2B20 100%)", border: "1px solid rgba(34,197,94,0.12)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldCheck className="w-3 h-3" style={{ color: "#4ADE80" }} />
            <span style={{ ...LABEL, color: "#4ADE80" }}>Endotoxin & BAC Safety</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.text, marginBottom: 3 }}>Safety Calculator</div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>Calculate endotoxin limits and BAC water safety for your reconstituted peptides</div>
          <div className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-white" style={{ background: "linear-gradient(135deg, #16A34A, #15803D)", height: 40, fontSize: 12 }}>
            <ShieldCheck className="w-3.5 h-3.5" /> Open Safety Calculator
          </div>
        </button>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
          <a href="#" className="flex items-center gap-1.5" style={{ color: "#2AABEE", fontSize: 12 }}>
            <MessageCircle className="w-3 h-3" /><span className="font-semibold">@urbanblend789</span>
          </a>
          <span style={{ fontSize: 11, color: C.muted }}>Pay with USDT · Ethereum</span>
        </div>
      </main>

      {/* Nav — underline active indicator */}
      <nav className="fixed bottom-0 left-1/2" style={{ transform: "translateX(-50%)", width: 390, background: C.bg, borderTop: `1px solid ${C.border}`, paddingBottom: 14 }}>
        <div className="flex justify-around pt-1">
          {[{ id: "home", icon: Home, label: "Home" }, { id: "protocols", icon: FileText, label: "Protocols" }, { id: "calc", icon: Calculator, label: "Calc" }, { id: "account", icon: User, label: "Account" }].map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex flex-col items-center px-3" style={{ paddingTop: 8, paddingBottom: 0, position: "relative" }}>
                <t.icon className="w-5 h-5 mb-1" style={{ color: active ? "#3B82F6" : C.muted }} />
                <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? "#3B82F6" : C.muted }}>{t.label}</span>
                {active && <div style={{ height: 2, width: 20, borderRadius: 1, background: "#3B82F6", marginTop: 4 }} />}
                {!active && <div style={{ height: 2, marginTop: 4 }} />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
