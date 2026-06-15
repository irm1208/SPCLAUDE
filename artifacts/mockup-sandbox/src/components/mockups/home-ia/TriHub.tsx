import React from "react";
import { Users, FlaskConical, TestTube, Search, ArrowRight, MessageCircle, Home, BookOpen, Calculator, User } from "lucide-react";

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

export function TriHub() {
  return (
    <div className="w-full flex flex-col pb-14 min-h-screen" style={{ background: "#F0F4F8", fontFamily: "Inter, system-ui, sans-serif" }}>
      <TopNav />
      <main className="flex-1 flex flex-col px-4 pt-5 pb-4 gap-4 max-w-md mx-auto w-full">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Salt &amp; Peps</h1>
          <p className="text-xs text-slate-400 mt-0.5">Peptide group buys — quality tested, discreetly shipped.</p>
        </div>

        {/* Mode 1 — Group Buys: largest card */}
        <button onClick={() => {}} className="rounded-2xl overflow-hidden relative text-left w-full" style={{ background: "linear-gradient(160deg, #0F172A 0%, #0D2550 100%)", minHeight: "180px" }}>
          <div className="p-5 flex flex-col gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.2)" }}>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Primary · Group Buys</p>
              <h2 className="text-xl font-black text-white mt-0.5">Group Buy Login</h2>
              <p className="text-sm text-white/55 mt-1">Browse 126+ products and place your kit order.</p>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-blue-300">Enter → <ArrowRight className="w-4 h-4" /></div>
          </div>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none" style={{ background: "rgba(59,130,246,0.1)", transform: "translate(35%,-35%)" }} />
        </button>

        {/* Mode 2 — Lonely Vial */}
        <button onClick={() => {}} className="rounded-2xl overflow-hidden relative text-left w-full" style={{ background: "linear-gradient(160deg, #120A2E 0%, #1D0D45 100%)", minHeight: "150px", border: "1px solid rgba(139,92,246,0.25)" }}>
          <div className="p-5 flex flex-col gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.25)" }}>
              <FlaskConical className="w-5 h-5" style={{ color: "#A78BFA" }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#A78BFA" }}>Primary · Single Vials</p>
              <h2 className="text-xl font-black text-white mt-0.5">The Lonely Vial</h2>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>Individual vials, no minimums, pay with USDT.</p>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: "#A78BFA" }}>Browse Shop <ArrowRight className="w-4 h-4" /></div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: "rgba(139,92,246,0.1)", transform: "translate(35%,-35%)" }} />
        </button>

        {/* Mode 3 — Tools & Lab */}
        <button onClick={() => {}} className="rounded-2xl text-left w-full" style={{ background: "linear-gradient(160deg, #0A1628 0%, #0C1F38 100%)", minHeight: "110px", border: "1px solid rgba(34,211,238,0.15)" }}>
          <div className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(34,211,238,0.15)" }}>
              <TestTube className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Secondary · Tools &amp; Lab</p>
              <h2 className="text-base font-black text-white mt-0.5">Lab Reports &amp; Calculators</h2>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>CoA tests, endotoxin calc, BAC safety</p>
            </div>
            <ArrowRight className="w-4 h-4 text-cyan-400 shrink-0" />
          </div>
        </button>

        {/* Manage order — tertiary, small */}
        <button onClick={() => {}} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-slate-200 w-full text-left">
          <Search className="w-4 h-4 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">Manage your order</p>
            <p className="text-xs text-slate-400">Track, edit, pay, or upload QR code</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
        </button>

        <div className="flex items-center justify-between px-1">
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#2AABEE" }}><MessageCircle className="w-3.5 h-3.5" /> @urbanblend789</a>
          <span className="text-[10px] text-slate-400">Pay with USDT · Ethereum</span>
        </div>
      </main>
      <BottomTabs />
    </div>
  );
}
