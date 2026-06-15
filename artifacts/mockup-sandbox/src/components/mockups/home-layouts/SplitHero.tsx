import React from "react";
import {
  ShoppingBag, Search, ArrowRight, MessageCircle,
  TestTube, ShieldCheck, FlaskConical, Users,
  Home, BookOpen, Calculator, User,
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

export function SplitHero() {
  return (
    <div
      className="w-full flex flex-col pb-14 min-h-screen"
      style={{ background: "#F0F4F8", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <TopNav />

      <main className="flex-1 flex flex-col px-3 pt-3 pb-3 gap-3 max-w-md mx-auto w-full">
        {/* Brand Header — compact */}
        <div className="text-center pt-1 pb-0">
          <h1
            className="text-2xl font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, #0F172A 0%, #3B82F6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Salt &amp; Peps
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 tracking-wide">Peptide group buys — quality tested, discreetly shipped.</p>
        </div>

        {/* SPLIT HERO — primary actions side by side */}
        <div className="flex gap-2.5" style={{ minHeight: "240px" }}>
          {/* Left: Place an order */}
          <div
            className="flex-1 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden"
            style={{ background: "linear-gradient(160deg, #0F172A 0%, #1E3A5F 100%)" }}
          >
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <ShoppingBag className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">New</span>
              </div>
              <h2 className="text-base font-bold text-white leading-tight mb-1">Place an order</h2>
              <p className="text-xs text-white/60 leading-snug">Browse products and checkout</p>
            </div>
            <button
              onClick={() => {}}
              className="mt-3 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-white w-full"
              style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}
            >
              <Users className="w-3.5 h-3.5" /> Login <ArrowRight className="w-3 h-3" />
            </button>
            <div
              className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
              style={{ background: "rgba(59,130,246,0.12)", transform: "translate(35%, -35%)" }}
            />
          </div>

          {/* Right: Manage order */}
          <div
            className="flex-1 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden"
            style={{ background: "linear-gradient(160deg, #1A2B3C 0%, #3D2A0A 100%)" }}
          >
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Search className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Returning</span>
              </div>
              <h2 className="text-base font-bold text-white leading-tight mb-1">Manage your order</h2>
              <p className="text-xs text-white/60 leading-snug">Track, edit, pay, or upload QR code</p>
            </div>
            <button
              onClick={() => {}}
              className="mt-3 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-white w-full"
              style={{ background: "linear-gradient(135deg, #EA580C, #C2410C)" }}
            >
              <Search className="w-3.5 h-3.5" /> My Orders
            </button>
            <div
              className="absolute bottom-0 left-0 w-24 h-24 rounded-full pointer-events-none"
              style={{ background: "rgba(234,88,12,0.10)", transform: "translate(-35%, 35%)" }}
            />
          </div>
        </div>

        {/* Divider label */}
        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 h-px" style={{ background: "rgba(15,23,42,0.12)" }} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tools &amp; Resources</span>
          <div className="flex-1 h-px" style={{ background: "rgba(15,23,42,0.12)" }} />
        </div>

        {/* Secondary tools — 3-column horizontal strip */}
        <div className="flex gap-2">
          {[
            {
              icon: TestTube,
              color: "#22D3EE",
              bg: "linear-gradient(160deg, #0A1628 0%, #0C2040 100%)",
              border: "rgba(34,211,238,0.18)",
              title: "Lab Reports",
              sub: "352+ tests",
            },
            {
              icon: ShieldCheck,
              color: "#4ADE80",
              bg: "linear-gradient(160deg, #0A1F1A 0%, #0D2420 100%)",
              border: "rgba(74,222,128,0.15)",
              title: "Safety Calc",
              sub: "Endotoxin",
            },
            {
              icon: FlaskConical,
              color: "#A78BFA",
              bg: "linear-gradient(160deg, #120A2E 0%, #1D0D45 100%)",
              border: "rgba(139,92,246,0.22)",
              title: "Lonely Vial",
              sub: "Single vials",
            },
          ].map(({ icon: Icon, color, bg, border, title, sub }) => (
            <button
              key={title}
              onClick={() => {}}
              className="flex-1 flex flex-col items-center gap-2 px-2 py-3 rounded-2xl text-center"
              style={{ background: bg, border: `1px solid ${border}` }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${color}18` }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color, width: "18px", height: "18px" }} />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">{title}</p>
                <p className="text-[9px] text-white/45 mt-0.5">{sub}</p>
              </div>
              <ArrowRight className="w-3 h-3 text-white/25" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 px-1">
          <a
            href="https://t.me/urbanblend789"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm"
            style={{ color: "#2AABEE" }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="font-semibold text-xs">@urbanblend789</span>
          </a>
          <span className="text-[10px] text-slate-400">Pay with USDT · Ethereum</span>
        </div>
      </main>

      <BottomTabs />
    </div>
  );
}
