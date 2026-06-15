import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, ShoppingCart, X, Plus, Minus, Trash2,
  ExternalLink, ChevronRight, AlertTriangle, Loader2,
  ChevronDown, Package, Zap, Shield, Check, ArrowLeft,
  Globe, Store, Send, FileText, Tag, CreditCard, Star,
} from "lucide-react";
import { useVialCart } from "@/hooks/use-vial-cart";
import { useCurrency } from "@/hooks/use-currency";
import { PageLayout } from "@/components/PageLayout";
import { T } from "@/lib/theme";

interface VialProduct {
  id: string; name: string; description: string | null; category: string | null;
  mgSize: string | null; price: number; currency: string; stock: number;
  batchNumber: string | null; labReportUrl: string | null; active: boolean;
  manufacturer: string | null;
  vendorId: string | null; vendorName: string | null; vendorTelegram: string | null;
  vendorShipsTo: string | null; vendorCountry: string | null; vendorRating: number | null;
  vendorLogoUrl: string | null;
  vendorWallet: string | null; vendorRevolutLink: string | null; vendorPaypalLink: string | null;
  imageUrl: string | null;
}

interface VendorTab { id: string; name: string; logoUrl: string | null; }

function nameToHsl(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 48%)`;
}

function SellerAvatar({ name, logoUrl, size = 24 }: { name: string; logoUrl: string | null; size?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const initials = name.split(/\s+/).map(w => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
  if (logoUrl && !imgErr) {
    return (
      <img
        src={logoUrl}
        alt={name}
        width={size} height={size}
        onError={() => setImgErr(true)}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size, border: `1.5px solid ${T.border}` }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-bold text-white"
      style={{ width: size, height: size, background: nameToHsl(name), fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

const NAVY       = "var(--t-blue-deep)";
const BLUE       = "var(--t-blue)";
const BLUE_BG    = "var(--t-blue-08)";
const BLUE_BORDER= "var(--t-blue-25)";

function CoaModal({ url, productName, onClose }: { url: string; productName: string; onClose: () => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    setImage(null);
    fetch(`/api/lab-tests/coa-preview?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(d => {
        if (d.type === "image" && d.images && d.images.length > 0) {
          setImage(`/api/lab-tests/coa-proxy?url=${encodeURIComponent(url)}`);
        } else if (d.type === "pdf") {
          setImage(`/api/lab-tests/coa-proxy?url=${encodeURIComponent(url)}`);
        } else {
          setError("No report image found for this COA.");
        }
      })
      .catch(() => setError("Failed to load report."))
      .finally(() => setLoading(false));
  }, [url]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex flex-col"
      style={{ background: T.surface }}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
          style={{ background: T.surface2 }}
        >
          <X className="w-5 h-5" style={{ color: T.muted }} />
        </button>
        <div className="flex-1 text-center px-3">
          <p className="font-bold text-sm leading-tight truncate" style={{ color: T.text }}>Certificate of Analysis</p>
          <p className="text-xs mt-0.5 truncate" style={{ color: T.muted }}>{productName}</p>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors"
          style={{ background: T.surface2 }}>
          <ExternalLink className="w-4 h-4" style={{ color: T.muted }} />
        </a>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center px-2 py-4 min-h-0" style={{ background: T.bg }}>
        {loading && (
          <div className="flex flex-col items-center gap-3" style={{ color: T.subtle }}>
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: BLUE }} />
            <span className="text-sm">Loading report…</span>
          </div>
        )}
        {!loading && error && (
          <div className="flex flex-col items-center gap-4 text-center px-6">
            <AlertTriangle className="w-7 h-7" style={{ color: BLUE }} />
            <p className="text-sm" style={{ color: T.muted }}>{error}</p>
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: BLUE }}>
              <ExternalLink className="w-4 h-4" /> Open on Janoshik
            </a>
          </div>
        )}
        {!loading && image && (
          <AnimatePresence mode="wait">
            <motion.img
              key={url}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              src={image}
              alt={`CoA for ${productName}`}
              className="rounded-xl shadow-2xl"
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", width: "auto" }}
            />
          </AnimatePresence>
        )}
      </div>

      <div className="flex items-center justify-center px-5 py-4 shrink-0" style={{ borderTop: `1px solid ${T.border}` }}>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: T.subtle }}>
          <ExternalLink className="w-3.5 h-3.5" /> View on Janoshik
        </a>
      </div>
    </motion.div>
  );
}

