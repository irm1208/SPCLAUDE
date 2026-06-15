import React from "react";
import { Users, FlaskConical, TestTube, ShieldCheck, Search, ArrowRight, MessageCircle, User, ChevronRight } from "lucide-react";
import { ShoppingBag, Beaker } from "lucide-react";

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
    <div className="fixed bottom-0 inset-x-0 flex h-16 border-t bg-white border-slate-100">
      {[
        { icon: Users, label: "Group Buys", active: true },
        { icon: FlaskConical, label: "Single Vials", active: false },
        { icon: TestTube, label: "Tools & Lab", active: false },
        { icon: User, label: "Account", active: false },
      ].map(({ icon: Icon, label, active }) => (
        <button key={label} onClick={() => {}} className="flex-1 flex flex-col items-center justify-center gap-0.5 px-1">
          <Icon className={`w-5 h-5 ${active ? "text-blue-600" : "text-slate-400"}`} />
          <span className={`text-[9px] font-semibold text-center leading-tight ${active ? "text-blue-600" : "text-slate-400"}`}>{label}</span>
        </button>
      ))}
    </div>
  );
}

export function TabCentric() {
  return (
    <div className="w-full flex flex-col pb-16 min-h-screen" style={{ background: "#F0F4F8", fontFamily: "Inter, system-ui, sans-serif" }}>
      <TopNav />
      {/* Active indicator for Group Buys */}
      <div className="bg-white border-b border-slate-100 px-4 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Group Buys</span>
      </div>

      <main className="flex-1 flex flex-col px-4 pt-5 pb-4 gap-4 max-w-md mx-auto w-full">

        {/* Full-screen hero for the active mode */}
        <div className="rounded-2xl overflow-hidden relative" style={{ background: "linear-gradient(160deg, #0F172A 0%, #0D2550 100%)", minHeight: "250px" }}>
          <div className="p-6 flex flex-col gap-4 relative z-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">New Customer</p>
              <h2 className="text-2xl font-black text-white mt-1">Place an order</h2>
              <p className="text-sm text-white/55 mt-2 leading-relaxed">Browse 126+ peptide products and submit your order for the next group buy.</p>
            </div>
            <button onClick={() => {}} className="h-14 rounded-xl text-base font-black flex items-center justify-center gap-2 text-white w-full" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "0 6px 24px rgba(59,130,246,0.45)" }}>
              <Users className="w-5 h-5" /> Group Buy Login <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-44 h-44 rounded-full pointer-events-none" style={{ background: "rgba(59,130,246,0.15)", transform: "translate(35%,-35%)" }} />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full pointer-events-none" style={{ background: "rgba(59,130,246,0.07)", transform: "translate(-30%,30%)" }} />
        </div>

        {/* Manage order — secondary on this tab */}
        <button onClick={() => {}} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-slate-200 w-full text-left">
          <Search className="w-4 h-4 text-amber-500" />
          <div className="flex-1"><p className="text-sm font-bold text-slate-800">Manage your order</p><p className="text-xs text-slate-400">Track, edit, pay, upload QR code</p></div>
          <ArrowRight className="w-4 h-4 text-slate-300" />
        </button>

        {/* Hint that other modes exist via tabs */}
        <div className="flex gap-2">
          {[
            { label: "Single Vials →", color: "#7C3AED", bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.2)" },
            { label: "Tools & Lab →", color: "#0891B2", bg: "rgba(8,145,178,0.07)", border: "rgba(8,145,178,0.15)" },
          ].map(({ label, color, bg, border }) => (
            <button key={label} onClick={() => {}} className="flex-1 py-2 rounded-xl text-xs font-bold text-center" style={{ background: bg, border: `1px solid ${border}`, color }}>{label}</button>
          ))}
        </div>

        <div className="flex items-center justify-between px-1 mt-auto">
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#2AABEE" }}><MessageCircle className="w-3.5 h-3.5" /> @urbanblend789</a>
          <span className="text-[10px] text-slate-400">Pay with USDT · Ethereum</span>
        </div>
      </main>
      <BottomTabs />
    </div>
  );
}
