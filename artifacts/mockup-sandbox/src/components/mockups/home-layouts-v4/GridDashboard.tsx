import { useState } from "react";
import {
  ShoppingBag, Search, ArrowRight, MessageCircle,
  TestTube, ShieldCheck, FlaskConical, Users, Wallet,
  Clock, LayoutGrid, Home, FileText, Calculator, User,
} from "lucide-react";

const BRAND = { name: "Salt & Peps", sub: "Peps Anonymous", tagline: "Peptide group buys — quality tested, discreetly shipped." };

export function GridDashboard() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0D1117", color: "#fff", fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}>

      {/* ── Slim top nav ── */}
      <header className="flex items-center justify-between px-4 pt-5 pb-3">
        <div>
          <div className="text-base font-bold tracking-tight" style={{ color: "#E2E8F0" }}>{BRAND.name}</div>
          <div className="text-xs" style={{ color: "#64748B" }}>{BRAND.sub}</div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: "rgba(59,130,246,0.15)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.25)" }}>
          <User className="w-3 h-3" /> Login
        </button>
      </header>

      {/* ── Group-buy countdown banner ── */}
      <div className="mx-4 mb-4 flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.18)" }}>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" style={{ color: "#60A5FA" }} />
          <div>
            <div className="text-xs font-bold" style={{ color: "#94A3B8" }}>GROUP BUY CLOSES</div>
            <div className="text-sm font-bold" style={{ color: "#E2E8F0" }}>28 Oct 2026</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold" style={{ color: "#94A3B8" }}>REMAINING</div>
          <div className="text-sm font-bold" style={{ color: "#60A5FA" }}>7 months</div>
        </div>
      </div>

      <main className="flex-1 px-4 flex flex-col gap-3 pb-24">

        {/* ── Hero: Primary CTA spanning full width ── */}
        <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #1A2B4A 100%)", border: "1px solid rgba(59,130,246,0.3)" }}>
          <div className="absolute top-0 right-0 w-36 h-36 rounded-full" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)", transform: "translate(20%, -20%)" }} />
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4" style={{ color: "#93C5FD" }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#93C5FD" }}>New Customer</span>
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: "#F1F5F9" }}>Place an order</h2>
          <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>Browse products and checkout</p>
          <button className="w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 relative z-10" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
            <Users className="w-4 h-4" /> Group Buy Login <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── 2-column grid for the 4 remaining sections ── */}
        <div className="grid grid-cols-2 gap-3">

          {/* Manage */}
          <div className="rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #1A2B3C 0%, #2D4A5E 100%)", border: "1px solid rgba(234,88,12,0.2)" }}>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Search className="w-3.5 h-3.5" style={{ color: "#FBBF24" }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#FBBF24" }}>Returning</span>
              </div>
              <div className="text-sm font-bold" style={{ color: "#F1F5F9" }}>Manage order</div>
              <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>Track, pay, QR code</div>
            </div>
            <button className="h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 w-full" style={{ background: "linear-gradient(135deg, #EA580C, #C2410C)" }}>
              <Search className="w-3.5 h-3.5" /> My Orders
            </button>
          </div>

          {/* Lab Reports */}
          <div className="rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #0A1628 0%, #0F2240 100%)", border: "1px solid rgba(6,182,212,0.2)" }}>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <TestTube className="w-3.5 h-3.5" style={{ color: "#22D3EE" }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22D3EE" }}>QA</span>
              </div>
              <div className="text-sm font-bold" style={{ color: "#F1F5F9" }}>Lab Reports</div>
              <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>352+ CoA tests</div>
            </div>
            <button className="h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 w-full" style={{ background: "linear-gradient(135deg, #0EA5E9, #0284C7)" }}>
              <TestTube className="w-3.5 h-3.5" /> Browse
            </button>
          </div>

          {/* Safety Calculator */}
          <div className="rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #0A1F2E 0%, #0D2B20 100%)", border: "1px solid rgba(34,197,94,0.15)" }}>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#4ADE80" }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#4ADE80" }}>Safety</span>
              </div>
              <div className="text-sm font-bold" style={{ color: "#F1F5F9" }}>Calculator</div>
              <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>Endotoxin & BAC</div>
            </div>
            <button className="h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 w-full" style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}>
              <ShieldCheck className="w-3.5 h-3.5" /> Open
            </button>
          </div>

          {/* Lonely Vial */}
          <div className="rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #120A2E 0%, #1D0D45 100%)", border: "1px solid rgba(139,92,246,0.25)" }}>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <FlaskConical className="w-3.5 h-3.5" style={{ color: "#A78BFA" }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#A78BFA" }}>Singles</span>
              </div>
              <div className="text-sm font-bold" style={{ color: "#F1F5F9" }}>Lonely Vial</div>
              <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>No kits, no minimums</div>
            </div>
            <button className="h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 w-full" style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}>
              <FlaskConical className="w-3.5 h-3.5" /> Shop
            </button>
          </div>
        </div>

        {/* ── Footer links ── */}
        <div className="flex items-center justify-between pt-1">
          <a href="#" className="flex items-center gap-1.5 text-sm" style={{ color: "#2AABEE" }}>
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="font-semibold">@urbanblend789</span>
          </a>
          <span className="text-xs" style={{ color: "#475569" }}>Pay with USDT · ETH</span>
        </div>
      </main>

      {/* ── Bottom tabs ── */}
      <nav className="fixed bottom-0 left-1/2" style={{ transform: "translateX(-50%)", width: 390, background: "rgba(13,17,23,0.96)", borderTop: "1px solid rgba(255,255,255,0.08)", paddingBottom: 16 }}>
        <div className="flex justify-around pt-2">
          {[{ id: "home", icon: Home, label: "Home" }, { id: "protocols", icon: FileText, label: "Protocols" }, { id: "calc", icon: Calculator, label: "Calc" }, { id: "account", icon: User, label: "Account" }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className="flex flex-col items-center gap-1 px-3 py-1">
              <t.icon className="w-5 h-5" style={{ color: activeTab === t.id ? "#3B82F6" : "#64748B" }} />
              <span className="text-xs font-medium" style={{ color: activeTab === t.id ? "#3B82F6" : "#64748B" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
