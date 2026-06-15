import { ShoppingBag, Search, ArrowRight, MessageCircle, Wallet, Clock } from "lucide-react";

export function SplitPersona() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8", fontFamily: "'Inter', sans-serif" }}>
      <nav className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-bold" style={{ color: "#1A2B3C" }}>Peps Anonymous</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#E8EDF2", color: "#5A6E7F" }}>
          USD <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold" style={{ background: "#4A7BA7", color: "#fff" }}>$</span>
        </div>
      </nav>

      <main className="flex-1 px-4 py-4 flex flex-col gap-4">
        <div className="rounded-2xl overflow-hidden flex-1 flex flex-col relative text-white" style={{ background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)", minHeight: "220px" }}>
          <div className="flex-1 flex flex-col justify-center p-6 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">New Customer</span>
            </div>
            <h2 className="text-xl font-bold mb-1">Place an order</h2>
            <p className="text-xs text-white/50 mb-5">Browse 128+ peptide products and checkout</p>
            <button className="h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 w-full" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
              Start Shopping <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-blue-500/10" style={{ transform: "translate(30%, -30%)" }} />
        </div>

        <div className="rounded-2xl overflow-hidden flex-1 flex flex-col relative text-white" style={{ background: "linear-gradient(180deg, #1A2B3C 0%, #2D4A5E 100%)", minHeight: "220px" }}>
          <div className="flex-1 flex flex-col justify-center p-6 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Returning</span>
            </div>
            <h2 className="text-xl font-bold mb-1">Manage your order</h2>
            <p className="text-xs text-white/50 mb-5">Track, edit, pay, or upload your QR code</p>

            <div className="flex gap-2">
              <button className="flex-1 h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, #EA580C, #C2410C)" }}>
                <Search className="w-4 h-4" /> Find Order
              </button>
              <button className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                <Wallet className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-amber-500/10" style={{ transform: "translate(-30%, 30%)" }} />

          <div className="border-t border-white/10 px-5 py-3 flex items-center gap-3 relative z-10">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <div className="flex-1">
              <p className="text-[10px] font-bold text-white/80">Draft waiting · 1 item</p>
            </div>
            <button className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
              Resume <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between py-1">
          <a href="#" className="flex items-center gap-1.5 text-xs" style={{ color: "#2AABEE" }}>
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="font-semibold">@urbanblend789</span>
          </a>
          <span className="text-[10px]" style={{ color: "#8A9AAA" }}>PIN: 4 digits · default 0000</span>
        </div>
      </main>
    </div>
  );
}
