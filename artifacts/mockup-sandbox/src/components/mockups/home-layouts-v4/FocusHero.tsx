import { useState } from "react";
import {
  ShoppingBag, Search, ArrowRight, MessageCircle,
  TestTube, ShieldCheck, FlaskConical, Users,
  Clock, Home, FileText, Calculator, User, ChevronRight,
} from "lucide-react";

const BRAND = { name: "Salt & Peps", sub: "Peps Anonymous" };

const TOOLS = [
  { label: "Lab Reports", icon: TestTube, color: "#22D3EE", bg: "rgba(14,165,233,0.12)", border: "rgba(14,165,233,0.2)" },
  { label: "Safety Calc", icon: ShieldCheck, color: "#4ADE80", bg: "rgba(22,163,74,0.12)", border: "rgba(22,163,74,0.2)" },
];

export function FocusHero() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#080D14", color: "#fff", fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}>

      {/* ── Top status bar ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" style={{ color: "#60A5FA" }} />
          <span className="text-xs" style={{ color: "#94A3B8" }}>Group buy closes <strong className="text-white">28 Oct 2026</strong></span>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(59,130,246,0.12)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.2)" }}>
          <User className="w-3 h-3" /> Login
        </button>
      </div>

      <main className="flex-1 flex flex-col px-4 pb-24">

        {/* ── Dominant hero block ── */}
        <div className="mt-6 mb-2 text-center">
          <h1 className="text-4xl font-black tracking-tight mb-1" style={{ background: "linear-gradient(135deg, #FFFFFF 30%, #93C5FD 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {BRAND.name}
          </h1>
          <p className="text-sm" style={{ color: "#475569" }}>{BRAND.sub}</p>
        </div>

        {/* ── Primary action — massive card ── */}
        <div className="mt-4 mb-5 rounded-3xl p-7 relative overflow-hidden flex flex-col" style={{ background: "linear-gradient(160deg, #1E3A5F 0%, #0F2040 60%, #0A1628 100%)", border: "1px solid rgba(59,130,246,0.25)", minHeight: 260 }}>
          {/* Glowing accent */}
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.18) 0%, transparent 60%)" }} />
          <div className="relative z-10 flex-1 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 mb-4 px-3 py-1 rounded-full" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}>
                <ShoppingBag className="w-3.5 h-3.5" style={{ color: "#93C5FD" }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#93C5FD" }}>New Customer</span>
              </div>
              <h2 className="text-3xl font-black leading-tight mb-3" style={{ color: "#F8FAFC" }}>Place an<br />order</h2>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                Peptide group buys — quality tested, discreetly shipped.
              </p>
            </div>
            <button className="mt-6 w-full h-13 rounded-2xl text-base font-bold flex items-center justify-center gap-2.5" style={{ background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)", height: 52 }}>
              <Users className="w-5 h-5" /> Group Buy Login <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Quick tool chips ── */}
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#475569" }}>Quick Tools</p>
        <div className="flex gap-3 mb-3">
          {TOOLS.map(t => (
            <button key={t.label} className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-2xl" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
                <t.icon style={{ color: t.color, width: 16, height: 16 }} />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold" style={{ color: "#E2E8F0" }}>{t.label}</div>
                <div className="text-xs" style={{ color: "#64748B" }}>Open →</div>
              </div>
            </button>
          ))}
        </div>

        {/* ── Lonely Vial — shop card ── */}
        <button className="w-full rounded-2xl p-5 flex items-center gap-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(124,58,237,0.1) 100%)", border: "1px solid rgba(167,139,250,0.3)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 10% 50%, rgba(167,139,250,0.15) 0%, transparent 70%)" }} />
          <div className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)" }}>
            <FlaskConical style={{ color: "#C4B5FD", width: 26, height: 26 }} />
          </div>
          <div className="relative z-10 flex-1 text-left">
            <div className="text-base font-black" style={{ color: "#EDE9FE" }}>Lonely Vial</div>
            <div className="text-xs mt-0.5" style={{ color: "#A78BFA" }}>Single-vial shop — browse & order →</div>
          </div>
          <ChevronRight className="relative z-10 flex-shrink-0" style={{ color: "#7C3AED", width: 18, height: 18 }} />
        </button>

        {/* ── Returning / Manage section ── */}
        <div className="mt-3 rounded-2xl p-4 flex items-center gap-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(234,88,12,0.15)", border: "1px solid rgba(234,88,12,0.25)" }}>
            <Search className="w-5 h-5" style={{ color: "#FB923C" }} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: "#FB923C" }}>Returning</p>
            <p className="text-sm font-bold" style={{ color: "#E2E8F0" }}>Manage your order</p>
            <p className="text-xs" style={{ color: "#64748B" }}>Track, edit, pay, InPost QR</p>
          </div>
          <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: "#475569" }} />
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between mt-5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <a href="#" className="flex items-center gap-1.5 text-sm" style={{ color: "#2AABEE" }}>
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="font-semibold">@urbanblend789</span>
          </a>
          <span className="text-xs" style={{ color: "#334155" }}>USDT · Ethereum</span>
        </div>
      </main>

      {/* ── Bottom tabs ── */}
      <nav className="fixed bottom-0 left-1/2" style={{ transform: "translateX(-50%)", width: 390, background: "rgba(8,13,20,0.97)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingBottom: 16 }}>
        <div className="flex justify-around pt-2">
          {[{ id: "home", icon: Home, label: "Home" }, { id: "protocols", icon: FileText, label: "Protocols" }, { id: "calc", icon: Calculator, label: "Calc" }, { id: "account", icon: User, label: "Account" }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex flex-col items-center gap-1 px-3 py-1">
              <t.icon className="w-5 h-5" style={{ color: activeTab === t.id ? "#3B82F6" : "#475569" }} />
              <span className="text-xs font-medium" style={{ color: activeTab === t.id ? "#3B82F6" : "#475569" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
