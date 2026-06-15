import React, { useState } from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight, MessageCircle, Home, BookOpen, Calculator, User, ChevronDown, ChevronUp } from "lucide-react";

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

export function DrawerTools() {
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <div className="w-full flex flex-col pb-14 min-h-screen" style={{ background: "#F0F4F8", fontFamily: "Inter, system-ui, sans-serif" }}>
      <TopNav />
      <main className="flex-1 flex flex-col px-4 pt-4 pb-4 gap-3 max-w-md mx-auto w-full">

        <div className="pt-1"><h1 className="text-2xl font-black text-slate-900">Salt &amp; Peps</h1><p className="text-xs text-slate-400 mt-0.5">Quality tested, discreetly shipped.</p></div>

        {/* PRIMARY — Group Buy */}
        <div className="rounded-2xl overflow-hidden relative" style={{ background: "linear-gradient(160deg, #0F172A 0%, #0D2550 100%)", minHeight: "200px" }}>
          <div className="p-5 flex flex-col gap-3 relative z-10">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Group Buys · Primary</p><h2 className="text-xl font-black text-white mt-1">Place an order</h2><p className="text-sm text-white/55 mt-1">Browse 126+ products and submit your group buy order.</p></div>
            <button onClick={() => {}} className="h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white w-full" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "0 4px 16px rgba(59,130,246,0.4)" }}><Users className="w-4 h-4" /> Group Buy Login <ArrowRight className="w-4 h-4" /></button>
          </div>
          <div className="absolute top-0 right-0 w-36 h-36 rounded-full pointer-events-none" style={{ background: "rgba(59,130,246,0.12)", transform: "translate(35%,-35%)" }} />
        </div>

        {/* PRIMARY — Lonely Vial */}
        <div className="rounded-2xl overflow-hidden relative flex items-center gap-4 px-5" style={{ background: "linear-gradient(160deg, #120A2E 0%, #1D0D45 100%)", minHeight: "90px", border: "1px solid rgba(139,92,246,0.25)" }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.25)" }}><FlaskConical className="w-5 h-5" style={{ color: "#A78BFA" }} /></div>
          <div className="flex-1 relative z-10">
            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "#A78BFA" }}>Single Vials · Primary</p>
            <p className="text-base font-black text-white">The Lonely Vial</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>Individual vials, no minimums, USDT.</p>
          </div>
          <button onClick={() => {}} className="h-9 px-3 rounded-xl text-xs font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}>Shop →</button>
        </div>

        {/* Manage order — secondary row */}
        <button onClick={() => {}} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-slate-200 w-full text-left">
          <Search className="w-3.5 h-3.5 text-amber-500" />
          <div className="flex-1"><p className="text-xs font-bold text-slate-700">Manage your order</p><p className="text-[10px] text-slate-400">Track, edit, pay, upload QR</p></div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
        </button>

        {/* Tools drawer — expands inline */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(160deg, #0A1628 0%, #0C1F38 100%)", border: "1px solid rgba(34,211,238,0.15)" }}>
          <button onClick={() => setToolsOpen(v => !v)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
            <TestTube className="w-4 h-4 text-cyan-400" />
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Tools &amp; Lab Reports</p>
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>CoA tests · Safety calc · Endotoxin</p>
            </div>
            {toolsOpen ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
          {toolsOpen && (
            <div className="flex flex-col" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { icon: TestTube, color: "#22D3EE", label: "Lab Reports", sub: "352+ CoA tests" },
                { icon: ShieldCheck, color: "#4ADE80", label: "Safety Calculator", sub: "Endotoxin & BAC" },
              ].map(({ icon: Icon, color, label, sub }) => (
                <button key={label} onClick={() => {}} className="flex items-center gap-3 px-4 py-3 w-full text-left" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}><Icon style={{ color, width: "13px", height: "13px" }} /></div>
                  <div><p className="text-xs font-bold text-white">{label}</p><p className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>{sub}</p></div>
                  <ArrowRight className="w-3 h-3 ml-auto shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
                </button>
              ))}
            </div>
          )}
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
