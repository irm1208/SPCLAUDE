import { useState } from "react";
import {
  ShoppingCart, Zap, FileText, Globe, LogIn, Store,
  AlertTriangle, Check, Star, Send,
} from "lucide-react";

const NAVY = "#1B3A7A";
const NAVY_DARK = "#071640";
const BLUE = "#2D6BCC";
const BLUE_BG = "rgba(45,107,204,0.08)";
const BLUE_BORDER = "rgba(45,107,204,0.22)";

const FLAGS: Record<string, string> = { UK: "🇬🇧", DE: "🇩🇪", US: "🇺🇸" };

const CATEGORY_STYLES: Record<string, { accent: string; bg: string; label: string }> = {
  "GLP-1":   { accent: "#2D6BCC", bg: BLUE_BG, label: "GLP-1 Agonists" },
  "Peptides": { accent: "#7C3AED", bg: "rgba(124,58,237,0.07)", label: "Research Peptides" },
};

const PRODUCTS = [
  { id: "1", name: "Retatrutide 10mg", category: "GLP-1", mgSize: "10mg", price: 20.0, currency: "USDT", stock: 5, vendorName: "Test", vendorRating: 4.9, vendorShipsTo: "Worldwide", vendorCountry: "UK", batchNumber: "32342", labReportUrl: "#", vendorTelegram: "test", vendorPaypalLink: "#", vendorWallet: true },
  { id: "3", name: "Semaglutide 2mg", category: "GLP-1", mgSize: "2mg", price: 55.0, currency: "USDT", stock: 3, vendorName: "NovaPeptides", vendorRating: 4.8, vendorShipsTo: "Worldwide", vendorCountry: "US", batchNumber: "NP-4401", labReportUrl: "#", vendorTelegram: "novapeptides", vendorPaypalLink: "#", vendorWallet: true },
  { id: "2", name: "BPC-157 5mg", category: "Peptides", mgSize: "5mg", price: 35.0, currency: "USDT", stock: 22, vendorName: "AlphaResearch", vendorRating: 5.0, vendorShipsTo: "EU / UK", vendorCountry: "DE", batchNumber: "AB-991", labReportUrl: "#", vendorTelegram: "alpharesearch", vendorPaypalLink: null, vendorWallet: true },
  { id: "4", name: "TB-500 5mg", category: "Peptides", mgSize: "5mg", price: 28.0, currency: "USDT", stock: 14, vendorName: "Test", vendorRating: 4.9, vendorShipsTo: "Worldwide", vendorCountry: "UK", batchNumber: "TB-882", labReportUrl: null, vendorTelegram: "test", vendorPaypalLink: "#", vendorWallet: true },
  { id: "5", name: "Ipamorelin 2mg", category: "Peptides", mgSize: "2mg", price: 18.0, currency: "USDT", stock: 30, vendorName: "AlphaResearch", vendorRating: 5.0, vendorShipsTo: "EU / UK", vendorCountry: "DE", batchNumber: "IP-229", labReportUrl: "#", vendorTelegram: "alpharesearch", vendorPaypalLink: null, vendorWallet: true },
];

const CHIPS = ["All", "In Stock", "Worldwide", "EU / UK", "COA"];

