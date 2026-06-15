import { useState } from "react";
import {
  ShoppingBag, MessageCircle, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, Users, Zap,
} from "lucide-react";

// HYPOTHESIS: Group buy as a live event you're either in or missing.
// Lead with the countdown + fill meter as the emotional hook.
// Scarcity and social proof (X members joined) drive the CTA.

const TOTAL_SLOTS = 120;
const FILLED_SLOTS = 87;
const DAYS_LEFT = 217;
const PCT = Math.round((FILLED_SLOTS / TOTAL_SLOTS) * 100);

export function FocusHeroLiveStatus() {
  const [activeTab, setActiveTab] = useState("home");

  const circumference = 2 * Math.PI * 54;
  const dash = (PCT / 100) * circumference;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#080D14", color: "#fff", fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <div className="text-base font-black" style={{ color: "#E2E8F0" }}>Salt & Peps</div>
          <div className="text-xs" style={{ color: "#475569" }}>Peps Anonymous</div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: "rgba(59,130,246,0.12)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.2)" }}>
          <User className="w-3 h-3" /> Login
        </button>
      </div>

      <main className="flex-1 flex flex-col px-5 pb-24">

        {/* Live status hero */}
        <div className="mt-3 rounded-3xl p-6 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #0D1F0A 0%, #071209 100%)", border: "1px solid rgba(74,222,128,0.2)" }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(74,222,128,0.08) 0%, transparent 60%)" }} />

          <div className="relative z-10 flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: "#4ADE80", boxShadow: "0 0 6px #4ADE80" }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#4ADE80" }}>Group buy live</span>
              </div>
              <div className="text-3xl font-black" style={{ color: "#F8FAFC" }}>{DAYS_LEFT} days</div>
              <div className="text-xs" style={{ color: "#475569" }}>until close — 28 Oct 2026</div>
            </div>

            {/* SVG ring */}
            <div className="relative" style={{ width: 120, height: 120 }}>
              <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(74,222,128,0.1)" strokeWidth="8" />
                <circle cx="60" cy="60" r="54" fill="none" stroke="#4ADE80" strokeWidth="8"
                  strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 4px #4ADE80)" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-black" style={{ color: "#4ADE80" }}>{PCT}%</div>
                <div className="text-xs" style={{ color: "#475569" }}>filled</div>
              </div>
            </div>
          </div>

          {/* Slot bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: "#64748B" }}>
              <span><strong style={{ color: "#F1F5F9" }}>{FILLED_SLOTS}</strong> members joined</span>
              <span><strong style={{ color: "#F1F5F9" }}>{TOTAL_SLOTS - FILLED_SLOTS}</strong> slots left</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: `${PCT}%`, background: "linear-gradient(90deg, #16A34A, #4ADE80)", boxShadow: "0 0 8px rgba(74,222,128,0.5)" }} />
            </div>
          </div>

          <button className="w-full rounded-2xl font-bold flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #16A34A, #4ADE80)", height: 50, color: "#052e16", fontSize: 15 }}>
            <Zap className="w-4 h-4" /> Join group buy <Users className="w-4 h-4" />
          </button>
        </div>

        {/* Already in? */}
        <button className="mt-3 w-full flex items-center justify-between px-4 py-3.5 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-left">
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FB923C" }}>Already in?</div>
            <div className="text-sm font-bold" style={{ color: "#E2E8F0" }}>Manage your order</div>
          </div>
          <div className="text-xs" style={{ color: "#475569" }}>Track · Pay · QR →</div>
        </button>

        {/* Tools */}
        <p className="text-xs font-bold uppercase tracking-widest mt-5 mb-3" style={{ color: "#334155" }}>Tools</p>
        <div className="flex gap-2 mb-2">
          {[
            { label: "Lab Reports", icon: TestTube, color: "#22D3EE", bg: "rgba(14,165,233,0.1)", border: "rgba(14,165,233,0.18)" },
            { label: "Safety Calc", icon: ShieldCheck, color: "#4ADE80", bg: "rgba(22,163,74,0.1)", border: "rgba(22,163,74,0.18)" },
          ].map(t => (
            <button key={t.label} className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
              <t.icon style={{ color: t.color, width: 14, height: 14 }} />
              <span className="text-xs font-bold" style={{ color: "#E2E8F0" }}>{t.label}</span>
            </button>
          ))}
        </div>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
          <FlaskConical style={{ color: "#C4B5FD", width: 16, height: 16 }} />
          <span className="flex-1 text-left text-xs font-bold" style={{ color: "#E2E8F0" }}>Lonely Vial</span>
          <span className="text-xs" style={{ color: "#A78BFA" }}>Single-vial shop →</span>
        </button>

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
