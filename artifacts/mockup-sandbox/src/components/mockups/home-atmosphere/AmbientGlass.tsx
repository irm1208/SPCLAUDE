import React from "react";
import {
  Search, ArrowRight, MessageCircle,
  TestTube, ShieldCheck, FlaskConical, Users,
  Home, BookOpen, Calculator, User, ChevronRight,
} from "lucide-react";

function TopNav() {
  return (
    <div className="flex items-center justify-between px-4 h-12 shrink-0" style={{ background: "rgba(6,10,22,0.5)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span className="text-sm font-bold text-white tracking-wide">Salt &amp; Peps</span>
      <div className="flex items-center gap-2">
        <button onClick={() => {}} className="text-xs font-semibold text-white/60 flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(8px)" }}>
          <User className="w-3 h-3" /> Login
        </button>
        <span className="text-xs font-bold text-white px-2 py-1 rounded-lg" style={{ background: "rgba(59,130,246,0.8)" }}>USD</span>
      </div>
    </div>
  );
}

function BottomTabs() {
  return (
    <div className="fixed bottom-0 inset-x-0 flex h-14" style={{ background: "rgba(6,10,22,0.75)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      {[
        { icon: Home, label: "Home", active: true },
        { icon: BookOpen, label: "Protocols", active: false },
        { icon: Calculator, label: "Calc", active: false },
        { icon: User, label: "Account", active: false },
      ].map(({ icon: Icon, label, active }) => (
        <button key={label} onClick={() => {}} className="flex-1 flex flex-col items-center justify-center gap-0.5">
          <Icon className={`w-5 h-5 ${active ? "text-blue-400" : "text-slate-600"}`} />
          <span className={`text-[10px] font-semibold ${active ? "text-blue-400" : "text-slate-600"}`}>{label}</span>
        </button>
      ))}
    </div>
  );
}

export function AmbientGlass() {
  return (
    <div
      className="w-full flex flex-col pb-14 min-h-screen"
      style={{
        background: "linear-gradient(160deg, #060A16 0%, #091428 30%, #0C1240 60%, #090818 100%)",
        fontFamily: "Inter, system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* Ambient light blobs — fixed in the background */}
      <div className="absolute pointer-events-none" style={{ top: "8%", right: "-10%", width: "260px", height: "260px", borderRadius: "50%", background: "rgba(59,130,246,0.12)", filter: "blur(60px)" }} />
      <div className="absolute pointer-events-none" style={{ top: "40%", left: "-12%", width: "220px", height: "220px", borderRadius: "50%", background: "rgba(124,58,237,0.1)", filter: "blur(50px)" }} />
      <div className="absolute pointer-events-none" style={{ bottom: "20%", right: "0%", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(6,182,212,0.07)", filter: "blur(40px)" }} />

      <TopNav />
      <main className="flex-1 flex flex-col px-4 pt-5 pb-4 gap-3 max-w-md mx-auto w-full relative z-10">

        {/* Brand */}
        <div className="pb-1">
          <h1 className="text-3xl font-black tracking-tight text-white">Salt &amp; Peps</h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Quality tested, discreetly shipped.</p>
        </div>

        {/* PRIMARY — Group Buy Login: glass card */}
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: "rgba(59,130,246,0.1)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(59,130,246,0.2)",
            minHeight: "210px",
          }}
        >
          <div className="p-6 flex flex-col gap-4 relative z-10 h-full justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">New Customer</span>
              <h2 className="text-2xl font-black text-white leading-tight mt-1">Place an order</h2>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)", maxWidth: "240px" }}>Browse 126+ peptide products and submit your order for the next group buy.</p>
            </div>
            <button
              onClick={() => {}}
              className="h-14 rounded-xl text-base font-black flex items-center justify-center gap-2 text-white w-full"
              style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "0 6px 28px rgba(59,130,246,0.55)" }}
            >
              <Users className="w-5 h-5" /> Group Buy Login <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SECONDARY — Lonely Vial: glass card, violet tint */}
        <div
          className="rounded-2xl overflow-hidden relative flex items-center gap-4 px-5"
          style={{
            background: "rgba(124,58,237,0.12)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(139,92,246,0.22)",
            minHeight: "96px",
          }}
        >
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.25)" }}>
            <FlaskConical className="w-5 h-5" style={{ color: "#A78BFA" }} />
          </div>
          <div className="flex-1 relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "#A78BFA" }}>Single Vials</p>
            <p className="text-lg font-black text-white leading-tight">The Lonely Vial</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>No kits, no minimums. USDT.</p>
          </div>
          <button
            onClick={() => {}}
            className="h-9 px-4 rounded-xl text-xs font-black text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)", boxShadow: "0 3px 14px rgba(124,58,237,0.45)" }}
          >
            Shop →
          </button>
        </div>

        {/* LIST — bare rows, no card, items float directly on the gradient */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {[
            { icon: Search, color: "#FBBF24", label: "Manage your order", sub: "Track, edit, pay, upload QR" },
            { icon: TestTube, color: "#22D3EE", label: "Lab Reports", sub: "352+ independent CoA tests" },
            { icon: ShieldCheck, color: "#4ADE80", label: "Safety Calculator", sub: "Endotoxin & BAC water safety" },
          ].map(({ icon: Icon, color, label, sub }) => (
            <button
              key={label}
              onClick={() => {}}
              className="w-full flex items-center gap-3 px-1 py-3 text-left"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}12`, backdropFilter: "blur(8px)" }}>
                <Icon style={{ color, width: "15px", height: "15px" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight">{label}</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <a href="https://t.me/urbanblend789" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#2AABEE" }}>
            <MessageCircle className="w-3.5 h-3.5" /> @urbanblend789
          </a>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>Pay with USDT · Ethereum</span>
        </div>
      </main>
      <BottomTabs />
    </div>
  );
}
