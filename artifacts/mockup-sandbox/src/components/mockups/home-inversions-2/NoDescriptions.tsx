import { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, MessageCircle, Users, Clock,
} from "lucide-react";

// INVERSION A: No descriptions — icon grid, action names only
//
// Inverts: padded cards with label + title + description + CTA →
//          bare tappable tiles, icon + single action word, nothing else.
//
// Inverts: sequential scroll → everything above the fold at once.
// Inverts: text-heavy explanation → assumes you already know what each thing is.
//
// What this reveals: how much of the current design is navigation vs explanation.
// If you remove the explanation, do users know where to go?

const TILES = [
  {
    id: "order",
    icon: Users,
    label: "Group Buy",
    color: "#3B82F6",
    bg: "linear-gradient(145deg, #0F172A, #1E3A5F)",
    border: "rgba(59,130,246,0.3)",
    glow: "rgba(59,130,246,0.15)",
  },
  {
    id: "vial",
    icon: FlaskConical,
    label: "Lonely Vial",
    color: "#A78BFA",
    bg: "linear-gradient(145deg, #120A2E, #2A1060)",
    border: "rgba(139,92,246,0.3)",
    glow: "rgba(139,92,246,0.15)",
  },
  {
    id: "manage",
    icon: Search,
    label: "My Orders",
    color: "#FB923C",
    bg: "linear-gradient(145deg, #1A1208, #2D1A0A)",
    border: "rgba(234,88,12,0.3)",
    glow: "rgba(234,88,12,0.15)",
  },
  {
    id: "lab",
    icon: TestTube,
    label: "Lab Reports",
    color: "#38BDF8",
    bg: "linear-gradient(145deg, #051020, #0A1E3A)",
    border: "rgba(14,165,233,0.25)",
    glow: "rgba(14,165,233,0.12)",
  },
  {
    id: "safety",
    icon: ShieldCheck,
    label: "Safety Calc",
    color: "#4ADE80",
    bg: "linear-gradient(145deg, #051A0F, #0A2E1A)",
    border: "rgba(22,163,74,0.25)",
    glow: "rgba(22,163,74,0.12)",
  },
  {
    id: "account",
    icon: User,
    label: "Account",
    color: "#94A3B8",
    bg: "linear-gradient(145deg, #0D1117, #141C24)",
    border: "rgba(148,163,184,0.15)",
    glow: "rgba(148,163,184,0.06)",
  },
];

export function NoDescriptions() {
  const [activeTab, setActiveTab] = useState("home");
  const [pressed, setPressed] = useState<string | null>(null);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#080D14", color: "#F1F5F9", fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}
    >
      {/* Header — minimal */}
      <div className="flex items-center justify-between px-5 py-3" style={{ background: "#0D1117", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#F8FAFC" }}>Salt & Peps</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "#3B82F6" }}>
            <Clock className="w-3 h-3" />
            <span style={{ color: "rgba(255,255,255,0.4)" }}>28 Oct 2026</span>
          </div>
          <button className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(59,130,246,0.15)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.2)" }}>
            Login
          </button>
        </div>
      </div>

      <main className="flex-1 px-4 py-5 pb-24">
        {/* 2-col grid of bare tiles — no descriptions */}
        <div className="grid grid-cols-2 gap-3">
          {TILES.map(t => (
            <button
              key={t.id}
              className="flex flex-col items-center justify-center rounded-3xl relative overflow-hidden"
              style={{
                background: t.bg,
                border: `1px solid ${t.border}`,
                height: 120,
                boxShadow: `0 0 20px ${t.glow}`,
                transform: pressed === t.id ? "scale(0.96)" : "scale(1)",
                transition: "transform 0.12s",
              }}
              onPointerDown={() => setPressed(t.id)}
              onPointerUp={() => setPressed(null)}
              onPointerLeave={() => setPressed(null)}
            >
              <t.icon style={{ color: t.color, width: 28, height: 28, marginBottom: 10 }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: "#F8FAFC" }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Draft pill — the only "explanation" allowed */}
        <div className="flex items-center justify-between mt-4 px-4 py-3 rounded-2xl" style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)" }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: "#FBBF24" }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>Draft · 1 item</span>
          </div>
          <button style={{ fontSize: 13, fontWeight: 700, color: "#FBBF24" }}>Resume →</button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <a href="#" className="flex items-center gap-1.5 text-xs" style={{ color: "#2AABEE" }}>
            <MessageCircle className="w-3 h-3" /> @urbanblend789
          </a>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>USDT · Ethereum</span>
        </div>
      </main>

      <nav
        className="fixed bottom-0 left-1/2"
        style={{ transform: "translateX(-50%)", width: 390, background: "#0D1117", borderTop: "1px solid rgba(255,255,255,0.06)", paddingBottom: 16 }}
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
