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

export function HubSpoke() {
  return (
    <div className="w-full flex flex-col pb-14 min-h-screen" style={{ background: "#F0F4F8", fontFamily: "Inter, system-ui, sans-serif" }}>
      <TopNav />
      <main className="flex-1 flex flex-col px-4 pt-4 pb-4 gap-3 max-w-md mx-auto w-full">

        {/* Central hub banner */}
        <div className="rounded-2xl px-5 py-4 bg-white border border-slate-200 text-center">
          <h1 className="text-xl font-black text-slate-900">Salt &amp; Peps</h1>
          <p className="text-xs text-slate-400 mt-0.5">Where would you like to go?</p>
        </div>

        {/* SPOKE 1 — Group Buys: widest card */}
        <button onClick={() => {}} className="rounded-2xl overflow-hidden relative text-left w-full" style={{ background: "linear-gradient(135deg, #0F172A 0%, #0D2550 100%)", minHeight: "160px" }}>
          <div className="p-5 relative z-10 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.2)" }}><Users className="w-6 h-6 text-blue-400" /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Primary</p>
                <h2 className="text-xl font-black text-white">Group Buy Login</h2>
                <p className="text-xs text-white/50">126+ products, kit orders</p>
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); }} className="h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 text-white w-full" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}><Users className="w-3.5 h-3.5" /> Enter <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="absolute top-0 right-0 w-36 h-36 rounded-full pointer-events-none" style={{ background: "rgba(59,130,246,0.12)", transform: "translate(35%,-35%)" }} />
        </button>

        {/* SPOKES 2 & 3 side by side */}
        <div className="flex gap-3">
          {/* Lonely Vial */}
          <button onClick={() => {}} className="flex-1 rounded-2xl overflow-hidden relative text-left" style={{ background: "linear-gradient(160deg, #120A2E 0%, #1D0D45 100%)", minHeight: "160px", border: "1px solid rgba(139,92,246,0.25)" }}>
            <div className="p-4 flex flex-col gap-2 relative z-10 h-full justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: "rgba(124,58,237,0.25)" }}><FlaskConical className="w-5 h-5" style={{ color: "#A78BFA" }} /></div>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "#A78BFA" }}>Primary</p>
                <p className="text-sm font-black text-white leading-tight">The Lonely Vial</p>
                <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>Individual vials, USDT</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); }} className="h-8 rounded-lg text-xs font-bold text-white w-full" style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}>Browse →</button>
            </div>
          </button>

          {/* Tools & Lab */}
          <button onClick={() => {}} className="flex-1 rounded-2xl overflow-hidden relative text-left" style={{ background: "linear-gradient(160deg, #0A1628 0%, #0C1F38 100%)", minHeight: "160px", border: "1px solid rgba(34,211,238,0.15)" }}>
            <div className="p-4 flex flex-col gap-2 relative z-10 h-full justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: "rgba(34,211,238,0.15)" }}><TestTube className="w-5 h-5 text-cyan-400" /></div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-cyan-400 mb-0.5">Secondary</p>
                <p className="text-sm font-black text-white leading-tight">Tools &amp; Lab</p>
                <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>CoA · Calc · Safety</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); }} className="h-8 rounded-lg text-xs font-bold text-white w-full" style={{ background: "rgba(34,211,238,0.18)" }}>Open →</button>
            </div>
          </button>
        </div>

        {/* MANAGE — tertiary slim row */}
        <button onClick={() => {}} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-slate-200 w-full text-left">
          <Search className="w-4 h-4 text-amber-500" />
          <div className="flex-1"><p className="text-sm font-bold text-slate-800">Manage your order</p><p className="text-xs text-slate-400">Track, edit, pay, upload QR</p></div>
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
