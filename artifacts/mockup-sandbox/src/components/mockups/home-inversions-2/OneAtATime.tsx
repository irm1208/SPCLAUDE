import { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, MessageCircle, Users, ArrowRight, ChevronLeft, ChevronRight,
} from "lucide-react";

// INVERSION B: One thing at a time — full-screen immersive panels
//
// Inverts: multiple sections visible at once → one section fills the entire screen.
// Inverts: scroll to explore → tap left/right to step through sections.
// Inverts: muted gradient cards → the section colour is the entire screen.
// Inverts: dense → one headline, one sub, one button. Nothing else.
//
// What this reveals: the current design is a navigation menu;
// this is a guided experience. Different user assumption entirely.

const PANELS = [
  {
    id: "order",
    label: "NEW CUSTOMER",
    title: "Place an order",
    sub: "Peptide group buys — quality tested, discreetly shipped.",
    cta: "Group Buy Login",
    ctaIcon: Users,
    bg: "linear-gradient(160deg, #0A1628 0%, #1E3A5F 50%, #0F2040 100%)",
    accent: "#3B82F6",
    accentDim: "rgba(59,130,246,0.15)",
    accentBorder: "rgba(59,130,246,0.3)",
    icon: ShoppingBag,
    orb1: "rgba(59,130,246,0.12)",
    orb2: "rgba(59,130,246,0.06)",
  },
  {
    id: "vial",
    label: "SINGLE VIALS",
    title: "The Lonely Vial",
    sub: "Buy individual vials — no kits, no minimums. Pay with USDT.",
    cta: "Browse the Shop",
    ctaIcon: FlaskConical,
    bg: "linear-gradient(160deg, #0C0520 0%, #2A1060 50%, #1D0D45 100%)",
    accent: "#A78BFA",
    accentDim: "rgba(139,92,246,0.15)",
    accentBorder: "rgba(139,92,246,0.3)",
    icon: FlaskConical,
    orb1: "rgba(139,92,246,0.15)",
    orb2: "rgba(139,92,246,0.06)",
  },
  {
    id: "manage",
    label: "RETURNING",
    title: "Manage your order",
    sub: "Track, edit, pay, or upload your InPost QR code.",
    cta: "My Orders",
    ctaIcon: Search,
    bg: "linear-gradient(160deg, #0E0905 0%, #2D1A0A 50%, #1C1005 100%)",
    accent: "#FB923C",
    accentDim: "rgba(234,88,12,0.15)",
    accentBorder: "rgba(234,88,12,0.3)",
    icon: Search,
    orb1: "rgba(234,88,12,0.12)",
    orb2: "rgba(234,88,12,0.05)",
  },
  {
    id: "lab",
    label: "QUALITY ASSURANCE",
    title: "Lab Reports",
    sub: "Independent Janoshik CoA tests — 352+ reports from supplier Uther.",
    cta: "Browse Lab Results",
    ctaIcon: TestTube,
    bg: "linear-gradient(160deg, #020A18 0%, #0A1E3A 50%, #051528 100%)",
    accent: "#38BDF8",
    accentDim: "rgba(14,165,233,0.15)",
    accentBorder: "rgba(14,165,233,0.25)",
    icon: TestTube,
    orb1: "rgba(14,165,233,0.12)",
    orb2: "rgba(14,165,233,0.05)",
  },
  {
    id: "safety",
    label: "ENDOTOXIN & BAC",
    title: "Safety Calculator",
    sub: "Calculate endotoxin limits and BAC water safety for your reconstituted peptides.",
    cta: "Open Calculator",
    ctaIcon: ShieldCheck,
    bg: "linear-gradient(160deg, #020E08 0%, #0A2E1A 50%, #052010 100%)",
    accent: "#4ADE80",
    accentDim: "rgba(22,163,74,0.15)",
    accentBorder: "rgba(22,163,74,0.25)",
    icon: ShieldCheck,
    orb1: "rgba(22,163,74,0.12)",
    orb2: "rgba(22,163,74,0.05)",
  },
];