function countryFlag(country: string): string {
  const map: Record<string, string> = {
    "UK": "🇬🇧", "United Kingdom": "🇬🇧", "GB": "🇬🇧",
    "US": "🇺🇸", "USA": "🇺🇸", "United States": "🇺🇸",
    "EU": "🇪🇺", "Europe": "🇪🇺",
    "DE": "🇩🇪", "Germany": "🇩🇪",
    "FR": "🇫🇷", "France": "🇫🇷",
    "NL": "🇳🇱", "Netherlands": "🇳🇱",
    "PL": "🇵🇱", "Poland": "🇵🇱",
    "RO": "🇷🇴", "Romania": "🇷🇴",
    "CN": "🇨🇳", "China": "🇨🇳",
    "CA": "🇨🇦", "Canada": "🇨🇦",
    "AU": "🇦🇺", "Australia": "🇦🇺",
  };
  return map[country] ?? "🌍";
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="shop-half-star">
            <stop offset="50%" stopColor={BLUE} />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>
      {[1,2,3,4,5].map(i => {
        const isHalf = i === full + 1 && half;
        return (
          <Star
            key={i}
            className="w-2.5 h-2.5"
            style={{ color: i <= full ? BLUE : isHalf ? BLUE : T.border }}
            fill={i <= full ? BLUE : isHalf ? "url(#shop-half-star)" : "none"}
          />
        );
      })}
      <span className="text-[10px] font-bold ml-0.5" style={{ color: T.muted }}>{rating.toFixed(1)}</span>
    </span>
  );
}

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "#DC2626" }}>
      Out of stock
    </span>
  );
  if (stock <= 5) return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: BLUE_BG, color: BLUE }}>
      <AlertTriangle className="w-3 h-3" /> Only {stock} left
    </span>
  );
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#059669" }}>
      In Stock
    </span>
  );
}

function AddedToast({ productName, onClose, onViewCart }: { productName: string; onClose: () => void; onViewCart: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ type: "spring", damping: 24, stiffness: 320 }}
      className="fixed top-20 left-1/2 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl"
      style={{
        transform: "translateX(-50%)",
        minWidth: 260, maxWidth: 340,
        background: T.surface,
        border: `1px solid ${T.border}`,
      }}
    >
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.12)" }}>
        <Check className="w-4 h-4" style={{ color: "#059669" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs" style={{ color: T.muted }}>Added to cart</p>
        <p className="text-sm font-semibold truncate" style={{ color: T.text }}>{productName}</p>
      </div>
      <button onClick={onViewCart} className="text-xs font-bold shrink-0" style={{ color: BLUE }}>View →</button>
    </motion.div>
  );
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: T.subtle }}>{label}</p>
      <div className="text-[11px] font-semibold" style={{ color: T.muted }}>{children}</div>
    </div>
  );
}

