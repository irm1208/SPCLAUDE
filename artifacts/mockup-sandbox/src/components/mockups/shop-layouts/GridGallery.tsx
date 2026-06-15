import { useState } from "react";
import { ShoppingCart, Zap, FileText, Globe, SlidersHorizontal, X, Check, AlertTriangle } from "lucide-react";

const NAVY = "#1B3A7A";
const NAVY_DARK = "#071640";
const BLUE = "#2D6BCC";
const BLUE_BG = "rgba(45,107,204,0.08)";
const BLUE_BORDER = "rgba(45,107,204,0.2)";

const PRODUCTS = [
  { id: 1, name: "Retatrutide 10mg", abbr: "RT", category: "GLP-1", price: 20.0, seller: "Test", rating: 4.9, ships: "Worldwide", batch: "32342", coa: true, stock: 5, lowStock: true },
  { id: 2, name: "BPC-157 5mg", abbr: "BP", category: "Peptides", price: 35.0, seller: "AlphaResearch", rating: 5.0, ships: "EU / UK", batch: "AB-991", coa: true, stock: 22, lowStock: false },
  { id: 3, name: "Semaglutide 2mg", abbr: "SG", category: "GLP-1", price: 55.0, seller: "NovaPeptides", rating: 4.8, ships: "Worldwide", batch: "NP-4401", coa: true, stock: 3, lowStock: true },
  { id: 4, name: "TB-500 5mg", abbr: "TB", category: "Peptides", price: 28.0, seller: "Test", rating: 4.9, ships: "Worldwide", batch: "TB-882", coa: false, stock: 14, lowStock: false },
  { id: 5, name: "Ipamorelin 2mg", abbr: "IP", category: "Peptides", price: 18.0, seller: "AlphaResearch", rating: 5.0, ships: "EU / UK", batch: "IP-229", coa: true, stock: 30, lowStock: false },
  { id: 6, name: "CJC-1295 2mg", abbr: "CJ", category: "Peptides", price: 22.0, seller: "NovaPeptides", rating: 4.8, ships: "Worldwide", batch: "CJ-661", coa: true, stock: 8, lowStock: false },
];

const CARD_COLORS = ["#071640", "#0A2254", "#0D2A6A", "#071640", "#0A2254", "#0D2A6A"];

