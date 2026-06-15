import { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, MessageCircle, ArrowRight, Clock, Users,
} from "lucide-react";

// VIBE: Warm Brotherhood
//
// Emotional register: trusted community, underground-market warmth, earned familiarity.
// Palette: espresso/tobacco dark + deep amber + terracotta. Everything glows, nothing is cold.
// Typography: slightly heavier weight, warm labels — informal but not messy.
// Feel: a Discord that's been running for 3 years and has its own culture.

const T = {
  bg: "#110B06",
  panel: "#1C1208",
  panelWarm: "#231609",
  border: "rgba(251,191,36,0.1)",
  borderWarm: "rgba(251,191,36,0.2)",
  text: "#FEF3C7",
  textSub: "#92400E",
  textMuted: "#451A03",
  amber: "#F59E0B",
  amberDim: "rgba(245,158,11,0.12)",
  amberBorder: "rgba(245,158,11,0.25)",
  terracotta: "#E07B54",
  terracottaDim: "rgba(224,123,84,0.12)",
  terracottaBorder: "rgba(224,123,84,0.25)",
};

export function VibeWarmBrotherhood() {
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
      {/* Status strip — warm, understated */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: T.panel, borderBottom: `1px solid ${T.border}` }}
      >
        <div className="flex items-center gap-2" style={{ fontSize: 12, color: "#92400E" }}>
          <Clock style={{ width: 12, height: 12, color: T.amber }} />
          <span>Closes <strong style={{ color: "#FDE68A" }}>28 Oct 2026</strong></span>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          style={{ background: T.amberDim, color: T.amber, border: `1px solid ${T.amberBorder}`, fontSize: 12, fontWeight: 700 }}
        >
          <User style={{ width: 12, height: 12 }} /> Login
        </button>
      </div>

      <main className="flex-1 flex flex-col px-4 pb-24">

        {/* ── Tier 1 ── */}
        <div className="mt-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black"
              style={{ background: T.amber, color: "#1C1208" }}
            >1</span>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: T.amber, textTransform: "uppercase" }}>
              Place an order
            </span>
          </div>

          <div
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: "linear-gradient(150deg, #2D1A06 0%, #1C1208 100%)", border: `1px solid ${T.amberBorder}` }}
          >
            {/* Warm radial glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 70% 0%, rgba(245,158,11,0.12) 0%, transparent 65%)" }}
            />
            <div className="relative z-10">
              <div
                className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full"
                style={{ background: T.amberDim, border: `1px solid ${T.amberBorder}`, fontSize: 11, color: "#FDE68A", fontWeight: 700 }}
              >
                <ShoppingBag style={{ width: 11, height: 11 }} /> New member
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 900, color: "#FFFBEB", marginBottom: 8, letterSpacing: "-0.02em" }}>
                Place an order
              </h1>
              <p style={{ fontSize: 13, color: "#92400E", lineHeight: 1.65, marginBottom: 20 }}>
                Peptide group buys — quality tested, discreetly shipped.
              </p>
              <button
                className="w-full flex items-center justify-center gap-2 rounded-xl font-bold text-sm"
                style={{ background: "linear-gradient(135deg, #D97706, #B45309)", color: "#FFFBEB", height: 52 }}
              >
                <Users style={{ width: 17, height: 17 }} /> Group Buy Login <ArrowRight style={{ width: 17, height: 17 }} />
              </button>
              <button style={{ marginTop: 12, width: "100%", textAlign: "center", fontSize: 12, color: "#92400E" }}>
                Try a single vial instead →
              </button>
            </div>
          </div>
        </div>

        {/* ── Tier 2 ── */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black"
              style={{ background: T.terracottaDim, color: T.terracotta, border: `1px solid ${T.terracottaBorder}` }}
            >2</span>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: T.terracotta, textTransform: "uppercase" }}>
              Back again?
            </span>
          </div>

          <button
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left"
            style={{ background: T.terracottaDim, border: `1px solid ${T.terracottaBorder}` }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(224,123,84,0.15)", border: `1px solid ${T.terracottaBorder}` }}
            >
              <Search style={{ color: T.terracotta, width: 18, height: 18 }} />
            </div>
            <div className="flex-1">
              <div style={{ fontSize: 14, fontWeight: 800, color: "#FEF3C7" }}>Manage your order</div>
              <div style={{ fontSize: 12, color: "#92400E", marginTop: 2 }}>Track, edit, pay, InPost QR</div>
            </div>
            <ArrowRight style={{ color: T.terracotta, width: 16, height: 16 }} />
          </button>
        </div>

        {/* ── Tier 3 ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black"
              style={{ background: "rgba(255,255,255,0.04)", color: "#451A03", border: "1px solid rgba(255,255,255,0.06)" }}
            >3</span>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#451A03", textTransform: "uppercase" }}>
              More tools
            </span>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
            {[
              { icon: TestTube, color: "#FCD34D", label: "Lab Reports", sub: "352+ Janoshik tests" },
              { icon: ShieldCheck, color: "#6EE7B7", label: "Safety Calculator", sub: "Endotoxin & BAC" },
              { icon: FlaskConical, color: "#C4B5FD", label: "The Lonely Vial", sub: "Single-vial shop" },
            ].map((t, i, arr) => (
              <button
                key={t.label}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                style={{
                  background: T.panel,
                  borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none",
                }}
              >
                <t.icon style={{ color: t.color, width: 15, height: 15, flexShrink: 0, opacity: 0.8 }} />
                <span className="flex-1" style={{ fontSize: 13, fontWeight: 700, color: "#FEF3C7" }}>{t.label}</span>
                <span style={{ fontSize: 11, color: "#451A03", marginRight: 8 }}>{t.sub}</span>
                <ArrowRight style={{ color: "#451A03", width: 13, height: 13 }} />
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-5 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
          <a href="#" className="flex items-center gap-1.5" style={{ color: "#2AABEE", fontSize: 12 }}>
            <MessageCircle style={{ width: 12, height: 12 }} /><span className="font-semibold">@urbanblend789</span>
          </a>
          <span style={{ fontSize: 11, color: "#451A03" }}>USDT · Ethereum</span>
        </div>
      </main>

      <nav
        className="fixed bottom-0 left-1/2"
        style={{ transform: "translateX(-50%)", width: 390, background: T.panel, borderTop: `1px solid ${T.border}`, paddingBottom: 16 }}
      >
        <div className="flex justify-around pt-2">
          {[{ id: "home", icon: Home, label: "Home" }, { id: "protocols", icon: FileText, label: "Protocols" }, { id: "calc", icon: Calculator, label: "Calc" }, { id: "account", icon: User, label: "Account" }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex flex-col items-center gap-1 px-3 py-1">
              <t.icon style={{ width: 20, height: 20, color: activeTab === t.id ? T.amber : "#451A03" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: activeTab === t.id ? T.amber : "#451A03" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
