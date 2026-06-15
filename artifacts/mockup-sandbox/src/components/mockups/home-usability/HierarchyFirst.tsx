import { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, MessageCircle, ArrowRight, Clock, Users,
} from "lucide-react";

// USABILITY FOCUS: Clarity of information hierarchy
//
// Tradeoff: Visual weight is unequally distributed by intent — not by card size.
// One primary action dominates. Everything else is visually subordinate.
// The eye always knows where it lands first, second, third.
//
// What's sacrificed: feature parity — tools feel "less important" (they are).

export function HierarchyFirst() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#080D14", color: "#F1F5F9", fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}
    >
      {/* ── Tier 0: Status strip — informational only, visually quiet ── */}
      <div
        className="flex items-center justify-between px-4 py-2 text-xs"
        style={{ background: "#0D1117", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "#475569" }}
      >
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" style={{ color: "#3B82F6" }} />
          <span>Group buy closes <strong style={{ color: "#94A3B8" }}>28 Oct 2026</strong></span>
        </div>
        <button className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: "rgba(59,130,246,0.1)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.15)" }}>
          <User className="w-3 h-3" /> Login
        </button>
      </div>

      <main className="flex-1 flex flex-col px-4 pb-24">

        {/* ── Tier 1 (PRIMARY): Place an order — massive, unmissable ── */}
        <div className="mt-5 mb-3">
          {/* Level label */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "#3B82F6", color: "#fff" }}>1</div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#3B82F6" }}>Primary action</span>
          </div>

          <div
            className="rounded-3xl p-6 relative overflow-hidden"
            style={{ background: "linear-gradient(160deg, #1E3A5F 0%, #0F2040 100%)", border: "1px solid rgba(59,130,246,0.3)" }}
          >
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.2) 0%, transparent 60%)" }} />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full text-xs" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#93C5FD" }}>
                <ShoppingBag className="w-3 h-3" /> NEW CUSTOMER
              </div>
              <h1 className="text-3xl font-black mb-2" style={{ color: "#F8FAFC" }}>Place an order</h1>
              <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                Peptide group buys — quality tested, discreetly shipped.
              </p>
              <button
                className="w-full rounded-2xl font-bold flex items-center justify-center gap-2 text-white text-base"
                style={{ background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", height: 54 }}
              >
                <Users className="w-5 h-5" /> Group Buy Login <ArrowRight className="w-5 h-5" />
              </button>
              <button className="mt-3 w-full text-center text-sm" style={{ color: "#64748B" }}>
                Try a single vial instead →
              </button>
            </div>
          </div>
        </div>

        {/* ── Tier 2 (SECONDARY): Manage order — smaller, still actionable ── */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "rgba(251,146,60,0.2)", color: "#FB923C", border: "1px solid rgba(251,146,60,0.3)" }}>2</div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#FB923C" }}>Returning customer</span>
          </div>

          <button
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left"
            style={{ background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.2)" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(234,88,12,0.15)" }}>
              <Search className="w-5 h-5" style={{ color: "#FB923C" }} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold" style={{ color: "#F1F5F9" }}>Manage your order</div>
              <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>Track, edit, pay, InPost QR</div>
            </div>
            <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "#EA580C" }} />
          </button>
        </div>

        {/* ── Tier 3 (TERTIARY): Tools — compact list, clearly subordinate ── */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "rgba(255,255,255,0.06)", color: "#64748B", border: "1px solid rgba(255,255,255,0.1)" }}>3</div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#334155" }}>Resources</span>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
            {[
              { icon: TestTube, color: "#22D3EE", label: "Lab Reports", sub: "352+ Janoshik tests" },
              { icon: ShieldCheck, color: "#4ADE80", label: "Safety Calculator", sub: "Endotoxin & BAC" },
              { icon: FlaskConical, color: "#A78BFA", label: "The Lonely Vial", sub: "Single-vial shop" },
            ].map((t, i, arr) => (
              <button
                key={t.label}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}
              >
                <t.icon style={{ color: t.color, width: 16, height: 16, flexShrink: 0 }} />
                <span className="flex-1 text-sm font-semibold" style={{ color: "#CBD5E1" }}>{t.label}</span>
                <span className="text-xs mr-2" style={{ color: "#334155" }}>{t.sub}</span>
                <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#1E293B" }} />
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <a href="#" className="flex items-center gap-1.5 text-xs" style={{ color: "#2AABEE" }}>
            <MessageCircle className="w-3 h-3" /><span>@urbanblend789</span>
          </a>
          <span className="text-xs" style={{ color: "#1E293B" }}>USDT · Ethereum</span>
        </div>
      </main>

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