export function GridGallery() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showGBP, setShowGBP] = useState(false);
  const [cart, setCart] = useState(0);

  const fmt = (p: number) => showGBP ? `£${(p * 0.79).toFixed(2)}` : `$${p.toFixed(2)}`;

  const filtered = PRODUCTS.filter(p => {
    if (inStockOnly && p.stock === 0) return false;
    if (activeCategory && p.category !== activeCategory) return false;
    return true;
  });

  const activeCount = [activeCategory, inStockOnly].filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F2F8", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b" style={{ background: "#fff", borderColor: "#E2E8F0" }}>
        <div>
          <span className="text-[15px] font-bold" style={{ color: "#0F1A2E" }}>The Lonely Vial</span>
          <span className="ml-2 text-[11px]" style={{ color: BLUE }}>Single vials · No kits</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGBP(!showGBP)} className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border" style={{ background: showGBP ? BLUE_BG : "#F8FAFC", color: showGBP ? BLUE : "#64748B", borderColor: showGBP ? BLUE_BORDER : "#E2E8F0" }}>
            {showGBP ? "£ GBP" : "$ USD"}
          </button>
          <button className="relative w-9 h-9 rounded-lg flex items-center justify-center border" style={{ background: "#F8FAFC", borderColor: "#E2E8F0" }}>
            <ShoppingCart className="w-4 h-4" style={{ color: "#64748B" }} />
            {cart > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-black text-white flex items-center justify-center" style={{ background: BLUE }}>{cart}</span>}
          </button>
        </div>
      </div>

      {/* Filter trigger + quick categories */}
      <div className="flex items-center gap-3 px-6 py-3 border-b" style={{ background: "#fff", borderColor: "#E2E8F0" }}>
        <button onClick={() => setFilterOpen(!filterOpen)}
          className="flex items-center gap-2 h-8 px-3 rounded-lg border text-[12px] font-semibold"
          style={{ background: activeCount ? NAVY : "#F8FAFC", color: activeCount ? "white" : "#475569", borderColor: activeCount ? NAVY : "#E2E8F0" }}>
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters {activeCount > 0 && `(${activeCount})`}
        </button>

        <div className="h-5 w-px" style={{ background: "#E2E8F0" }} />

        {["", "Peptides", "GLP-1"].map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className="h-8 px-3 rounded-lg text-[12px] font-semibold border transition-all"
            style={{
              background: activeCategory === cat ? BLUE_BG : "transparent",
              color: activeCategory === cat ? BLUE : "#64748B",
              borderColor: activeCategory === cat ? BLUE_BORDER : "transparent",
            }}>
            {cat || "All"}
          </button>
        ))}

        <span className="ml-auto text-[11px]" style={{ color: "#94A3B8" }}>{filtered.length} products</span>
      </div>

      {/* Filter drawer */}
      {filterOpen && (
        <div className="px-6 py-4 border-b" style={{ background: "#F8FAFC", borderColor: "#E2E8F0" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold" style={{ color: "#0F1A2E" }}>Active Filters</span>
            <button onClick={() => setFilterOpen(false)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "#E2E8F0" }}>
              <X className="w-3.5 h-3.5" style={{ color: "#64748B" }} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Seller", "Country", "Manufacturer", "Payment", "Batch Range"].map(f => (
              <button key={f} className="flex items-center gap-1.5 h-7 px-3 rounded-full border text-[11px] font-medium" style={{ color: "#475569", borderColor: "#CBD5E1", background: "#fff" }}>
                {f} <ChevronDownIcon />
              </button>
            ))}
            <button onClick={() => setInStockOnly(!inStockOnly)}
              className="flex items-center gap-1.5 h-7 px-3 rounded-full border text-[11px] font-semibold"
              style={{ background: inStockOnly ? "#D1FAE5" : "#fff", color: inStockOnly ? "#065F46" : "#475569", borderColor: inStockOnly ? "#6EE7B7" : "#CBD5E1" }}>
              {inStockOnly ? <Check className="w-3 h-3" /> : null}
              In Stock Only
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 p-6">
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {filtered.map((p, i) => (
            <div key={p.id} className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "#fff", border: "1px solid #E2E8F0" }}>
              {/* Color block header */}
              <div className="relative flex items-center justify-center" style={{ height: 120, background: `linear-gradient(135deg, ${NAVY_DARK} 0%, ${CARD_COLORS[i % 6]} 100%)` }}>
                <div className="flex flex-col items-center">
                  <span className="text-5xl font-black text-white/90 leading-none tracking-tighter">{p.abbr}</span>
                  <span className="text-[10px] font-semibold text-white/50 mt-1 uppercase tracking-widest">{p.category}</span>
                </div>
                {p.lowStock && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: "rgba(251,191,36,0.2)", color: "#FCD34D" }}>
                    <AlertTriangle className="w-3 h-3" /> {p.stock} left
                  </div>
                )}
              </div>

              {/* Card body */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[14px] font-bold leading-tight" style={{ color: "#0F1A2E" }}>{p.name}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: BLUE }}>{p.seller} · ★ {p.rating}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[20px] font-black leading-none" style={{ color: "#0F1A2E" }}>{fmt(p.price)}</p>
                    <p className="text-[10px]" style={{ color: "#94A3B8" }}>USDT</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[10px] mb-4" style={{ color: "#64748B" }}>
                  <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{p.ships}</span>
                  <span>Batch #{p.batch}</span>
                  {p.coa && <span className="flex items-center gap-1 font-semibold" style={{ color: "#059669" }}><FileText className="w-3 h-3" />COA</span>}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setCart(c => c + 1)} className="flex-1 h-9 rounded-xl text-[12px] font-semibold border" style={{ color: BLUE, borderColor: BLUE_BORDER, background: BLUE_BG }}>
                    Add to Cart
                  </button>
                  <button className="flex-1 h-9 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
                    <Zap className="w-3.5 h-3.5" /> Buy Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
