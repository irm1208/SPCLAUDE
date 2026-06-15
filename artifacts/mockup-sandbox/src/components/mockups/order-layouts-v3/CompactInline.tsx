import { ChevronDown, Plus, Package, MessageCircle, Heart, ArrowLeft, ArrowRight } from "lucide-react";

export function CompactInline() {
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
        <div className="bg-white rounded-b-3xl border-b shadow-sm px-4 py-5 space-y-4" style={{ borderColor: "#D0DAE4" }}>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 rounded-full" style={{ background: "#3B82F6" }} />
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Customer</label>
              <input className="w-full h-10 rounded-lg border px-3 text-sm mt-1" style={{ borderColor: "#D0DAE4" }} placeholder="@telegram_username" />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-1.5 h-8 rounded-full mt-5" style={{ background: "#EA580C" }} />
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Delivery</label>
              <div className="flex gap-2 mt-1">
                {[
                  { name: "Royal Mail", price: "$10", sel: true },
                  { name: "InPost", price: "$3", sel: false },
                ].map(m => (
                  <button key={m.name} className="flex-1 h-10 rounded-lg border-2 text-xs font-bold" style={{ borderColor: m.sel ? "#4A7BA7" : "#D0DAE4", background: m.sel ? "#4A7BA710" : "transparent", color: m.sel ? "#4A7BA7" : "#5A6E7F" }}>
                    {m.name} · {m.price}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-4 rounded-full" style={{ background: "#8B5CF6" }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Products</span>
          </div>

          <div className="bg-white rounded-2xl border p-3" style={{ borderColor: "#D0DAE4" }}>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select className="w-full appearance-none h-10 rounded-lg border px-3 pr-8 text-sm" style={{ borderColor: "#D0DAE4" }}>
                  <option>Select a product...</option>
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4" style={{ color: "#8A9AAA" }} />
              </div>
              <div className="flex items-center h-10 border rounded-lg overflow-hidden shrink-0" style={{ borderColor: "#D0DAE4" }}>
                <button className="px-2.5 h-full text-base" style={{ color: "#8A9AAA" }}>−</button>
                <span className="w-8 text-center text-xs font-semibold">0.5</span>
                <button className="px-2.5 h-full text-base" style={{ color: "#8A9AAA" }}>+</button>
              </div>
              <span className="text-sm font-bold w-12 text-right shrink-0" style={{ color: "#1A2B3C" }}>$0.00</span>
            </div>
          </div>

          <button className="w-full h-10 rounded-xl border-2 border-dashed text-xs font-medium flex items-center justify-center gap-2" style={{ borderColor: "#D0DAE4", color: "#8A9AAA" }}>
            <Plus className="w-3 h-3" /> Add another product
          </button>

          <div className="flex items-center gap-3 pt-1">
            <div className="w-1.5 h-4 rounded-full" style={{ background: "#059669" }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Extras</span>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 h-12 rounded-xl border-2 border-dashed flex items-center justify-center gap-1.5 text-xs font-semibold" style={{ borderColor: "#D0DAE4", color: "#8A9AAA" }}>
              <Heart className="w-3.5 h-3.5" /> Tip (optional)
            </button>
            <div className="flex-1 bg-white rounded-xl border flex items-center" style={{ borderColor: "#D0DAE4" }}>
              <input className="w-full h-12 rounded-xl px-3 text-xs border-0 focus:outline-none" placeholder="Notes..." style={{ color: "#1A2B3C" }} />
            </div>
          </div>

          <a href="#" className="flex items-center gap-3 p-3 rounded-xl border bg-white" style={{ borderColor: "#D0DAE4" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#E8F4FD" }}>
              <MessageCircle className="w-4 h-4" style={{ color: "#2AABEE" }} />
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: "#1A2B3C" }}>@urbanblend789</p>
              <p className="text-[10px]" style={{ color: "#8A9AAA" }}>Need help?</p>
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
