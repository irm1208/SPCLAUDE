import { ShoppingBag, Search, ArrowRight, TestTube, ShieldCheck, FlaskConical, Users } from "lucide-react";

export function PolishedCards() {
  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: "#ECF0F7", fontFamily: "Inter, sans-serif" }}>
      <nav className="flex items-center justify-between px-4 py-3 bg-[#0F172A] sticky top-0 z-10">
        <span className="text-sm font-bold text-white tracking-tight">Salt & Peps</span>
        <div className="flex items-center gap-2">
          <button className="text-xs font-semibold text-white/80 flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
            Login
          </button>
          <button className="text-xs font-semibold text-white bg-blue-500/20 rounded-full px-3 py-1.5 flex items-center gap-1.5">
            USD <span className="w-4 h-4 bg-blue-500 rounded-full text-[9px] flex items-center justify-center font-bold">S</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 px-4 py-5 max-w-md mx-auto w-full flex flex-col gap-3">
        <div className="pt-1 pb-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight" style={{ background: "linear-gradient(135deg, #0F172A 0%, #3B82F6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Salt & Peps
          </h1>
          <p className="text-sm text-slate-500 mt-1 tracking-wide">Peps Anonymous</p>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
            Peptide group buys — quality tested, discreetly shipped.
          </p>
        </div>

        <div
          className="rounded-2xl overflow-hidden flex flex-col relative text-white"
          style={{ background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)", border: "1px solid rgba(59,130,246,0.2)", minHeight: "200px" }}
        >
          <div className="flex-1 flex flex-col justify-center p-6 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">New Customer</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Place an order</h2>
            <p className="text-sm text-white/70 mb-4">Browse products and checkout</p>
            <button className="h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 w-full text-white" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
              <Users className="w-4 h-4" /> Group Buy Login <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-blue-500/10" style={{ transform: "translate(30%, -30%)" }} />
        </div>

        <div
          className="rounded-2xl overflow-hidden flex flex-col relative text-white"
          style={{ background: "linear-gradient(180deg, #1A2B3C 0%, #2D4A5E 100%)", border: "1px solid rgba(245,158,11,0.2)", minHeight: "200px" }}
        >
          <div className="flex-1 flex flex-col justify-center p-6 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Returning</span>
            </div>
            <h2 className="text-xl font-bold mb-1 text-white">Manage your order</h2>
            <p className="text-sm text-white/70 mb-4">Track, edit, pay, or upload your InPost QR code</p>
            <div className="flex gap-2">
              <button className="flex-1 h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white" style={{ background: "linear-gradient(135deg, #EA580C, #C2410C)" }}>
                <Search className="w-4 h-4" /> My Orders
              </button>
            </div>
            <button className="mt-2 h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-2" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
              <Search className="w-3.5 h-3.5" /> Find order by code
            </button>
          </div>
          <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-amber-500/10" style={{ transform: "translate(-30%, 30%)" }} />
        </div>

        <div
          className="rounded-2xl overflow-hidden flex flex-col relative text-white"
          style={{ background: "linear-gradient(180deg, #0A1628 0%, #0F2240 100%)", border: "1px solid rgba(59,130,246,0.15)" }}
        >
          <div className="flex-1 flex flex-col justify-center p-6 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <TestTube className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Quality Assurance</span>
            </div>
            <h2 className="text-xl font-bold mb-1 text-white">Lab Reports</h2>
            <p className="text-sm text-white/70 mb-4">Independent Janoshik CoA tests — 352+ reports from supplier Uther</p>
            <button className="h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 w-full text-white" style={{ background: "linear-gradient(135deg, #0EA5E9, #0284C7)" }}>
              <TestTube className="w-4 h-4" /> Browse Lab Results <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-cyan-500/10" style={{ transform: "translate(30%, -30%)" }} />
        </div>

        <div
          className="rounded-2xl overflow-hidden flex flex-col relative text-white"
          style={{ background: "linear-gradient(180deg, #0A1F2E 0%, #0D2B20 100%)", border: "1px solid rgba(34,197,94,0.15)" }}
        >
          <div className="flex-1 flex flex-col justify-center p-6 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-green-400">Endotoxin & BAC Safety</span>
            </div>
            <h2 className="text-xl font-bold mb-1 text-white">Safety Calculator</h2>
            <p className="text-sm text-white/70 mb-4">Calculate endotoxin limits and BAC water safety for your reconstituted peptides</p>
            <button className="h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 w-full text-white" style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}>
              <ShieldCheck className="w-4 h-4" /> Open Safety Calculator <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-green-500/10" style={{ transform: "translate(30%, -30%)" }} />
        </div>

        <div
          className="rounded-2xl overflow-hidden flex flex-col relative text-white"
          style={{ background: "linear-gradient(180deg, #120A2E 0%, #1D0D45 100%)", border: "1px solid rgba(139,92,246,0.2)" }}
        >
          <div className="flex-1 flex flex-col justify-center p-6 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="w-4 h-4" style={{ color: "#A78BFA" }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#A78BFA" }}>Single Vials</span>
            </div>
            <h2 className="text-xl font-bold mb-1 text-white">The Lonely Vial</h2>
            <p className="text-sm text-white/70 mb-4">Buy individual vials — no kits, no minimums. Pay with USDT.</p>
            <button className="h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 w-full text-white" style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}>
              <FlaskConical className="w-4 h-4" /> Browse the Shop <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-28 h-28 rounded-full" style={{ background: "rgba(139,92,246,0.10)", transform: "translate(30%, -30%)" }} />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1 pb-2">
          <span>@urbanblend789</span>
          <span>Pay with USDT · Ethereum</span>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 flex bg-white border-t border-slate-200 pb-safe">
        {[
          { label: "Home", active: true },
          { label: "Protocols", active: false },
          { label: "Calc", active: false },
          { label: "Account", active: false },
        ].map((tab) => (
          <button key={tab.label} className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5">
            <div className={`w-5 h-5 rounded ${tab.active ? "bg-blue-600" : "bg-slate-300"}`} />
            <span className={`text-[10px] font-semibold ${tab.active ? "text-blue-600" : "text-slate-400"}`}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
