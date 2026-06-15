import { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, MessageCircle, ArrowRight, Clock,
} from "lucide-react";

// INVERSION 1: Warm market stall
// Inverts: dark → cream/warm light; isolated serial cards → dense all-at-once grid;
// clinical labels → human conversational copy; scroll-to-discover → everything scannable.

export function WarmMarket() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#FAF7F2", color: "#1C1917", fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}
    >
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #E7E3DC" }}>
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <div className="text-base font-black" style={{ color: "#1C1917" }}>Salt & Peps</div>
            <div className="text-xs" style={{ color: "#A8A29E" }}>Peps Anonymous</div>
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: "#F5F0E8", color: "#44403C", border: "1px solid #E7E3DC" }}
          >
            <User className="w-3 h-3" /> Login
          </button>
        </div>
        {/* Warm countdown strip */}
        <div className="flex items-center justify-between px-5 py-2" style={{ background: "#FEF3C7", borderTop: "1px solid #FDE68A" }}>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" style={{ color: "#D97706" }} />
            <span className="text-xs font-semibold" style={{ color: "#92400E" }}>Group buy open</span>
          </div>
          <span className="text-xs font-bold" style={{ color: "#92400E" }}>Closes 28 Oct 2026 · 7 months left</span>
        </div>
      </header>

      <main className="flex-1 px-4 pt-5 pb-24">
        {/* Hero — brief, human */}
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-black mb-1" style={{ color: "#1C1917" }}>Quality peptides,<br />bought together.</h1>
          <p className="text-sm" style={{ color: "#78716C" }}>Janoshik-tested. Discreetly shipped. USDT accepted.</p>
        </div>

        {/* Primary actions — 2 equal cards side by side */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            className="rounded-2xl p-4 flex flex-col gap-2 text-left"
            style={{ background: "#1D4ED8", color: "#fff" }}
          >
            <ShoppingBag className="w-5 h-5 opacity-80" />
            <div>
              <div className="text-sm font-black leading-tight">Join the buy</div>
              <div className="text-xs opacity-70 mt-0.5">Browse & order</div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold opacity-90 mt-auto">
              Group Buy Login <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          <button
            className="rounded-2xl p-4 flex flex-col gap-2 text-left"
            style={{ background: "#fff", border: "1px solid #E7E3DC" }}
          >
            <Search className="w-5 h-5" style={{ color: "#EA580C" }} />
            <div>
              <div className="text-sm font-black leading-tight" style={{ color: "#1C1917" }}>Your order</div>
              <div className="text-xs mt-0.5" style={{ color: "#78716C" }}>Track, edit, pay, QR</div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold mt-auto" style={{ color: "#EA580C" }}>
              Manage <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </div>

        {/* Tools — 3 compact horizontal rows */}
        <div className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: "#A8A29E" }}>Tools & resources</div>

        {[
          {
            icon: TestTube,
            color: "#0EA5E9",
            bg: "#F0F9FF",
            border: "#BAE6FD",
            label: "Lab Reports",
            sub: "352+ Janoshik CoA tests · supplier Uther",
          },
          {
            icon: ShieldCheck,
            color: "#16A34A",
            bg: "#F0FDF4",
            border: "#BBF7D0",
            label: "Safety Calculator",
            sub: "Endotoxin limits & BAC water safety",
          },
          {
            icon: FlaskConical,
            color: "#7C3AED",
            bg: "#FAF5FF",
            border: "#DDD6FE",
            label: "The Lonely Vial",
            sub: "Single vials, no kits, no minimums",
          },
        ].map((t) => (
          <button
            key={t.label}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-2.5 text-left"
            style={{ background: t.bg, border: `1px solid ${t.border}` }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
            >
              <t.icon style={{ color: t.color, width: 18, height: 18 }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold" style={{ color: "#1C1917" }}>{t.label}</div>
              <div className="text-xs truncate" style={{ color: "#78716C" }}>{t.sub}</div>
            </div>
            <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "#C7C4BF" }} />
          </button>
        ))}

        {/* Footer */}
        <div
          className="flex items-center justify-between mt-4 pt-3"
          style={{ borderTop: "1px solid #E7E3DC" }}
        >
          <a href="#" className="flex items-center gap-1.5 text-sm" style={{ color: "#2AABEE" }}>
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="font-semibold">@urbanblend789</span>
          </a>
          <span className="text-xs" style={{ color: "#C7C4BF" }}>USDT · Ethereum</span>
        </div>
      </main>

      {/* Bottom tabs */}
      <nav
        className="fixed bottom-0 left-1/2"
        style={{
          transform: "translateX(-50%)",
          width: 390,
          background: "rgba(255,255,255,0.97)",
          borderTop: "1px solid #E7E3DC",
          paddingBottom: 16,
        }}
      >
        <div className="flex justify-around pt-2">
          {[
            { id: "home", icon: Home, label: "Home" },
            { id: "protocols", icon: FileText, label: "Protocols" },
            { id: "calc", icon: Calculator, label: "Calc" },
            { id: "account", icon: User, label: "Account" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="flex flex-col items-center gap-1 px-3 py-1"
            >
              <t.icon
                className="w-5 h-5"
                style={{ color: activeTab === t.id ? "#1D4ED8" : "#A8A29E" }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: activeTab === t.id ? "#1D4ED8" : "#A8A29E" }}
              >
                {t.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