export function OneAtATime() {
  const [current, setCurrent] = useState(0);
  const [activeTab, setActiveTab] = useState("home");
  const [dir, setDir] = useState<"left" | "right">("right");

  const go = (next: number, direction: "left" | "right") => {
    setDir(direction);
    setCurrent(next);
  };

  const panel = PANELS[current];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#080D14", color: "#F1F5F9", fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}
    >
      {/* Minimal header — doesn't compete */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(255,255,255,0.05)", position: "relative", zIndex: 10 }}
      >
        <div style={{ fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.8)" }}>Salt & Peps</div>
        <button className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <User className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Full-screen immersive panel */}
      <div
        className="flex-1 flex flex-col justify-between relative overflow-hidden pb-24"
        style={{ background: panel.bg, transition: "background 0.4s ease" }}
      >
        {/* Decorative orbs */}
        <div className="absolute" style={{ width: 280, height: 280, borderRadius: "50%", background: panel.orb1, top: -80, right: -80, filter: "blur(60px)", pointerEvents: "none" }} />
        <div className="absolute" style={{ width: 200, height: 200, borderRadius: "50%", background: panel.orb2, bottom: 60, left: -60, filter: "blur(40px)", pointerEvents: "none" }} />

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-7 py-8">
          {/* Label */}
          <div className="flex items-center gap-2 mb-6">
            <panel.icon style={{ color: panel.accent, width: 16, height: 16 }} />
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: panel.accent, textTransform: "uppercase" }}>
              {panel.label}
            </span>
          </div>

          {/* Big editorial headline */}
          <h1 style={{ fontSize: 38, fontWeight: 900, color: "#F8FAFC", lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 18 }}>
            {panel.title}
          </h1>

          {/* Single sentence sub */}
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, maxWidth: 280, marginBottom: 40 }}>
            {panel.sub}
          </p>

          {/* Single CTA */}
          <button
            className="flex items-center justify-center gap-2.5 rounded-2xl font-bold text-white self-start px-8"
            style={{ background: panel.accent, height: 54, fontSize: 15, boxShadow: `0 8px 32px ${panel.accentDim}` }}
          >
            <panel.ctaIcon style={{ width: 18, height: 18 }} />
            {panel.cta}
            <ArrowRight style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Step controls */}
        <div className="relative z-10 px-7 pb-5">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5 justify-center mb-5">
            {PANELS.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i, i > current ? "right" : "left")}
                style={{
                  width: i === current ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === current ? panel.accent : "rgba(255,255,255,0.2)",
                  transition: "all 0.25s",
                }}
              />
            ))}
          </div>

          {/* Prev / Next */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => go(Math.max(0, current - 1), "left")}
              disabled={current === 0}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 font-semibold text-sm"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: current === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.6)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              {current + 1} / {PANELS.length}
            </span>

            <button
              onClick={() => go(Math.min(PANELS.length - 1, current + 1), "right")}
              disabled={current === PANELS.length - 1}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 font-semibold text-sm"
              style={{
                background: current === PANELS.length - 1 ? "transparent" : panel.accentDim,
                color: current === PANELS.length - 1 ? "rgba(255,255,255,0.15)" : panel.accent,
                border: `1px solid ${current === PANELS.length - 1 ? "rgba(255,255,255,0.08)" : panel.accentBorder}`,
              }}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <nav
        className="fixed bottom-0 left-1/2"
        style={{ transform: "translateX(-50%)", width: 390, background: "rgba(8,13,20,0.95)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingBottom: 16, backdropFilter: "blur(8px)" }}
      >
        <div className="flex justify-around pt-2">
          {[{ id: "home", icon: Home, label: "Home" }, { id: "protocols", icon: FileText, label: "Protocols" }, { id: "calc", icon: Calculator, label: "Calc" }, { id: "account", icon: User, label: "Account" }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex flex-col items-center gap-1 px-3 py-1">
              <t.icon className="w-5 h-5" style={{ color: activeTab === t.id ? "#3B82F6" : "rgba(255,255,255,0.3)" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: activeTab === t.id ? "#3B82F6" : "rgba(255,255,255,0.3)" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
