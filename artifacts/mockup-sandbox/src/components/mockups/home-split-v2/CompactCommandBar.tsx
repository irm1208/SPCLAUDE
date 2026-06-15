import React from "react";
import {
  ShoppingBag, Search, ArrowRight, MessageCircle,
  TestTube, ShieldCheck, FlaskConical, Users,
  Home, BookOpen, Calculator, User,
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
      {[{ icon: Home, label: "Home", active: true }, { icon: BookOpen, label: "Protocols", active: false }, { icon: Calculator, label: "Calc", active: false }, { icon: User, label: "Account", active: false }].map(({ icon: Icon, label, active }) => (
        <button key={label} onClick={() => {}} className="flex-1 flex flex-col items-center justify-center gap-0.5">
          <Icon className={`w-5 h-5 ${active ? "text-blue-400" : "text-slate-500"}`} />
          <span className={`text-[10px] font-semibold ${active ? "text-blue-400" : "text-slate-500"}`}>{label}</span>
        </button>
      ))}
    </div>
  );
}

export function CompactCommandBar() {
  return (
    <div className="w-full flex flex-col pb-14 min-h-screen" style={{ background: "#F0F4F8", fontFamily: "Inter, system-ui, sans-serif" }}>
      <TopNav />
      <main className="flex-1 flex flex-col px-3 pt-3 pb-3 gap-3 max-w-md mx-auto w-full">

        {/* Brand */}
        <div className="text-center pt-1">
          <h1 className="text-2xl font-black tracking-tight" style={{ background: "linear-gradient(135deg, #0F172A 0%, #3B82F6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Salt &amp; Peps
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Peptide group buys — quality tested, discreetly shipped.</p>
        </div>

        {/* COMPACT COMMAND BAR — both primary actions as slim pill buttons */}
        <div
          className="rounded-2xl p-3 flex gap-2"
          style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <button
            onClick={() => {}}
            className="flex-1 h-11 rounded-xl text-sm font-black flex items-center justify-center gap-2 text-white"
            style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}
          >
            <Users className="w-4 h-4" /> Place an order <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {}}
            className="flex-1 h-11 rounded-xl text-sm font-black flex items-center justify-center gap-2 text-white"
            style={{ background: "linear-gradient(135deg, #EA580C, #C2410C)" }}
          >
            <Search className="w-4 h-4" /> My orders
          </button>
        </div>

        {/* Divider — tools get the star billing below */}
        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 h-px" style={{ background: "rgba(15,23,42,0.12)" }} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tools &amp; Resources</span>
          <div className="flex-1 h-px" style={{ background: "rgba(15,23,42,0.12)" }} />
        </div>

        {/* SECONDARY TOOLS — given generous space with full descriptions */}
        {[
          {
            icon: TestTube,
            color: "#22D3EE",
            bg: "linear-gradient(160deg, #0A1628 0%, #0C2040 100%)",
            border: "rgba(34,211,238,0.18)",
            badge: "Quality Assurance",
            title: "Lab Reports",
            desc: "Independent Janoshik CoA tests — 352+ reports from supplier Uther",
            cta: "Browse Lab Results",
            ctaBg: "linear-gradient(135deg, #0EA5E9, #0284C7)",
          },
          {
            icon: ShieldCheck,
            color: "#4ADE80",
            bg: "linear-gradient(160deg, #0A1F2E 0%, #0D2B20 100%)",
            border: "rgba(74,222,128,0.14)",
            badge: "Endotoxin & BAC Safety",
            title: "Safety Calculator",
            desc: "Calculate endotoxin limits and BAC water safety for reconstituted peptides",
            cta: "Open Calculator",
            ctaBg: "linear-gradient(135deg, #16A34A, #15803D)",
          },
          {
            icon: FlaskConical,
            color: "#A78BFA",
            bg: "linear-gradient(160deg, #120A2E 0%, #1D0D45 100%)",
            border: "rgba(139,92,246,0.22)",
            badge: "Single Vials",
            title: "The Lonely Vial",
            desc: "Buy individual vials — no kits, no minimums. Pay with USDT.",
            cta: "Browse the Shop",
            ctaBg: "linear-gradient(135deg, #7C3AED, #6D28D9)",
          },
        ].map(({ icon: Icon, color, bg, border, badge, title, desc, cta, ctaBg }) => (
          <div
            key={title}
            className="rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden"
            style={{ background: bg, border: `1px solid ${border}` }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}18` }}>
                <Icon style={{ color, width: "20px", height: "20px" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color }}>{badge}</p>
                <p className="text-base font-black text-white leading-tight">{title}</p>
                <p className="text-xs text-white/55 mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
            <button
              onClick={() => {}}
              className="h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white w-full"
              style={{ background: ctaBg }}
            >
              <Icon style={{ color: "white", width: "16px", height: "16px" }} /> {cta} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}

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