export function ShopShelfSections() {
  const [activeChip, setActiveChip] = useState("All");
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [showGBP, setShowGBP] = useState(false);

  const fmt = (p: number) => showGBP ? `£${(p * 0.79).toFixed(2)}` : `$${p.toFixed(2)}`;

  const filtered = PRODUCTS.filter(p => {
    if (activeChip === "All") return true;
    if (activeChip === "In Stock") return p.stock > 0;
    if (activeChip === "COA") return !!p.labReportUrl;
    if (activeChip === "Worldwide") return p.vendorShipsTo === "Worldwide";
    if (activeChip === "EU / UK") return p.vendorShipsTo === "EU / UK";
    return true;
  });

  const categories = ["GLP-1", "Peptides"].filter(cat =>
    filtered.some(p => p.category === cat)
  );

  const inCart = (id: string) => cartIds.includes(id);
  const toggleCart = (id: string) => setCartIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#F4F6FA", fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div className="shrink-0" style={{ background: "#fff", borderBottom: "1px solid #E5E9F2" }}>
        {/* Quick links */}
        <div className="flex gap-2 px-3 pt-3 pb-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12px] font-bold" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})`, color: "white" }}>
            <LogIn className="w-3.5 h-3.5" /> My Account
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12px] font-bold border" style={{ color: BLUE, borderColor: BLUE_BORDER, background: BLUE_BG }}>
            <Store className="w-3.5 h-3.5" /> Sell with us
          </button>
        </div>

        {/* Title + controls */}
        <div className="flex items-center justify-between px-3 pb-2">
          <div>
            <p className="text-[15px] font-black" style={{ color: "#0F1A2E" }}>The Lonely Vial</p>
            <p className="text-[10px]" style={{ color: "#9CA3AF" }}>Single vials · No kits · {filtered.length} listings</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowGBP(!showGBP)} className="h-7 px-2.5 rounded-lg text-[11px] font-bold border" style={{ background: showGBP ? BLUE_BG : "#F4F6FA", color: showGBP ? BLUE : "#6B7280", borderColor: "#E5E7EB" }}>
              {showGBP ? "£" : "$"}
            </button>
            <div className="relative">
              <button className="w-7 h-7 rounded-lg flex items-center justify-center border" style={{ background: "#F4F6FA", borderColor: "#E5E7EB" }}>
                <ShoppingCart className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
              </button>
              {cartIds.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center" style={{ background: BLUE }}>{cartIds.length}</span>}
            </div>
          </div>
        </div>

        {/* Filter chip strip */}
        <div className="flex gap-1.5 px-3 pb-2.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {CHIPS.map(chip => (
            <button key={chip} onClick={() => setActiveChip(chip)}
              className="shrink-0 h-7 px-3 rounded-full text-[11px] font-semibold border"
              style={{
                background: activeChip === chip ? NAVY : "#F4F6FA",
                color: activeChip === chip ? "white" : "#4B5563",
                borderColor: activeChip === chip ? NAVY : "#DDE1EB",
              }}>
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto pb-24">
        {categories.map(cat => {
          const style = CATEGORY_STYLES[cat] ?? { accent: BLUE, bg: BLUE_BG, label: cat };
          const catProducts = filtered.filter(p => p.category === cat);

          return (
            <div key={cat} className="mb-1">
              {/* Section header */}
              <div className="flex items-center gap-2 px-3 py-2 sticky top-0 z-10" style={{ background: "#F4F6FA", borderBottom: `1px solid #E5E9F2` }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: style.accent }} />
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: style.accent }}>{style.label}</span>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: style.bg, color: style.accent }}>{catProducts.length}</span>
              </div>

              {/* Shelf items */}
              <div className="px-3 py-1.5 space-y-2">
                {catProducts.map(p => {
                  const outOfStock = p.stock <= 0;
                  const lowStock = p.stock > 0 && p.stock <= 5;
                  const added = inCart(p.id);

                  return (
                    <div key={p.id} className="flex items-stretch rounded-2xl overflow-hidden"
                      style={{ background: "#fff", border: added ? `2px solid ${BLUE}` : "1px solid #E5E9F2", boxShadow: added ? `0 0 0 3px ${BLUE_BG}` : "0 1px 3px rgba(0,0,0,0.04)" }}>
                      {/* Category accent bar */}
                      <div className="w-1 shrink-0" style={{ background: style.accent, opacity: 0.7 }} />

                      {/* Main content */}
                      <div className="flex-1 px-3 py-2.5 min-w-0">
                        {/* Row 1: badges + stock */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: BLUE_BG, color: BLUE }}>{p.mgSize}</span>
                          {lowStock && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5" style={{ background: BLUE_BG, color: BLUE }}>
                              <AlertTriangle className="w-2.5 h-2.5" />Only {p.stock} left
                            </span>
                          )}
                          {outOfStock && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(239,68,68,0.08)", color: "#DC2626" }}>Out of stock</span>
                          )}
                        </div>

                        {/* Row 2: name */}
                        <p className="text-[13px] font-bold leading-tight" style={{ color: "#0F1A2E" }}>{p.name}</p>

                        {/* Row 3: seller + ships */}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-semibold" style={{ color: "#059669" }}>{p.vendorName}</span>
                          <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "#9CA3AF" }}>
                            <Star className="w-2.5 h-2.5" fill={BLUE} style={{ color: BLUE }} />{p.vendorRating}
                          </span>
                          <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "#9CA3AF" }}>
                            <Globe className="w-3 h-3" />{p.vendorShipsTo}
                          </span>
                          {FLAGS[p.vendorCountry] && <span>{FLAGS[p.vendorCountry]}</span>}
                        </div>

                        {/* Row 4: meta */}
                        <div className="flex items-center gap-3 mt-1 text-[10px]" style={{ color: "#9CA3AF" }}>
                          <span>Batch #{p.batchNumber}</span>
                          {p.labReportUrl && (
                            <span className="flex items-center gap-0.5 font-semibold" style={{ color: "#059669" }}>
                              <FileText className="w-3 h-3" />COA
                            </span>
                          )}
                          {p.vendorTelegram && (
                            <span className="flex items-center gap-0.5">
                              <Send className="w-3 h-3" />@{p.vendorTelegram}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: price + actions */}
                      <div className="flex flex-col items-end justify-between px-3 py-2.5 shrink-0" style={{ minWidth: 90 }}>
                        <div className="text-right">
                          <p className="text-[18px] font-black leading-none" style={{ color: BLUE }}>{fmt(p.price)}</p>
                          <p className="text-[9px] mt-0.5" style={{ color: "#9CA3AF" }}>{p.currency}</p>
                        </div>
                        <div className="flex flex-col gap-1 mt-2 w-full">
                          {outOfStock ? (
                            <div className="h-8 rounded-xl flex items-center justify-center text-[10px]" style={{ background: "#F4F6FA", color: "#9CA3AF" }}>OOS</div>
                          ) : added ? (
                            <button onClick={() => toggleCart(p.id)} className="h-8 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1" style={{ background: BLUE_BG, color: BLUE, border: `1px solid ${BLUE_BORDER}` }}>
                              <Check className="w-3 h-3" />Cart
                            </button>
                          ) : (
                            <>
                              <button onClick={() => toggleCart(p.id)} className="h-8 rounded-xl text-[11px] font-bold border" style={{ color: BLUE, borderColor: BLUE_BORDER, background: BLUE_BG }}>
                                + Cart
                              </button>
                              <button className="h-8 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-1" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
                                <Zap className="w-3 h-3" />Buy
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-16 flex flex-col items-center" style={{ color: "#9CA3AF" }}>
            <p className="text-[13px] font-semibold">No products found</p>
            <button onClick={() => setActiveChip("All")} className="mt-2 text-[12px] font-bold" style={{ color: BLUE }}>Show all</button>
          </div>
        )}
      </div>

      {/* Cart bar */}
      {cartIds.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-4 pt-3" style={{ background: "linear-gradient(to top, #F4F6FA 60%, transparent)" }}>
          <button className="w-full h-12 rounded-2xl font-bold text-sm text-white flex items-center justify-between px-5" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})`, boxShadow: "0 6px 20px rgba(45,107,204,0.4)" }}>
            <span className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" />{cartIds.length} item{cartIds.length > 1 ? "s" : ""}</span>
            <span>View Cart →</span>
          </button>
        </div>
      )}
    </div>
  );
}
