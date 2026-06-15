import { useState } from "react";
import {
  ShoppingCart, Zap, ChevronDown, ChevronRight, FileText,
  Globe, AlertTriangle, Tag, Store, CreditCard, FlaskConical, Star,
} from "lucide-react";

const NAVY = "#1B3A7A";
const NAVY_DARK = "#071640";
const BLUE = "#2D6BCC";
const BLUE_BG = "rgba(45,107,204,0.08)";
const BLUE_BORDER = "rgba(45,107,204,0.22)";

const FLAGS: Record<string, string> = { UK: "🇬🇧", DE: "🇩🇪", US: "🇺🇸" };

const PRODUCTS = [
  { id: "1", name: "Retatrutide 10mg", category: "GLP-1", mgSize: "10mg", price: 20.0, currency: "USDT", stock: 5, vendorName: "Test", vendorRating: 4.9, vendorShipsTo: "Worldwide", vendorCountry: "UK", batchNumber: "32342", labReportUrl: "#", vendorTelegram: "test", vendorWallet: true, vendorPaypalLink: "#", manufacturer: "Janoshik" },
  { id: "2", name: "BPC-157 5mg", category: "Peptides", mgSize: "5mg", price: 35.0, currency: "USDT", stock: 22, vendorName: "AlphaResearch", vendorRating: 5.0, vendorShipsTo: "EU / UK", vendorCountry: "DE", batchNumber: "AB-991", labReportUrl: "#", vendorTelegram: "alpharesearch", vendorWallet: true, vendorPaypalLink: null, manufacturer: "AlphaLab" },
  { id: "3", name: "Semaglutide 2mg", category: "GLP-1", mgSize: "2mg", price: 55.0, currency: "USDT", stock: 3, vendorName: "NovaPeptides", vendorRating: 4.8, vendorShipsTo: "Worldwide", vendorCountry: "US", batchNumber: "NP-4401", labReportUrl: "#", vendorTelegram: "novapeptides", vendorWallet: true, vendorPaypalLink: "#", manufacturer: "NovaLab" },
  { id: "4", name: "TB-500 5mg", category: "Peptides", mgSize: "5mg", price: 28.0, currency: "USDT", stock: 14, vendorName: "Test", vendorRating: 4.9, vendorShipsTo: "Worldwide", vendorCountry: "UK", batchNumber: "TB-882", labReportUrl: null, vendorTelegram: "test", vendorWallet: true, vendorPaypalLink: "#", manufacturer: "Janoshik" },
  { id: "5", name: "Ipamorelin 2mg", category: "Peptides", mgSize: "2mg", price: 18.0, currency: "USDT", stock: 30, vendorName: "AlphaResearch", vendorRating: 5.0, vendorShipsTo: "EU / UK", vendorCountry: "DE", batchNumber: "IP-229", labReportUrl: "#", vendorTelegram: "alpharesearch", vendorWallet: true, vendorPaypalLink: null, manufacturer: "AlphaLab" },
];

const FILTER_SECTIONS = [
  { key: "cat", label: "Cat", icon: Tag, options: ["GLP-1", "Peptides"] },
  { key: "seller", label: "Seller", icon: Store, options: ["Test", "AlphaResearch", "NovaPeptides"] },
  { key: "country", label: "Ship", icon: Globe, options: ["UK", "DE", "US"] },
  { key: "payment", label: "Pay", icon: CreditCard, options: ["Crypto", "PayPal"] },
  { key: "mfg", label: "Lab", icon: FlaskConical, options: ["Janoshik", "AlphaLab", "NovaLab"] },
];

