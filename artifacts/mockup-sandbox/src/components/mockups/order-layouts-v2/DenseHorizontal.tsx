import { ChevronDown, Plus, Trash2, Package, MessageCircle, Heart, ArrowLeft, ShoppingBag } from "lucide-react";

export function DenseHorizontal() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8", fontFamily: "'Inter', sans-serif" }}>
      <nav className="flex items-center gap-3 px-4 py-3 bg-white border-b" style={{ borderColor: "#D0DAE4" }}>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#F0F4F8" }}>
          <ArrowLeft className="w-4 h-4" style={{ color: "#1A2B3C" }} />
        </button>
        <span className="text-sm font-bold flex-1" style={{ color: "#1A2B3C" }}>New Order</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#F0F4F8", color: "#5A6E7F" }}>
          USD <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold" style={{ background: "#4A7BA7", color: "#fff" }}>$</span>
        </div>
      </nav>

      <main className="flex-1 px-4 py-4 pb-36 space-y-3">
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#D0DAE4" }}>
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Customer</span>
          </div>
          <div className="px-4 pb-4">
            <input
              className="w-full h-10 rounded-lg border px-3 text-sm"
              style={{ borderColor: "#D0DAE4" }}
              placeholder="@telegram_username"
            />
          </div>

          <div className="border-t" style={{ borderColor: "#E8EDF2" }}>
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Products</span>
              <button className="text-[10px] font-bold flex items-center gap-1" style={{ color: "#4A7BA7" }}>
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            <div className="px-4 pb-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select className="w-full appearance-none h-10 rounded-lg border px-3 pr-8 text-sm" style={{ borderColor: "#D0DAE4" }}>
                    <option>Select a product...</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4" style={{ color: "#8A9AAA" }} />
                </div>
                <div className="flex items-center h-10 border rounded-lg overflow-hidden shrink-0" style={{ borderColor: "#D0DAE4" }}>
                  <button className="px-2 h-full text-base" style={{ color: "#8A9AAA" }}>−</button>
                  <span className="w-8 text-center text-xs font-semibold">0.5</span>
                  <button className="px-2 h-full text-base" style={{ color: "#8A9AAA" }}>+</button>
                </div>
                <span className="text-sm font-bold w-14 text-right shrink-0" style={{ color: "#1A2B3C" }}>$0.00</span>
              </div>
            </div>
          </div>

          <div className="border-t" style={{ borderColor: "#E8EDF2" }}>
            <div className="px-4 pt-3 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Delivery</span>
            </div>
            <div className="px-4 pb-3 flex gap-2">
              {[
                { name: "Royal Mail", price: "$10", selected: true },
                { name: "InPost", price: "$3", selected: false },
              ].map(m => (
                <button
                  key={m.name}
                  className="flex-1 rounded-xl border-2 py-3 text-center"
                  style={{
                    borderColor: m.selected ? "#4A7BA7" : "#D0DAE4",
                    background: m.selected ? "#4A7BA710" : "transparent",
                  }}
                >
                  <Package className="w-4 h-4 mx-auto mb-1" style={{ color: m.selected ? "#4A7BA7" : "#8A9AAA" }} />
                  <p className="text-xs font-bold" style={{ color: m.selected ? "#4A7BA7" : "#1A2B3C" }}>{m.name}</p>
                  <p className="text-[10px] font-semibold" style={{ color: m.selected ? "#4A7BA7" : "#8A9AAA" }}>{m.price}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            className="rounded-xl border-2 border-dashed p-3.5 text-left"
            style={{ borderColor: "#D0DAE4" }}
          >
            <Heart className="w-4 h-4 mb-1.5" style={{ color: "#8A9AAA" }} />
            <p className="text-xs font-bold" style={{ color: "#1A2B3C" }}>Add a tip?</p>
            <p className="text-[9px]" style={{ color: "#8A9AAA" }}>Optional</p>
          </button>
          <div className="rounded-xl border bg-white p-3.5" style={{ borderColor: "#D0DAE4" }}>
            <textarea
              className="w-full text-[11px] resize-none border-0 p-0 focus:outline-none min-h-[45px]"
              placeholder="Notes (optional)"
              style={{ color: "#1A2B3C" }}
            />
          </div>
        </div>

        <a href="#" className="flex items-center gap-3 p-3 rounded-xl border bg-white" style={{ borderColor: "#D0DAE4" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#E8F4FD" }}>
            <MessageCircle className="w-4 h-4" style={{ color: "#2AABEE" }} />
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: "#1A2B3C" }}>@urbanblend789</p>
            <p className="text-[10px]" style={{ color: "#8A9AAA" }}>Need help? Telegram us</p>
          </div>
        </a>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t" style={{ borderColor: "#D0DAE4" }}>
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#8A9AAA" }}>Grand Total</p>
              <p className="text-xl font-bold" style={{ color: "#1A2B3C" }}>$10.00</p>
              <p className="text-[10px]" style={{ color: "#8A9AAA" }}>incl. Royal Mail</p>
            </div>
            <button className="h-12 px-7 rounded-xl text-sm font-bold text-white" style={{ background: "#1A2B3C" }}>
              Review Order
            </button>
          </div>
          <p className="text-[10px] text-center border-t pt-2" style={{ borderColor: "#E8EDF2", color: "#8A9AAA" }}>
            Payments are to be made through the website once sleeping pep confirms
          </p>
        </div>
      </div>
    </div>
  );
}
