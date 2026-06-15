import { useState } from "react";
import {
  ShoppingBag, Search, ArrowRight, MessageCircle,
  TestTube, ShieldCheck, FlaskConical,
  Home, FileText, Calculator, User, Users, Star, Package,
} from "lucide-react";

// HYPOTHESIS: Lead with the product, not the transaction.
// Users want to know *what they're buying* before they commit.
// Treat it like a product detail page — name, specs, purity, price/vial.
// The group-buy mechanic is context, not the primary frame.

const PEPTIDE = {
  name: "BPC-157",
  subtitle: "Body Protection Compound",
  purity: "99.4%",
  pricePerVial: "€18.50",
  vialSize: "5 mg",
  rating: 4.9,
  reviews: 214,
  badges: ["3rd-party tested", "EU shipped", "Discreet"],
};

export function FocusHeroProductFirst() {
  const [activeTab, setActiveTab] = useState("home");
  const [tab, setTab] = useState<"buy" | "manage">("buy");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#080D14", color: "#fff", fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="text-sm font-black" style={{ color: "#E2E8F0" }}>Salt & Peps</div>
        <button className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(59,130,246,0.12)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.2)" }}>
          <User className="w-3 h-3" /> Login
        </button>
      </div>

      <main className="flex-1 flex flex-col pb-24">

        {/* Product hero */}
        <div className="px-5 pt-5">
          {/* Product identity */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#475569" }}>Current group buy</div>
              <h1 className="text-3xl font-black tracking-tight" style={{ color: "#F8FAFC" }}>{PEPTIDE.name}</h1>
              <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>{PEPTIDE.subtitle}</p>
            </div>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #1E3A5F, #0F2040)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <FlaskConical style={{ color: "#93C5FD", width: 28, height: 28 }} />
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} style={{ width: 12, height: 12, color: i < 5 ? "#FBBF24" : "#334155", fill: i < 5 ? "#FBBF24" : "none" }} />
            ))}
            <span className="text-xs font-bold" style={{ color: "#F59E0B" }}>{PEPTIDE.rating}</span>
            <span className="text-xs" style={{ color: "#334155" }}>({PEPTIDE.reviews} reviews)</span>
          </div>

          {/* Key specs row */}
          <div className="flex gap-2 mb-4">
            {[
              { label: "Purity", value: PEPTIDE.purity },
              { label: "Vial", value: PEPTIDE.vialSize },
              { label: "Per vial", value: PEPTIDE.pricePerVial },
            ].map(s => (
              <div key={s.label} className="flex-1 rounded-xl px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="text-base font-black" style={{ color: "#F1F5F9" }}>{s.value}</div>
                <div className="text-xs" style={{ color: "#475569" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="flex gap-2 flex-wrap mb-5">
            {PEPTIDE.badges.map(b => (
              <span key={b} className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(74,222,128,0.08)", color: "#4ADE80", border: "1px solid rgba(74,222,128,0.2)" }}>{b}</span>
            ))}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="px-5">
          <div className="flex rounded-xl p-1 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {(["buy", "manage"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                style={{
                  background: tab === t ? "rgba(59,130,246,0.2)" : "transparent",
                  color: tab === t ? "#93C5FD" : "#475569",
                  border: tab === t ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
                }}
              >
                {t === "buy" ? "Join buy" : "Manage order"}
              </button>
            ))}
          </div>

          {tab === "buy" ? (
            <div>
              <div className="text-xs mb-3" style={{ color: "#64748B" }}>
                <strong style={{ color: "#F1F5F9" }}>87 of 120</strong> members joined · closes <strong style={{ color: "#F1F5F9" }}>28 Oct 2026</strong>
              </div>
              <button className="w-full rounded-2xl font-bold flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", height: 50, fontSize: 15 }}>
                <ShoppingBag className="w-4 h-4" /> Join group buy <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button className="w-full rounded-2xl font-bold flex items-center justify-center gap-2" style={{ background: "rgba(234,88,12,0.15)", border: "1px solid rgba(234,88,12,0.3)", height: 50, fontSize: 15, color: "#FB923C" }}>
              <Search className="w-4 h-4" /> Manage my order <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="mx-5 mt-5 mb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

        {/* Tools row */}
        <div className="px-5">
          <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: "#334155" }}>Tools</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Lab Reports", icon: TestTube, color: "#22D3EE" },
              { label: "Safety Calc", icon: ShieldCheck, color: "#4ADE80" },
              { label: "Lonely Vial", icon: FlaskConical, color: "#C4B5FD" },
            ].map(t => (
              <button key={t.label} className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <t.icon style={{ color: t.color, width: 18, height: 18 }} />
                <span className="text-xs font-bold text-center leading-tight" style={{ color: "#94A3B8" }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mx-5 flex items-center justify-between mt-5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
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
