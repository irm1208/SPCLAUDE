import React, { useState } from "react";
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

const TABS = ["Group Buys", "Single Vials", "Tools & Lab"] as const;
type Tab = typeof TABS[number];

export function TopSegment() {
  const [active, setActive] = useState<Tab>("Group Buys");
  return (
    <div className="w-full flex flex-col pb-14 min-h-screen" style={{ background: "#F0F4F8", fontFamily: "Inter, system-ui, sans-serif" }}>
      <TopNav />

      {/* Segmented control pinned below nav */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-2">
        <div className="flex rounded-xl p-1 gap-1" style={{ background: "#F0F4F8" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setActive(t)} className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all" style={{ background: active === t ? "white" : "transparent", color: active === t ? "#1E40AF" : "#64748B", boxShadow: active === t ? "0 1px 4px rgba(0,0,0,0.10)" : undefined }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 flex flex-col px-4 pt-4 pb-4 gap-3 max-w-md mx-auto w-full">
        {active === "Group Buys" && (
          <>
            <div className="rounded-2xl overflow-hidden relative" style={{ background: "linear-gradient(160deg, #0F172A 0%, #0D2550 100%)", minHeight: "220px" }}>
              <div className="p-6 flex flex-col gap-4 relative z-10">
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">New Customer</p><h2 className="text-2xl font-black text-white mt-1">Place an order</h2><p className="text-sm text-white/55 mt-2 leading-relaxed">Browse 126+ peptide products and submit your group buy order.</p></div>
                <button onClick={() => {}} className="h-13 rounded-xl text-sm font-black flex items-center justify-center gap-2 text-white w-full" style={{ height: "52px", background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "0 4px 20px rgba(59,130,246,0.4)" }}><Users className="w-4 h-4" /> Group Buy Login <ArrowRight className="w-4 h-4" /></button>
              </div>
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none" style={{ background: "rgba(59,130,246,0.12)", transform: "translate(35%,-35%)" }} />
            </div>
            <button onClick={() => {}} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-slate-200 w-full text-left">
              <Search className="w-4 h-4 text-amber-500" />
              <div className="flex-1"><p className="text-sm font-bold text-slate-800">Manage your order</p><p className="text-xs text-slate-400">Track, edit, pay, upload QR</p></div>
              <ArrowRight className="w-4 h-4 text-slate-300" />
            </button>
          </>
        )}
        {active === "Single Vials" && (
          <div className="rounded-2xl overflow-hidden relative" style={{ background: "linear-gradient(160deg, #120A2E 0%, #1D0D45 100%)", minHeight: "220px", border: "1px solid rgba(139,92,246,0.25)" }}>
            <div className="p-6 flex flex-col gap-4 relative z-10">
              <div><p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#A78BFA" }}>Single Vials</p><h2 className="text-2xl font-black text-white mt-1">The Lonely Vial</h2><p className="text-sm mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>Buy individual vials — no kits, no minimums. Pay with USDT.</p></div>
              <button onClick={() => {}} className="h-12 rounded-xl text-sm font-black flex items-center justify-center gap-2 text-white w-full" style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)", boxShadow: "0 4px 14px rgba(124,58,237,0.35)" }}><FlaskConical className="w-4 h-4" /> Browse the Shop <ArrowRight className="w-4 h-4" /></button>
            </div>
            <div className="absolute top-0 right-0 w-36 h-36 rounded-full pointer-events-none" style={{ background: "rgba(139,92,246,0.10)", transform: "translate(35%,-35%)" }} />
          </div>
        )}
        {active === "Tools & Lab" && (
          <div className="flex flex-col gap-3">
            {[
              { icon: TestTube, color: "#22D3EE", bg: "linear-gradient(160deg,#0A1628,#0C2040)", border: "rgba(34,211,238,0.18)", title: "Lab Reports", sub: "352+ independent Janoshik CoA tests from supplier Uther" },
              { icon: ShieldCheck, color: "#4ADE80", bg: "linear-gradient(160deg,#0A1F1A,#0D2420)", border: "rgba(74,222,128,0.14)", title: "Safety Calculator", sub: "Endotoxin limits and BAC water safety for reconstituted peptides" },
              { icon: Calculator, color: "#FB923C", bg: "linear-gradient(160deg,#1C0E00,#2A1500)", border: "rgba(251,146,60,0.14)", title: "Peptide Calculator", sub: "Dose and reconstitution calculations" },
            ].map(({ icon: Icon, color, bg, border, title, sub }) => (
              <button key={title} onClick={() => {}} className="flex items-center gap-4 px-4 py-4 rounded-2xl text-left w-full" style={{ background: bg, border: `1px solid ${border}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}><Icon style={{ color, width: "20px", height: "20px" }} /></div>
                <div><p className="text-sm font-bold text-white">{title}</p><p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{sub}</p></div>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-1 mt-auto pt-2">
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#2AABEE" }}><MessageCircle className="w-3.5 h-3.5" /> @urbanblend789</a>
          <span className="text-[10px] text-slate-400">Pay with USDT · Ethereum</span>
        </div>
      </main>
      <BottomTabs />
    </div>
  );
}
