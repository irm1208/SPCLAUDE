import { Search, Filter, ShoppingBag, ChevronRight, MessageCircle, ArrowRight } from "lucide-react";

const FEATURED = [
  { name: "BPC-157 5mg", price: "$29.99", cat: "Healing" },
  { name: "TB-500 5mg", price: "$34.99", cat: "Healing" },
  { name: "Semaglutide 5mg", price: "$89.99", cat: "GLP-1" },
  { name: "Tirzepatide 10mg", price: "$119.99", cat: "GLP-1" },
  { name: "CJC-1295 / Ipa 5/5mg", price: "$49.99", cat: "Growth" },
  { name: "MK-677 25mg caps", price: "$39.99", cat: "Growth" },
];

const CATEGORIES = ["All", "GLP-1", "Healing", "Growth", "Blends", "PCT"];

export function CatalogFirst() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F4F8", fontFamily: "'Inter', sans-serif" }}>
      <nav className="bg-white border-b px-4 pt-3 pb-0" style={{ borderColor: "#D0DAE4" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold" style={{ color: "#1A2B3C" }}>Peps Anonymous</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#F0F4F8", color: "#5A6E7F" }}>
              USD <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold" style={{ background: "#4A7BA7", color: "#fff" }}>$</span>
            </div>
            <button className="relative w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#F0F4F8" }}>
              <ShoppingBag className="w-4 h-4" style={{ color: "#5A6E7F" }} />
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "#E53E3E" }}>1</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-9 rounded-lg border px-3 flex items-center gap-2" style={{ borderColor: "#D0DAE4", background: "#F0F4F8" }}>
            <Search className="w-3.5 h-3.5" style={{ color: "#8A9AAA" }} />
            <span className="text-xs" style={{ color: "#8A9AAA" }}>Search 128+ products...</span>
          </div>
          <button className="w-9 h-9 rounded-lg border flex items-center justify-center" style={{ borderColor: "#D0DAE4" }}>
            <Filter className="w-3.5 h-3.5" style={{ color: "#5A6E7F" }} />
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-2.5 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat}
              className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0"
              style={{
                background: i === 0 ? "#1A2B3C" : "#E8EDF2",
                color: i === 0 ? "#FFFFFF" : "#5A6E7F",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 px-4 py-4 space-y-4 pb-44">
        <div className="rounded-xl p-3.5 flex items-center gap-3" style={{ background: "#1A2B3C" }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#F59E0B" }} />
          <div className="flex-1">
            <p className="text-xs font-bold text-white">Draft order in progress</p>
            <p className="text-[10px]" style={{ color: "#8A9AAA" }}>1 item · tap to resume</p>
          </div>
          <ArrowRight className="w-4 h-4 text-white opacity-50" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Popular Products</p>
            <button className="text-xs font-semibold flex items-center gap-0.5" style={{ color: "#4A7BA7" }}>
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {FEATURED.map((product) => (
              <button key={product.name} className="rounded-xl bg-white border p-3 text-left" style={{ borderColor: "#D0DAE4" }}>
                <div className="w-full h-16 rounded-lg mb-2.5 flex items-center justify-center" style={{ background: "#F0F4F8" }}>
                  <ShoppingBag className="w-5 h-5" style={{ color: "#D0DAE4" }} />
                </div>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#E8EDF2", color: "#5A6E7F" }}>{product.cat}</span>
                <p className="text-xs font-bold mt-1.5 leading-tight" style={{ color: "#1A2B3C" }}>{product.name}</p>
                <p className="text-xs font-bold mt-1" style={{ color: "#4A7BA7" }}>{product.price}</p>
              </button>
            ))}
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t" style={{ borderColor: "#D0DAE4" }}>
        <div className="px-4 pt-2.5 pb-1.5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "#8A9AAA" }}>Your Cart</p>
              <p className="text-base font-bold" style={{ color: "#1A2B3C" }}>1 item · $0.00</p>
            </div>
            <button className="h-10 px-5 rounded-lg text-sm font-bold text-white" style={{ background: "#1A2B3C" }}>
              Checkout
            </button>
          </div>
        </div>
        <div className="flex items-center justify-around py-2 border-t" style={{ borderColor: "#E8EDF2" }}>
          <button className="flex flex-col items-center gap-0.5">
            <ShoppingBag className="w-4 h-4" style={{ color: "#4A7BA7" }} />
            <span className="text-[9px] font-semibold" style={{ color: "#4A7BA7" }}>Shop</span>
          </button>
          <button className="flex flex-col items-center gap-0.5">
            <Search className="w-4 h-4" style={{ color: "#8A9AAA" }} />
            <span className="text-[9px] font-semibold" style={{ color: "#8A9AAA" }}>Orders</span>
          </button>
          <button className="flex flex-col items-center gap-0.5">
            <MessageCircle className="w-4 h-4" style={{ color: "#8A9AAA" }} />
            <span className="text-[9px] font-semibold" style={{ color: "#8A9AAA" }}>Help</span>
          </button>
        </div>
      </div>
    </div>
  );
}
