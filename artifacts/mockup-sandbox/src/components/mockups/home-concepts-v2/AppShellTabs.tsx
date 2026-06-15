import { ShoppingBag, Search, MessageCircle, Wallet, Home, Settings, ChevronRight, Clock, Package, ArrowRight, KeyRound } from "lucide-react";
import { useState } from "react";

function TabBar({ active, onTab }: { active: string; onTab: (t: string) => void }) {
  const tabs = [
    { id: "home", icon: Home, label: "Home" },
    { id: "orders", icon: Package, label: "Orders" },
    { id: "help", icon: MessageCircle, label: "Help" },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex" style={{ borderColor: "#D0DAE4" }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onTab(t.id)}
          className="flex-1 flex flex-col items-center gap-0.5 py-2.5"
        >
          <t.icon className="w-5 h-5" style={{ color: active === t.id ? "#1E40AF" : "#8A9AAA" }} />
          <span className="text-[9px] font-semibold" style={{ color: active === t.id ? "#1E40AF" : "#8A9AAA" }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export function AppShellTabs() {
  const [tab, setTab] = useState("home");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8", fontFamily: "'Inter', sans-serif" }}>
      <nav className="flex items-center justify-between px-4 py-3 bg-white border-b" style={{ borderColor: "#D0DAE4" }}>
        <span className="text-sm font-bold" style={{ color: "#1A2B3C" }}>Peps Anonymous</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#F0F4F8", color: "#5A6E7F" }}>
          USD <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold" style={{ background: "#4A7BA7", color: "#fff" }}>$</span>
        </div>
      </nav>

      <main className="flex-1 px-4 py-4 pb-20 space-y-4">
        <div className="text-center py-2">
          <p className="text-xs" style={{ color: "#8A9AAA" }}>Welcome back</p>
          <h1 className="text-lg font-bold" style={{ color: "#1A2B3C" }}>What would you like to do?</h1>
        </div>

        <div className="rounded-2xl p-4 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1A2B3C, #2D4A5E)" }}>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold">Draft order · 1 item</p>
              <p className="text-[10px] opacity-50">No username set</p>
            </div>
            <button className="h-8 px-3 rounded-lg text-xs font-bold bg-white/20 flex items-center gap-1.5">
              Resume <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button className="rounded-xl p-4 text-left text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
            <ShoppingBag className="w-5 h-5 mb-2 opacity-80" />
            <p className="text-sm font-bold">New Order</p>
            <p className="text-[10px] opacity-60">128+ products</p>
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-white/10" style={{ transform: "translate(30%, -30%)" }} />
          </button>
          <button className="rounded-xl p-4 text-left text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #EA580C, #C2410C)" }}>
            <Search className="w-5 h-5 mb-2 opacity-80" />
            <p className="text-sm font-bold">Find Order</p>
            <p className="text-[10px] opacity-60">Track & manage</p>
            <div className="absolute bottom-0 left-0 w-14 h-14 rounded-full bg-white/10" style={{ transform: "translate(-30%, 30%)" }} />
          </button>
        </div>

        <div className="space-y-2">
          {[
            { label: "Pay with USDT", desc: "Complete payment", bg: "linear-gradient(135deg, #0F5132, #0A3622)" },
            { label: "Upload InPost QR", desc: "Locker QR code", bg: "linear-gradient(135deg, #5B21B6, #4C1D95)" },
            { label: "Change PIN", desc: "Security settings", bg: "linear-gradient(135deg, #9D174D, #831843)" },
          ].map(a => (
            <button key={a.label} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white text-left relative overflow-hidden" style={{ background: a.bg }}>
              <div className="flex-1 relative z-10">
                <p className="text-sm font-bold">{a.label}</p>
                <p className="text-[10px] opacity-60">{a.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 opacity-40 relative z-10" />
            </button>
          ))}
        </div>

        <div className="rounded-xl p-3 flex items-start gap-2.5" style={{ background: "#E8EDF2" }}>
          <KeyRound className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#4A7BA7" }} />
          <p className="text-[10px] leading-relaxed" style={{ color: "#5A6E7F" }}>
            Access orders with your Telegram username and 4-digit PIN (default: 0000).
          </p>
        </div>
      </main>

      <TabBar active={tab} onTab={setTab} />
    </div>
  );
}
