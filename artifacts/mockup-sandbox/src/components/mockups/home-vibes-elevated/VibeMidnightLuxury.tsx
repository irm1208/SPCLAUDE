import { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, MessageCircle, ArrowRight,
  Clock, Users,
} from "lucide-react";

// VIBE: Midnight Luxury
//
// Emotional register: premium, quiet confidence, high-end commerce.
// True black — no blue tint. Zero decoration except intentional gold.
// Typography does the work: large, confident, generous negative space.
// CTAs are white-on-dark for the primary actions; text-only for secondary.
// Gold is reserved solely for the draft notice — the only warm signal.

const C = {
  bg: "#09090B",
  surface: "#111113",
  border: "rgba(255,255,255,0.07)",
  text: "#FAFAFA",
  sub: "rgba(250,250,250,0.5)",
  muted: "rgba(250,250,250,0.25)",
  gold: "#C9A84C",
};

const LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
};

export function VibeMidnightLuxury() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: C.bg, color: C.text, fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}
    >
      {/* Header — restrained, elegant */}
      <header className="flex items-center justify-between px-5 py-3" style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, whiteSpace: "nowrap", letterSpacing: "0.04em" }}>Salt & Peps</div>
        <button
          className="flex items-center gap-1.5 px-4 rounded-full font-semibold flex-shrink-0"
          style={{ background: "transparent", color: C.sub, border: `1px solid ${C.border}`, height: 32, fontSize: 12 }}
        >
          <User className="w-3 h-3" /> Login
        </button>
      </header>

      {/* Countdown — just a whisper */}
      <div className="flex items-center justify-between px-5 py-2" style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" style={{ color: C.muted }} />
          <div>
            <div style={{ ...LABEL, color: C.muted }}>Group buy closes</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>28 Oct 2026</div>
          </div>
        </div>
        <div className="text-right">
          <div style={{ ...LABEL, color: C.muted }}>Remaining</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>7 months</div>
        </div>
      </div>

      <main className="flex-1 flex flex-col px-4 pb-24 mt-4">

        {/* Primary pair — large confident type, white CTAs */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            {
              accent: "rgba(255,255,255,0.9)",
              label: "New Customer", LabelIcon: ShoppingBag,
              title: "Place an\norder",
              sub: "128+ peptide products",
              ctaLabel: "Group Buy Login", CtaIcon: Users,
              cardBg: "#111318",
              border: "rgba(255,255,255,0.09)",
              ctaBg: "rgba(255,255,255,0.95)",
              ctaColor: "#09090B",
            },
            {
              accent: "rgba(255,255,255,0.9)",
              label: "Single Vials", LabelIcon: FlaskConical,
              title: "The Lonely\nVial",
              sub: "No kits, no minimums",
              ctaLabel: "Browse Shop", CtaIcon: FlaskConical,
              cardBg: "#111118",
              border: "rgba(255,255,255,0.09)",
              ctaBg: "rgba(255,255,255,0.95)",
              ctaColor: "#09090B",
            },
          ].map(card => (
            <button
              key={card.title}
              className="flex flex-col rounded-3xl p-4 text-left"
              style={{ background: card.cardBg, border: `1px solid ${card.border}`, minHeight: 172 }}
            >
              <div className="w-7 h-7 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                <card.LabelIcon style={{ color: "rgba(255,255,255,0.6)", width: 13, height: 13 }} />
              </div>
              <div style={{ ...LABEL, color: C.muted, marginBottom: 6 }}>{card.label}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.text, lineHeight: 1.15, marginBottom: 6, whiteSpace: "pre-line" }}>{card.title}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5, marginBottom: 16 }}>{card.sub}</div>
              <div
                className="w-full flex items-center justify-center gap-1.5 rounded-2xl font-bold mt-auto"
                style={{ background: card.ctaBg, color: card.ctaColor, height: 40, fontSize: 12 }}
              >
                <card.CtaIcon className="w-3.5 h-3.5" /> {card.ctaLabel}
              </div>
            </button>
          ))}
        </div>

        {/* Manage — compact, typographic, no colour */}
        <button
          className="w-full flex items-center gap-3 px-4 rounded-2xl mb-4 text-left"
          style={{ background: C.surface, border: `1px solid ${C.border}`, height: 54 }}
        >
          <Search style={{ color: C.muted, width: 14, height: 14, flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <div style={{ ...LABEL, color: C.muted, marginBottom: 1 }}>Returning</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Manage your order</div>
          </div>
          <div className="flex items-center gap-1" style={{ color: C.muted, fontSize: 12 }}>
            My Orders <ArrowRight style={{ width: 12, height: 12 }} />
          </div>
        </button>

        {/* Draft — only gold element on the page */}
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-4" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: C.gold }} />
          <span style={{ flex: 1, textAlign: "left", fontSize: 13, color: C.sub, fontWeight: 400 }}>Draft waiting · 1 item</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.gold }}>Resume →</span>
        </button>

        {/* Lab Reports — typographic, no fill CTA */}
        <div className="w-full rounded-2xl p-5 mb-3 text-left" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <TestTube className="w-3 h-3" style={{ color: C.muted }} />
            <span style={{ ...LABEL, color: C.muted }}>Quality Assurance</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4, letterSpacing: "-0.01em" }}>Lab Reports</div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 1.6 }}>352+ independent Janoshik CoA tests from supplier Uther</div>
          <button className="flex items-center gap-1.5" style={{ color: C.sub, fontSize: 12, fontWeight: 600 }}>
            Browse Lab Results <ArrowRight style={{ width: 12, height: 12 }} />
          </button>
        </div>

        {/* Safety Calculator — same treatment */}
        <div className="w-full rounded-2xl p-5 mb-3 text-left" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-3 h-3" style={{ color: C.muted }} />
            <span style={{ ...LABEL, color: C.muted }}>Endotoxin & BAC Safety</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4, letterSpacing: "-0.01em" }}>Safety Calculator</div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 14, lineHeight: 1.6 }}>Endotoxin limits and BAC water safety for reconstituted peptides</div>
          <button className="flex items-center gap-1.5" style={{ color: C.sub, fontSize: 12, fontWeight: 600 }}>
            Open Calculator <ArrowRight style={{ width: 12, height: 12 }} />
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
          <a href="#" className="flex items-center gap-1.5" style={{ color: C.muted, fontSize: 12 }}>
            <MessageCircle className="w-3 h-3" /><span>@urbanblend789</span>
          </a>
          <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.06em", fontWeight: 500 }}>USDT · ETH</span>
        </div>
      </main>

      {/* Nav — quiet, monochrome */}
      <nav className="fixed bottom-0 left-1/2" style={{ transform: "translateX(-50%)", width: 390, background: C.bg, borderTop: `1px solid ${C.border}`, paddingBottom: 14 }}>
        <div className="flex justify-around pt-2">
          {[{ id: "home", icon: Home, label: "Home" }, { id: "protocols", icon: FileText, label: "Protocols" }, { id: "calc", icon: Calculator, label: "Calc" }, { id: "account", icon: User, label: "Account" }].map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl"
                style={{ minWidth: 60 }}>
                <t.icon className="w-5 h-5" style={{ color: active ? C.text : C.muted }} />
                <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? C.sub : C.muted }}>{t.label}</span>
                {active && <div style={{ width: 16, height: 1, background: "rgba(255,255,255,0.5)", marginTop: 2, borderRadius: 1 }} />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
