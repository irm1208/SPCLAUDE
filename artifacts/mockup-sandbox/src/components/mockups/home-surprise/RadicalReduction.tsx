import { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, MessageCircle, ArrowRight,
  Clock, Users,
} from "lucide-react";

// SURPRISE AXIS: Cards are not the organizing system.
//
// TYPOGRAPHIC LIST — hierarchy through type scale, not chrome.
//
// No card backgrounds. No borders around sections. No gradient fills.
// The two primary actions get 26px bold titles. Manage gets 16px.
// Lab/Safety get 13px. The eye reads size as importance — no visual noise needed.
// A thin colored left-border line replaces card background for each section.
// The page looks more like a well-designed README than an app.
//
// What this challenges: the assumption that sections need chrome to feel distinct.

const C = {
  bg: "#0B0F17",
  border: "rgba(255,255,255,0.07)",
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

export function RadicalReduction() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: C.bg, color: C.text, fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, whiteSpace: "nowrap" }}>Salt & Peps</div>
        <button className="flex items-center gap-1.5 px-3 rounded-xl font-bold flex-shrink-0"
          style={{ background: "rgba(59,130,246,0.15)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.22)", height: 34, fontSize: 13 }}>
          <User className="w-3.5 h-3.5" /> Login
        </button>
      </header>

      {/* Countdown — still a strip but very quiet */}
      <div className="flex items-center justify-between px-5 py-2" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" style={{ color: C.muted }} />
          <div>
            <div style={{ ...LABEL, color: C.muted }}>Group buy closes</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.sub }}>28 Oct 2026</div>
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#60A5FA" }}>7 months left</div>
      </div>

      <main className="flex-1 flex flex-col pb-24 mt-5">

        {/* Primary pair — massive type, full-width stacked, no card */}
        {[
          {
            accent: "#3B82F6",
            accentDim: "rgba(59,130,246,0.12)",
            label: "New customer",
            LabelIcon: ShoppingBag,
            title: "Place an order",
            sub: "Browse 128+ peptide products and checkout via group buy",
            ctaLabel: "Group Buy Login",
            CtaIcon: Users,
            ctaBg: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
          },
          {
            accent: "#8B5CF6",
            accentDim: "rgba(139,92,246,0.12)",
            label: "Single Vials",
            LabelIcon: FlaskConical,
            title: "The Lonely Vial",
            sub: "No kits, no minimums — buy exactly one vial",
            ctaLabel: "Browse the Shop",
            CtaIcon: FlaskConical,
            ctaBg: "linear-gradient(135deg, #7C3AED, #5B21B6)",
          },
        ].map(item => (
          <button
            key={item.title}
            className="w-full text-left"
            style={{ paddingLeft: 20, paddingRight: 20, paddingTop: 20, paddingBottom: 20, borderLeft: `3px solid ${item.accent}`, marginLeft: 0, marginBottom: 2 }}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <item.LabelIcon style={{ color: item.accent, width: 12, height: 12 }} />
              <span style={{ ...LABEL, color: item.accent }}>{item.label}</span>
            </div>
            {/* LARGE TYPE — the hierarchy signal */}
            <div style={{ fontSize: 28, fontWeight: 900, color: C.text, lineHeight: 1.1, marginBottom: 8, letterSpacing: "-0.02em" }}>{item.title}</div>
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginBottom: 18 }}>{item.sub}</div>
            <div className="flex items-center justify-center gap-2 rounded-2xl font-bold text-white"
              style={{ background: item.ctaBg, height: 48, fontSize: 14 }}>
              <item.CtaIcon className="w-4 h-4" /> {item.ctaLabel}
            </div>
          </button>
        ))}

        {/* Divider */}
        <div style={{ height: 1, background: C.border, marginTop: 6, marginBottom: 6 }} />

        {/* Manage — medium type, compact */}
        <button className="w-full flex items-center gap-4 px-5 py-4 text-left"
          style={{ borderLeft: "2px solid rgba(251,146,60,0.5)", marginLeft: 0 }}>
          <div>
            <div style={{ ...LABEL, color: "rgba(251,146,60,0.7)", marginBottom: 2 }}>Returning</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Manage your order</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>Track, pay, upload InPost QR</div>
          </div>
          <div className="ml-auto flex items-center gap-1 flex-shrink-0" style={{ color: "#FB923C", fontSize: 13, fontWeight: 700 }}>
            My Orders <ArrowRight style={{ width: 14, height: 14 }} />
          </div>
        </button>

        {/* Draft — inline notice */}
        <div className="flex items-center gap-3 px-5 py-2.5 mx-0" style={{ background: "rgba(251,191,36,0.06)", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#FBBF24" }} />
          <span style={{ flex: 1, fontSize: 12, color: C.sub }}>Draft waiting · 1 item</span>
          <button style={{ fontSize: 12, fontWeight: 700, color: "#FBBF24" }}>Resume →</button>
        </div>

        {/* Secondary list — small type, icon rows */}
        <div className="px-5 mt-4">
          <div style={{ ...LABEL, color: C.muted, marginBottom: 12 }}>Resources</div>
          {[
            { accent: "#38BDF8", Icon: TestTube, title: "Lab Reports", sub: "352+ Janoshik CoA tests", label: "Browse" },
            { accent: "#4ADE80", Icon: ShieldCheck, title: "Safety Calculator", sub: "Endotoxin & BAC limits", label: "Open" },
          ].map(item => (
            <button key={item.title} className="w-full flex items-center gap-3 py-3.5 text-left" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `rgba(${item.accent === "#38BDF8" ? "56,189,248" : "74,222,128"},0.1)` }}>
                <item.Icon style={{ color: item.accent, width: 14, height: 14 }} />
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.title}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{item.sub}</div>
              </div>
              <div style={{ fontSize: 12, color: item.accent, fontWeight: 600, flexShrink: 0 }}>{item.label} →</div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 mt-5 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
          <a href="#" className="flex items-center gap-1.5" style={{ color: "#2AABEE", fontSize: 12 }}>
            <MessageCircle className="w-3 h-3" /><span className="font-semibold">@urbanblend789</span>
          </a>
          <span style={{ fontSize: 11, color: C.muted }}>USDT · ETH</span>
        </div>
      </main>

      {/* Nav */}
      <nav className="fixed bottom-0 left-1/2" style={{ transform: "translateX(-50%)", width: 390, background: C.bg, borderTop: `1px solid ${C.border}`, paddingBottom: 14 }}>
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
