import React from "react";
import {
  ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical,
  MessageCircle, Home, BookOpen, Calculator, User, BookMarked,
  ArrowRight,
} from "lucide-react";

function TopNav() {
  return (
    <div
      className="flex items-center justify-between px-4 h-12 shrink-0"
      style={{ background: "#0F172A", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <span className="text-sm font-bold text-white tracking-wide">Salt &amp; Peps</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {}}
          className="text-xs font-semibold text-slate-300 flex items-center gap-1 px-2 py-1 rounded-lg"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <User className="w-3 h-3" /> Login
        </button>
        <span className="text-xs font-bold text-white px-2 py-1 rounded-lg" style={{ background: "#3B82F6" }}>USD</span>
      </div>
    </div>
  );
}

function BottomTabs() {
  return (
    <div
      className="fixed bottom-0 inset-x-0 flex h-14 border-t"
      style={{ background: "#0F172A", borderColor: "rgba(255,255,255,0.08)" }}
    >
      {[
        { icon: Home, label: "Home", active: true },
        { icon: BookOpen, label: "Protocols", active: false },
        { icon: Calculator, label: "Calc", active: false },
        { icon: User, label: "Account", active: false },
      ].map(({ icon: Icon, label, active }) => (
        <button key={label} onClick={() => {}} className="flex-1 flex flex-col items-center justify-center gap-0.5">
          <Icon className={`w-5 h-5 ${active ? "text-blue-400" : "text-slate-500"}`} />
          <span className={`text-[10px] font-semibold ${active ? "text-blue-400" : "text-slate-500"}`}>{label}</span>
        </button>
      ))}
    </div>
  );
}

const TILES = [
  {
    icon: ShoppingBag,
    color: "#60A5FA",
    tint: "rgba(59,130,246,0.14)",
    ring: "rgba(59,130,246,0.25)",
    label: "New Customer",
    title: "Place an Order",
  },
  {
    icon: Search,
    color: "#FCA5A1",
    tint: "rgba(234,88,12,0.14)",
    ring: "rgba(234,88,12,0.25)",
    label: "Returning",
    title: "My Orders",
  },
  {
    icon: TestTube,
    color: "#22D3EE",
    tint: "rgba(6,182,212,0.12)",
    ring: "rgba(6,182,212,0.22)",
    label: "QA",
    title: "Lab Reports",
  },
  {
    icon: ShieldCheck,
    color: "#4ADE80",
    tint: "rgba(34,197,94,0.12)",
    ring: "rgba(34,197,94,0.22)",
    label: "Safety",
    title: "Calculator",
  },
  {
    icon: FlaskConical,
    color: "#A78BFA",
    tint: "rgba(139,92,246,0.12)",
    ring: "rgba(139,92,246,0.22)",
    label: "Singles",
    title: "Lonely Vial",
  },
  {
    icon: BookMarked,
    color: "#F9A8D4",
    tint: "rgba(244,114,182,0.12)",
    ring: "rgba(244,114,182,0.22)",
    label: "Info",
    title: "Protocols",
  },
];

export function QuickLaunchGrid() {
  return (
    <div
      className="w-full flex flex-col pb-14 min-h-screen"
      style={{ background: "#0B1120", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <TopNav />

      <main className="flex-1 px-4 pt-4 pb-4 max-w-md mx-auto w-full flex flex-col">

        {/* Brand Hero — dark, tight */}
        <div
          className="rounded-2xl px-5 py-5 mb-4 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", border: "1px solid rgba(59,130,246,0.15)" }}
        >
          <h1
            className="text-2xl font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, #FFFFFF 0%, #93C5FD 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Salt &amp; Peps
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 tracking-wide">Peps Anonymous</p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-[220px]">
            Peptide group buys — quality tested, discreetly shipped.
          </p>
          <div
            className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)", transform: "translate(20%, -20%)" }}
          />
        </div>

        {/* 2-column launch grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {TILES.map(({ icon: Icon, color, tint, ring, label, title }) => (
            <button
              key={title}
              onClick={() => {}}
              className="rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center relative overflow-hidden"
              style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", minHeight: "118px" }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: tint, boxShadow: `0 0 0 1px ${ring}` }}
              >
                <Icon className="w-6 h-6" style={{ color }} />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: `${color}99` }}>{label}</p>
                <p className="text-sm font-bold text-white leading-tight">{title}</p>
              </div>
              <div
                className="absolute bottom-0 right-0 w-16 h-16 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${tint} 0%, transparent 70%)`, transform: "translate(30%, 30%)" }}
              />
            </button>
          ))}
        </div>

        {/* Status bar */}
        <button
          onClick={() => {}}
          className="rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          <p className="text-xs text-slate-400 flex-1 text-left">Group buy open · Next close in 3 days</p>
          <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
        </button>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 px-1">
          <a
            href="https://t.me/urbanblend789"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5"
            style={{ color: "#2AABEE" }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="font-semibold text-xs">@urbanblend789</span>
          </a>
          <span className="text-[10px] text-slate-600">Pay with USDT · Ethereum</span>
        </div>

      </main>

      <BottomTabs />
    </div>
  );
}
