import React from "react";
import {
  ShoppingBag, Search, ArrowRight, MessageCircle,
  TestTube, ShieldCheck, FlaskConical, Users,
  Home, BookOpen, Calculator, User,
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

export function VerticalFocus() {
  return (
    <div className="w-full flex flex-col pb-14 min-h-screen" style={{ background: "#F0F4F8", fontFamily: "Inter, system-ui, sans-serif" }}>
      <TopNav />
      <main className="flex-1 flex flex-col px-4 pt-4 pb-4 gap-3 max-w-md mx-auto w-full">

        {/* Brand — compact */}
        <div className="text-center pt-1 pb-1">
          <h1 className="text-2xl font-black tracking-tight" style={{ background: "linear-gradient(135deg, #0F172A 0%, #3B82F6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Salt &amp; Peps
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Peptide group buys — quality tested, discreetly shipped.</p>
        </div>

        {/* PRIMARY 1 — Group Buy Login: tall hero, full width */}
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{ background: "linear-gradient(160deg, #0F172A 0%, #0D2550 100%)", minHeight: "210px" }}
        >
          <div className="p-6 flex flex-col gap-3 relative z-10">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">New Customer</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white leading-tight">Place an order</h2>
              <p className="text-sm text-white/60 mt-1 leading-relaxed">Browse 126+ peptide products and submit your order for the next group buy.</p>
            </div>
            <button
              onClick={() => {}}
              className="h-13 rounded-xl text-sm font-black flex items-center justify-center gap-2 text-white w-full mt-1"
              style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "0 4px 20px rgba(59,130,246,0.4)", height: "52px" }}
            >
              <Users className="w-4 h-4" /> Group Buy Login <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none" style={{ background: "rgba(59,130,246,0.12)", transform: "translate(35%,-35%)" }} />
        </div>

        {/* PRIMARY 2 — Lonely Vial: full width, strong but slightly shorter */}
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{ background: "linear-gradient(160deg, #120A2E 0%, #1D0D45 100%)", minHeight: "160px", border: "1px solid rgba(139,92,246,0.25)" }}
        >
          <div className="p-5 flex flex-col gap-3 relative z-10">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" style={{ color: "#A78BFA" }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#A78BFA" }}>Single Vials</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-white leading-tight">The Lonely Vial</h2>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>Buy individual vials — no kits, no minimums. Pay with USDT.</p>
            </div>
            <button
              onClick={() => {}}
              className="h-11 rounded-xl text-sm font-black flex items-center justify-center gap-2 text-white w-full"
              style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)", boxShadow: "0 4px 14px rgba(124,58,237,0.35)" }}
            >
              <FlaskConical className="w-4 h-4" /> Browse the Shop <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: "rgba(139,92,246,0.10)", transform: "translate(35%,-35%)" }} />
        </div>

        {/* SEPARATOR */}
        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 h-px" style={{ background: "rgba(15,23,42,0.12)" }} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">More</span>
          <div className="flex-1 h-px" style={{ background: "rgba(15,23,42,0.12)" }} />
        </div>

        {/* SECONDARY — Manage your order: full width, muted, compact */}
        <div
          className="rounded-2xl flex items-center gap-3 px-4 overflow-hidden relative"
          style={{ background: "linear-gradient(135deg, #1A2B3C 0%, #3D2A0A 100%)", height: "68px" }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(234,88,12,0.22)" }}>
            <Search className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Returning</p>
            <p className="text-sm font-bold text-white leading-tight">Manage your order</p>
          </div>
          <button onClick={() => {}} className="h-8 px-3 rounded-xl text-xs font-bold text-white shrink-0 flex items-center gap-1" style={{ background: "linear-gradient(135deg, #EA580C, #C2410C)" }}>
            My Orders <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* UTILITY — 2-col icon tiles */}
        <div className="flex gap-2">
          {[
            { icon: TestTube, color: "#22D3EE", bg: "linear-gradient(160deg,#0A1628,#0C2040)", border: "rgba(34,211,238,0.18)", title: "Lab Reports", sub: "352+ CoA tests" },
            { icon: ShieldCheck, color: "#4ADE80", bg: "linear-gradient(160deg,#0A1F1A,#0D2420)", border: "rgba(74,222,128,0.14)", title: "Safety Calc", sub: "Endotoxin & BAC" },
          ].map(({ icon: Icon, color, bg, border, title, sub }) => (
            <button key={title} onClick={() => {}} className="flex-1 flex flex-col gap-1.5 px-3 py-3 rounded-2xl" style={{ background: bg, border: `1px solid ${border}` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon style={{ color, width: "16px", height: "16px" }} />
              </div>
              <p className="text-xs font-bold text-white leading-tight">{title}</p>
              <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>{sub}</p>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 px-1">
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#2AABEE" }}>
            <MessageCircle className="w-3.5 h-3.5" /> @urbanblend789
          </a>
          <span className="text-[10px] text-slate-400">Pay with USDT · Ethereum</span>
        </div>
      </main>
      <BottomTabs />
    </div>
  );
}
