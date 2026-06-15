import { ShoppingBag, Search, TestTube, ShieldCheck, FlaskConical, Users, ArrowRight, MessageCircle, Bell } from "lucide-react";

export function CommandDashboard() {
  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: "#0B1120", fontFamily: "'Inter', sans-serif" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#4B6EF5" }}>Peps Anonymous</p>
          <h1 className="text-2xl font-black text-white leading-tight">Salt &amp; Peps</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.07)" }}>
            <Bell className="w-4 h-4 text-slate-400" />
          </button>
          <button className="h-9 px-4 rounded-xl text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
            My Account
          </button>
        </div>
      </div>

      <main className="flex-1 px-4 flex flex-col gap-3">

        {/* Primary 2-up actions */}
        <div className="grid grid-cols-2 gap-3">
          {/* Place Order */}
          <button className="relative rounded-2xl p-4 text-left flex flex-col justify-between overflow-hidden" style={{ background: "linear-gradient(145deg, #1E3A8A, #1D4ED8)", minHeight: "180px" }}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full" style={{ background: "rgba(255,255,255,0.06)", transform: "translate(35%, -35%)" }} />
            <div>
              <div className="w-9 h-9 rounded-xl mb-3 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                <ShoppingBag className="w-4.5 h-4.5 text-white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>New Order</p>
              <p className="text-base font-bold text-white leading-tight">Place an Order</p>
            </div>
            <div className="flex items-center gap-1 mt-3">
              <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>Group Buy Login</span>
              <ArrowRight className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.7)" }} />
            </div>
          </button>

          {/* Manage Orders */}
          <button className="relative rounded-2xl p-4 text-left flex flex-col justify-between overflow-hidden" style={{ background: "linear-gradient(145deg, #7C2D12, #C2410C)", minHeight: "180px" }}>
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full" style={{ background: "rgba(255,255,255,0.05)", transform: "translate(-35%, 35%)" }} />
            <div>
              <div className="w-9 h-9 rounded-xl mb-3 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                <Search className="w-4.5 h-4.5 text-white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Returning</p>
              <p className="text-base font-bold text-white leading-tight">Manage Orders</p>
            </div>
            <div className="flex items-center gap-1 mt-3">
              <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>Track &amp; Pay</span>
              <ArrowRight className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.7)" }} />
            </div>
          </button>
        </div>

        {/* Secondary 3-col tools */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: TestTube, label: "Lab Reports", sub: "352+ CoA tests", color: "#0EA5E9", bg: "rgba(14,165,233,0.1)", border: "rgba(14,165,233,0.15)" },
            { icon: ShieldCheck, label: "Safety Calc", sub: "Endotoxin limits", color: "#22C55E", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.15)" },
            { icon: FlaskConical, label: "Lonely Vial", sub: "Single vials", color: "#A78BFA", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.15)" },
          ].map(({ icon: Icon, label, sub, color, bg, border }) => (
            <button key={label} className="rounded-2xl p-3 flex flex-col items-center text-center gap-1.5" style={{ background: bg, border: `1px solid ${border}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.07)" }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <p className="text-xs font-bold text-white leading-tight">{label}</p>
              <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.45)" }}>{sub}</p>
            </button>
          ))}
        </div>

        {/* Quick lookup bar */}
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
            <Search className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Find order by code</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Track a specific order instantly</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500" />
        </div>

        {/* Telegram row */}
        <div className="flex items-center justify-between px-1 pb-2">
          <a href="#" className="flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4" style={{ color: "#2AABEE" }} />
            <span className="text-sm font-semibold" style={{ color: "#2AABEE" }}>@urbanblend789</span>
          </a>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Pay with USDT</span>
        </div>
      </main>

      {/* Bottom tabs */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-around h-16 px-2" style={{ background: "rgba(11,17,32,0.95)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { icon: ShoppingBag, label: "Home", active: true },
          { icon: Search, label: "Lookup", active: false },
          { icon: Users, label: "Account", active: false },
        ].map(({ icon: Icon, label, active }) => (
          <button key={label} className="flex flex-col items-center gap-1">
            <Icon className="w-5 h-5" style={{ color: active ? "#3B82F6" : "rgba(255,255,255,0.35)" }} />
            <span className="text-[10px] font-semibold" style={{ color: active ? "#3B82F6" : "rgba(255,255,255,0.35)" }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
