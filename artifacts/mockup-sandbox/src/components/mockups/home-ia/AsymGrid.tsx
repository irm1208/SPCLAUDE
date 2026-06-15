import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight, MessageCircle, Home, BookOpen, Calculator, User } from "lucide-react";

function TopNav() {
  return (
    <div className="flex items-center justify-between px-4 h-12 shrink-0 bg-white border-b border-slate-100">
      <span className="text-sm font-bold text-slate-900 tracking-wide">Salt &amp; Peps</span>
      <div className="flex items-center gap-2">
        <button onClick={() => {}} className="text-xs font-semibold text-slate-600 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100"><User className="w-3 h-3" /> Login</button>
        <span className="text-xs font-bold text-white px-2 py-1 rounded-lg bg-blue-600">USD</span>
      </div>
    </div>
  );
}

function BottomTabs() {
  return (
    <div className="fixed bottom-0 inset-x-0 flex h-14 border-t bg-white border-slate-100">
      {[{ icon: Home, label: "Home", active: true }, { icon: BookOpen, label: "Protocols", active: false }, { icon: Calculator, label: "Calc", active: false }, { icon: User, label: "Account", active: false }].map(({ icon: Icon, label, active }) => (
        <button key={label} onClick={() => {}} className="flex-1 flex flex-col items-center justify-center gap-0.5">
          <Icon className={`w-5 h-5 ${active ? "text-blue-600" : "text-slate-400"}`} />
          <span className={`text-[10px] font-semibold ${active ? "text-blue-600" : "text-slate-400"}`}>{label}</span>
        </button>
      ))}
    </div>
  );
}

export function AsymGrid() {
  return (
    <div className="w-full flex flex-col pb-14 min-h-screen" style={{ background: "#F0F4F8", fontFamily: "Inter, system-ui, sans-serif" }}>
      <TopNav />
      <main className="flex-1 flex flex-col px-4 pt-4 pb-4 gap-3 max-w-md mx-auto w-full">
        <div className="pt-1"><h1 className="text-2xl font-black text-slate-900">Salt &amp; Peps</h1><p className="text-xs text-slate-400 mt-0.5">Quality tested, discreetly shipped.</p></div>

        {/* PRIMARY — full-width Group Buy hero */}
        <button onClick={() => {}} className="rounded-2xl overflow-hidden relative text-left w-full" style={{ background: "linear-gradient(160deg, #0F172A 0%, #0D2550 100%)", minHeight: "165px" }}>
          <div className="p-5 flex flex-col gap-3 relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Group Buys · Primary</p>
            <h2 className="text-2xl font-black text-white leading-tight">Place an order</h2>
            <button onClick={(e) => { e.stopPropagation(); }} className="h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 text-white" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", width: "fit-content", padding: "0 16px" }}><Users className="w-3.5 h-3.5" /> Group Buy Login</button>
          </div>
          <div className="absolute top-0 right-0 w-36 h-36 rounded-full pointer-events-none" style={{ background: "rgba(59,130,246,0.12)", transform: "translate(35%,-35%)" }} />
        </button>

        {/* TWO MEDIUM — Lonely Vial (60%) + Manage (40%) */}
        <div className="flex gap-2" style={{ minHeight: "130px" }}>
          <button onClick={() => {}} className="flex-[3] rounded-2xl overflow-hidden relative text-left" style={{ background: "linear-gradient(160deg, #120A2E 0%, #1D0D45 100%)", border: "1px solid rgba(139,92,246,0.25)" }}>
            <div className="p-4 flex flex-col gap-2 relative z-10 h-full justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "#A78BFA" }}>Single Vials</p>
                <p className="text-base font-black text-white leading-tight">The Lonely Vial</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>No kits, no minimums.</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); }} className="h-8 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1 w-full" style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}>Shop →</button>
            </div>
          </button>
          <button onClick={() => {}} className="flex-[2] rounded-2xl text-left" style={{ background: "white", border: "1px solid #E2E8F0" }}>
            <div className="p-4 flex flex-col gap-2 h-full justify-between">
              <div>
                <Search className="w-4 h-4 text-amber-500 mb-1" />
                <p className="text-xs font-bold text-slate-800 leading-tight">Manage order</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Track &amp; edit</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            </div>
          </button>
        </div>

        {/* TOOLS strip — 2 compact tiles */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">Tools &amp; Lab</p>
          <div className="flex gap-2">
            {[
              { icon: TestTube, color: "#22D3EE", bg: "linear-gradient(160deg,#0A1628,#0C2040)", border: "rgba(34,211,238,0.18)", title: "Lab Reports", sub: "352+ tests" },
              { icon: ShieldCheck, color: "#4ADE80", bg: "linear-gradient(160deg,#0A1F1A,#0D2420)", border: "rgba(74,222,128,0.14)", title: "Safety Calc", sub: "Endotoxin" },
            ].map(({ icon: Icon, color, bg, border, title, sub }) => (
              <button key={title} onClick={() => {}} className="flex-1 flex flex-col gap-1.5 px-3 py-3 rounded-2xl" style={{ background: bg, border: `1px solid ${border}` }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}><Icon style={{ color, width: "14px", height: "14px" }} /></div>
                <p className="text-xs font-bold text-white">{title}</p>
                <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>{sub}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-1">
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#2AABEE" }}><MessageCircle className="w-3.5 h-3.5" /> @urbanblend789</a>
          <span className="text-[10px] text-slate-400">Pay with USDT · Ethereum</span>
        </div>
      </main>
      <BottomTabs />
    </div>
  );
}
