import React from "react";
import { Users, FlaskConical, TestTube, ArrowRight, MessageCircle, User } from "lucide-react";

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

export function QuickRouter() {
  return (
    <div className="w-full flex flex-col min-h-screen" style={{ background: "#F0F4F8", fontFamily: "Inter, system-ui, sans-serif" }}>
      <TopNav />
      <main className="flex-1 flex flex-col px-4 pt-6 pb-6 gap-4 max-w-md mx-auto w-full justify-center">

        {/* Centred question */}
        <div className="text-center mb-2">
          <h1 className="text-3xl font-black text-slate-900 leading-tight">What are you<br />here for?</h1>
          <p className="text-xs text-slate-400 mt-2">Salt &amp; Peps · Quality tested, discreetly shipped.</p>
        </div>

        {/* Answer card 1 — Group Buys */}
        <button onClick={() => {}} className="rounded-2xl overflow-hidden relative text-left w-full" style={{ background: "linear-gradient(160deg, #0F172A 0%, #0D2550 100%)", minHeight: "140px" }}>
          <div className="p-5 flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(59,130,246,0.2)" }}>
              <Users className="w-7 h-7 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-0.5">Most Popular</p>
              <h2 className="text-xl font-black text-white">Kit group buys</h2>
              <p className="text-sm text-white/50 mt-1 leading-snug">126+ products, group buy pricing, discreet delivery.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-400 shrink-0" />
          </div>
          <div className="absolute top-0 right-0 w-36 h-36 rounded-full pointer-events-none" style={{ background: "rgba(59,130,246,0.1)", transform: "translate(35%,-35%)" }} />
        </button>

        {/* Answer card 2 — Single Vials */}
        <button onClick={() => {}} className="rounded-2xl overflow-hidden relative text-left w-full" style={{ background: "linear-gradient(160deg, #120A2E 0%, #1D0D45 100%)", minHeight: "130px", border: "1px solid rgba(139,92,246,0.25)" }}>
          <div className="p-5 flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.25)" }}>
              <FlaskConical className="w-7 h-7" style={{ color: "#A78BFA" }} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black text-white">Single vials</h2>
              <p className="text-sm mt-1 leading-snug" style={{ color: "rgba(255,255,255,0.5)" }}>Individual vials, no minimums, pay with USDT.</p>
            </div>
            <ArrowRight className="w-5 h-5 shrink-0" style={{ color: "#A78BFA" }} />
          </div>
          <div className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none" style={{ background: "rgba(139,92,246,0.10)", transform: "translate(35%,-35%)" }} />
        </button>

        {/* Answer card 3 — Tools & Lab */}
        <button onClick={() => {}} className="rounded-2xl overflow-hidden text-left w-full" style={{ background: "linear-gradient(160deg, #0A1628 0%, #0C1F38 100%)", minHeight: "100px", border: "1px solid rgba(34,211,238,0.15)" }}>
          <div className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(34,211,238,0.15)" }}>
              <TestTube className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-black text-white">Tools &amp; Lab Reports</h2>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>CoA reports, endotoxin calc, BAC safety, peptide calc</p>
            </div>
            <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0" />
          </div>
        </button>

        {/* Footer */}
        <div className="flex items-center justify-between px-1 mt-2">
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#2AABEE" }}><MessageCircle className="w-3.5 h-3.5" /> @urbanblend789</a>
          <span className="text-[10px] text-slate-400">Pay with USDT · Ethereum</span>
        </div>
      </main>
    </div>
  );
}
