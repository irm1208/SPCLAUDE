import React, { useRef } from "react";
import {
  ShoppingBag, Search, ArrowRight, MessageCircle,
  TestTube, ShieldCheck, FlaskConical, Users,
  Home, BookOpen, Calculator, User, ChevronRight,
} from "lucide-react";

function TopNav() {
  return (
    <div className="flex items-center justify-between px-4 h-12 shrink-0 bg-[#0F172A] border-b border-white/5">
      <span className="text-sm font-bold text-white tracking-wide">Salt &amp; Peps</span>
      <div className="flex items-center gap-2">
        <button onClick={() => {}} className="text-xs font-semibold text-slate-300 flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.08)" }}>
          <User className="w-3 h-3" /> Login
        </button>
        <span className="text-xs font-bold text-white px-2 py-1 rounded-lg bg-blue-600">USD</span>
      </div>
    </div>
  );
}

function BottomTabs() {
  return (
    <div className="fixed bottom-0 inset-x-0 flex h-14 border-t bg-[#0F172A] border-white/8">
      {[{ icon: Home, label: "Home", active: true }, { icon: BookOpen, label: "Protocols", active: false }, { icon: Calculator, label: "Calc", active: false }, { icon: User, label: "Account", active: false }].map(({ icon: Icon, label, active }) => (
        <button key={label} onClick={() => {}} className="flex-1 flex flex-col items-center justify-center gap-0.5">
          <Icon className={`w-5 h-5 ${active ? "text-blue-400" : "text-slate-500"}`} />
          <span className={`text-[10px] font-semibold ${active ? "text-blue-400" : "text-slate-500"}`}>{label}</span>
        </button>
      ))}
    </div>
  );
}

const SECTIONS = [
  {
    id: "order",
    icon: Users,
    accentColor: "#60A5FA",
    badge: "New Customer",
    title: "Place an order",
    desc: "Browse 126+ peptide products and submit your order for the next group buy.",
    cta: "Group Buy Login",
    bg: "linear-gradient(160deg, #0F172A 0%, #0D2550 100%)",
    border: "rgba(59,130,246,0.2)",
    ctaBg: "linear-gradient(135deg, #3B82F6, #2563EB)",
    orb: "rgba(59,130,246,0.12)",
  },
  {
    id: "manage",
    icon: Search,
    accentColor: "#FCA5A1",
    badge: "Returning",
    title: "Manage your order",
    desc: "Track, edit, pay, or upload your InPost QR code for any existing order.",
    cta: "My Orders",
    bg: "linear-gradient(160deg, #1A2B3C 0%, #3D2A0A 100%)",
    border: "rgba(234,88,12,0.2)",
    ctaBg: "linear-gradient(135deg, #EA580C, #C2410C)",
    orb: "rgba(234,88,12,0.10)",
  },
  {
    id: "lab",
    icon: TestTube,
    accentColor: "#22D3EE",
    badge: "Quality Assurance",
    title: "Lab Reports",
    desc: "Independent Janoshik CoA tests — 352+ reports from supplier Uther.",
    cta: "Browse Results",
    bg: "linear-gradient(160deg, #0A1628 0%, #0F2240 100%)",
    border: "rgba(34,211,238,0.15)",
    ctaBg: "linear-gradient(135deg, #0EA5E9, #0284C7)",
    orb: "rgba(34,211,238,0.06)",
  },
  {
    id: "safety",
    icon: ShieldCheck,
    accentColor: "#4ADE80",
    badge: "Endotoxin & BAC",
    title: "Safety Calculator",
    desc: "Calculate endotoxin limits and BAC water safety for your reconstituted peptides.",
    cta: "Open Calculator",
    bg: "linear-gradient(160deg, #0A1F2E 0%, #0D2B20 100%)",
    border: "rgba(74,222,128,0.12)",
    ctaBg: "linear-gradient(135deg, #16A34A, #15803D)",
    orb: "rgba(74,222,128,0.06)",
  },
  {
    id: "vial",
    icon: FlaskConical,
    accentColor: "#A78BFA",
    badge: "Single Vials",
    title: "The Lonely Vial",
    desc: "Buy individual vials — no kits, no minimums. Pay with USDT.",
    cta: "Browse the Shop",
    bg: "linear-gradient(160deg, #120A2E 0%, #1D0D45 100%)",
    border: "rgba(139,92,246,0.2)",
    ctaBg: "linear-gradient(135deg, #7C3AED, #6D28D9)",
    orb: "rgba(139,92,246,0.08)",
  },
];

export function HorizontalCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full flex flex-col pb-14 min-h-screen" style={{ background: "#0B1120", fontFamily: "Inter, system-ui, sans-serif" }}>
      <TopNav />
      <main className="flex-1 flex flex-col pt-4 pb-3 gap-4 max-w-md mx-auto w-full overflow-hidden">

        {/* Brand — left-aligned for a dashboard feel */}
        <div className="px-4">
          <h1 className="text-2xl font-black tracking-tight" style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #93C5FD 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Salt &amp; Peps
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-slate-500">Peptide group buys — discreetly shipped.</p>
            <div className="flex items-center gap-1 ml-auto text-[10px] text-slate-500">
              <span>Scroll</span> <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Horizontal scrolling carousel — all 5 sections as peers */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2"
          style={{
            paddingLeft: "16px",
            paddingRight: "16px",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {SECTIONS.map(({ id, icon: Icon, accentColor, badge, title, desc, cta, bg, border, ctaBg, orb }) => (
            <div
              key={id}
              className="flex-none flex flex-col justify-between relative overflow-hidden rounded-2xl p-4"
              style={{
                background: bg,
                border: `1px solid ${border}`,
                width: "210px",
                minHeight: "340px",
                scrollSnapAlign: "start",
              }}
            >
              <div className="flex flex-col gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `${accentColor}18` }}>
                  <Icon style={{ color: accentColor, width: "22px", height: "22px" }} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: accentColor }}>{badge}</p>
                  <h2 className="text-lg font-black text-white leading-tight">{title}</h2>
                  <p className="text-xs text-white/55 mt-2 leading-relaxed">{desc}</p>
                </div>
              </div>
              <button
                onClick={() => {}}
                className="h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 text-white w-full mt-4"
                style={{ background: ctaBg }}
              >
                {cta} <ArrowRight className="w-3.5 h-3.5" />
              </button>
              {/* orb */}
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${orb} 0%, transparent 70%)`, transform: "translate(30%,-30%)" }} />
            </div>
          ))}
        </div>

        {/* Scroll progress dots */}
        <div className="flex items-center justify-center gap-1.5 px-4">
          {SECTIONS.map((s, i) => (
            <div
              key={s.id}
              className="rounded-full transition-all"
              style={{ width: i === 0 ? "20px" : "6px", height: "6px", background: i === 0 ? "#3B82F6" : "rgba(255,255,255,0.2)" }}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4">
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#2AABEE" }}>
            <MessageCircle className="w-3.5 h-3.5" /> @urbanblend789
          </a>
          <span className="text-[10px] text-slate-600">Pay with USDT · Ethereum</span>
        </div>
      </main>
      <BottomTabs />
    </div>
  );
}
