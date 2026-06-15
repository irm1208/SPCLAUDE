import { ChevronDown, Plus, Package, MessageCircle, Heart, ArrowLeft, ArrowRight } from "lucide-react";

export function FullScroll() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)" }}>
        <nav className="flex items-center gap-3 px-4 py-3">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <span className="text-sm font-bold flex-1 text-white">New Order</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/70">
            USD <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold bg-blue-500 text-white">$</span>
          </div>
        </nav>
        <div className="px-4 pb-5 pt-1">
          <p className="text-xs text-white/40 mb-1">Step 1 of 1</p>
          <p className="text-lg font-bold text-white">Build your order</p>
          <p className="text-xs text-white/50">Fill in everything below, then review</p>
        </div>
      </div>

      <main className="flex-1 px-4 py-5 pb-36 space-y-5 -mt-1">
        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Customer</p>
          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: "#D0DAE4" }}>
            <label className="text-xs font-extrabold block mb-2" style={{ color: "#1A2B3C" }}>Telegram Username</label>
            <input className="w-full h-11 rounded-xl border px-4 text-sm" style={{ borderColor: "#D0DAE4" }} placeholder="@username" />
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Products</p>
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
        </section>

        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Delivery</p>
          <div className="space-y-2">
            {[
              { name: "Royal Mail", price: "$10.00", sel: true },
              { name: "InPost", price: "$3.00", sel: false },
            ].map(m => (
              <label key={m.name} className="flex items-center justify-between p-3.5 rounded-2xl border-2 bg-white cursor-pointer" style={{ borderColor: m.sel ? "#4A7BA7" : "#D0DAE4", background: m.sel ? "#4A7BA710" : "#fff" }}>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: m.sel ? "#4A7BA7" : "#8A9AAA80" }}>
                    {m.sel && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#4A7BA7" }} />}
                  </div>
                  <Package className="w-4 h-4" style={{ color: "#8A9AAA" }} />
                  <span className="font-semibold text-sm" style={{ color: m.sel ? "#4A7BA7" : "#1A2B3C" }}>{m.name}</span>
                </div>
                <span className="font-bold text-sm" style={{ color: m.sel ? "#4A7BA7" : "#8A9AAA" }}>{m.price}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <button className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 border-dashed text-sm font-semibold" style={{ borderColor: "#D0DAE4", color: "#8A9AAA" }}>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span>Add a tip?</span>
              <span className="text-xs font-normal">(optional)</span>
            </div>
          </button>
        </section>

        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Notes</p>
          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: "#D0DAE4" }}>
            <textarea className="w-full rounded-xl border p-3 text-sm min-h-[80px] resize-none" style={{ borderColor: "#D0DAE4" }} placeholder="Any special instructions? (Optional)" />
          </div>
        </section>

        <a href="#" className="flex items-center gap-3 p-3.5 rounded-2xl border bg-white" style={{ borderColor: "#D0DAE4" }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#E8F4FD" }}>
            <MessageCircle className="w-4 h-4" style={{ color: "#2AABEE" }} />
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: "#1A2B3C" }}>@urbanblend789</p>
            <p className="text-[10px]" style={{ color: "#8A9AAA" }}>Message us on Telegram for help</p>
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
              Review Order <ArrowRight className="w-4 h-4" />
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
