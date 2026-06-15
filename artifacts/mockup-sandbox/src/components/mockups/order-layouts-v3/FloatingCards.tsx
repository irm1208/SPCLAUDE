import { ChevronDown, Plus, Package, MessageCircle, Heart, ArrowLeft, ArrowRight } from "lucide-react";

export function FloatingCards() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0F172A 0%, #1A2B3C 30%, #F0F4F8 30%)", fontFamily: "'Inter', sans-serif" }}>
      <nav className="flex items-center gap-3 px-4 py-3">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <span className="text-sm font-bold flex-1 text-white">New Order</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/70">
          USD <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold bg-blue-500 text-white">$</span>
        </div>
      </nav>

      <main className="flex-1 px-4 pb-36 space-y-3 -mt-1">
        <div className="bg-white rounded-2xl shadow-lg shadow-black/5 border p-4 space-y-3" style={{ borderColor: "#D0DAE4" }}>
          <div className="flex items-center gap-2 pb-1">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#3B82F620" }}>
              <span className="text-[10px] font-bold" style={{ color: "#3B82F6" }}>1</span>
            </div>
            <span className="text-xs font-bold" style={{ color: "#1A2B3C" }}>Customer</span>
          </div>
          <input className="w-full h-11 rounded-xl border px-4 text-sm" style={{ borderColor: "#D0DAE4" }} placeholder="@telegram_username" />
        </div>

        <div className="bg-white rounded-2xl shadow-lg shadow-black/5 border p-4 space-y-3" style={{ borderColor: "#D0DAE4" }}>
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#8B5CF620" }}>
                <span className="text-[10px] font-bold" style={{ color: "#8B5CF6" }}>2</span>
              </div>
              <span className="text-xs font-bold" style={{ color: "#1A2B3C" }}>Products</span>
            </div>
            <button className="text-[10px] font-bold flex items-center gap-1" style={{ color: "#4A7BA7" }}>
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="relative">
            <select className="w-full appearance-none h-11 rounded-xl border px-4 pr-10 text-sm" style={{ borderColor: "#D0DAE4" }}>
              <option>Select a product...</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 w-5 h-5" style={{ color: "#8A9AAA" }} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center h-10 border rounded-xl overflow-hidden" style={{ borderColor: "#D0DAE4" }}>
              <button className="px-3 h-full text-lg" style={{ color: "#8A9AAA" }}>−</button>
              <span className="w-10 text-center text-sm font-semibold">0.5</span>
              <button className="px-3 h-full text-lg" style={{ color: "#8A9AAA" }}>+</button>
            </div>
            <span className="font-bold" style={{ color: "#1A2B3C" }}>$0.00</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg shadow-black/5 border p-4" style={{ borderColor: "#D0DAE4" }}>
          <div className="flex items-center gap-2 pb-3">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#EA580C20" }}>
              <span className="text-[10px] font-bold" style={{ color: "#EA580C" }}>3</span>
            </div>
            <span className="text-xs font-bold" style={{ color: "#1A2B3C" }}>Delivery</span>
          </div>
          <div className="flex gap-2">
            {[
              { name: "Royal Mail", price: "$10", sel: true },
              { name: "InPost", price: "$3", sel: false },
            ].map(m => (
              <button key={m.name} className="flex-1 rounded-xl border-2 py-3.5 text-center" style={{ borderColor: m.sel ? "#4A7BA7" : "#D0DAE4", background: m.sel ? "#4A7BA710" : "transparent" }}>
                <Package className="w-4 h-4 mx-auto mb-1" style={{ color: m.sel ? "#4A7BA7" : "#8A9AAA" }} />
                <p className="text-xs font-bold" style={{ color: m.sel ? "#4A7BA7" : "#1A2B3C" }}>{m.name}</p>
                <p className="text-[10px] font-semibold" style={{ color: m.sel ? "#4A7BA7" : "#8A9AAA" }}>{m.price}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg shadow-black/5 border p-4 space-y-3" style={{ borderColor: "#D0DAE4" }}>
          <div className="flex items-center gap-2 pb-1">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#05966920" }}>
              <span className="text-[10px] font-bold" style={{ color: "#059669" }}>4</span>
            </div>
            <span className="text-xs font-bold" style={{ color: "#1A2B3C" }}>Extras</span>
          </div>
          <button className="w-full flex items-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed text-sm font-semibold" style={{ borderColor: "#D0DAE4", color: "#8A9AAA" }}>
            <Heart className="w-4 h-4" /> Add a tip? <span className="text-xs font-normal">(optional)</span>
          </button>
          <textarea className="w-full rounded-xl border p-3 text-sm min-h-[60px] resize-none" style={{ borderColor: "#D0DAE4" }} placeholder="Notes (optional)" />
        </div>

        <a href="#" className="flex items-center gap-3 p-3.5 rounded-2xl border bg-white shadow-lg shadow-black/5" style={{ borderColor: "#D0DAE4" }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#E8F4FD" }}>
            <MessageCircle className="w-4 h-4" style={{ color: "#2AABEE" }} />
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: "#1A2B3C" }}>@urbanblend789</p>
            <p className="text-[10px]" style={{ color: "#8A9AAA" }}>Need help? Telegram us</p>
          </div>
        </a>
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
