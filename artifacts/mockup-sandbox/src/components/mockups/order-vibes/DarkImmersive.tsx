import { ChevronDown, Plus, Package, MessageCircle, Heart, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

export function DarkImmersive() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0B1120", fontFamily: "'Inter', sans-serif" }}>
      <nav className="flex items-center gap-3 px-4 py-3">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <span className="text-sm font-bold flex-1 text-white">New Order</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-white/50">
          USD <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold bg-blue-500 text-white">$</span>
        </div>
      </nav>

      <main className="flex-1 px-4 py-4 pb-36 space-y-4">
        <div className="rounded-2xl p-4 border" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.02))", borderColor: "rgba(59,130,246,0.15)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Who are you?</span>
          </div>
          <input
            className="w-full h-11 rounded-xl px-4 text-sm bg-white/5 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-blue-500/40"
            placeholder="@telegram_username"
          />
        </div>

        <div className="rounded-2xl p-4 border" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))", borderColor: "rgba(139,92,246,0.15)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Products</span>
            </div>
            <span className="text-xs font-bold text-white/30">0 items</span>
          </div>

          <div className="relative mb-3">
            <select className="w-full appearance-none h-11 rounded-xl px-4 pr-10 text-sm bg-white/5 border border-white/10 text-white/80 focus:outline-none focus:border-purple-500/40">
              <option>Select a product...</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-white/20" />
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center h-10 rounded-xl overflow-hidden border border-white/10">
              <button className="px-3.5 h-full text-lg text-white/40 hover:text-white/70 transition-colors">−</button>
              <span className="w-10 text-center text-sm font-semibold text-white">0.5</span>
              <button className="px-3.5 h-full text-lg text-white/40 hover:text-white/70 transition-colors">+</button>
            </div>
            <span className="font-bold text-white">$0.00</span>
          </div>

          <button className="w-full h-10 rounded-xl border border-dashed border-white/10 text-xs font-medium flex items-center justify-center gap-2 text-white/30 hover:text-white/50 hover:border-white/20 transition-colors">
            <Plus className="w-3 h-3" /> Add another product
          </button>
        </div>

        <div className="rounded-2xl p-4 border" style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.08), rgba(234,88,12,0.02))", borderColor: "rgba(234,88,12,0.15)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Delivery</span>
          </div>
          <div className="space-y-2">
            {[
              { name: "Royal Mail", price: "$10.00", sel: true },
              { name: "InPost", price: "$3.00", sel: false },
            ].map(m => (
              <label key={m.name} className="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all" style={{ borderColor: m.sel ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)", background: m.sel ? "rgba(59,130,246,0.1)" : "transparent" }}>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: m.sel ? "#3B82F6" : "rgba(255,255,255,0.2)" }}>
                    {m.sel && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <Package className="w-4 h-4 text-white/30" />
                  <span className="font-semibold text-sm" style={{ color: m.sel ? "#60A5FA" : "rgba(255,255,255,0.6)" }}>{m.name}</span>
                </div>
                <span className="font-bold text-sm" style={{ color: m.sel ? "#60A5FA" : "rgba(255,255,255,0.3)" }}>{m.price}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button className="flex-1 rounded-xl border border-dashed border-white/10 p-3.5 text-left hover:border-white/20 transition-colors">
            <Heart className="w-4 h-4 text-pink-400/50 mb-1.5" />
            <p className="text-xs font-bold text-white/50">Tip?</p>
            <p className="text-[9px] text-white/20">Optional</p>
          </button>
          <div className="flex-1 rounded-xl border border-white/10 p-3.5" style={{ background: "rgba(255,255,255,0.02)" }}>
            <textarea className="w-full text-xs resize-none bg-transparent border-0 p-0 focus:outline-none text-white/60 placeholder-white/20 min-h-[45px]" placeholder="Notes (optional)" />
          </div>
        </div>

        <a href="#" className="flex items-center gap-3 p-3.5 rounded-xl border border-white/10 hover:border-[#2AABEE]/30 transition-colors">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(42,171,238,0.1)" }}>
            <MessageCircle className="w-4 h-4" style={{ color: "#2AABEE" }} />
          </div>
          <div>
            <p className="text-xs font-semibold text-white/80">@urbanblend789</p>
            <p className="text-[10px] text-white/30">Need help? Telegram us</p>
          </div>
        </a>
      </main>

      <div className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t" style={{ background: "rgba(11,17,32,0.9)", borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Grand Total</p>
              <p className="text-xl font-bold text-white">$10.00</p>
              <p className="text-[10px] text-white/30">incl. Royal Mail</p>
            </div>
            <button className="h-12 px-7 rounded-xl text-sm font-bold text-white flex items-center gap-2" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
              Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-center border-t pt-2 text-white/20" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            Payments confirmed through the website once sleeping pep approves
          </p>
        </div>
      </div>
    </div>
  );
}
