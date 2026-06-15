import { useState } from "react";
import { ShoppingCart, Zap, FileText, Globe, Check, ChevronDown, X } from "lucide-react";

const NAVY = "#1B3A7A";
const NAVY_DARK = "#071640";
const BLUE = "#2D6BCC";
const BLUE_BG = "rgba(45,107,204,0.08)";
const BLUE_BORDER = "rgba(45,107,204,0.2)";

const PRODUCTS = [
  { id: 1, name: "Retatrutide 10mg", abbr: "RT", category: "GLP-1", price: 20.0, seller: "Test", rating: 4.9, ships: "Worldwide", country: "UK", batch: "32342", coa: true, stock: 5, lowStock: true, payment: ["USDT", "PayPal"] },
  { id: 2, name: "BPC-157 5mg", abbr: "BP", category: "Peptides", price: 35.0, seller: "AlphaResearch", rating: 5.0, ships: "EU / UK", country: "Germany", batch: "AB-991", coa: true, stock: 22, lowStock: false, payment: ["USDT", "Revolut"] },
  { id: 3, name: "Semaglutide 2mg", abbr: "SG", category: "GLP-1", price: 55.0, seller: "NovaPeptides", rating: 4.8, ships: "Worldwide", country: "USA", batch: "NP-4401", coa: true, stock: 3, lowStock: true, payment: ["USDT"] },
  { id: 4, name: "TB-500 5mg", abbr: "TB", category: "Peptides", price: 28.0, seller: "Test", rating: 4.9, ships: "Worldwide", country: "UK", batch: "TB-882", coa: false, stock: 14, lowStock: false, payment: ["USDT", "PayPal"] },
  { id: 5, name: "Ipamorelin 2mg", abbr: "IP", category: "Peptides", price: 18.0, seller: "AlphaResearch", rating: 5.0, ships: "EU / UK", country: "Germany", batch: "IP-229", coa: true, stock: 30, lowStock: false, payment: ["USDT"] },
];

const CATEGORIES = ["GLP-1", "Peptides"];
const SELLERS = ["Test", "AlphaResearch", "NovaPeptides"];
const COUNTRIES = ["UK", "Germany", "USA"];

