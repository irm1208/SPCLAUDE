import { useState } from "react";
import {
  ShoppingBag, Search, ArrowRight, MessageCircle,
  TestTube, ShieldCheck, FlaskConical, Users, Wallet,
  Clock, Home, FileText, Calculator, User, ChevronRight,
} from "lucide-react";

type SectionId = "order" | "manage" | "lab" | "safety" | "vial";

const SECTIONS: { id: SectionId; label: string; shortLabel: string; icon: React.ElementType; color: string }[] = [
  { id: "order",  label: "Place Order",     shortLabel: "Order",  icon: ShoppingBag, color: "#60A5FA" },
  { id: "manage", label: "Manage",          shortLabel: "Manage", icon: Search,      color: "#FBBF24" },
  { id: "lab",    label: "Lab Reports",     shortLabel: "Lab",    icon: TestTube,    color: "#22D3EE" },
  { id: "safety", label: "Safety Calc",     shortLabel: "Safety", icon: ShieldCheck, color: "#4ADE80" },
  { id: "vial",   label: "The Lonely Vial", shortLabel: "Vial",   icon: FlaskConical, color: "#A78BFA" },
];

function OrderPanel() {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl overflow-hidden relative" style={{ background: "linear-gradient(160deg, #1E3A5F 0%, #0F2040 100%)", border: "1px solid rgba(59,130,246,0.25)", minHeight: 220 }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 85% 10%, rgba(59,130,246,0.2) 0%, transparent 55%)" }} />
        <div className="relative p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="w-4 h-4" style={{ color: "#93C5FD" }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#93C5FD" }}>New Customer</span>
          </div>
          <h2 className="text-2xl font-black mb-1.5" style={{ color: "#F8FAFC" }}>Place an order</h2>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>Browse products and checkout. Quality peptides, discreetly shipped.</p>
          <button className="w-full h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
            <Users className="w-4 h-4" /> Group Buy Login <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
        <ShoppingBag className="w-4 h-4 flex-shrink-0" style={{ color: "#60A5FA" }} />
        <p className="text-xs flex-1" style={{ color: "#64748B" }}>Prefer to try a single vial first? No kits, no minimums.</p>
        <button className="text-xs font-bold flex-shrink-0" style={{ color: "#A78BFA" }}>Try Vial →</button>
      </div>
    </div>
  );
}

function ManagePanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl overflow-hidden relative" style={{ background: "linear-gradient(160deg, #1A2B3C 0%, #2D4A5E 100%)", border: "1px solid rgba(234,88,12,0.2)", minHeight: 200 }}>
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full" style={{ background: "rgba(234,88,12,0.08)", transform: "translate(-30%, 30%)" }} />
        <div className="relative p-6">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4" style={{ color: "#FBBF24" }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#FBBF24" }}>Returning Customer</span>
          </div>
          <h2 className="text-2xl font-black mb-1.5" style={{ color: "#F8FAFC" }}>Manage your order</h2>
          <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.55)" }}>Track, edit, pay, or upload your InPost QR code.</p>
          <div className="flex gap-2">
            <button className="flex-1 h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #EA580C, #C2410C)" }}>
              <Users className="w-4 h-4" /> My Orders
            </button>
            <button className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)" }}>
              <Wallet className="w-4 h-4" style={{ color: "#E2E8F0" }} />
            </button>
          </div>
        </div>
      </div>
      <button className="h-10 rounded-xl text-sm flex items-center justify-center gap-2 font-semibold" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }}>
        <Search className="w-4 h-4" /> Find order by code
      </button>
      <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}>
        <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" style={{ animation: "pulse 2s infinite" }} />
        <p className="text-xs flex-1 font-semibold" style={{ color: "#FBBF24" }}>Draft waiting · 1 item</p>
        <button className="text-xs font-bold" style={{ color: "#FBBF24" }}>Resume →</button>
      </div>
    </div>
  );
}

function LabPanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #0A1628 0%, #0F2240 100%)", border: "1px solid rgba(6,182,212,0.2)" }}>
        <div className="flex items-center gap-2 mb-2">
          <TestTube className="w-4 h-4" style={{ color: "#22D3EE" }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#22D3EE" }}>Quality Assurance</span>
        </div>
        <h2 className="text-2xl font-black mb-1.5" style={{ color: "#F8FAFC" }}>Lab Reports</h2>
        <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.55)" }}>Independent Janoshik CoA tests — 352+ reports from supplier Uther.</p>
        <button className="w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #0EA5E9, #0284C7)" }}>
          <TestTube className="w-4 h-4" /> Browse Lab Results <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      <div className="rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-xs" style={{ color: "#64748B" }}>All tests independently conducted by Janoshik. Results cover purity, endotoxin levels, and peptide identity.</p>
      </div>
    </div>
  );
}

function SafetyPanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #0A1F2E 0%, #0D2B20 100%)", border: "1px solid rgba(34,197,94,0.15)" }}>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4" style={{ color: "#4ADE80" }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#4ADE80" }}>Endotoxin & BAC Safety</span>
        </div>
        <h2 className="text-2xl font-black mb-1.5" style={{ color: "#F8FAFC" }}>Safety Calculator</h2>
        <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.55)" }}>Calculate endotoxin limits and BAC water safety for your reconstituted peptides.</p>
        <button className="w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}>
          <ShieldCheck className="w-4 h-4" /> Open Safety Calculator <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function VialPanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #120A2E 0%, #1D0D45 100%)", border: "1px solid rgba(139,92,246,0.25)" }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: "rgba(139,92,246,0.08)", transform: "translate(30%, -30%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="w-4 h-4" style={{ color: "#A78BFA" }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#A78BFA" }}>Single Vials</span>
          </div>
          <h2 className="text-2xl font-black mb-1.5" style={{ color: "#F8FAFC" }}>The Lonely Vial</h2>
          <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.55)" }}>Buy individual vials — no kits, no minimums. Pay with USDT.</p>
          <button className="w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}>
            <FlaskConical className="w-4 h-4" /> Browse the Shop <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

const PANEL_MAP: Record<SectionId, React.ReactNode> = {
  order: <OrderPanel />,
  manage: <ManagePanel />,
  lab: <LabPanel />,
  safety: <SafetyPanel />,
  vial: <VialPanel />,
};

export function TabbedNavigator() {
  const [active, setActive] = useState<SectionId>("order");
  const [activeTab, setActiveTab] = useState("home");
  const current = SECTIONS.find(s => s.id === active)!;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0D1117", color: "#fff", fontFamily: "Inter, sans-serif", maxWidth: 390, margin: "0 auto" }}>

      {/* ── Compact header ── */}
      <header className="flex items-center justify-between px-4 pt-5 pb-3">
        <div>
          <div className="text-base font-bold" style={{ color: "#E2E8F0" }}>Salt &amp; Peps</div>
          <div className="text-xs" style={{ color: "#475569" }}>Group buy closes <strong className="text-white">28 Oct 2026</strong></div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: "rgba(59,130,246,0.12)", color: "#93C5FD", border: "1px solid rgba(59,130,246,0.2)" }}>
          <User className="w-3 h-3" /> Login
        </button>
      </header>

      {/* ── Section tab bar ── */}
      <div className="px-4 pb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {SECTIONS.map(s => {
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: isActive ? `${s.color}1A` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isActive ? `${s.color}40` : "rgba(255,255,255,0.08)"}`,
                  color: isActive ? s.color : "#64748B",
                }}
              >
                <s.icon style={{ width: 13, height: 13 }} />
                {s.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active section panel ── */}
      <main className="flex-1 px-4 pb-24">
        {/* Section heading strip */}
        <div className="flex items-center gap-2 mb-4">
          <current.icon className="w-4 h-4" style={{ color: current.color }} />
          <h1 className="text-sm font-bold uppercase tracking-wider" style={{ color: current.color }}>{current.label}</h1>
        </div>

        {PANEL_MAP[active]}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between mt-6 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <a href="#" className="flex items-center gap-1.5 text-sm" style={{ color: "#2AABEE" }}>
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="font-semibold">@urbanblend789</span>
          </a>
          <span className="text-xs" style={{ color: "#334155" }}>Pay with USDT · ETH</span>
        </div>
      </main>

      {/* ── Bottom tabs ── */}
      <nav className="fixed bottom-0 left-1/2" style={{ transform: "translateX(-50%)", width: 390, background: "rgba(13,17,23,0.97)", borderTop: "1px solid rgba(255,255,255,0.07)", paddingBottom: 16 }}>
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
