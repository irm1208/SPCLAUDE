import { useState } from "react";
import {
  ShoppingCart, Zap, FileText, Globe, CreditCard,
  FlaskConical, ChevronDown, Check, Package,
} from "lucide-react";

const NAVY = "#1B3A7A";
const NAVY_DARK = "#071640";
const BLUE = "#2D6BCC";
const BLUE_BG = "rgba(45,107,204,0.08)";
const BLUE_BORDER = "rgba(45,107,204,0.2)";

const FILTERS = ["Category", "Seller", "Peptide", "Country", "Manufacturer", "Payment"];

const PRODUCTS = [
  {
    id: 1, name: "Retatrutide 10mg", category: "Peptides", price: 20.0,
    seller: "Test", rating: 4.9, ships: "Worldwide", batch: "32342",
    coa: true, contact: "@test", stock: 5, lowStock: true,
    payment: ["USDT", "PayPal"], country: "UK",
  },
  {
    id: 2, name: "BPC-157 5mg", category: "Peptides", price: 35.0,
    seller: "AlphaResearch", rating: 5.0, ships: "EU / UK", batch: "AB-991",
    coa: true, contact: "@alpharesearch", stock: 22, lowStock: false,
    payment: ["USDT", "Revolut"], country: "Germany",
  },
  {
    id: 3, name: "Semaglutide 2mg", category: "GLP-1", price: 55.0,
    seller: "NovaPeptides", rating: 4.8, ships: "Worldwide", batch: "NP-4401",
    coa: true, contact: "@novapeptides", stock: 3, lowStock: true,
    payment: ["USDT"], country: "USA",
  },
  {
    id: 4, name: "TB-500 5mg", category: "Peptides", price: 28.0,
    seller: "Test", rating: 4.9, ships: "Worldwide", batch: "TB-882",
    coa: false, contact: "@test", stock: 14, lowStock: false,
    payment: ["USDT", "PayPal"], country: "UK",
  },
];

