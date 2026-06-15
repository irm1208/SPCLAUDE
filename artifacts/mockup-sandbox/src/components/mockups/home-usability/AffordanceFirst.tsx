import { useState } from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, MessageCircle, ArrowRight,
  Clock, Users, ChevronRight,
} from "lucide-react";

// USABILITY FOCUS: Ease of interaction & affordance visibility
//
// Tradeoff: Every interactive element is unmistakably tappable — shadows, borders,
// chevrons, explicit labels, generous 48px+ tap targets. The screen "shows its buttons."
//
// What's sacrificed: visual minimalism — it's louder, more explicit, less "designed."

export function AffordanceFirst() {
  const [activeTab, setActiveTab] = useState("home");
  const [pressed, setPressed] = useState<string | null>(null);

  const btn = (id: string) => ({
    onPointerDown: () => setPressed(id),
    onPointerUp: () => setPressed(null),
    onPointerLeave: () => setPressed(null),
    style: {
      transform: pressed === id ? "scale(0.98)" : "scale(1)",
      transition: "transform 0.1s",
    } as React.CSSProperties,
  });

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0B1018", color: "#F1F5F9", fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div>
          <div className="text-base font-black" style={{ color: "#F1F5F9" }}>Salt & Peps</div>
          <div className="text-xs" style={{ color: "#475569" }}>Peps Anonymous</div>
        </div>
        {/* Login button — explicit label + icon + border = unmistakably a button */}
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
          style={{ background: "rgba(59,130,246,0.15)", color: "#93C5FD", border: "2px solid rgba(59,130,246,0.3)", boxShadow: "0 2px 8px rgba(59,130,246,0.1)" }}
          {...btn("login")}
        >
          <User className="w-4 h-4" /> Log in
        </button>
      </div>

      {/* Countdown — clear label + icon + distinct background */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)", margin: "12px 16px", borderRadius: 12 }}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" style={{ color: "#60A5FA" }} />
          <div>
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "#475569" }}>Group buy closes</div>
            <div className="text-sm font-black" style={{ color: "#F1F5F9" }}>28 Oct 2026</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "#475569" }}>Remaining</div>
          <div className="text-sm font-black" style={{ color: "#60A5FA" }}>7 months</div>
        </div>
      </div>

      <main className="flex-1 flex flex-col px-4 pb-24">

        {/* Primary CTA — shadow lift, deep border, large target */}
        <button
          className="w-full mb-3 rounded-2xl p-5 flex items-center gap-4 text-left relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1E3A5F, #0F2040)",
            border: "2px solid #3B82F6",
            boxShadow: "0 4px 20px rgba(59,130,246,0.25), 0 1px 0 rgba(255,255,255,0.05) inset",
          }}
          {...btn("order")}
        >
          {/* "BUTTON" affordance cue — pulsing dot */}
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(59,130,246,0.2)", color: "#93C5FD" }}>
            TAP →
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)" }}>
            <ShoppingBag style={{ color: "#93C5FD", width: 22, height: 22 }} />
          </div>
          <div className="flex-1 pr-8">
            <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#3B82F6" }}>New customer</div>
            <div className="text-lg font-black" style={{ color: "#F8FAFC" }}>Place an order</div>
            <div className="text-sm mt-0.5" style={{ color: "#64748B" }}>Browse products and checkout</div>
            <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white w-fit" style={{ background: "#3B82F6" }}>
              <Users className="w-4 h-4" /> Group Buy Login <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Secondary CTA — also clearly a button, different colour cue */}
        <button
          className="w-full mb-4 rounded-2xl p-4 flex items-center gap-4 text-left"
          style={{
            background: "rgba(234,88,12,0.08)",
            border: "2px solid rgba(234,88,12,0.35)",
            boxShadow: "0 2px 12px rgba(234,88,12,0.12)",
          }}
          {...btn("manage")}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(234,88,12,0.2)", border: "1px solid rgba(234,88,12,0.35)" }}>
            <Search style={{ color: "#FB923C", width: 20, height: 20 }} />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#EA580C" }}>Returning</div>
            <div className="text-base font-black" style={{ color: "#F1F5F9" }}>Manage your order</div>
            <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>Track · Edit · Pay · InPost QR</div>
          </div>
          <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: "#EA580C" }} />
        </button>

        {/* Draft notice — clearly interactive row, not decorative */}
        <button
          className="w-full mb-4 flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}
          {...btn("draft")}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#FBBF24", boxShadow: "0 0 6px #FBBF24" }} />
          <span className="flex-1 text-sm font-semibold text-left" style={{ color: "#FDE68A" }}>Draft waiting · 1 item</span>
          <span className="text-sm font-bold" style={{ color: "#FBBF24" }}>Resume →</span>
        </button>

        {/* Tools — each clearly a button with explicit affordance */}
        <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#334155" }}>Tools</div>
        <div className="flex flex-col gap-2.5">
          {[
            { icon: TestTube, color: "#22D3EE", accent: "rgba(14,165,233,0.2)", border: "rgba(14,165,233,0.3)", label: "Lab Reports", sub: "352+ Janoshik CoA tests", id: "lab" },
            { icon: ShieldCheck, color: "#4ADE80", accent: "rgba(22,163,74,0.2)", border: "rgba(22,163,74,0.3)", label: "Safety Calculator", sub: "Endotoxin & BAC water safety", id: "safety" },
            { icon: FlaskConical, color: "#A78BFA", accent: "rgba(124,58,237,0.2)", border: "rgba(124,58,237,0.3)", label: "The Lonely Vial", sub: "Single vials, no minimums", id: "vial" },
          ].map(t => (
            <button
              key={t.id}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left"
              style={{ background: "rgba(255,255,255,0.04)", border: `2px solid ${t.border}`, boxShadow: `0 2px 10px ${t.accent}` }}
              {...btn(t.id)}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: t.accent }}>
                <t.icon style={{ color: t.color, width: 18, height: 18 }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold" style={{ color: "#E2E8F0" }}>{t.label}</div>
                <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>{t.sub}</div>
              </div>
              <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: t.color, opacity: 0.7 }} />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <a href="#" className="flex items-center gap-1.5 text-sm" style={{ color: "#2AABEE" }}>
            <MessageCircle className="w-3.5 h-3.5" /><span className="font-semibold">@urbanblend789</span>
          </a>
          <span className="text-xs" style={{ color: "#334155" }}>USDT · Ethereum</span>
        </div>
      </main>

      <nav className="fixed bottom-0 left-1/2" style={{ transform: "translateX(-50%)", width: 390, background: "rgba(11,16,24,0.97)", borderTop: "2px solid rgba(255,255,255,0.08)", paddingBottom: 16 }}>
        <div className="flex justify-around pt-2">
          {[{ id: "home", icon: Home, label: "Home" }, { id: "protocols", icon: FileText, label: "Protocols" }, { id: "calc", icon: Calculator, label: "Calc" }, { id: "account", icon: User, label: "Account" }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl" style={{ minWidth: 60, background: activeTab === t.id ? "rgba(59,130,246,0.15)" : "transparent", border: activeTab === t.id ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent" }}>
              <t.icon className="w-5 h-5" style={{ color: activeTab === t.id ? "#60A5FA" : "#475569" }} />
              <span className="text-xs font-bold" style={{ color: activeTab === t.id ? "#60A5FA" : "#475569" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
