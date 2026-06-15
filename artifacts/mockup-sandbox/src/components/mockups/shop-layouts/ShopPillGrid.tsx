import { useState } from "react";
import {
  ShoppingCart, Zap, FileText, Globe, LogIn, Store,
  AlertTriangle, Check, Star, Send, CreditCard, Package,
} from "lucide-react";

const NAVY = "#1B3A7A";
const NAVY_DARK = "#071640";
const BLUE = "#2D6BCC";
const BLUE_BG = "rgba(45,107,204,0.08)";
const BLUE_BORDER = "rgba(45,107,204,0.22)";

const PRODUCTS = [
  { id: "1", name: "Retatrutide 10mg", category: "GLP-1", mgSize: "10mg", price: 20.0, currency: "USDT", stock: 5, vendorName: "Test", vendorRating: 4.9, vendorShipsTo: "Worldwide", vendorCountry: "UK", batchNumber: "32342", labReportUrl: "#", vendorTelegram: "test", vendorWallet: true, vendorPaypalLink: "#", vendorRevolutLink: null, manufacturer: "Janoshik" },
  { id: "2", name: "BPC-157 5mg", category: "Peptides", mgSize: "5mg", price: 35.0, currency: "USDT", stock: 22, vendorName: "AlphaResearch", vendorRating: 5.0, vendorShipsTo: "EU / UK", vendorCountry: "DE", batchNumber: "AB-991", labReportUrl: "#", vendorTelegram: "alpharesearch", vendorWallet: true, vendorPaypalLink: null, vendorRevolutLink: "#", manufacturer: "AlphaLab" },
  { id: "3", name: "Semaglutide 2mg", category: "GLP-1", mgSize: "2mg", price: 55.0, currency: "USDT", stock: 3, vendorName: "NovaPeptides", vendorRating: 4.8, vendorShipsTo: "Worldwide", vendorCountry: "US", batchNumber: "NP-4401", labReportUrl: "#", vendorTelegram: "novapeptides", vendorWallet: true, vendorPaypalLink: "#", vendorRevolutLink: null, manufacturer: "NovaLab" },
  { id: "4", name: "TB-500 5mg", category: "Peptides", mgSize: "5mg", price: 28.0, currency: "USDT", stock: 14, vendorName: "Test", vendorRating: 4.9, vendorShipsTo: "Worldwide", vendorCountry: "UK", batchNumber: "TB-882", labReportUrl: null, vendorTelegram: "test", vendorWallet: true, vendorPaypalLink: "#", vendorRevolutLink: null, manufacturer: "Janoshik" },
];

const PILLS = ["All", "GLP-1", "Peptides", "In Stock", "COA", "UK", "EU", "Worldwide"];
const FLAGS: Record<string, string> = { UK: "🇬🇧", DE: "🇩🇪", US: "🇺🇸" };