export function ShopSideLedger() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [inStockOnly, setInStockOnly] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [showGBP, setShowGBP] = useState(false);

  const fmt = (p: number) => showGBP ? `£${(p * 0.79).toFixed(2)}` : `$${p.toFixed(2)}`;

  const filtered = PRODUCTS.filter(p => {
    if (inStockOnly && p.stock <= 0) return false;
    if (filters.cat && p.category !== filters.cat) return false;
    if (filters.seller && p.vendorName !== filters.seller) return false;
    if (filters.country && p.vendorCountry !== filters.country) return false;
    if (filters.payment === "PayPal" && !p.vendorPaypalLink) return false;
    if (filters.payment === "Crypto" && !p.vendorWallet) return false;
    if (filters.mfg && p.manufacturer !== filters.mfg) return false;
    return true;
  });

  const activeCount = Object.values(filters).filter(Boolean).length + (inStockOnly ? 1 : 0);
  const inCart = (id: string) => cartIds.includes(id);
  const toggleCart = (id: string) => setCartIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#F7F8FC", fontFamily: "Inter, sans-serif" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 h-12 shrink-0 border-b" style={{ background: "#fff", borderColor: "#E5E7EB" }}>
        <div>
          <span className="text-[14px] font-bold" style={{ color: "#0F1A2E" }}>The Lonely Vial</span>
          <span className="ml-1.5 text-[10px]" style={{ color: BLUE }}>Single vials · No kits</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowGBP(!showGBP)} className="h-7 px-2 rounded-lg text-[10px] font-bold border" style={{ background: showGBP ? BLUE_BG : "#F4F6FA", color: showGBP ? BLUE : "#6B7280", borderColor: "#E5E7EB" }}>
            {showGBP ? "£ GBP" : "$ USD"}
          </button>
          <div className="relative">
            <button className="w-7 h-7 rounded-lg flex items-center justify-center border" style={{ background: "#F4F6FA", borderColor: "#E5E7EB" }}>
              <ShoppingCart className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
            </button>
            {cartIds.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center" style={{ background: BLUE }}>{cartIds.length}</span>}
          </div>
        </div>
      </div>

      {/* Split: sidebar + list */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left filter sidebar */}
        <div className="shrink-0 overflow-y-auto border-r py-3" style={{ width: 76, background: "#fff", borderColor: "#E5E7EB" }}>
          {/* In stock dot */}
          <button onClick={() => setInStockOnly(!inStockOnly)} className="w-full flex flex-col items-center gap-1 py-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: inStockOnly ? "rgba(16,185,129,0.12)" : "#F4F6FA" }}>
              <div className="w-3 h-3 rounded-full" style={{ background: inStockOnly ? "#10B981" : "#D1D5DB" }} />
            </div>
            <span className="text-[9px] font-bold" style={{ color: inStockOnly ? "#059669" : "#9CA3AF" }}>Stock</span>
          </button>

          {/* Filter sections */}
          {FILTER_SECTIONS.map(section => {
            const Icon = section.icon;
            const active = !!filters[section.key];
            const isOpen = expanded === section.key;
            return (
              <div key={section.key}>
                <button onClick={() => setExpanded(isOpen ? null : section.key)}
                  className="w-full flex flex-col items-center gap-1 py-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: active ? BLUE_BG : "#F4F6FA" }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: active ? BLUE : "#9CA3AF" }} />
                  </div>
                  <span className="text-[9px] font-bold" style={{ color: active ? BLUE : "#9CA3AF" }}>{section.label}</span>
                  {active && <div className="w-1.5 h-1.5 rounded-full" style={{ background: BLUE }} />}
                </button>

                {isOpen && (
                  <div className="px-1 pb-2 space-y-0.5">
                    <button onClick={() => { setFilters(f => { const n = { ...f }; delete n[section.key]; return n; }); setExpanded(null); }}
                      className="w-full text-center py-1 text-[9px] font-semibold rounded" style={{ background: "#F4F6FA", color: "#9CA3AF" }}>
                      All
                    </button>
                    {section.options.map(opt => (
                      <button key={opt} onClick={() => { setFilters(f => ({ ...f, [section.key]: opt })); setExpanded(null); }}
                        className="w-full text-center py-1 text-[9px] font-bold rounded truncate"
                        style={{ background: filters[section.key] === opt ? BLUE_BG : "transparent", color: filters[section.key] === opt ? BLUE : "#6B7280" }}>
                        {opt.length > 6 ? opt.slice(0, 6) + "…" : opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {activeCount > 0 && (
            <button onClick={() => { setFilters({}); setInStockOnly(false); }} className="w-full text-center mt-3 text-[9px] font-bold" style={{ color: "#DC2626" }}>
              Clear {activeCount}
            </button>
          )}
        </div>

        {/* Right: product list */}
        <div className="flex-1 overflow-y-auto pb-20">
          {/* Column header */}
          <div className="flex items-center px-3 py-1.5 sticky top-0 z-10 border-b" style={{ background: "#F7F8FC", borderColor: "#E5E7EB" }}>
            <span className="flex-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>Product</span>
            <span className="w-16 text-right text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>Price</span>
            <span className="w-14 text-right text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>Action</span>
          </div>

          {filtered.map((p, i) => {
            const isOpen = openRow === p.id;
            const lowStock = p.stock > 0 && p.stock <= 5;
            const outOfStock = p.stock <= 0;
            const added = inCart(p.id);

            return (
              <div key={p.id} style={{ borderBottom: "1px solid #F3F4F6", background: i % 2 === 0 ? "#fff" : "#FAFBFC" }}>
                {/* Collapsed row */}
                <button onClick={() => setOpenRow(isOpen ? null : p.id)} className="w-full flex items-center px-3 py-2.5 gap-2 text-left">
                  {/* Status dot */}
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: outOfStock ? "#EF4444" : lowStock ? BLUE : "#10B981" }} />

                  {/* Name + badges */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold truncate" style={{ color: "#111827" }}>{p.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px]" style={{ color: "#9CA3AF" }}>{p.vendorName}</span>
                      {lowStock && <span className="text-[9px] font-bold px-1 rounded" style={{ background: BLUE_BG, color: BLUE }}>{p.stock} left</span>}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="w-16 text-right shrink-0">
                    <p className="text-[13px] font-black" style={{ color: "#111827" }}>{fmt(p.price)}</p>
                    <p className="text-[9px]" style={{ color: "#9CA3AF" }}>{p.currency}</p>
                  </div>

                  {/* Action */}
                  <div className="w-14 flex justify-end shrink-0">
                    {outOfStock ? (
                      <span className="text-[9px]" style={{ color: "#D1D5DB" }}>OOS</span>
                    ) : added ? (
                      <button onClick={e => { e.stopPropagation(); toggleCart(p.id); }} className="h-7 px-2 rounded-lg text-[10px] font-bold" style={{ background: BLUE_BG, color: BLUE, border: `1px solid ${BLUE_BORDER}` }}>✓</button>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); toggleCart(p.id); }} className="h-7 px-2 rounded-lg text-[10px] font-bold" style={{ background: BLUE, color: "white" }}>+</button>
                    )}
                  </div>

                  <ChevronRight className="w-3.5 h-3.5 shrink-0 transition-transform" style={{ color: "#D1D5DB", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }} />
                </button>

                {/* Expanded meta */}
                {isOpen && (
                  <div className="px-4 pb-3 pt-1 border-t" style={{ borderColor: "#F3F4F6", background: "#F9FAFB" }}>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[
                        { label: "Category", value: p.category },
                        { label: "Ships to", value: p.vendorShipsTo },
                        { label: "Country", value: `${FLAGS[p.vendorCountry] ?? "🌍"} ${p.vendorCountry}` },
                        { label: "Rating", value: `★ ${p.vendorRating}` },
                        { label: "Batch", value: `#${p.batchNumber}` },
                        { label: "Lab", value: p.manufacturer },
                      ].map(row => (
                        <div key={row.label}>
                          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>{row.label}</p>
                          <p className="text-[11px] font-semibold mt-0.5" style={{ color: "#374151" }}>{row.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      {!outOfStock && !added && (
                        <button onClick={() => toggleCart(p.id)} className="flex-1 h-9 rounded-xl text-[11px] font-bold border" style={{ color: BLUE, borderColor: BLUE_BORDER, background: BLUE_BG }}>
                          Add to Cart
                        </button>
                      )}
                      {!outOfStock && (
                        <button className="flex-1 h-9 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-1" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
                          <Zap className="w-3.5 h-3.5" /> Buy Now
                        </button>
                      )}
                      {p.labReportUrl && (
                        <button className="h-9 px-3 rounded-xl text-[11px] font-semibold flex items-center gap-1 border" style={{ color: "#059669", borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.06)" }}>
                          <FileText className="w-3.5 h-3.5" /> COA
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 flex flex-col items-center" style={{ color: "#9CA3AF" }}>
              <p className="text-[12px] font-semibold">No products match filters</p>
              <button onClick={() => { setFilters({}); setInStockOnly(false); }} className="mt-2 text-[11px] font-bold" style={{ color: BLUE }}>Clear</button>
            </div>
          )}
        </div>
      </div>

      {/* Quick links footer */}
      <div className="shrink-0 flex gap-2 px-3 py-2 border-t" style={{ background: "#fff", borderColor: "#E5E7EB" }}>
        <button className="flex-1 h-8 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1" style={{ background: "#F4F6FA", color: "#6B7280", border: "1px solid #E5E7EB" }}>
          My Account
        </button>
        <button className="flex-1 h-8 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1" style={{ background: BLUE_BG, color: BLUE, border: `1px solid ${BLUE_BORDER}` }}>
          Sell with us
        </button>
      </div>
    </div>
  );
}
