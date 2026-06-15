import { useState } from "react";
import {
  MessageCircle, TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, ArrowRight, Search, Users,
} from "lucide-react";

// HYPOTHESIS: A question-first routing interface.
// Minimal until you answer. The app "reads the room" — a single question
// branches into a fully personalised view. Feels human, not transactional.

type Step = "ask" | "new" | "returning";

export function FocusHeroConversational() {
  const [activeTab, setActiveTab] = useState("home");
  const [step, setStep] = useState<Step>("ask");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#080D14", color: "#fff", fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}>

      {/* Minimal header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="text-sm font-black tracking-tight" style={{ color: "#E2E8F0" }}>Salt & Peps</div>
        <button className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(59,130,246,0.12)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.2)" }}>
          Login
        </button>
      </div>

      <main className="flex-1 flex flex-col px-5 pb-24">

        {/* Chat thread */}
        <div className="mt-6 flex flex-col gap-3">

          {/* Bot bubble 1 */}
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}>🧪</div>
            <div className="rounded-2xl rounded-bl-sm px-4 py-3 max-w-xs" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-sm leading-relaxed" style={{ color: "#E2E8F0" }}>Hey! Welcome to the Peps Anonymous group buy.</p>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="rounded-2xl rounded-bl-sm px-4 py-3 max-w-xs" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-sm leading-relaxed" style={{ color: "#E2E8F0" }}>
                {step === "ask" ? "Have you ordered with us before?" : step === "new" ? "Great! Let me get you started 👋" : "Welcome back! Let me pull up your order."}
              </p>
            </div>
          </div>

          {/* User answer bubble */}
          {step !== "ask" && (
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-br-sm px-4 py-3" style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.3)" }}>
                <p className="text-sm" style={{ color: "#BFDBFE" }}>
                  {step === "new" ? "No — first time here" : "Yes, I have an order"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Response area */}
        <div className="mt-5">
          {step === "ask" && (
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => setStep("new")}
                className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-sm"
                style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#93C5FD" }}
              >
                <span className="text-lg">👋</span>
                <span>No — first time here</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>
              <button
                onClick={() => setStep("returning")}
                className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold text-sm"
                style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.25)", color: "#FB923C" }}
              >
                <span className="text-lg">✅</span>
                <span>Yes, I have an order</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>
            </div>
          )}

          {step === "new" && (
            <div>
              <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #1E3A5F 0%, #0F2040 100%)", border: "1px solid rgba(59,130,246,0.25)" }}>
                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.15) 0%, transparent 60%)" }} />
                <div className="relative z-10">
                  <p className="text-xs mb-2" style={{ color: "#64748B" }}>Closes 28 Oct 2026 · 33 slots left</p>
                  <h2 className="text-2xl font-black mb-1.5" style={{ color: "#F8FAFC" }}>Place an order</h2>
                  <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>Quality-tested peptides, discreetly shipped.</p>
                  <button className="w-full rounded-xl font-bold flex items-center justify-center gap-2 text-sm" style={{ background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", height: 46 }}>
                    <Users className="w-4 h-4" /> Group Buy Login <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button onClick={() => setStep("ask")} className="mt-3 text-xs w-full text-center" style={{ color: "#334155" }}>← Start over</button>
            </div>
          )}

          {step === "returning" && (
            <div>
              <div className="rounded-2xl p-5" style={{ background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.25)" }}>
                <h2 className="text-xl font-black mb-1" style={{ color: "#F8FAFC" }}>Your order</h2>
                <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>Track, edit, pay, and collect your InPost QR code.</p>
                <button className="w-full rounded-xl font-bold flex items-center justify-center gap-2 text-sm" style={{ background: "linear-gradient(135deg, #EA580C, #C2410C)", height: 46 }}>
                  <Search className="w-4 h-4" /> Manage my order <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <button onClick={() => setStep("ask")} className="mt-3 text-xs w-full text-center" style={{ color: "#334155" }}>← Start over</button>
            </div>
          )}
        </div>

        {/* Tools */}
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#1E293B" }}>Tools</p>
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
