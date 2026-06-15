import { ShoppingBag, ArrowRight, Search, MessageCircle, Wallet, ChevronDown } from "lucide-react";

export function HeroFunnel() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8", fontFamily: "'Inter', sans-serif" }}>
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)" }}>
        <nav className="flex items-center justify-between px-4 py-3 relative z-10">
          <span className="text-sm font-bold text-white/90">Peps Anonymous</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/70">
            USD <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold bg-blue-500 text-white">$</span>
          </div>
        </nav>

        <div className="px-6 pt-8 pb-12 relative z-10 text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3B82F6, #8B5CF6)" }}>
            <ShoppingBag className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Ready to order?</h1>
          <p className="text-sm text-white/50 mb-8">128+ peptide products, two delivery options</p>

          <button className="w-full h-14 rounded-2xl text-base font-bold flex items-center justify-center gap-3 text-white mb-3" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
            Start Your Order
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-[10px] text-white/30">No account needed · Pay with USDT</p>
        </div>

        <div className="absolute -bottom-8 left-1/2 w-[140%] h-16 rounded-[50%] -translate-x-1/2" style={{ background: "#F0F4F8" }} />
        <div className="absolute top-12 -right-8 w-32 h-32 rounded-full bg-blue-500/10" />
        <div className="absolute bottom-20 -left-6 w-24 h-24 rounded-full bg-purple-500/10" />
      </div>

      <main className="flex-1 px-4 pt-4 pb-6 space-y-3 -mt-2">
        <div className="rounded-xl p-4 flex items-center gap-3 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1A2B3C, #2D4A5E)" }}>
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold">Draft in progress</p>
            <p className="text-[10px] opacity-50">1 item · tap to resume</p>
          </div>
          <ArrowRight className="w-4 h-4 opacity-40" />
          <div className="absolute top-0 right-0 w-14 h-14 rounded-full bg-white/5" style={{ transform: "translate(30%, -30%)" }} />
        </div>

        <p className="text-[10px] font-bold uppercase tracking-wider px-1 pt-2" style={{ color: "#8A9AAA" }}>Already have an order?</p>

        <button className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-white border text-left" style={{ borderColor: "#D0DAE4" }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#FFF3E0" }}>
            <Search className="w-4 h-4" style={{ color: "#E67E22" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "#1A2B3C" }}>Find My Order</p>
            <p className="text-[10px]" style={{ color: "#8A9AAA" }}>Track, edit, or pay</p>
          </div>
          <ArrowRight className="w-4 h-4" style={{ color: "#D0DAE4" }} />
        </button>

        <button className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-white border text-left" style={{ borderColor: "#D0DAE4" }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#ECFDF5" }}>
            <Wallet className="w-4 h-4" style={{ color: "#059669" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "#1A2B3C" }}>Pay with USDT</p>
            <p className="text-[10px]" style={{ color: "#8A9AAA" }}>Complete crypto payment</p>
          </div>
          <ArrowRight className="w-4 h-4" style={{ color: "#D0DAE4" }} />
        </button>

        <div className="pt-4">
          <a href="#" className="flex items-center justify-center gap-1.5 text-xs" style={{ color: "#2AABEE" }}>
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="font-semibold">@urbanblend789</span>
            <span style={{ color: "#8A9AAA" }}>· Need help?</span>
          </a>
        </div>
      </main>
    </div>
  );
}
