import { ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical, Users, ArrowRight, MessageCircle, ChevronRight, Wallet } from "lucide-react";

export function FocusTray() {
  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: "#F1F5F9", fontFamily: "'Inter', sans-serif" }}>

      {/* Status bar space + Top nav */}
      <div className="pt-12 pb-2 px-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 font-semibold tracking-widest uppercase">Peps Anonymous</p>
        </div>
        <button className="h-9 px-4 rounded-full text-xs font-bold text-white flex items-center gap-1.5" style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)" }}>
          <Users className="w-3.5 h-3.5" />
          My Account
        </button>
      </div>

      <main className="flex-1 px-4 pt-2 flex flex-col gap-4">

        {/* Hero focus card */}
        <div className="rounded-3xl overflow-hidden text-white relative" style={{ background: "linear-gradient(160deg, #0F172A 0%, #1E3A8A 60%, #1D4ED8 100%)", minHeight: "280px" }}>

          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)", transform: "translate(-30%, 30%)" }} />

          <div className="relative z-10 p-7 flex flex-col h-full justify-between" style={{ minHeight: "280px" }}>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-5 px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center" style={{ background: "rgba(59,130,246,0.3)", color: "#93C5FD" }}>
                  Group Buy
                </div>
              </div>
              <h1 className="text-3xl font-black text-white mb-2 leading-tight">Salt &amp; Peps</h1>
              <p className="text-base text-white/60 leading-relaxed">
                Peptide group buys, quality tested &amp; discreet shipping.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 mt-6">
              <button className="h-13 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)", height: "52px" }}>
                <ShoppingBag className="w-4 h-4" />
                Join Group Buy <ArrowRight className="w-4 h-4" />
              </button>
              <button className="h-10 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2" style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)" }}>
                <Search className="w-3.5 h-3.5" /> Manage Existing Orders
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal tray of destinations */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">More Tools</p>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {[
              { icon: TestTube, label: "Lab Reports", sub: "352+ CoA tests", color: "#0EA5E9", bg: "#E0F2FE" },
              { icon: ShieldCheck, label: "Safety Calc", sub: "Endotoxin limits", color: "#16A34A", bg: "#DCFCE7" },
              { icon: FlaskConical, label: "Lonely Vial", sub: "Single vials, USDT", color: "#7C3AED", bg: "#EDE9FE" },
              { icon: Wallet, label: "Pay Now", sub: "USDT on Ethereum", color: "#F59E0B", bg: "#FEF3C7" },
            ].map(({ icon: Icon, label, sub, color, bg }) => (
              <button key={label} className="rounded-2xl p-4 flex flex-col gap-2 shrink-0 text-left" style={{ background: "white", width: "130px", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                  <Icon className="w-4.5 h-4.5" style={{ color }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 leading-tight">{label}</p>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Order lookup strip */}
        <button className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#F1F5F9" }}>
            <Search className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-slate-800">Find order by code</p>
            <p className="text-xs text-slate-400">Enter your 4-digit order code</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </button>

        {/* Footer */}
        <div className="flex items-center justify-between px-1">
          <a href="#" className="flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" style={{ color: "#2AABEE" }} />
            <span className="text-sm font-semibold" style={{ color: "#2AABEE" }}>@urbanblend789</span>
          </a>
          <span className="text-xs text-slate-400">Pay with USDT</span>
        </div>
      </main>

      {/* Bottom tabs */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-around h-16 px-2 bg-white" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        {[
          { icon: ShoppingBag, label: "Home", active: true },
          { icon: Search, label: "Lookup", active: false },
          { icon: Users, label: "Account", active: false },
        ].map(({ icon: Icon, label, active }) => (
          <button key={label} className="flex flex-col items-center gap-1">
            <Icon className="w-5 h-5" style={{ color: active ? "#2563EB" : "#94A3B8" }} />
            <span className="text-[10px] font-semibold" style={{ color: active ? "#2563EB" : "#94A3B8" }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
