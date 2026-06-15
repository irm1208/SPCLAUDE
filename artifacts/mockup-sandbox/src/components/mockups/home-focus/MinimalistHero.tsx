import React from "react";
import {
  ShoppingBag, Search, ArrowRight, MessageCircle,
  TestTube, ShieldCheck, FlaskConical, Users,
  Home, BookOpen, Calculator, User, ChevronRight,
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

export function MinimalistHero() {
  return (
    <div className="w-full flex flex-col pb-14 min-h-screen" style={{ background: "#F0F4F8", fontFamily: "Inter, system-ui, sans-serif" }}>
      <TopNav />
      <main className="flex-1 flex flex-col px-4 pt-4 pb-4 gap-3 max-w-md mx-auto w-full">

        {/* Brand — ultra-minimal, just wordmark + tagline */}
        <div className="pt-1 pb-2">
          <h1 className="text-3xl font-black tracking-tight" style={{ background: "linear-gradient(135deg, #0F172A 0%, #3B82F6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Salt &amp; Peps
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Quality tested, discreetly shipped.</p>
        </div>

        {/* HERO — Group Buy Login, very tall, full bleed */}
        <div
          className="rounded-2xl overflow-hidden relative"
          style={{ background: "linear-gradient(160deg, #0F172A 0%, #0D2550 80%, #0F2A70 100%)", minHeight: "230px" }}
        >
          <div className="p-6 flex flex-col gap-4 relative z-10 h-full justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">New Customer</span>
              <h2 className="text-2xl font-black text-white leading-tight mt-1">Place an order</h2>
              <p className="text-sm text-white/55 mt-2 leading-relaxed max-w-[240px]">Browse 126+ peptide products and submit your order for the next group buy.</p>
            </div>
            <button
              onClick={() => {}}
              className="h-14 rounded-xl text-base font-black flex items-center justify-center gap-2 text-white w-full"
              style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", boxShadow: "0 6px 24px rgba(59,130,246,0.45)" }}
            >
              <Users className="w-5 h-5" /> Group Buy Login <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-44 h-44 rounded-full pointer-events-none" style={{ background: "rgba(59,130,246,0.15)", transform: "translate(35%,-35%)" }} />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full pointer-events-none" style={{ background: "rgba(59,130,246,0.07)", transform: "translate(-30%,30%)" }} />
        </div>

        {/* PROMINENT SECONDARY — Lonely Vial: full width, clearly secondary but still large */}
        <div
          className="rounded-2xl overflow-hidden relative flex items-center gap-4 px-5"
          style={{ background: "linear-gradient(160deg, #120A2E 0%, #1D0D45 100%)", minHeight: "100px", border: "1px solid rgba(139,92,246,0.28)" }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.25)" }}>
            <FlaskConical className="w-6 h-6" style={{ color: "#A78BFA" }} />
          </div>
          <div className="flex-1 relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "#A78BFA" }}>Single Vials</p>
            <p className="text-lg font-black text-white leading-tight">The Lonely Vial</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>Individual vials — no kits, no minimums. USDT.</p>
          </div>
          <button
            onClick={() => {}}
            className="h-10 px-4 rounded-xl text-sm font-black text-white shrink-0 flex items-center gap-1"
            style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)", boxShadow: "0 3px 12px rgba(124,58,237,0.35)" }}
          >
            Shop <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <div className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none" style={{ background: "rgba(139,92,246,0.08)", transform: "translate(35%,-35%)" }} />
        </div>

        {/* SECONDARY LIST — Manage, Lab, Safety as minimal list rows */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(180deg, #0F1E30 0%, #0D1B28 100%)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {[
            { icon: Search, color: "#FBBF24", label: "Manage your order", sub: "Track, edit, pay, upload QR" },
            { icon: TestTube, color: "#22D3EE", label: "Lab Reports", sub: "352+ independent CoA tests" },
            { icon: ShieldCheck, color: "#4ADE80", label: "Safety Calculator", sub: "Endotoxin & BAC water safety" },
          ].map(({ icon: Icon, color, label, sub }, i, arr) => (
            <button
              key={label}
              onClick={() => {}}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : undefined }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                <Icon style={{ color, width: "16px", height: "16px" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight">{label}</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
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
