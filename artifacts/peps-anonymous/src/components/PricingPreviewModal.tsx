import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Lock, Loader2, X, Search } from "lucide-react";

interface PreviewProduct { id: string; name: string; price: number; }

// Full-width price reveal panel rendered on canvas — watermark tiles across the entire surface
export function PriceRevealCanvas({ price, username }: { price: string; username: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth || 280;
    const H = 44;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "rgba(22,163,74,0.04)";
    ctx.fillRect(0, 0, W, H);

    // Tiled diagonal watermarks across the full panel
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.fillStyle = "#15803d";
    ctx.rotate(-18 * Math.PI / 180);
    const wm = `@${username}`;
    const wmW = ctx.measureText(wm).width;
    const colStep = wmW + 28;
    const rowStep = 22;
    // extend range to cover rotated overflow
    for (let y = -H; y < W + H * 2; y += rowStep) {
      for (let x = -W; x < W * 2; x += colStep) {
        ctx.fillText(wm, x, y);
      }
    }
    ctx.restore();

    // "Member price" label on left
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.textBaseline = "middle";
    ctx.fillText("Member price", 14, H / 2);

    // Price text on right — right-aligned
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.fillStyle = "#0f172a";
    const priceW = ctx.measureText(price).width;
    ctx.fillText(price, W - priceW - 14, H / 2);
  }, [price, username]);

  return (
    <canvas
      ref={ref}
      style={{ width: "100%", display: "block", borderRadius: "0 0 10px 10px" }}
    />
  );
}

export function PricingPreviewModal({ gbId, gbName, username, onClose }: {
  gbId: string;
  gbName: string;
  username: string;
  onClose: () => void;
}) {
  const [products, setProducts] = useState<PreviewProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [currency, setCurrency] = useState("GBP");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/group-buys/${encodeURIComponent(gbId)}/preview-prices`, { credentials: "include" })
      .then(r => r.ok ? r.json() : { hidden: true, products: [] })
      .then(d => {
        setHidden(!!d.hidden);
        setProducts(Array.isArray(d.products) ? d.products : []);
        if (d.currency) setCurrency(d.currency);
      })
      .catch(() => setHidden(true))
      .finally(() => setLoading(false));
  }, [gbId]);

  const formatPrice = (amount: number) => {
    try {
      return new Intl.NumberFormat("en-GB", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40"
        style={{ zIndex: 60 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: "spring", damping: 30, stiffness: 350 }}
        className="fixed inset-0 flex items-center justify-center p-5 pointer-events-none"
        style={{ zIndex: 70 }}
      >
        <div
          className="w-full max-w-sm rounded-3xl overflow-hidden pointer-events-auto bg-white shadow-2xl"
          style={{ userSelect: "none", WebkitUserSelect: "none" } as React.CSSProperties}
        >
          {/* Header */}
          <div className="px-5 pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#F0FDF4" }}>
              <DollarSign className="w-5 h-5" style={{ color: "#16A34A" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base text-slate-900 leading-tight truncate">{gbName}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Tap a product to reveal its price</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-slate-100">
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

          {/* Confidentiality badge */}
          <div className="mx-4 mb-3 px-3 py-2 rounded-xl flex items-center gap-2"
               style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.18)" }}>
            <Lock className="w-3 h-3 shrink-0" style={{ color: "#16A34A" }} />
            <p className="text-[11px]" style={{ color: "#15803d" }}>
              Member-only pricing · watermarked with your handle
            </p>
          </div>

          {/* Search */}
          {!loading && !hidden && products.length > 4 && (
            <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl px-3 py-2"
                 style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0" }}>
              <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search products…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                style={{ userSelect: "text", WebkitUserSelect: "text" } as React.CSSProperties}
              />
              {search && (
                <button onClick={() => setSearch("")} className="shrink-0">
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              )}
            </div>
          )}

          {/* Product accordion */}
          <div className="px-4 pb-4 space-y-1.5 overflow-y-auto" style={{ maxHeight: "22rem" }}>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
              </div>
            ) : hidden ? (
              <p className="text-center text-slate-400 text-sm py-6">
                Pricing not available for this group buy.
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-6">
                {search ? `No products matching "${search}"` : "No products listed yet."}
              </p>
            ) : filtered.map(p => {
              const isOpen = openId === p.id;
              return (
                <div key={p.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : p.id)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-colors"
                    style={{
                      background: isOpen ? "rgba(22,163,74,0.08)" : "#F8FAFC",
                      border: `1.5px solid ${isOpen ? "rgba(22,163,74,0.28)" : "#E2E8F0"}`,
                      borderBottomLeftRadius: isOpen ? 0 : undefined,
                      borderBottomRightRadius: isOpen ? 0 : undefined,
                    }}
                  >
                    <span className="text-sm font-medium text-slate-700 leading-snug pr-2 min-w-0 truncate">{p.name}</span>
                    <span
                      className="text-[11px] font-semibold shrink-0 whitespace-nowrap ml-2"
                      style={{ color: isOpen ? "#16A34A" : "#94A3B8" }}
                    >
                      {isOpen ? "▴ hide" : "tap to reveal"}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", damping: 32, stiffness: 320 }}
                        className="overflow-hidden"
                        style={{
                          borderLeft: "1.5px solid rgba(22,163,74,0.22)",
                          borderRight: "1.5px solid rgba(22,163,74,0.22)",
                          borderBottom: "1.5px solid rgba(22,163,74,0.22)",
                          borderRadius: "0 0 10px 10px",
                        }}
                      >
                        <PriceRevealCanvas price={formatPrice(Number(p.price))} username={username} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </>
  );
}
