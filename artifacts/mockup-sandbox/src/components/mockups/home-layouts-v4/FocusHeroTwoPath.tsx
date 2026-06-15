import { useState } from "react";
import {
  ShoppingBag, Search, ArrowRight, MessageCircle,
  TestTube, ShieldCheck, FlaskConical,
  Clock, Home, FileText, Calculator, User, ChevronRight, Users,
} from "lucide-react";

// HYPOTHESIS: Self-identification upfront — show only your relevant path.
// Instead of one dominant CTA that serves nobody perfectly, split the screen
// into two equal "doors". Each door opens a tailored experience.

export function FocusHeroTwoPath() {
  const [activeTab, setActiveTab] = useState("home");
  const [path, setPath] = useState<"new" | "returning" | null>(null);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#080D14", color: "#fff", fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div>
          <div className="text-base font-black tracking-tight" style={{ color: "#E2E8F0" }}>Salt & Peps</div>
          <div className="text-xs" style={{ color: "#475569" }}>Peps Anonymous</div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs" style={{ background: "rgba(59,130,246,0.1)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.2)" }}>
          <Clock className="w-3 h-3" /> 28 Oct 2026
        </div>
      </div>

      <main className="flex-1 flex flex-col px-4 pb-24">

        {/* Identity question */}
        <div className="mt-7 mb-5 text-center">
          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#475569" }}>Welcome back</div>
          <h1 className="text-2xl font-black" style={{ color: "#F1F5F9" }}>Who are you here as?</h1>
        </div>

        {/* Two equal-weight path cards */}
        {!path ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setPath("new")}
              className="rounded-3xl p-6 flex items-center gap-4 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0F2040 100%)", border: "1px solid rgba(59,130,246,0.3)" }}
            >
              <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(59,130,246,0.2) 0%, transparent 60%)" }} />
              <div className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.3)" }}>
                <ShoppingBag style={{ color: "#93C5FD", width: 24, height: 24 }} />
              </div>
              <div className="relative z-10 flex-1 text-left">
                <div className="text-lg font-black" style={{ color: "#F8FAFC" }}>New here</div>
                <div className="text-sm" style={{ color: "#64748B" }}>Place a group buy order</div>
              </div>
              <ArrowRight className="relative z-10 flex-shrink-0" style={{ color: "#3B82F6", width: 20, height: 20 }} />
            </button>

            <button
              onClick={() => setPath("returning")}
              className="rounded-3xl p-6 flex items-center gap-4 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #2C1810 0%, #1A0F0A 100%)", border: "1px solid rgba(234,88,12,0.3)" }}
            >
              <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(234,88,12,0.18) 0%, transparent 60%)" }} />
              <div className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(234,88,12,0.2)", border: "1px solid rgba(234,88,12,0.3)" }}>
                <Search style={{ color: "#FB923C", width: 24, height: 24 }} />
              </div>
              <div className="relative z-10 flex-1 text-left">
                <div className="text-lg font-black" style={{ color: "#F8FAFC" }}>Returning</div>
                <div className="text-sm" style={{ color: "#64748B" }}>Track, edit, pay, InPost QR</div>
              </div>
              <ArrowRight className="relative z-10 flex-shrink-0" style={{ color: "#EA580C", width: 20, height: 20 }} />
            </button>
          </div>
        ) : path === "new" ? (
          <div>
            <button onClick={() => setPath(null)} className="mb-4 text-xs flex items-center gap-1" style={{ color: "#475569" }}>← Back</button>
            <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #1E3A5F 0%, #0F2040 100%)", border: "1px solid rgba(59,130,246,0.25)" }}>
              <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.15) 0%, transparent 60%)" }} />
              <div className="relative z-10">
                <h2 className="text-2xl font-black mb-2" style={{ color: "#F8FAFC" }}>Place an order</h2>
                <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>Peptide group buys — quality tested, discreetly shipped.</p>
                <button className="w-full rounded-2xl font-bold flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", height: 48, fontSize: 15 }}>
                  <Users className="w-4 h-4" /> Group Buy Login <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <button onClick={() => setPath(null)} className="mb-4 text-xs flex items-center gap-1" style={{ color: "#475569" }}>← Back</button>
            <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #2C1810 0%, #1A0F0A 100%)", border: "1px solid rgba(234,88,12,0.3)" }}>
              <div className="relative z-10">
                <h2 className="text-2xl font-black mb-2" style={{ color: "#F8FAFC" }}>Your order</h2>
                <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>Track status, edit details, pay, or collect InPost QR.</p>
                <button className="w-full rounded-2xl font-bold flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #EA580C, #C2410C)", height: 48, fontSize: 15 }}>
                  <Search className="w-4 h-4" /> Manage my order <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tools strip */}
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#334155" }}>Tools</p>
          <div className="flex gap-2 mb-2">
            {[
              { label: "Lab Reports", icon: TestTube, color: "#22D3EE", bg: "rgba(14,165,233,0.1)", border: "rgba(14,165,233,0.18)" },
              { label: "Safety Calc", icon: ShieldCheck, color: "#4ADE80", bg: "rgba(22,163,74,0.1)", border: "rgba(22,163,74,0.18)" },
            ].map(t => (
              <button key={t.label} className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
                <t.icon style={{ color: t.color, width: 14, height: 14, flexShrink: 0 }} />
                <span className="text-xs font-bold" style={{ color: "#E2E8F0" }}>{t.label}</span>
              </button>
            ))}
          </div>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
            <FlaskConical style={{ color: "#C4B5FD", width: 16, height: 16, flexShrink: 0 }} />
            <span className="flex-1 text-left text-xs font-bold" style={{ color: "#E2E8F0" }}>Lonely Vial</span>
            <span className="text-xs" style={{ color: "#7C3AED" }}>Shop →</span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <a href="#" className="flex items-center gap-1.5 text-sm" style={{ color: "#2AABEE" }}>
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="font-semibold">@urbanblend789</span>
          </a>
          <span className="text-xs" style={{ color: "#334155" }}>USDT · Ethereum</span>
        </div>
      </main>

      {/* Bottom tabs */}
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