export function ShopPillGrid() {
  const [activePill, setActivePill] = useState("All");
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [showGBP, setShowGBP] = useState(false);

  const fmt = (p: number) => showGBP ? `£${(p * 0.79).toFixed(2)}` : `$${p.toFixed(2)}`;

  const filtered = PRODUCTS.filter(p => {
    if (activePill === "All") return true;
    if (activePill === "In Stock") return p.stock > 0;
    if (activePill === "COA") return !!p.labReportUrl;
    if (activePill === "UK") return p.vendorCountry === "UK";
    if (activePill === "EU") return p.vendorCountry === "DE";
    if (activePill === "Worldwide") return p.vendorShipsTo === "Worldwide";
    return p.category === activePill;
  });

  const inCart = (id: string) => cartIds.includes(id);
  const toggleCart = (id: string) =>
    setCartIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#F4F6FA", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
      {/* Top bar: quick links + currency + cart */}
      <div className="shrink-0 px-3 pt-3 pb-2" style={{ background: "#fff", borderBottom: "1px solid #E5E9F2" }}>
        <div className="flex gap-2 mb-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl text-[11px] font-semibold" style={{ background: "#F4F6FA", color: "#6B7280", border: "1px solid #E5E7EB" }}>
            <LogIn className="w-3.5 h-3.5" /> My Account
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl text-[11px] font-semibold" style={{ background: BLUE_BG, color: BLUE, border: `1px solid ${BLUE_BORDER}` }}>
            <Store className="w-3.5 h-3.5" /> Sell with us
          </button>
          <button onClick={() => setShowGBP(!showGBP)} className="h-8 px-2.5 rounded-xl text-[11px] font-semibold border" style={{ background: showGBP ? BLUE_BG : "#F4F6FA", color: showGBP ? BLUE : "#6B7280", borderColor: "#E5E7EB" }}>
            {showGBP ? "£" : "$"}
          </button>
          <div className="relative">
            <button className="w-8 h-8 rounded-xl flex items-center justify-center border" style={{ background: "#F4F6FA", borderColor: "#E5E7EB" }}>
              <ShoppingCart className="w-4 h-4" style={{ color: "#6B7280" }} />
            </button>
            {cartIds.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center" style={{ background: BLUE }}>{cartIds.length}</span>}
          </div>
        </div>

        {/* Pill filter strip */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {PILLS.map(pill => (
            <button key={pill} onClick={() => setActivePill(pill)}
              className="shrink-0 h-7 px-3 rounded-full text-[11px] font-semibold border transition-all"
              style={{
                background: activePill === pill ? NAVY : "#fff",
                color: activePill === pill ? "white" : "#4B5563",
                borderColor: activePill === pill ? NAVY : "#DDE1EB",
              }}>
              {pill}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="px-3 py-1.5 shrink-0" style={{ background: "#F4F6FA" }}>
        <span className="text-[11px] font-medium" style={{ color: "#9CA3AF" }}>{filtered.length} products · {activePill}</span>
      </div>

      {/* 2-column grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-24">
        <div className="grid grid-cols-2 gap-2.5">
          {filtered.map(p => {
            const outOfStock = p.stock <= 0;
            const lowStock = p.stock > 0 && p.stock <= 5;
            const added = inCart(p.id);

            return (
              <div key={p.id} className="rounded-2xl flex flex-col overflow-hidden"
                style={{ background: "#fff", border: added ? `2px solid ${BLUE}` : "1px solid #E5E9F2", boxShadow: added ? `0 0 0 3px ${BLUE_BG}` : "none" }}>
                {/* Price header */}
                <div className="px-3 pt-3 pb-2" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
                  <p className="text-[22px] font-black leading-none text-white">{fmt(p.price)}</p>
                  <p className="text-[10px] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{p.currency}</p>
                </div>

                {/* Body */}
                <div className="px-3 pt-2.5 pb-2 flex-1 flex flex-col gap-2">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: BLUE_BG, color: BLUE }}>{p.mgSize}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(124,58,237,0.08)", color: "#7C3AED" }}>{p.category}</span>
                    {lowStock && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5" style={{ background: BLUE_BG, color: BLUE }}><AlertTriangle className="w-2.5 h-2.5" />{p.stock}</span>}
                    {outOfStock && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "rgba(239,68,68,0.1)", color: "#DC2626" }}>OOS</span>}
                  </div>

                  <p className="text-[13px] font-bold leading-snug" style={{ color: "#0F1A2E" }}>{p.name}</p>

                  {/* Mini meta */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[10px]" style={{ color: "#6B7280" }}>
                      <span style={{ color: BLUE }} className="font-semibold">{p.vendorName}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5" fill={BLUE} style={{ color: BLUE }} />{p.vendorRating}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]" style={{ color: "#6B7280" }}>
                      <Globe className="w-3 h-3 shrink-0" />
                      <span className="truncate">{p.vendorShipsTo}</span>
                      <span className="ml-auto">{FLAGS[p.vendorCountry] ?? "🌍"}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]" style={{ color: "#9CA3AF" }}>
                      <span>#{p.batchNumber}</span>
                      {p.labReportUrl && <span className="flex items-center gap-0.5 font-semibold" style={{ color: "#059669" }}><FileText className="w-3 h-3" />COA</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto pt-1">
                    {outOfStock ? (
                      <div className="h-9 rounded-xl flex items-center justify-center text-[11px] font-semibold" style={{ background: "#F4F6FA", color: "#9CA3AF", border: "1px solid #E5E7EB" }}>Out of stock</div>
                    ) : added ? (
                      <button onClick={() => toggleCart(p.id)} className="w-full h-9 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5" style={{ background: BLUE_BG, color: BLUE, border: `1.5px solid ${BLUE_BORDER}` }}>
                        <Check className="w-3.5 h-3.5" /> In Cart
                      </button>
                    ) : (
                      <div className="flex gap-1.5">
                        <button onClick={() => toggleCart(p.id)} className="flex-1 h-9 rounded-xl text-[11px] font-bold border" style={{ color: BLUE, borderColor: BLUE_BORDER, background: BLUE_BG }}>
                          + Cart
                        </button>
                        <button className="flex-1 h-9 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-1" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
                          <Zap className="w-3 h-3" />Buy
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky cart bar */}
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