export function CommandCenter() {
  const [selCats, setSelCats] = useState<string[]>([]);
  const [selSellers, setSelSellers] = useState<string[]>([]);
  const [selCountries, setSelCountries] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showGBP, setShowGBP] = useState(false);
  const [cart, setCart] = useState(0);
  const [sort, setSort] = useState("price-asc");

  const toggle = (arr: string[], set: (v: string[]) => void, val: string) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const fmt = (p: number) => showGBP ? `£${(p * 0.79).toFixed(2)}` : `$${p.toFixed(2)}`;

  const filtered = PRODUCTS.filter(p => {
    if (inStockOnly && p.stock === 0) return false;
    if (selCats.length && !selCats.includes(p.category)) return false;
    if (selSellers.length && !selSellers.includes(p.seller)) return false;
    if (selCountries.length && !selCountries.includes(p.country)) return false;
    return true;
  }).sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "rating") return b.rating - a.rating;
    return 0;
  });

  const activeCount = selCats.length + selSellers.length + selCountries.length + (inStockOnly ? 1 : 0);

  const clearAll = () => { setSelCats([]); setSelSellers([]); setSelCountries([]); setInStockOnly(false); };

  const FilterSection = ({ title, items, selected, onToggle }: { title: string; items: string[]; selected: string[]; onToggle: (v: string) => void }) => (
    <div className="mb-5">
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#9CA3AF" }}>{title}</p>
      <div className="space-y-1">
        {items.map(item => (
          <button key={item} onClick={() => onToggle(item)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-[12px] transition-colors" style={{ background: selected.includes(item) ? BLUE_BG : "transparent", color: selected.includes(item) ? BLUE : "#374151" }}>
            <span className={`w-4 h-4 rounded flex items-center justify-center border ${selected.includes(item) ? "border-blue-600" : "border-gray-300"}`} style={{ background: selected.includes(item) ? BLUE : "#fff" }}>
              {selected.includes(item) && <Check className="w-2.5 h-2.5 text-white" />}
            </span>
            <span className="font-medium">{item}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F7F8FC", fontFamily: "Inter, sans-serif" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 h-13 border-b" style={{ background: "#fff", borderColor: "#E5E7EB", height: 52 }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>TLV</div>
          <div>
            <span className="text-[14px] font-bold" style={{ color: "#111827" }}>The Lonely Vial</span>
            <span className="ml-2 text-[10px] font-medium" style={{ color: BLUE }}>Single vials · No kits</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGBP(!showGBP)} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border" style={{ background: showGBP ? BLUE_BG : "#F9FAFB", color: showGBP ? BLUE : "#6B7280", borderColor: showGBP ? BLUE_BORDER : "#E5E7EB" }}>
            {showGBP ? "£ GBP" : "$ USD"}
          </button>
          <button className="relative w-8 h-8 rounded-lg flex items-center justify-center border" style={{ background: "#F9FAFB", borderColor: "#E5E7EB" }}>
            <ShoppingCart className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
            {cart > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center" style={{ background: BLUE }}>{cart}</span>}
          </button>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - filters */}
        <div className="shrink-0 overflow-y-auto border-r p-4" style={{ width: 220, background: "#fff", borderColor: "#E5E7EB" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[13px] font-bold" style={{ color: "#111827" }}>Filters</span>
            {activeCount > 0 && (
              <button onClick={clearAll} className="text-[10px] font-semibold flex items-center gap-1" style={{ color: "#6B7280" }}>
                <X className="w-3 h-3" /> Clear {activeCount}
              </button>
            )}
          </div>

          {/* In Stock */}
          <div className="mb-5">
            <button onClick={() => setInStockOnly(!inStockOnly)} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-[12px] transition-colors" style={{ background: inStockOnly ? "#D1FAE5" : "transparent", color: inStockOnly ? "#065F46" : "#374151" }}>
              <span className={`w-4 h-4 rounded flex items-center justify-center border`} style={{ background: inStockOnly ? "#059669" : "#fff", borderColor: inStockOnly ? "#059669" : "#D1D5DB" }}>
                {inStockOnly && <Check className="w-2.5 h-2.5 text-white" />}
              </span>
              <span className="font-semibold">In Stock Only</span>
            </button>
          </div>

          <FilterSection title="Category" items={CATEGORIES} selected={selCats} onToggle={v => toggle(selCats, setSelCats, v)} />
          <FilterSection title="Seller" items={SELLERS} selected={selSellers} onToggle={v => toggle(selSellers, setSelSellers, v)} />
          <FilterSection title="Country" items={COUNTRIES} selected={selCountries} onToggle={v => toggle(selCountries, setSelCountries, v)} />

          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#9CA3AF" }}>Payment</p>
            {["USDT", "PayPal", "Revolut"].map(pm => (
              <div key={pm} className="px-2 py-1 text-[12px]" style={{ color: "#6B7280" }}>{pm}</div>
            ))}
          </div>
        </div>

        {/* Right: result bar + product list */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Result bar */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b shrink-0" style={{ background: "#F9FAFB", borderColor: "#E5E7EB" }}>
            <span className="text-[12px] font-semibold" style={{ color: "#374151" }}>
              {filtered.length} <span style={{ color: "#9CA3AF" }}>of {PRODUCTS.length} products</span>
              {activeCount > 0 && <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: BLUE }}>{activeCount} filter{activeCount > 1 ? "s" : ""}</span>}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[11px]" style={{ color: "#9CA3AF" }}>Sort:</span>
              <select value={sort} onChange={e => setSort(e.target.value)} className="text-[11px] font-semibold border rounded px-1.5 py-0.5" style={{ color: "#374151", borderColor: "#E5E7EB", background: "#fff" }}>
                <option value="price-asc">Price ↑</option>
                <option value="price-desc">Price ↓</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>

          {/* Products */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map((p, i) => (
              <div key={p.id} className="flex items-center px-5 py-3.5 border-b hover:bg-white transition-colors" style={{ borderColor: "#F3F4F6", background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-black shrink-0 mr-3" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
                  {p.abbr}
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold" style={{ color: "#111827" }}>{p.name}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: BLUE_BG, color: BLUE }}>{p.category}</span>
                    {p.lowStock && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "#FEF9C3", color: "#854D0E" }}>Low stock</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-0.5 text-[11px]" style={{ color: "#6B7280" }}>
                    <span style={{ color: BLUE }}>{p.seller} ★{p.rating}</span>
                    <span className="flex items-center gap-0.5"><Globe className="w-3 h-3" />{p.ships}</span>
                    <span>#{p.batch}</span>
                    {p.coa && <span className="flex items-center gap-0.5" style={{ color: "#059669" }}><FileText className="w-3 h-3" />COA</span>}
                    {p.payment.map(pm => <span key={pm}>{pm}</span>)}
                  </div>
                </div>

                {/* Price + actions */}
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <div className="text-right mr-2">
                    <div className="text-[16px] font-black" style={{ color: "#111827" }}>{fmt(p.price)}</div>
                    <div className="text-[10px]" style={{ color: "#9CA3AF" }}>USDT</div>
                  </div>
                  <button onClick={() => setCart(c => c + 1)} className="h-8 px-3 rounded-lg border text-[11px] font-semibold" style={{ color: BLUE, borderColor: BLUE_BORDER, background: BLUE_BG }}>
                    + Cart
                  </button>
                  <button className="h-8 px-3 rounded-lg text-[11px] font-bold text-white flex items-center gap-1" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
                    <Zap className="w-3 h-3" /> Buy
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20" style={{ color: "#9CA3AF" }}>
                <p className="text-[14px] font-semibold">No products match your filters</p>
                <button onClick={clearAll} className="mt-2 text-[12px] font-semibold" style={{ color: BLUE }}>Clear all filters</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
