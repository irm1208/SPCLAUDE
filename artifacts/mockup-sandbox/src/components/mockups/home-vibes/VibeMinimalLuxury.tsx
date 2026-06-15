import { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, MessageCircle, ArrowRight, Clock, Users,
} from "lucide-react";

// VIBE: Minimal Luxury
//
// Emotional register: quiet prestige, restrained confidence, considered craft.
// Palette: warm off-white + single near-black text. Near-zero colour.
//          One moment of controlled contrast: the primary CTA.
// Typography: large, generous, weight-only hierarchy — no colour to do the work.
// Feel: Swiss watchmaker meets premium fintech. Nothing shouts.

const T = {
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  border: "#E8E6E1",
  borderLight: "#F0EEE9",
  text: "#111110",
  textSub: "#6B6860",
  textMuted: "#B8B5AF",
  ctaBg: "#111110",
  ctaText: "#FAFAF8",
  linkColor: "#2AABEE",
};

export function VibeMinimalLuxury() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: T.bg,
        color: T.text,
        fontFamily: "'Inter', system-ui, sans-serif",
        maxWidth: 390,
        margin: "0 auto",
      }}
    >
      {/* Status strip — invisible almost */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ background: T.surface, borderBottom: `1px solid ${T.border}` }}
      >
        <div className="flex items-center gap-2" style={{ fontSize: 12, color: T.textSub }}>
          <Clock style={{ width: 12, height: 12, color: T.textMuted }} />
          <span>Closes <span style={{ color: T.text, fontWeight: 600 }}>28 Oct 2026</span></span>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ border: `1px solid ${T.border}`, fontSize: 12, fontWeight: 600, color: T.textSub }}
        >
          <User style={{ width: 12, height: 12 }} /> Login
        </button>
      </div>

      <main className="flex-1 flex flex-col px-5 pb-24">

        {/* ── Tier 1 ── */}
        <div className="mt-7 mb-6">
          {/* Label — just a fine horizontal rule + small numeral */}
          <div className="flex items-center gap-3 mb-4">
            <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              01
            </span>
            <div className="flex-1 h-px" style={{ background: T.border }} />
          </div>

          {/* No card border, no background — whitespace carries the weight */}
          <div>
            <div
              className="inline-flex items-center gap-1.5 mb-4 px-2.5 py-1 rounded-full"
              style={{ border: `1px solid ${T.border}`, fontSize: 11, color: T.textSub, fontWeight: 600, letterSpacing: "0.04em" }}
            >
              <ShoppingBag style={{ width: 10, height: 10 }} /> New customer
            </div>
            <h1 style={{ fontSize: 34, fontWeight: 900, color: T.text, marginBottom: 10, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
              Place an order
            </h1>
            <p style={{ fontSize: 14, color: T.textSub, lineHeight: 1.7, marginBottom: 24 }}>
              Peptide group buys — quality tested, discreetly shipped.
            </p>
            <button
              className="w-full flex items-center justify-center gap-2.5 rounded-xl font-bold text-sm"
              style={{ background: T.ctaBg, color: T.ctaText, height: 52, letterSpacing: "0.01em" }}
            >
              <Users style={{ width: 16, height: 16 }} /> Group Buy Login <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
            <button style={{ marginTop: 12, width: "100%", textAlign: "center", fontSize: 13, color: T.textMuted }}>
              Try a single vial instead →
            </button>
          </div>
        </div>

        {/* ── Divider between tiers ── */}
        <div className="h-px mb-6" style={{ background: T.border }} />

        {/* ── Tier 2 ── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>02</span>
            <div className="flex-1 h-px" style={{ background: T.border }} />
          </div>

          <button
            className="w-full flex items-center gap-4 py-4 text-left"
            style={{ borderBottom: `1px solid ${T.border}` }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: T.bg, border: `1px solid ${T.border}` }}
            >
              <Search style={{ color: T.textSub, width: 17, height: 17 }} />
            </div>
            <div className="flex-1">
              <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Manage your order</div>
              <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>Track, edit, pay, InPost QR</div>
            </div>
            <ArrowRight style={{ color: T.textMuted, width: 16, height: 16 }} />
          </button>
        </div>

        {/* ── Tier 3 ── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>03</span>
            <div className="flex-1 h-px" style={{ background: T.border }} />
          </div>

          {[
            { icon: TestTube, label: "Lab Reports", sub: "352+ Janoshik tests" },
            { icon: ShieldCheck, label: "Safety Calculator", sub: "Endotoxin & BAC" },
            { icon: FlaskConical, label: "The Lonely Vial", sub: "Single-vial shop" },
          ].map((t, i, arr) => (
            <button
              key={t.label}
              className="w-full flex items-center gap-4 py-3.5 text-left"
              style={{ borderBottom: i < arr.length - 1 ? `1px solid ${T.borderLight}` : "none" }}
            >
              <t.icon style={{ color: T.textMuted, width: 15, height: 15, flexShrink: 0 }} />
              <span className="flex-1" style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{t.label}</span>
              <span style={{ fontSize: 12, color: T.textMuted, marginRight: 8 }}>{t.sub}</span>
              <ArrowRight style={{ color: T.textMuted, width: 13, height: 13 }} />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
          <a href="#" className="flex items-center gap-1.5" style={{ color: T.linkColor, fontSize: 12 }}>
            <MessageCircle style={{ width: 12, height: 12 }} /><span className="font-semibold">@urbanblend789</span>
          </a>
          <span style={{ fontSize: 11, color: T.textMuted }}>USDT · Ethereum</span>
        </div>
      </main>

      <nav
        className="fixed bottom-0 left-1/2"
        style={{ transform: "translateX(-50%)", width: 390, background: T.surface, borderTop: `1px solid ${T.border}`, paddingBottom: 16 }}
      >
        <div className="flex justify-around pt-2">
          {[{ id: "home", icon: Home, label: "Home" }, { id: "protocols", icon: FileText, label: "Protocols" }, { id: "calc", icon: Calculator, label: "Calc" }, { id: "account", icon: User, label: "Account" }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex flex-col items-center gap-1 px-3 py-1">
              <t.icon style={{ width: 20, height: 20, color: activeTab === t.id ? T.text : T.textMuted }} />
              <span style={{ fontSize: 11, fontWeight: activeTab === t.id ? 800 : 500, color: activeTab === t.id ? T.text : T.textMuted }}>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
