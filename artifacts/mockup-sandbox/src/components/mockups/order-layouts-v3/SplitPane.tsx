import { ChevronDown, Plus, Package, MessageCircle, Heart, ArrowLeft, ArrowRight, User, ShoppingBag } from "lucide-react";

export function SplitPane() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8", fontFamily: "'Inter', sans-serif" }}>
      <nav className="flex items-center gap-3 px-4 py-3" style={{ background: "linear-gradient(135deg, #0F172A, #1E293B)" }}>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <span className="text-sm font-bold flex-1 text-white">New Order</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/70">
          USD <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold bg-blue-500 text-white">$</span>
        </div>
      </nav>

      <main className="flex-1 pb-36">
        <div className="rounded-b-3xl px-4 pt-4 pb-6 text-white" style={{ background: "linear-gradient(180deg, #1E293B 0%, #1A2B3C 100%)" }}>
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Customer</span>
            </div>
            <input className="w-full h-11 rounded-xl px-4 text-sm bg-white/10 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50" placeholder="@telegram_username" />

            <div className="flex items-center gap-2 mt-4 mb-1">
              <Package className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Delivery</span>
            </div>
            <div className="flex gap-2">
              {[
                { name: "Royal Mail", price: "$10", sel: true },
                { name: "InPost", price: "$3", sel: false },
              ].map(m => (
                <button key={m.name} className="flex-1 rounded-xl py-3 text-center border" style={{ borderColor: m.sel ? "#3B82F6" : "rgba(255,255,255,0.1)", background: m.sel ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)" }}>
                  <p className="text-xs font-bold" style={{ color: m.sel ? "#60A5FA" : "rgba(255,255,255,0.6)" }}>{m.name}</p>
                  <p className="text-[10px] font-semibold" style={{ color: m.sel ? "#60A5FA" : "rgba(255,255,255,0.3)" }}>{m.price}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" style={{ color: "#8A9AAA" }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Products</span>
          </div>

          <div className="bg-white rounded-2xl border p-4 space-y-3" style={{ borderColor: "#D0DAE4" }}>
            <div className="relative">
              <select className="w-full appearance-none h-11 rounded-xl border px-4 pr-10 text-sm" style={{ borderColor: "#D0DAE4" }}>
                <option>Select a product...</option>
              </select>
              <ChevronDown className="absolute right-3 top-3 w-5 h-5" style={{ color: "#8A9AAA" }} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center h-10 border rounded-xl overflow-hidden" style={{ borderColor: "#D0DAE4" }}>
                <button className="px-3.5 h-full text-lg" style={{ color: "#8A9AAA" }}>−</button>
                <span className="w-10 text-center text-sm font-semibold">0.5</span>
                <button className="px-3.5 h-full text-lg" style={{ color: "#8A9AAA" }}>+</button>
              </div>
              <span className="font-bold" style={{ color: "#1A2B3C" }}>$0.00</span>
            </div>
          </div>

          <button className="w-full h-11 rounded-xl border-2 border-dashed text-sm font-medium flex items-center justify-center gap-2" style={{ borderColor: "#D0DAE4", color: "#8A9AAA" }}>
            <Plus className="w-4 h-4" /> Add another product
          </button>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button className="rounded-2xl border-2 border-dashed p-4 text-left" style={{ borderColor: "#D0DAE4" }}>
              <Heart className="w-4 h-4 mb-1.5" style={{ color: "#8A9AAA" }} />
              <p className="text-xs font-bold" style={{ color: "#1A2B3C" }}>Add a tip?</p>
              <p className="text-[9px]" style={{ color: "#8A9AAA" }}>Optional</p>
            </button>
            <div className="rounded-2xl border bg-white p-4" style={{ borderColor: "#D0DAE4" }}>
              <textarea className="w-full text-xs resize-none border-0 p-0 focus:outline-none min-h-[50px]" placeholder="Notes (optional)" style={{ color: "#1A2B3C" }} />
            </div>
          </div>

          <a href="#" className="flex items-center gap-3 p-3.5 rounded-2xl border bg-white" style={{ borderColor: "#D0DAE4" }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#E8F4FD" }}>
              <MessageCircle className="w-4 h-4" style={{ color: "#2AABEE" }} />
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: "#1A2B3C" }}>@urbanblend789</p>
              <p className="text-[10px]" style={{ color: "#8A9AAA" }}>Need help? Telegram us</p>
            </div>
          </a>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t" style={{ background: "rgba(15,23,42,0.95)", borderColor: "#1E293B" }}>
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Grand Total</p>
              <p className="text-xl font-bold text-white">$10.00</p>
              <p className="text-[10px] text-white/40">incl. Royal Mail</p>
            </div>
            <button className="h-12 px-7 rounded-xl text-sm font-bold text-white flex items-center gap-2" style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}>
              Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-center border-t pt-2 text-white/30" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
            Payments are to be made through the website once sleeping pep confirms
          </p>
        </div>
      </div>
    </div>
  );
}