export function ScanList() {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showGBP, setShowGBP] = useState(false);
  const [cart, setCart] = useState(0);

  const toggleFilter = (f: string) =>
    setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const fmt = (p: number) => showGBP ? `£${(p * 0.79).toFixed(2)}` : `$${p.toFixed(2)}`;

  const products = inStockOnly ? PRODUCTS.filter(p => p.stock > 0) : PRODUCTS;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F4F6FA", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b" style={{ background: "#fff", borderColor: "#E5E9F2" }}>
        <div>
          <span className="text-[15px] font-bold tracking-tight" style={{ color: "#0F1A2E" }}>The Lonely Vial</span>
          <span className="ml-2 text-[11px] font-medium" style={{ color: BLUE }}>Single vials · No kits · {products.length} results</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGBP(!showGBP)}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border"
            style={{ background: showGBP ? BLUE_BG : "#F8F9FB", color: showGBP ? BLUE : "#6B7280", borderColor: showGBP ? BLUE_BORDER : "#E5E7EB" }}>
            {showGBP ? "£ GBP" : "$ USD"}
          </button>
          <button onClick={() => setCart(c => c + 1)} className="relative w-9 h-9 rounded-lg flex items-center justify-center border" style={{ background: "#F8F9FB", borderColor: "#E5E7EB" }}>
            <ShoppingCart className="w-4 h-4" style={{ color: "#6B7280" }} />
            {cart > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center text-white" style={{ background: BLUE }}>{cart}</span>}
          </button>
        </div>
      </div>

      {/* Filter chip bar */}
      <div className="flex items-center gap-2 px-6 py-2.5 overflow-x-auto border-b" style={{ background: "#fff", borderColor: "#E5E9F2" }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => toggleFilter(f)}
            className="flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-all"
            style={{
              background: activeFilters.includes(f) ? NAVY : "#F4F6FA",
              color: activeFilters.includes(f) ? "white" : "#4B5563",
              borderColor: activeFilters.includes(f) ? NAVY : "#DDE2EC",
            }}>
            {activeFilters.includes(f) && <Check className="w-3 h-3" />}
            {f}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
        ))}
        <div className="w-px h-5 mx-1" style={{ background: "#DDE2EC" }} />
        <button onClick={() => setInStockOnly(!inStockOnly)}
          className="flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-all"
          style={{
            background: inStockOnly ? "#D1FAE5" : "#F4F6FA",
            color: inStockOnly ? "#065F46" : "#4B5563",
            borderColor: inStockOnly ? "#6EE7B7" : "#DDE2EC",
          }}>
          {inStockOnly && <Check className="w-3 h-3" />}
          In Stock Only
        </button>
        {activeFilters.length > 0 && (
          <button onClick={() => setActiveFilters([])} className="ml-auto text-[11px] font-medium" style={{ color: BLUE }}>
            Clear {activeFilters.length}
          </button>
        )}
      </div>

      {/* Column headers */}
      <div className="grid px-6 py-2 text-[10px] font-bold uppercase tracking-widest" style={{ gridTemplateColumns: "1fr 180px 160px 100px 180px", color: "#9CA3AF", background: "#EAEEF5", borderBottom: "1px solid #DDE2EC" }}>
        <span>Product</span>
        <span>Seller &amp; Ships</span>
        <span>Batch / COA</span>
        <span className="text-right">Price</span>
        <span className="text-right">Actions</span>
      </div>

      {/* Product rows */}
      <div className="flex-1">
        {products.map((p, i) => (
          <div key={p.id} className="grid items-center px-6 py-3.5 hover:bg-white transition-colors" style={{ gridTemplateColumns: "1fr 180px 160px 100px 180px", borderBottom: "1px solid #E5E9F2", background: i % 2 === 0 ? "#F9FAFB" : "#fff" }}>
            {/* Product */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[11px] font-black shrink-0" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
                {p.name.split(" ")[0].slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold truncate" style={{ color: "#0F1A2E" }}>{p.name}</span>
                  {p.lowStock && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "#FEF3C7", color: "#92400E" }}>Only {p.stock} left</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: BLUE_BG, color: BLUE }}>{p.category}</span>
                  {p.payment.map(pm => <span key={pm} className="text-[10px] font-medium px-1.5 py-0.5 rounded border" style={{ color: "#6B7280", borderColor: "#E5E7EB" }}>{pm}</span>)}
                </div>
              </div>
            </div>

            {/* Seller */}
            <div>
              <div className="text-[12px] font-semibold" style={{ color: BLUE }}>{p.seller} <span className="text-[10px]" style={{ color: "#9CA3AF" }}>★ {p.rating}</span></div>
              <div className="flex items-center gap-1 mt-0.5 text-[11px]" style={{ color: "#6B7280" }}>
                <Globe className="w-3 h-3" /> {p.ships}
              </div>
            </div>

            {/* Batch / COA */}
            <div>
              <div className="text-[11px] font-mono" style={{ color: "#6B7280" }}>#{p.batch}</div>
              {p.coa
                ? <div className="flex items-center gap-1 mt-0.5 text-[11px] font-semibold" style={{ color: "#059669" }}><FileText className="w-3 h-3" /> COA Available</div>
                : <div className="text-[11px]" style={{ color: "#D1D5DB" }}>No COA</div>}
            </div>

            {/* Price */}
            <div className="text-right">
              <div className="text-[16px] font-black" style={{ color: "#0F1A2E" }}>{fmt(p.price)}</div>
              <div className="text-[10px]" style={{ color: "#9CA3AF" }}>USDT</div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setCart(c => c + 1)} className="h-8 px-3 rounded-lg border text-[11px] font-semibold transition-all hover:border-blue-400" style={{ color: BLUE, borderColor: BLUE_BORDER, background: BLUE_BG }}>
                + Cart
              </button>
              <button className="h-8 px-3 rounded-lg text-[11px] font-semibold text-white flex items-center gap-1" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
                <Zap className="w-3 h-3" /> Buy Now
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t flex items-center justify-between" style={{ background: "#fff", borderColor: "#E5E9F2" }}>
        <span className="text-[11px]" style={{ color: "#9CA3AF" }}>{products.length} products · Prices in {showGBP ? "GBP" : "USDT"}</span>
        <div className="flex gap-3">
          <button className="text-[11px] font-semibold" style={{ color: BLUE }}>My Account</button>
          <button className="text-[11px] font-semibold" style={{ color: "#6B7280" }}>Sell with us</button>
        </div>
      </div>
    </div>
  );
}
