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

export function ContextStrip() {
  return (
    <div className="w-full flex flex-col pb-14 min-h-screen" style={{ background: "#F0F4F8", fontFamily: "Inter, system-ui, sans-serif" }}>
      <TopNav />
      <main className="flex-1 flex flex-col px-4 pt-5 pb-4 gap-4 max-w-md mx-auto w-full">

        {/* Very minimal brand */}
        <div className="pb-1">
          <h1 className="text-3xl font-black text-slate-900">Salt &amp; Peps</h1>
          <p className="text-xs text-slate-400 mt-0.5">Quality tested, discreetly shipped.</p>
        </div>

        {/* FULL SCREEN hero — Group Buy Login, all the vertical space */}
        <div className="rounded-2xl overflow-hidden relative flex-1" style={{ background: "linear-gradient(160deg, #0F172A 0%, #0D2550 100%)", minHeight: "280px" }}>
          <div className="p-6 flex flex-col gap-5 relative z-10 h-full">
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Group Buys</p>
              <h2 className="text-3xl font-black text-white leading-tight mt-2">Place an order</h2>
              <p className="text-sm text-white/50 mt-3 leading-relaxed">Browse 126+ peptide products and submit your order for the next group buy.</p>
            </div>
            <button onClick={() => {}} className="h-14 rounded-xl text-base font-black flex items-center justify-center gap-2 text-white w-full" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "0 6px 24px rgba(59,130,246,0.45)" }}>
              <Users className="w-5 h-5" /> Group Buy Login <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-44 h-44 rounded-full pointer-events-none" style={{ background: "rgba(59,130,246,0.15)", transform: "translate(35%,-35%)" }} />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full pointer-events-none" style={{ background: "rgba(59,130,246,0.07)", transform: "translate(-30%,30%)" }} />
        </div>

        {/* Sticky quick-access strip — 3 icon buttons for secondary modes */}
        <div className="rounded-2xl bg-white border border-slate-200 flex divide-x divide-slate-100 overflow-hidden">
          {[
            { icon: FlaskConical, label: "Single Vials", color: "#7C3AED" },
            { icon: Search, label: "My Orders", color: "#D97706" },
            { icon: TestTube, label: "Tools & Lab", color: "#0891B2" },
          ].map(({ icon: Icon, label, color }) => (
            <button key={label} onClick={() => {}} className="flex-1 flex flex-col items-center gap-1.5 py-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}12` }}><Icon style={{ color, width: "18px", height: "18px" }} /></div>
              <span className="text-[10px] font-bold text-slate-600">{label}</span>
            </button>
          ))}
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
