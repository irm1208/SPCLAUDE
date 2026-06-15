import { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, MessageCircle, ArrowRight, Clock, Users,
} from "lucide-react";

// VIBE: Clinical / Pharmaceutical
//
// Emotional register: cold authority, institutional trust, precision instruments.
// Palette: deep charcoal + pure cool steel + single ice-blue accent. Zero warmth.
// Typography: tight tracking, uppercase labels, thin dividers — like a medical UI.
// Feel: you trust it because it looks like it was audited.

const T = {
  bg: "#0A0E12",
  panel: "#101419",
  panelHover: "#141820",
  border: "rgba(148,163,184,0.1)",
  borderStrong: "rgba(148,163,184,0.18)",
  text: "#E2E8F0",
  textSub: "#64748B",
  textMuted: "#334155",
  accent: "#38BDF8",       // ice blue — single accent colour
  accentDim: "rgba(56,189,248,0.12)",
  accentBorder: "rgba(56,189,248,0.25)",
};

export function VibeClinical() {
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
        letterSpacing: "-0.01em",
      }}
    >
      {/* Status strip — clinical header band */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: T.panel, borderBottom: `1px solid ${T.borderStrong}` }}
      >
        <div className="flex items-center gap-2" style={{ fontSize: 11, color: T.textSub, letterSpacing: "0.05em" }}>
          <Clock style={{ width: 11, height: 11, color: T.accent }} />
          <span style={{ textTransform: "uppercase" }}>
            CLOSES <strong style={{ color: T.text, fontWeight: 700 }}>28 OCT 2026</strong>
          </span>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1 rounded"
          style={{ background: T.accentDim, color: T.accent, border: `1px solid ${T.accentBorder}`, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
        >
          <User style={{ width: 10, height: 10 }} /> Login
        </button>
      </div>

      <main className="flex-1 flex flex-col px-4 pb-24">

        {/* ── Tier 1 ── */}
        <div className="mt-5 mb-4">
          {/* Tier label — thin ruled, clinical */}
          <div className="flex items-center gap-3 mb-3">
            <span
              className="flex items-center justify-center w-5 h-5 rounded text-xs font-black"
              style={{ background: T.accent, color: "#000", fontFamily: "monospace" }}
            >1</span>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: T.accent, textTransform: "uppercase" }}>
              Primary action
            </span>
            <div className="flex-1 h-px" style={{ background: T.accentBorder }} />
          </div>

          <div
            className="rounded-xl p-5 relative overflow-hidden"
            style={{ background: T.panel, border: `1px solid ${T.accentBorder}` }}
          >
            {/* Subtle scan-line texture */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(56,189,248,0.02) 3px, rgba(56,189,248,0.02) 4px)",
              }}
            />
            <div className="relative z-10">
              <div
                className="inline-flex items-center gap-1.5 mb-3 px-2 py-0.5 rounded"
                style={{ background: T.accentDim, border: `1px solid ${T.accentBorder}`, fontSize: 10, color: T.accent, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}
              >
                <ShoppingBag style={{ width: 10, height: 10 }} /> New customer
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: "#F8FAFC", marginBottom: 6, letterSpacing: "-0.03em" }}>
                Place an order
              </h1>
              <p style={{ fontSize: 13, color: T.textSub, lineHeight: 1.6, marginBottom: 20 }}>
                Peptide group buys — quality tested, discreetly shipped.
              </p>
              <button
                className="w-full flex items-center justify-center gap-2 rounded-lg font-bold text-black text-sm"
                style={{ background: T.accent, height: 48, letterSpacing: "0.02em" }}
              >
                <Users style={{ width: 16, height: 16 }} /> Group Buy Login <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
              <button style={{ marginTop: 10, width: "100%", textAlign: "center", fontSize: 12, color: T.textMuted, letterSpacing: "0.02em" }}>
                Try a single vial instead →
              </button>
            </div>
          </div>
        </div>

        {/* ── Tier 2 ── */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-3">
            <span
              className="flex items-center justify-center w-5 h-5 rounded text-xs font-black"
              style={{ background: "rgba(148,163,184,0.12)", color: T.textSub, border: `1px solid ${T.border}`, fontFamily: "monospace" }}
            >2</span>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: T.textSub, textTransform: "uppercase" }}>
              Returning customer
            </span>
            <div className="flex-1 h-px" style={{ background: T.border }} />
          </div>

          <button
            className="w-full flex items-center gap-4 px-4 rounded-xl text-left"
            style={{ background: T.panel, border: `1px solid ${T.border}`, height: 60 }}
          >
            <div
              className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(148,163,184,0.06)", border: `1px solid ${T.border}` }}
            >
              <Search style={{ color: T.textSub, width: 16, height: 16 }} />
            </div>
            <div className="flex-1">
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Manage your order</div>
              <div style={{ fontSize: 11, color: T.textSub, letterSpacing: "0.01em" }}>Track · Edit · Pay · InPost QR</div>
            </div>
            <ArrowRight style={{ color: T.textMuted, width: 14, height: 14 }} />
          </button>
        </div>

        {/* ── Tier 3 ── */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span
              className="flex items-center justify-center w-5 h-5 rounded text-xs font-black"
              style={{ background: "rgba(148,163,184,0.06)", color: T.textMuted, border: `1px solid rgba(148,163,184,0.08)`, fontFamily: "monospace" }}
            >3</span>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: T.textMuted, textTransform: "uppercase" }}>
              Resources
            </span>
            <div className="flex-1 h-px" style={{ background: "rgba(148,163,184,0.06)" }} />
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
            {[
              { icon: TestTube, color: "#38BDF8", label: "Lab Reports", sub: "352+ Janoshik tests" },
              { icon: ShieldCheck, color: "#34D399", label: "Safety Calculator", sub: "Endotoxin & BAC" },
              { icon: FlaskConical, color: "#A78BFA", label: "The Lonely Vial", sub: "Single-vial shop" },
            ].map((t, i, arr) => (
              <button
                key={t.label}
                className="w-full flex items-center gap-3 px-4 text-left"
                style={{
                  background: T.panel,
                  borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none",
                  height: 48,
                }}
              >
                <t.icon style={{ color: t.color, width: 14, height: 14, flexShrink: 0, opacity: 0.7 }} />
                <span className="flex-1" style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{t.label}</span>
                <span style={{ fontSize: 11, color: T.textMuted, marginRight: 8, fontFamily: "monospace" }}>{t.sub}</span>
                <ArrowRight style={{ color: T.textMuted, width: 12, height: 12, opacity: 0.5 }} />
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-5 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
          <a href="#" className="flex items-center gap-1.5" style={{ color: "#2AABEE", fontSize: 11, letterSpacing: "0.02em" }}>
            <MessageCircle style={{ width: 11, height: 11 }} /><span>@urbanblend789</span>
          </a>
          <span style={{ fontSize: 10, color: T.textMuted, letterSpacing: "0.04em", textTransform: "uppercase" }}>USDT · ETH</span>
        </div>
      </main>

      <nav
        className="fixed bottom-0 left-1/2"
        style={{ transform: "translateX(-50%)", width: 390, background: T.panel, borderTop: `1px solid ${T.borderStrong}`, paddingBottom: 16 }}
      >
        <div className="flex justify-around pt-2">
          {[{ id: "home", icon: Home, label: "Home" }, { id: "protocols", icon: FileText, label: "Protocols" }, { id: "calc", icon: Calculator, label: "Calc" }, { id: "account", icon: User, label: "Account" }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex flex-col items-center gap-1 px-3 py-1">
              <t.icon style={{ width: 18, height: 18, color: activeTab === t.id ? T.accent : T.textMuted }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: activeTab === t.id ? T.accent : T.textMuted, letterSpacing: "0.05em", textTransform: "uppercase" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