function ProductCard({ product, onAdd, onBuyNow }: { product: VialProduct; onAdd: () => void; onBuyNow: () => void }) {
  const { items, updateQty, removeItem } = useVialCart();
  const { format } = useCurrency();
  const cartItem = items.find(i => i.productId === product.id);
  const inCart = !!cartItem;
  const outOfStock = product.stock <= 0;
  const [coaOpen, setCoaOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl flex flex-col"
      style={{
        background: T.surface,
        border: inCart ? `2px solid ${BLUE}` : `1px solid ${T.border}`,
        boxShadow: inCart ? `0 0 0 4px ${BLUE_BG}, 0 2px 8px rgba(0,0,0,0.06)` : "var(--salt-card-shadow)",
        transition: "box-shadow 0.18s ease",
        overflow: "hidden",
      }}
    >
      {/* Main info row */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              {product.mgSize && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: BLUE_BG, color: BLUE }}>
                  {product.mgSize}
                </span>
              )}
              {product.category && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: "rgba(124,58,237,0.08)", color: "#7C3AED" }}>
                  {product.category}
                </span>
              )}
              <StockBadge stock={product.stock} />
            </div>
            <h3 className="text-[15px] font-bold leading-snug" style={{ color: T.text }}>{product.name}</h3>
            {product.description && (
              <p className="text-xs mt-1 leading-relaxed" style={{ color: T.muted }}>{product.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-14 h-14 rounded-xl object-cover"
                style={{ border: `1.5px solid ${T.border}` }}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div className="text-right">
              <span className="text-2xl font-black" style={{ color: BLUE }}>{format(product.price)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Meta grid */}
      <div className="px-4 pb-3 flex flex-wrap gap-x-4 gap-y-2.5" style={{ borderBottom: `1px solid ${T.border}` }}>
        {product.vendorName && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: T.subtle }}>Seller</p>
            <div className="flex items-center gap-1.5">
              <SellerAvatar name={product.vendorName} logoUrl={product.vendorLogoUrl ?? null} size={18} />
              <span className="text-[11px] font-semibold" style={{ color: "#059669" }}>{product.vendorName}</span>
            </div>
          </div>
        )}
        {product.vendorCountry && (
          <MetaField label="Country">
            <span className="flex items-center gap-1">
              {countryFlag(product.vendorCountry)} {product.vendorCountry}
            </span>
          </MetaField>
        )}
        {product.vendorRating !== null && product.vendorRating !== undefined && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: T.subtle }}>Rating</p>
            <StarRating rating={product.vendorRating} />
          </div>
        )}
        {product.vendorShipsTo && (
          <MetaField label="Ships">
            <span style={{ color: BLUE }}>{product.vendorShipsTo}</span>
          </MetaField>
        )}
        {product.manufacturer && (
          <MetaField label="Lab">{product.manufacturer}</MetaField>
        )}
        {product.batchNumber && (
          <MetaField label="Batch">{product.batchNumber}</MetaField>
        )}
        {product.labReportUrl && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: T.subtle }}>COA</p>
            <button
              onClick={e => { e.stopPropagation(); setCoaOpen(true); }}
              className="text-[11px] font-semibold flex items-center gap-0.5 hover:opacity-80 transition-opacity"
              style={{ color: BLUE }}
            >
              <FileText className="w-3 h-3" /> Preview
            </button>
          </div>
        )}
        {product.vendorTelegram && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: T.subtle }}>Contact</p>
            <a
              href={`https://t.me/${product.vendorTelegram}`}
              target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-[11px] font-semibold flex items-center gap-0.5 hover:opacity-80 transition-opacity"
              style={{ color: BLUE }}
            >
              <Send className="w-2.5 h-2.5" /> @{product.vendorTelegram}
            </a>
          </div>
        )}
      </div>

      {/* Payment methods */}
      {(product.vendorWallet || product.vendorRevolutLink || product.vendorPaypalLink) && (
        <div className="px-4 pb-3 flex flex-wrap gap-2" style={{ borderBottom: `1px solid ${T.border}` }}>
          <p className="w-full text-[9px] font-bold uppercase tracking-wider" style={{ color: T.subtle }}>Pay via</p>
          {product.vendorWallet && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(234,179,8,0.1)", color: "#B45309" }}>
              Crypto
            </span>
          )}
          {product.vendorRevolutLink && (
            <a href={product.vendorRevolutLink} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full hover:opacity-80"
              style={{ background: BLUE_BG, color: BLUE }}>
              Revolut →
            </a>
          )}
          {product.vendorPaypalLink && (
            <a href={product.vendorPaypalLink} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full hover:opacity-80"
              style={{ background: "rgba(0,112,186,0.1)", color: "#003087" }}>
              PayPal →
            </a>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3">
        {outOfStock ? (
          <div
            className="h-10 rounded-xl flex items-center justify-center text-xs font-semibold"
            style={{ background: T.surface2, color: T.subtle, border: `1px solid ${T.border}` }}
          >
            Out of stock
          </div>
        ) : inCart ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1" style={{ background: BLUE_BG, border: `1px solid ${BLUE_BORDER}` }}>
              <button
                onClick={() => cartItem.quantity <= 1 ? removeItem(product.id) : updateQty(product.id, cartItem.quantity - 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: BLUE_BG }}
              >
                {cartItem.quantity <= 1
                  ? <Trash2 className="w-3.5 h-3.5" style={{ color: BLUE }} />
                  : <Minus className="w-3.5 h-3.5" style={{ color: BLUE }} />}
              </button>
              <span className="font-bold text-sm flex-1 text-center" style={{ color: BLUE }}>{cartItem.quantity}</span>
              <button
                onClick={() => cartItem.quantity < product.stock && updateQty(product.id, cartItem.quantity + 1)}
                disabled={cartItem.quantity >= product.stock}
                className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30"
                style={{ background: BLUE_BG }}
              >
                <Plus className="w-3.5 h-3.5" style={{ color: BLUE }} />
              </button>
            </div>
            <span className="text-sm font-bold shrink-0" style={{ color: BLUE }}>
              ${(product.price * cartItem.quantity).toFixed(2)}
            </span>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onAdd}
              className="flex-1 h-10 rounded-xl text-xs font-bold border transition-all"
              style={{ borderColor: BLUE_BORDER, color: BLUE, background: BLUE_BG }}
            >
              Add to Cart
            </button>
            <button
              onClick={onBuyNow}
              className="flex-1 h-10 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
              style={{ background: `linear-gradient(135deg, #071640 0%, ${NAVY} 100%)` }}
            >
              <Zap className="w-3.5 h-3.5" /> Buy Now
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {coaOpen && product.labReportUrl && (
          <CoaModal url={product.labReportUrl} productName={product.name} onClose={() => setCoaOpen(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FilterDropdown({ label, icon: Icon, value, onChange, options }: {
  label: string; icon: React.ElementType; value: string;
  onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="relative flex-1 min-w-0">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <Icon className="w-3.5 h-3.5" style={{ color: value ? BLUE : T.subtle }} />
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-10 pl-8 pr-8 rounded-xl text-sm font-semibold appearance-none focus:outline-none"
        style={{
          background: T.surface2,
          border: value ? `2px solid ${BLUE}` : `1px solid ${T.border}`,
          color: value ? BLUE : T.muted,
        }}
      >
        <option value="">{label}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: T.subtle }} />
    </div>
  );
}

export default function Shop() {
  const [, setLocation] = useLocation();
  const [products, setProducts] = useState<VialProduct[]>([]);
  const [vendors, setVendors] = useState<VendorTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedPeptide, setSelectedPeptide] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("peptide") ?? "";
  });
  const [selectedSeller, setSelectedSeller] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("");
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const { cartOpen, setCartOpen, addItem, clearCart, itemCount } = useVialCart();
  const [toast, setToast] = useState<{ name: string } | null>(null);
  const count = itemCount();

  useEffect(() => {
    fetch("/api/vial/products")
      .then(r => r.json())
      .then(data => { setProducts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
    fetch("/api/vial/vendors")
      .then(r => r.json())
      .then(data => { setVendors(Array.isArray(data) ? data.filter((v: any) => v.active !== false).map((v: any) => ({ id: v.id, name: v.name, logoUrl: v.logoUrl ?? null })) : []); })
      .catch(() => {});
  }, []);

  const peptideOptions = useMemo(() =>
    [...new Set(products.map(p => p.name))].sort(), [products]);
  const sellerOptions = useMemo(() =>
    [...new Set(products.map(p => p.vendorName).filter(Boolean) as string[])].sort(), [products]);
  const categoryOptions = useMemo(() =>
    [...new Set(products.map(p => p.category).filter(Boolean) as string[])].sort(), [products]);
  const countryOptions = useMemo(() =>
    [...new Set(products.map(p => p.vendorCountry).filter(Boolean) as string[])].sort(), [products]);
  const manufacturerOptions = useMemo(() =>
    [...new Set(products.filter(p => p.stock > 0).map(p => p.manufacturer).filter(Boolean) as string[])].sort(), [products]);

  const filtered = products.filter(p => {
    if (selectedPeptide && !p.name.toLowerCase().includes(selectedPeptide.toLowerCase())) return false;
    if (selectedSeller && p.vendorName !== selectedSeller) return false;
    if (selectedCategory && p.category !== selectedCategory) return false;
    if (selectedCountry && p.vendorCountry !== selectedCountry) return false;
    if (selectedManufacturer && p.manufacturer !== selectedManufacturer) return false;
    if (selectedPayment) {
      if (selectedPayment === "Crypto" && !p.vendorWallet) return false;
      if (selectedPayment === "Revolut" && !p.vendorRevolutLink) return false;
      if (selectedPayment === "PayPal" && !p.vendorPaypalLink) return false;
    }
    if (inStockOnly && p.stock <= 0) return false;
    return true;
  });

  const hasFilters = !!(selectedPeptide || selectedSeller || selectedCategory || selectedCountry || selectedPayment || selectedManufacturer || inStockOnly);
  const clearFilters = () => {
    setSelectedPeptide(""); setSelectedSeller(""); setSelectedCategory("");
    setSelectedCountry(""); setSelectedPayment(""); setSelectedManufacturer("");
    setInStockOnly(false);
  };

  const handleAdd = useCallback((p: VialProduct) => {
    addItem({ id: p.id, name: p.name, price: p.price, stock: p.stock });
    setToast({ name: p.name });
  }, [addItem]);

  const handleBuyNow = useCallback((p: VialProduct) => {
    clearCart();
    addItem({ id: p.id, name: p.name, price: p.price, stock: p.stock });
    setLocation("/shop/checkout");
  }, [addItem, clearCart, setLocation]);

  const inStockCount = products.filter(p => p.stock > 0).length;

  return (
    <PageLayout>
      <div className="flex flex-col" style={{ background: T.bg, minHeight: "100%" }}>
        <AnimatePresence>
          {toast && (
            <AddedToast
              productName={toast.name}
              onClose={() => setToast(null)}
              onViewCart={() => { setToast(null); setCartOpen(true); }}
            />
          )}
        </AnimatePresence>



        {/* Filters */}
        <div style={{ background: T.bg }}>
          <div className="max-w-xl mx-auto px-4 py-2">
            <button
              onClick={() => setFiltersOpen(v => !v)}
              className="w-full flex items-center justify-between h-11 px-4 rounded-xl transition-all"
              style={{
                background: hasFilters ? BLUE_BG : T.surface2,
                border: hasFilters ? `1.5px solid ${BLUE_BORDER}` : `1px solid ${T.border}`,
              }}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: hasFilters ? BLUE : T.muted }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2" />
                </svg>
                <span className="text-sm font-semibold" style={{ color: hasFilters ? BLUE : T.muted }}>Filters</span>
                {hasFilters && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: BLUE }}>
                    {[selectedCategory, selectedSeller, selectedPeptide, selectedCountry, selectedPayment, selectedManufacturer].filter(Boolean).length + (inStockOnly ? 1 : 0)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasFilters && (
                  <span
                    onClick={e => { e.stopPropagation(); clearFilters(); }}
                    className="text-xs font-semibold px-2 py-0.5 rounded-lg cursor-pointer hover:opacity-80"
                    style={{ color: BLUE, background: BLUE_BG }}
                  >
                    Clear
                  </span>
                )}
                <ChevronDown
                  className="w-4 h-4 transition-transform duration-200"
                  style={{ color: T.subtle, transform: filtersOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </div>
            </button>

            {filtersOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="mt-2 space-y-2 pb-1"
              >
                <div className="flex gap-2">
                  <FilterDropdown label="Category" icon={Tag} value={selectedCategory} onChange={setSelectedCategory} options={categoryOptions} />
                  <FilterDropdown label="Seller" icon={Store} value={selectedSeller} onChange={setSelectedSeller} options={sellerOptions} />
                </div>
                <div className="flex gap-2">
                  <FilterDropdown label="Peptide" icon={FlaskConical} value={selectedPeptide} onChange={setSelectedPeptide} options={peptideOptions} />
                  <FilterDropdown label="Country" icon={Globe} value={selectedCountry} onChange={setSelectedCountry} options={countryOptions} />
                </div>
                <div className="flex gap-2">
                  <FilterDropdown label="Manufacturer" icon={FlaskConical} value={selectedManufacturer} onChange={setSelectedManufacturer} options={manufacturerOptions} />
                  <FilterDropdown label="Payment" icon={CreditCard} value={selectedPayment} onChange={setSelectedPayment} options={["Crypto", "Revolut", "PayPal"]} />
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setInStockOnly(v => !v)}
                    className="flex items-center gap-1.5 h-10 px-3 rounded-xl text-xs font-bold shrink-0 transition-all"
                    style={{
                      background: inStockOnly ? "rgba(16,185,129,0.1)" : T.surface2,
                      border: inStockOnly ? "2px solid rgba(16,185,129,0.35)" : `1px solid ${T.border}`,
                      color: inStockOnly ? "#059669" : T.muted,
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: inStockOnly ? "#10B981" : T.border }} />
                    In Stock Only
                  </button>
                </div>
              </motion.div>
            )}

            {hasFilters && (
              <p className="text-xs mt-1.5 px-1" style={{ color: T.subtle }}>
                {filtered.length} product{filtered.length !== 1 ? "s" : ""} found
              </p>
            )}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 max-w-xl mx-auto w-full px-4 pb-32">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: BLUE }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-12 h-12 mx-auto mb-3" style={{ color: T.border }} />
              <p className="text-sm font-medium" style={{ color: T.subtle }}>
                {products.length === 0 ? "No products available yet" : "No products match your filters"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 pt-3">
              {filtered.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onAdd={() => handleAdd(p)}
                  onBuyNow={() => handleBuyNow(p)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sticky checkout bar */}
        <AnimatePresence>
          {count > 0 && !cartOpen && (
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3"
              style={{ background: `linear-gradient(to top, ${T.bg} 50%, transparent)` }}
            >
              <div className="max-w-xl mx-auto">
                <button
                  onClick={() => setCartOpen(true)}
                  className="w-full rounded-xl font-bold text-sm flex items-center justify-between px-5 text-white"
                  style={{
                    background: `linear-gradient(135deg, #071640 0%, ${NAVY} 100%)`,
                    height: 54,
                    boxShadow: "0 6px 20px var(--t-blue-40)",
                  }}
                >
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    <span>{count} item{count !== 1 ? "s" : ""}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    View Cart <ChevronRight className="w-4 h-4" />
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PageLayout>
  );
}
