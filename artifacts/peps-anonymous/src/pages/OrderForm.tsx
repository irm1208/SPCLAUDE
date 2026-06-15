import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChevronDown, Package, MessageCircle, X, Heart, ArrowRight, Info, Loader2, TestTube, AlertTriangle, Globe, BarChart2, Search, Check, Truck, Home } from "lucide-react";
import { findProtocol, type Protocol } from "@/data/protocols";
import { COUNTRIES } from "@/data/countries";
import { LabReportPopup } from "@/components/LabTestsPopup";
import { Card, cn } from "@/components/ui";
import { PageLayout } from "@/components/PageLayout";
import { useSidebarExpanded } from "@/hooks/use-sidebar-expanded";
import { SiteAnnouncements } from "@/components/SiteAnnouncements";
import { useGetProducts, useGetDeliveryMethods, useGetSiteConfig } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useDraftStore } from "@/hooks/use-draft-store";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAccount, useMyGroupBuys, useCountryLegs, useAssignMyCountryLeg } from "@/hooks/use-account";

const TIP_OPTIONS = [0, 1, 2, 3, 5, 10, 15, 20];

/** Match an account's stored country value against a country leg, tolerating all common formats:
 *  full name ("United Kingdom"), ISO code ("GB"), "Name (CODE)" ("United Kingdom (GB)"),
 *  "CODE Name" ("GB United Kingdom"), or any string containing "(CODE)".
 */
function matchesCountryLeg(
  accountCountry: string,
  leg: { countryCode: string; countryName: string },
): boolean {
  const c = accountCountry.toLowerCase().trim();
  const code = leg.countryCode.toLowerCase();
  const name = leg.countryName.toLowerCase();
  return (
    c === name ||
    c === code ||
    c === `${name} (${code})` ||
    c === `${code} ${name}` ||
    c.includes(`(${code})`) ||
    c.startsWith(`${code} `)
  );
}

function nextQty(current: number): number {
  if (current < 1) return 1;
  return current + 1;
}
function prevQty(current: number): number {
  if (current <= 0.5) return 0.5;
  if (current <= 1) return 0.5;
  return current - 1;
}
function displayQty(qty: number): string {
  return qty % 1 === 0 ? String(qty) : qty.toFixed(1);
}

function FloatingError({ message, onClose }: { message: string; onClose: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onClose, 4000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [message]);

  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -80, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="fixed top-20 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
    >
      <div className="flex items-center gap-3 bg-destructive text-destructive-foreground rounded-xl shadow-lg shadow-destructive/25 px-5 py-3.5 max-w-sm w-full pointer-events-auto">
        <span className="flex-1 text-sm font-medium leading-snug">{message}</span>
        <button
          onClick={onClose}
          className="shrink-0 opacity-80 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function getDeliveryBrand(name: string): "royal-mail" | "inpost" | "default" {
  const lower = name.toLowerCase();
  if (lower.includes("royal")) return "royal-mail";
  if (lower.includes("inpost")) return "inpost";
  return "default";
}

function getDeliveryFallbackInfo(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("royal mail")) return "Delivered by Royal Mail to your door. Standard tracked service — typically 2–3 working days within the UK. Arrives in plain, unmarked packaging.";
  if (lower.includes("inpost")) return "Delivered to your nearest InPost locker. Collect at any time using a unique PIN code sent to you. Great for privacy — no home delivery required.";
  if (lower.includes("eu") && lower.includes("vendor")) return "Ships directly from our EU supplier to your address. Ideal for larger orders (15+ kits). Delivered in discreet, unmarked packaging. Allow 5–10 working days.";
  if (lower.includes("vendor")) return "Ships directly from our supplier to your address. Delivered in discreet, unmarked packaging.";
  if (lower.includes("collect") || lower.includes("pickup")) return "Collect your order from an agreed pickup point. Details will be confirmed after your order is placed.";
  return "Your order will be dispatched promptly in plain, unmarked packaging for your privacy.";
}

function RoyalMailLogo({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 36, height: 26, marginBottom: 10, ...style }}>
      <circle cx="4" cy="13" r="3" fill="currentColor" />
      <circle cx="20" cy="5" r="3" fill="currentColor" />
      <circle cx="36" cy="13" r="3" fill="currentColor" />
      <path d="M4 13 L10 4 L16 12 L20 5 L24 12 L30 4 L36 13 L36 22 L4 22 Z" fill="currentColor" />
      <rect x="2" y="21" width="36" height="5" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function InPostLogo({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 40 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 36, height: 28, marginBottom: 10, ...style }}>
      <rect x="1" y="5" width="38" height="26" rx="3" fill="currentColor" />
      <rect x="5" y="9" width="13" height="18" rx="1.5" fill="white" opacity="0.9" />
      <rect x="22" y="9" width="13" height="18" rx="1.5" fill="white" opacity="0.9" />
      <circle cx="11.5" cy="18" r="2" fill="currentColor" />
      <circle cx="28.5" cy="18" r="2" fill="currentColor" />
      <rect x="14" y="2" width="12" height="5" rx="1" fill="currentColor" />
    </svg>
  );
}

// ─── Searchable Product Combobox ──────────────────────────────────────────────
const CAT_ORDER_FALLBACK = [
  "GLP-1 & Weight Loss", "GH & IGF Peptides", "Metabolic", "Healing & Recovery",
  "Longevity & Anti-Aging", "Cognitive & Mood", "Sexual Health",
  "Supplies & Supplements", "Skin & Hair", "Bioregulators", "Fertility & Hormones",
];

type SearchProduct = { id: string; name: string; price: number; category?: string | null; mgSize?: string | null };
type CapacityEntry  = { productName: string; fillPercent: number; status: "available" | "limited" | "low" | "full"; totalOrdered: number };
type PopularityEntry = { productName: string; score: number };

const DOT_COLOR  = { available: "#10B981", limited: "#F59E0B", low: "#F97316", full: "#EF4444" } as const;
const DOT_LABEL  = { available: "In Stock", limited: "Med", low: "Low", full: "OOS" } as const;
const MEDALS     = ["🥇", "🥈", "🥉"] as const;

function SearchableProductSelect({
  products, value, onChange, disabledIds, disabled, formatPrice, catOrder, capacity, popularity, hidePrices,
}: {
  products: SearchProduct[];
  value: string;
  onChange: (id: string) => void;
  disabledIds: string[];
  disabled: boolean;
  formatPrice: (amount: number) => string;
  catOrder?: string[];
  capacity?: CapacityEntry[];
  popularity?: PopularityEntry[];
  hidePrices?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click/tap (works even with portal)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      const inWrapper = wrapperRef.current?.contains(target) ?? false;
      const inPanel = panelRef.current?.contains(target) ?? false;
      if (!inWrapper && !inPanel) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  // Compute the portal panel position from the trigger's bounding rect
  const recomputePosition = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const openUpward = spaceBelow < 200 && spaceAbove > spaceBelow;
    setPanelStyle(openUpward
      ? { position: "fixed", bottom: window.innerHeight - r.top + 6, left: r.left, width: r.width, zIndex: 9999 }
      : { position: "fixed", top: r.bottom + 6, left: r.left, width: r.width, zIndex: 9999 }
    );
  };

  // Auto-focus search input when opening, compute portal position; track on scroll/resize
  useEffect(() => {
    if (!open) { setQuery(""); return; }
    recomputePosition();
    setTimeout(() => searchRef.current?.focus(), 60);
    window.addEventListener("scroll", recomputePosition, { passive: true, capture: true });
    window.addEventListener("resize", recomputePosition, { passive: true });
    return () => {
      window.removeEventListener("scroll", recomputePosition, { capture: true });
      window.removeEventListener("resize", recomputePosition);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = products.find(p => p.id === value);
  const q = query.toLowerCase().trim();
  const filtered = q
    ? products.filter(p => p.name.toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q))
    : products;

  const categorised: Record<string, SearchProduct[]> = {};
  const uncategorised: SearchProduct[] = [];
  filtered.forEach(p => {
    if (p.category) { (categorised[p.category] = categorised[p.category] || []).push(p); }
    else { uncategorised.push(p); }
  });
  const allCats = Object.keys(categorised);
  const effectiveCatOrder = catOrder && catOrder.length > 0 ? catOrder : CAT_ORDER_FALLBACK;
  const cats = [
    ...effectiveCatOrder.filter(c => allCats.includes(c)),
    ...allCats.filter(c => !effectiveCatOrder.includes(c)).sort(),
  ];

  const handleSelect = (id: string) => { onChange(id); setOpen(false); };

  const renderRow = (p: SearchProduct) => {
    const isDisabled = p.id !== value && disabledIds.includes(p.id);
    const isSelected = p.id === value;
    const cap = capacity?.find(c => c.productName.trim().toLowerCase() === p.name.trim().toLowerCase());
    const dotColor = cap ? DOT_COLOR[cap.status] : null;
    const dotLabel = cap ? DOT_LABEL[cap.status] : null;
    const popRank = popularity
      ? popularity.findIndex(pop => pop.productName.trim().toLowerCase() === p.name.trim().toLowerCase())
      : -1;
    const medal = popRank >= 0 && popRank < 3 ? MEDALS[popRank] : null;
    const showLeftSlot = capacity !== undefined || medal !== null;

    return (
      <button
        key={p.id}
        type="button"
        disabled={isDisabled}
        onClick={() => handleSelect(p.id)}
        className="w-full text-left flex items-center gap-2 px-4"
        style={{
          minHeight: 44,
          color: isDisabled ? "rgba(255,255,255,0.25)" : isSelected ? "#5B8DEF" : "rgba(255,255,255,0.88)",
          background: isSelected ? "rgba(91,141,239,0.12)" : "transparent",
          cursor: isDisabled ? "not-allowed" : "pointer",
          fontSize: 14,
          paddingTop: 10,
          paddingBottom: 10,
          transition: "background 0.1s",
        }}
        onMouseEnter={e => { if (!isDisabled) (e.currentTarget as HTMLElement).style.background = isSelected ? "rgba(91,141,239,0.18)" : "rgba(255,255,255,0.05)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected ? "rgba(91,141,239,0.12)" : "transparent"; }}
      >
        {/* Left slot: medal emoji for top 3, stock dot otherwise */}
        {showLeftSlot && (
          medal
            ? <span style={{ flexShrink: 0, fontSize: 13, lineHeight: 1, userSelect: "none", opacity: isDisabled ? 0.35 : 1 }}>{medal}</span>
            : <span style={{ flexShrink: 0, width: 7, height: 7, borderRadius: "50%", background: dotColor ?? "rgba(255,255,255,0.12)", opacity: isDisabled ? 0.35 : 1 }} />
        )}

        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {p.name}{p.mgSize ? ` - ${p.mgSize}` : ""}
        </span>

        {dotLabel && (
          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: dotColor ?? undefined, opacity: isDisabled ? 0.35 : 1 }}>
            {dotLabel}
          </span>
        )}

        {!hidePrices && (
          <span style={{ flexShrink: 0, fontVariantNumeric: "tabular-nums", color: isDisabled ? "rgba(255,255,255,0.15)" : isSelected ? "#5B8DEF" : "rgba(255,255,255,0.45)" }}>
            {formatPrice(p.price)}
          </span>
        )}
        {isSelected && (
          <span style={{ flexShrink: 0, color: "#5B8DEF", fontWeight: 600 }}>✓</span>
        )}
      </button>
    );
  };

  const panel = open ? (
    <div
      ref={panelRef}
      style={{
        ...panelStyle,
        borderRadius: 12,
        overflow: "hidden",
        background: "#162231",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
        maxHeight: 320,
        display: "flex",
        flexDirection: "column",
      }}
      role="listbox"
    >
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search products…"
          style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#ffffff", fontSize: 16, lineHeight: "1.4" }}
          className="placeholder:text-white/35"
        />
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {filtered.length === 0 && (
          <p style={{ padding: "12px 16px", fontSize: 14, color: "rgba(255,255,255,0.4)" }}>No products match "{query}"</p>
        )}
        {cats.length === 0
          ? filtered.map(renderRow)
          : (
            <>
              {cats.map(cat => (
                <div key={cat}>
                  <div style={{ padding: "6px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", position: "sticky", top: 0, background: "#162231" }}>
                    {cat}
                  </div>
                  {categorised[cat].map(renderRow)}
                </div>
              ))}
              {uncategorised.length > 0 && (
                <div>
                  <div style={{ padding: "6px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", position: "sticky", top: 0, background: "#162231" }}>
                    Other
                  </div>
                  {uncategorised.map(renderRow)}
                </div>
              )}
            </>
          )
        }
      </div>
    </div>
  ) : null;

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className="w-full text-left focus:outline-none flex items-center"
        style={{
          height: 48,
          borderRadius: 12,
          paddingLeft: 16,
          paddingRight: 40,
          fontSize: 14,
          background: "#162231",
          border: open ? "1px solid rgba(91,141,239,0.5)" : "1px solid rgba(255,255,255,0.08)",
          color: selected ? "#ffffff" : "rgba(255,255,255,0.75)",
          transition: "border-color 0.15s",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {disabled ? "Loading products…" : selected ? `${selected.name}${selected.mgSize ? ` - ${selected.mgSize}` : ""}` : "Select a product…"}
        </span>
      </button>
      <ChevronDown
        className="absolute right-3 top-3.5 w-5 h-5 pointer-events-none"
        style={{ color: "#5B8DEF", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
      />
      {panel && createPortal(panel, document.body)}
    </div>
  );
}

export default function OrderForm() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const gbId = new URLSearchParams(search).get("gbId") ?? null;

  // When in GB mode, fetch GB-specific products/delivery methods
  const { data: globalProducts = [], isLoading: isLoadingGlobalProducts } = useGetProducts();
  const { data: globalDeliveryMethods = [], isLoading: isLoadingGlobalMethods } = useGetDeliveryMethods();
  const { data: siteConfig } = useGetSiteConfig();

  const { data: catOrderData } = useQuery<{ order: string[] }>({
    queryKey: ["public-category-order"],
    queryFn: async () => {
      const res = await fetch("/api/public/category-order");
      if (!res.ok) return { order: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: gbProducts = [], isLoading: isLoadingGbProducts } = useQuery<Array<{ id: string; name: string; price: number; description: string | null; sortOrder: number; category: string | null; mgSize: string | null; halfKitEnabled?: boolean }>>({
    queryKey: ["gb-products", gbId],
    queryFn: async () => {
      if (!gbId) return [];
      const res = await fetch(`/api/group-buys/${gbId}/products`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!gbId,
    staleTime: 60 * 1000,
  });

  const { data: gbDeliveryMethods = [], isLoading: isLoadingGbMethods } = useQuery<Array<{ id: string; name: string; price: number; description: string | null }>>({
    queryKey: ["gb-delivery-methods", gbId],
    queryFn: async () => {
      if (!gbId) return [];
      const res = await fetch(`/api/group-buys/${gbId}/delivery-methods`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!gbId,
    staleTime: 60 * 1000,
  });

  type DirectShippingRegion = { name: string; prices: number[] | null; priceNote: string | null; customNote: string | null };
  type DirectShippingInfo = { enabled: false } | { enabled: true; vendor: null } | {
    enabled: true;
    tiers: string[];
    tierBounds: number[];
    maxKitsPerPackage: number;
    userRegionName: string | null;
    regions: DirectShippingRegion[];
  };

  const { data: directShippingInfo } = useQuery<DirectShippingInfo>({
    queryKey: ["gb-direct-shipping-info", gbId],
    queryFn: async () => {
      if (!gbId) return { enabled: false };
      const res = await fetch(`/api/group-buys/${gbId}/direct-shipping-info`, { credentials: "include" });
      if (!res.ok) return { enabled: false };
      return res.json();
    },
    enabled: !!gbId,
    staleTime: 60 * 1000,
  });

  const { data: gbPopularity = [] } = useQuery<Array<{ productName: string; score: number }>>({
    queryKey: ["gb-popularity", gbId],
    queryFn: async () => {
      if (!gbId) return [];
      const res = await fetch(`/api/group-buys/${gbId}/popularity`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!gbId,
    staleTime: 3 * 60 * 1000,
  });

  type CapacityItem = { productName: string; totalOrdered: number; stock: number; fillPercent: number; status: "available" | "limited" | "low" | "full"; mapped: boolean };
  type CapacityResponse = { items: CapacityItem[]; stockViewEnabled: boolean };
  const { data: capacityData } = useQuery<CapacityResponse>({
    queryKey: ["gb-capacity", gbId],
    queryFn: async () => {
      if (!gbId) return { items: [], stockViewEnabled: true };
      const res = await fetch(`/api/group-buys/${gbId}/capacity`, { credentials: "include" });
      if (!res.ok) return { items: [], stockViewEnabled: true };
      return res.json();
    },
    enabled: !!gbId,
    staleTime: 20 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });
  const gbCapacity = capacityData?.items ?? [];
  const stockViewEnabled = capacityData?.stockViewEnabled ?? true;

  const products = gbId ? gbProducts : globalProducts;
  const isLoadingProducts = gbId ? isLoadingGbProducts : isLoadingGlobalProducts;
  const isLoadingMethods = gbId ? isLoadingGbMethods : isLoadingGlobalMethods;

  const draft = useDraftStore();

  // Calculate direct shipping cost reactively from current kit count + vendor tier pricing
  const calcDirectShippingCost = useMemo((): number | null => {
    if (draft.deliveryMethodId !== "__direct_shipping") return null;
    if (!directShippingInfo?.enabled || !("tiers" in directShippingInfo)) return null;
    const info = directShippingInfo as any;
    if (!info.tiers || !info.tierBounds?.length) return null;
    const { tierBounds, maxKitsPerPackage, userRegionName, regions } = info;
    const userRegion = userRegionName ? regions.find((r: any) => r.name === userRegionName) : null;
    if (!userRegion?.prices) return null;
    const totalKits = draft.lineItems.reduce((s: number, item: any) => item.productId ? s + item.quantity : s, 0);
    if (totalKits === 0) return 0;
    let remaining = totalKits;
    let total = 0;
    while (remaining > 0) {
      const inPkg = Math.min(remaining, maxKitsPerPackage);
      let tierIdx = tierBounds.length - 1;
      for (let i = 0; i < tierBounds.length; i++) { if (inPkg <= tierBounds[i]) { tierIdx = i; break; } }
      const p = userRegion.prices[tierIdx];
      if (p == null) return null;
      total += p;
      remaining -= inPkg;
    }
    return parseFloat(total.toFixed(2));
  }, [draft.deliveryMethodId, draft.lineItems, directShippingInfo]);

  // Sync calculated cost into draft.deliveryPrice so the total stays correct as kits change
  useEffect(() => {
    if (calcDirectShippingCost === null) return;
    if (draft.deliveryPrice !== calcDirectShippingCost) {
      draft.setDeliveryMethod("__direct_shipping", "Direct Shipping to Home", calcDirectShippingCost);
    }
  }, [calcDirectShippingCost]);

  const setPageTitle = usePageTitle(s => s.setTitle);
  const pageTitle = usePageTitle(s => s.title);
  const { account } = useAccount();
  const { data: myGroupBuys } = useMyGroupBuys();

  const [gbShippingOptions, setGbShippingOptions] = React.useState<Array<{ id: string; label: string; price: number; requiresAddress?: boolean }>>([]);
  const [isLoadingGbInfo, setIsLoadingGbInfo] = React.useState(false);

  // Kit limit data from the GB
  const [gbMaxKitsPerCustomer, setGbMaxKitsPerCustomer] = React.useState<number | null>(null);
  const [gbMaxKitsTotal, setGbMaxKitsTotal] = React.useState<number | null>(null);
  const [gbKitsOrderedByUser, setGbKitsOrderedByUser] = React.useState<number>(0);
  const [gbKitsOrderedTotal, setGbKitsOrderedTotal] = React.useState<number>(0);
  const [gbAllowHalfKits, setGbAllowHalfKits] = React.useState<boolean>(true);
  const [gbOrderPageMessage, setGbOrderPageMessage] = React.useState<string | null>(null);
  const [gbCurrency, setGbCurrency] = React.useState<string | null>(null);

  // Resolve the user's country leg for the current GB (if the GB has country legs enabled)
  const myGb = gbId ? (myGroupBuys?.find(g => g.id === gbId) ?? null) : null;
  const gbClosed = myGb?.status === "closed";
  const hideOrderFormPrices = gbClosed && (myGb?.hidePricesOnOrderForm ?? false);
  const hideOrderTotal = gbClosed && (myGb?.hideOrderTotalOnOrderForm ?? false);
  const myCountryLegId = myGb?.countryLegId ?? null;
  const gbHasCountryLegs = myGb?.countryLegsEnabled ?? false;
  const gbAllowReshipperCode = myGb?.allowReshipperCode ?? false;
  const { data: countryLegs = [] } = useCountryLegs(gbHasCountryLegs ? gbId : null);
  const myCountryLeg = myCountryLegId ? countryLegs.find(l => l.id === myCountryLegId) ?? null : null;
  // All reshippers serving this leg (supports multiple per country)
  const legReshippers = myCountryLeg?.reshippers ?? (myCountryLeg?.reshipper ? [myCountryLeg.reshipper] : []);
  const hasMultipleReshippers = legReshippers.length > 1;
  // Single-reshipper legs: auto-use that reshipper. Multi-reshipper legs: not assigned at order time.
  const reshipperInfo = hasMultipleReshippers ? null : (legReshippers[0] ?? null);

  // Inline country assignment (for members who joined before legs were enabled)
  const [assignLegId, setAssignLegId] = React.useState("");
  const [assignError, setAssignError] = React.useState<string | null>(null);
  const assignLeg = useAssignMyCountryLeg(gbId ?? null);

  // Track which GB we've already attempted auto-assignment for, so we never loop if the
  // mutation fails or the account-group-buys refetch is slow (e.g. with an ad blocker).
  const autoAssignAttempted = React.useRef<string | null>(null);

  // Auto-assign country leg from account's stored country code — silent, no picker needed
  React.useEffect(() => {
    if (!gbHasCountryLegs || myCountryLegId || !account?.country || countryLegs.length === 0) return;
    if (assignLeg.isPending) return;
    // Only ever fire once per GB — prevents an infinite loop when the post-mutation
    // refetch of myCountryLegId hasn't settled yet (common with ad blockers).
    if (autoAssignAttempted.current === gbId) return;
    const match = countryLegs.find(l => l.status === "active" && matchesCountryLeg(account.country!, l));
    if (match) {
      autoAssignAttempted.current = gbId ?? null;
      assignLeg.mutate({ countryLegId: match.id });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gbHasCountryLegs, myCountryLegId, account?.country, countryLegs, gbId]);

  // Clear preferred reshipper from draft — assignment is now handled by reshippers claiming orders
  React.useEffect(() => {
    draft.setPreferredReshipperUsername(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve currency: use async-fetched state, fall back to cached group buy data so the
  // symbol is correct immediately on remount (before the fetch resolves).
  const effectiveCurrency = gbCurrency ?? (gbId ? (myGroupBuys?.find(g => g.id === gbId)?.currency ?? null) : null);

  // Format price using the group buy's currency
  const formatPrice = React.useCallback(
    (amount: number) => {
      const symbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€", CAD: "CA$", AUD: "A$" };
      const sym = (effectiveCurrency && symbols[effectiveCurrency]) ? symbols[effectiveCurrency] : "$";
      return `${sym}${amount.toFixed(2)}`;
    },
    [effectiveCurrency]
  );

  // When a GB defines its own shipping options, use those; otherwise fall back to relational delivery methods
  const gbShippingAsDelivery = gbShippingOptions.map(o => ({ id: o.id, name: o.label, price: o.price, description: null, requiresAddress: o.requiresAddress ?? false }));
  const deliveryMethods = gbId && gbShippingOptions.length > 0
    ? gbShippingAsDelivery
    : (gbId ? gbDeliveryMethods : globalDeliveryMethods);

  // Auto-populate username from logged-in account
  useEffect(() => {
    if (account?.telegramUsername && !draft.orderId) {
      draft.setTelegramUsername(account.telegramUsername.replace(/^@/, ""));
    }
  }, [account?.telegramUsername]);

  // Does the currently selected delivery method require a shipping address?
  // NOTE: must be declared before the useEffect below that uses it as a dependency.
  const selectedMethodRequiresAddress = (() => {
    if (!draft.deliveryMethodId) return false;
    const opt = gbShippingOptions.find(o => o.id === draft.deliveryMethodId);
    return opt?.requiresAddress ?? false;
  })();


  // Fetch GB name, shipping options and kit limits
  useEffect(() => {
    if (!gbId) {
      setPageTitle(null);
      setGbShippingOptions([]);
      setGbMaxKitsPerCustomer(null);
      setGbMaxKitsTotal(null);
      setGbKitsOrderedByUser(0);
      setGbKitsOrderedTotal(0);
      setGbOrderPageMessage(null);
      setGbCurrency(null);
      setIsLoadingGbInfo(false);
      return;
    }
    setIsLoadingGbInfo(true);
    fetch("/api/group-buys", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((gbs: Array<{
        id: string; name: string; testingEnabled?: boolean; labTestSupplier?: string | null;
        shippingOptions?: Array<{ id: string; label: string; price: number; requiresAddress?: boolean }>;
        maxKitsPerCustomer?: number | null;
        maxKitsTotal?: number | null;
        kitsOrderedByUser?: number;
        kitsOrderedTotal?: number;
        allowHalfKits?: boolean;
        orderPageMessage?: string | null;
        currency?: string | null;
      }>) => {
        const gb = gbs.find(g => g.id === gbId);
        setPageTitle(gb?.name ?? null);
        setGbTestingEnabled(gb?.testingEnabled ?? false);
        setGbLabTestSupplier(gb?.labTestSupplier ?? null);
        setGbShippingOptions(gb?.shippingOptions ?? []);
        setGbMaxKitsPerCustomer(gb?.maxKitsPerCustomer ?? null);
        setGbMaxKitsTotal(gb?.maxKitsTotal ?? null);
        setGbKitsOrderedByUser(gb?.kitsOrderedByUser ?? 0);
        setGbKitsOrderedTotal(gb?.kitsOrderedTotal ?? 0);
        setGbAllowHalfKits(gb?.allowHalfKits ?? true);
        setGbOrderPageMessage(gb?.orderPageMessage ?? null);
        setGbCurrency(gb?.currency ?? null);
        setIsLoadingGbInfo(false);
      })
      .catch(() => {
        setPageTitle(null); setGbTestingEnabled(false); setGbShippingOptions([]);
        setGbMaxKitsPerCustomer(null); setGbMaxKitsTotal(null);
        setGbKitsOrderedByUser(0); setGbKitsOrderedTotal(0);
        setGbAllowHalfKits(true);
        setGbOrderPageMessage(null);
        setGbCurrency(null);
        setIsLoadingGbInfo(false);
      });
    return () => { setPageTitle(null); };
  }, [gbId]);

  const [infoOpenId, setInfoOpenId] = React.useState<string | null>(null);
  const [showAllDsRegions, setShowAllDsRegions] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showTip, setShowTip] = React.useState(draft.tip > 0);
  const [reshipperCodeState, setReshipperCodeState] = React.useState<"idle" | "validating" | "valid" | "invalid">("idle");
  const [reshipperCodeMsg, setReshipperCodeMsg] = React.useState("");
  const [gbTestingEnabled, setGbTestingEnabled] = React.useState(false);
  const [gbLabTestSupplier, setGbLabTestSupplier] = React.useState<string | null>(null);
  const [gbTestingContributionAmount, setGbTestingContributionAmount] = React.useState(15);
  const [infoProtocol, setInfoProtocol] = React.useState<Protocol | null>(null);
  const [labTestsProduct, setLabTestsProduct] = React.useState<{ productName: string; vendor?: string | null; gbLabSupplier?: string | null } | null>(null);
  const [stockModalOpen, setStockModalOpen] = React.useState(false);
  const [stockSearch, setStockSearch] = React.useState("");
  const [stockFilter, setStockFilter] = React.useState<"available" | "limited" | "low" | "full" | null>(null);
  const [productLabTestsMap, setProductLabTestsMap] = React.useState<Record<string, boolean>>({});
  const labTestsInFlight = React.useRef<Set<string>>(new Set());
  const sidebarExpanded = useSidebarExpanded();
  const [isMdPlus, setIsMdPlus] = React.useState(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMdPlus(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (siteConfig?.vendorShipping !== undefined) {
      draft.setVendorShipping(siteConfig.vendorShipping);
    }
  }, [siteConfig?.vendorShipping]);

  // Sync groupBuyId into draft when navigating to this page with ?gbId=
  useEffect(() => {
    draft.setGroupBuyId(gbId);
  }, [gbId]);

  // OrderForm is the non-wholesale order flow — clear any stale orderType from the draft
  useEffect(() => {
    useDraftStore.setState({ orderType: null });
  }, []);

  // When testing is enabled for this GB, fetch the active round's contribution amount
  useEffect(() => {
    if (!gbId || !gbTestingEnabled) { setGbTestingContributionAmount(15); return; }
    fetch(`/api/group-buys/${gbId}/testing`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.round?.contributionAmount) setGbTestingContributionAmount(d.round.contributionAmount); })
      .catch(() => {});
  }, [gbId, gbTestingEnabled]);

  // Reset testing contribution whenever the GB context changes to a state where it's not allowed
  useEffect(() => {
    if (!gbId || !gbTestingEnabled) {
      if (draft.testingContribution > 0) {
        draft.setTestingContribution(0);
      }
    }
  }, [gbId, gbTestingEnabled]);

  useEffect(() => {
    if (draft.lineItems.length === 0) {
      draft.addLineItem();
    }
  }, []);

  // Check whether each selected product has lab reports for its specific vendor; hide button if not
  useEffect(() => {
    draft.lineItems.forEach(item => {
      const name = item.productName;
      if (!name) return;
      const found = products.find(p => p.id === item.productId);
      const vendor: string = (found as any)?.vendor ?? gbLabTestSupplier ?? "";
      const key = vendor ? `${name}::${vendor}` : name;
      if (labTestsInFlight.current.has(key)) return;
      labTestsInFlight.current.add(key);
      const params = new URLSearchParams({ limit: "1" });
      params.set("peptide", encodeURIComponent(name));
      if (vendor) params.set("supplier", vendor);
      fetch(`/api/lab-tests?${params}`, { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then(data => setProductLabTestsMap(prev => ({ ...prev, [name]: Array.isArray(data) && data.length > 0 })))
        .catch(() => setProductLabTestsMap(prev => ({ ...prev, [name]: false })));
    });
  }, [draft.lineItems, products]); // eslint-disable-line react-hooks/exhaustive-deps

  // When GB delivery methods finish loading, validate the persisted delivery selection.
  // If the saved method is not part of this group buy's configured methods (e.g. stale
  // selection from a previous GB, a custom shipping option from a different GB, or from
  // the global order form), clear it — and also clear isTopUp so the user can pick a
  // valid method rather than being stuck with a locked "Included from previous order" UI.
  useEffect(() => {
    if (!gbId || isLoadingMethods || isLoadingGbInfo) return;
    if (draft.deliveryMethodId) {
      // "__direct_shipping" is a virtual method — never in deliveryMethods list, so skip validation
      if (draft.deliveryMethodId === "__direct_shipping") return;
      if (deliveryMethods.length === 0) {
        draft.clearTopUp();
        return;
      }
      const currentMethod = deliveryMethods.find(m => m.id === draft.deliveryMethodId);
      if (!currentMethod) {
        draft.clearTopUp();
      } else if (currentMethod.price !== draft.deliveryPrice || currentMethod.name !== draft.deliveryMethod) {
        draft.setDeliveryMethod(currentMethod.id, currentMethod.name, currentMethod.price);
      }
    } else if (draft.isTopUp) {
      // deliveryMethodId is already empty but isTopUp is still set — clear it
      draft.clearTopUp();
    }
  }, [gbId, isLoadingMethods, isLoadingGbInfo, deliveryMethods]);

  // Auto-select the only delivery method when there's exactly one option and none is chosen yet
  useEffect(() => {
    if (!isLoadingMethods && !isLoadingGbInfo && deliveryMethods.length === 1 && !draft.deliveryMethodId) {
      const m = deliveryMethods[0];
      draft.setDeliveryMethod(m.id, m.name, m.price);
    }
  }, [isLoadingMethods, isLoadingGbInfo, deliveryMethods, draft.deliveryMethodId]);

  const productSubtotal = parseFloat(
    draft.lineItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
  );
  const grandTotal = parseFloat(
    (productSubtotal + (draft.isTopUp ? 0 : draft.deliveryPrice) + (productSubtotal > 0 ? draft.vendorShipping : 0) + draft.tip + draft.testingContribution).toFixed(2)
  );

  const fuzzyPrice = (name: string): number => {
    const pricedProducts = products.filter(p => p.price > 0);
    if (pricedProducts.length === 0) return 0;
    const tokenise = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean));
    const targetTokens = tokenise(name);
    let bestScore = -1, bestPrice = 0;
    for (const p of pricedProducts) {
      const t = tokenise(p.name);
      const inter = [...targetTokens].filter(w => t.has(w)).length;
      const union = new Set([...targetTokens, ...t]).size;
      const score = union === 0 ? 0 : inter / union;
      if (score > bestScore) { bestScore = score; bestPrice = p.price; }
    }
    return bestPrice;
  };

  const handleProductSelect = (id: string, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const unitPrice = product.price > 0 ? product.price : fuzzyPrice(product.name);
      draft.updateLineItem(id, {
        productId: product.id,
        productName: product.name,
        unitPrice,
      });
    } else {
      draft.updateLineItem(id, { productId: '', productName: '', unitPrice: 0 });
    }
  };

  const handleQuickAdd = (productId: string) => {
    const emptySlot = useDraftStore.getState().lineItems.find(li => !li.productId);
    if (emptySlot) {
      handleProductSelect(emptySlot.id, productId);
    } else {
      draft.addLineItem();
      const newItems = useDraftStore.getState().lineItems;
      const newSlot = newItems[newItems.length - 1];
      if (newSlot) handleProductSelect(newSlot.id, productId);
    }
  };

  const handleDeliverySelect = (methodId: string) => {
    const method = deliveryMethods.find(m => m.id === methodId);
    if (method) {
      draft.setDeliveryMethod(method.id, method.name, method.price);
      draft.setDirectShippingRequested(false);
    }
  };

  const handleTipToggle = () => {
    if (showTip) {
      draft.setTip(0);
    }
    setShowTip(prev => !prev);
  };

  const validateReshipperCode = React.useCallback(async (val: string) => {
    if (!gbId) return;
    const trimmed = val.trim().toUpperCase();
    if (!trimmed) {
      draft.setReshipperCode(null);
      setReshipperCodeState("idle");
      setReshipperCodeMsg("");
      return;
    }
    setReshipperCodeState("validating");
    try {
      const r = await fetch(`/api/group-buys/${gbId}/validate-reshipper-code?code=${encodeURIComponent(trimmed)}`);
      const d = await r.json();
      if (r.ok && d.valid) {
        draft.setReshipperCode(trimmed);
        setReshipperCodeState("valid");
        setReshipperCodeMsg(d.reshipperUsername ? `Routes to @${d.reshipperUsername.replace(/^@/, "")}` : "Code accepted");
      } else {
        draft.setReshipperCode(null);
        setReshipperCodeState("invalid");
        setReshipperCodeMsg(d.error ?? "Invalid code");
      }
    } catch {
      setReshipperCodeState("invalid");
      setReshipperCodeMsg("Could not validate code");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gbId]);

  const handleReview = () => {
    const filledItems = draft.lineItems.filter(item => item.productId);

    if (filledItems.length === 0) {
      setError("Please add at least one product to your order");
      return;
    }

    if (!draft.deliveryMethodId) {
      setError("Please choose a delivery method");
      return;
    }

    const emptyIds = draft.lineItems.filter(i => !i.productId).map(i => i.id);
    emptyIds.forEach(id => draft.removeLineItem(id));

    // For GB orders not using direct shipping, clear any stale address data.
    // For non-GB direct orders the address belongs to the customer — keep it.
    if (gbId && !draft.directShippingRequested) {
      draft.setShippingAddress("");
    }

    // Validate shipping fields for non-GB direct orders
    if (!gbId) {
      if (!draft.shippingName.trim()) { setError("Please enter your full name"); return; }
      if (!draft.shippingAddress.trim()) { setError("Please enter your delivery address"); return; }
    }

    setError("");
    setLocation("/review");
  };

  const selectedProductIds = draft.lineItems.map(item => item.productId).filter(Boolean);

  return (
    <PageLayout>
    <div className="flex-1 flex flex-col" style={{ background: "var(--t-bg)", fontFamily: "'Inter', sans-serif" }}>
      <div className="px-4 pt-4 max-w-2xl mx-auto w-full">
        <SiteAnnouncements />
      </div>
      <AnimatePresence>
        {error && (
          <FloatingError message={error} onClose={() => setError("")} />
        )}
      </AnimatePresence>
      {/* Protocol info modal */}
      <AnimatePresence>
        {infoProtocol && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-0"
            onClick={() => setInfoProtocol(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-lg rounded-t-3xl overflow-hidden max-h-[88vh] flex flex-col bg-white"
              onClick={e => e.stopPropagation()}
            >
              {/* Coloured accent line */}
              <div className="h-0.5 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${infoProtocol.color} 0%, ${infoProtocol.color}55 100%)` }} />

              {/* Header */}
              <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 shrink-0 border-b border-slate-100">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 leading-tight">{infoProtocol.name}</h2>
                  <p className="text-sm mt-0.5 text-slate-500">{infoProtocol.tagline}</p>
                </div>
                <button
                  onClick={() => setInfoProtocol(null)}
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 mt-0.5"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* 4-stat grid */}
              <div className="px-5 py-3 grid grid-cols-4 gap-2 shrink-0 border-b border-slate-100">
                {[
                  { label: "Start Dose", value: infoProtocol.startDose.split(/[\s(]/)[0] + (infoProtocol.startDose.includes("mg") ? " mg" : infoProtocol.startDose.includes("mcg") ? " mcg" : "") },
                  { label: "Frequency", value: infoProtocol.frequency.toLowerCase().includes("weekly") ? "Weekly" : infoProtocol.frequency.toLowerCase().includes("daily") ? "Daily" : infoProtocol.frequency.split(/[\n,]/)[0].slice(0, 10) },
                  { label: "Route", value: infoProtocol.route.toLowerCase().includes("subcutaneous") ? "Subcut." : infoProtocol.route.toLowerCase().includes("nasal") ? "Intranasal" : infoProtocol.route.split(/[\n,]/)[0].slice(0, 10) },
                  { label: "Storage", value: infoProtocol.storage.toLowerCase().includes("fridge") || infoProtocol.storage.toLowerCase().includes("refrigerat") ? "Refrigerated" : infoProtocol.storage.split(/[\n,]/)[0].slice(0, 12) },
                ].map(s => (
                  <div key={s.label} className="rounded-xl py-2 px-1 text-center bg-slate-50 border border-slate-100">
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1 text-slate-400">{s.label}</p>
                    <p className="text-[11px] font-bold text-slate-800 leading-tight">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-y-auto flex-1">
                {/* Description */}
                <div className="px-5 py-3 border-b border-slate-100">
                  <p className="text-sm leading-relaxed text-slate-600">{infoProtocol.description}</p>
                </div>

                {/* Benefits */}
                <div className="px-5 py-3 border-b border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: infoProtocol.color }}>Benefits</p>
                  <p className="text-sm leading-relaxed text-slate-600">{infoProtocol.benefits}</p>
                </div>

                {/* Data table */}
                <table className="w-full text-[13px] border-collapse border-b border-slate-100">
                  <tbody>
                    {[
                      { label: "Vial size", value: infoProtocol.vial },
                      { label: "Reconstitution", value: infoProtocol.recon },
                      { label: "Start dose", value: infoProtocol.startDose },
                      { label: "Target dose", value: infoProtocol.targetDose },
                      { label: "Frequency", value: infoProtocol.frequency },
                      { label: "Route", value: infoProtocol.route },
                      { label: "Storage", value: infoProtocol.storage },
                    ].map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "var(--t-surface2)" : "var(--t-surface)" }}>
                        <td className="py-2 px-5 font-semibold w-[38%] leading-tight border-r border-slate-100" style={{ color: infoProtocol.color }}>
                          {row.label}
                        </td>
                        <td className="py-2 px-5 leading-tight text-slate-700">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Tips */}
                <div className="px-5 py-3 border-b border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-wider mb-1.5 text-blue-600">Tips</p>
                  <p className="text-sm leading-relaxed text-slate-600">{infoProtocol.tips}</p>
                </div>

                {/* Side Effects */}
                <div className="px-5 py-3 border-b border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-wider mb-1.5 text-red-600">Side Effects</p>
                  <p className="text-sm leading-relaxed text-slate-600">{infoProtocol.sideEffects}</p>
                </div>

                {/* Watch Out For */}
                <div className="px-5 py-3 border-b border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-wider mb-1.5 text-blue-600">Watch Out For</p>
                  <p className="text-sm leading-relaxed text-slate-600">{infoProtocol.watchOut}</p>
                </div>

                <p className="text-xs text-center pb-6 px-5 pt-3 text-slate-300">
                  For educational purposes only — consult a healthcare professional.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <main className="flex-1 px-4 py-5 pb-32 max-w-2xl mx-auto w-full space-y-4">

        {/* GB title + progress steps — only shown for group buy orders */}
        {gbId && pageTitle && (
          <div className="space-y-3 pt-1">
            {/* Order page message banner */}
            {gbOrderPageMessage && (
              <div
                className="rounded-xl px-4 py-3 text-sm text-center leading-relaxed font-semibold"
                style={{ background: "#fef2f2", color: "#991b1b", border: "2px solid #dc2626" }}
              >
                {gbOrderPageMessage}
              </div>
            )}

            {/* Country leg assignment — auto-detected from account country; manual picker as fallback */}
            {gbHasCountryLegs && !myCountryLegId && (() => {
              const activeLegs = countryLegs.filter(l => l.status === "active");
              const autoMatch = account?.country ? activeLegs.find(l => matchesCountryLeg(account.country!, l)) : null;
              // Auto-assigning in progress — show subtle loading state
              if (assignLeg.isPending) {
                return (
                  <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(45,107,204,0.06)", border: "1.5px solid rgba(45,107,204,0.2)" }}>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "#2D6BCC" }} />
                    <p className="text-xs" style={{ color: "#2D6BCC" }}>Detecting your country group…</p>
                  </div>
                );
              }
              // Auto-match found — effect will assign silently; nothing to show until resolved
              if (autoMatch) return null;
              // No auto-match — show manual fallback picker
              return (
                <div className="rounded-xl px-4 py-3 space-y-2.5" style={{ background: "rgba(245,158,11,0.08)", border: "1.5px solid rgba(245,158,11,0.3)" }}>
                  <div className="flex items-start gap-3">
                    <Globe className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#D97706" }} />
                    <div>
                      <p className="text-xs font-bold" style={{ color: "#D97706" }}>Select your country sub-group</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--t-text)" }}>
                        This group buy uses per-country sub-groups. Choose your country to get your reshipper assignment.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={assignLegId}
                      onChange={e => { setAssignLegId(e.target.value); setAssignError(null); }}
                      className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
                      style={{ background: "var(--t-surface2)", border: "1.5px solid rgba(245,158,11,0.4)", color: assignLegId ? "var(--t-text)" : "var(--t-muted)" }}
                      disabled={assignLeg.isPending || activeLegs.length === 0}
                    >
                      <option value="" disabled>{activeLegs.length === 0 ? "Loading…" : "Select country…"}</option>
                      {activeLegs.map(l => (
                        <option key={l.id} value={l.id}>{l.countryName}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!assignLegId || assignLeg.isPending}
                      onClick={() => {
                        setAssignError(null);
                        assignLeg.mutate({ countryLegId: assignLegId }, {
                          onError: (e) => setAssignError(e.message),
                        });
                      }}
                      className="rounded-lg px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-opacity disabled:opacity-50"
                      style={{ background: "#D97706", color: "#fff" }}
                    >
                      {assignLeg.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Confirm
                    </button>
                  </div>
                  {assignError && <p className="text-xs" style={{ color: "#DC2626" }}>{assignError}</p>}
                </div>
              );
            })()}

            {/* Reshipper info card — shown when the user's country leg has reshippers assigned */}
            {legReshippers.length > 0 && myCountryLeg && (
              <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: "var(--t-blue-12)", border: "1.5px solid var(--t-blue-30)" }}>
                <Globe className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--t-blue)" }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold" style={{ color: "var(--t-blue)" }}>
                    Local Reshipper — {myCountryLeg.countryName}
                  </p>
                  {!hasMultipleReshippers && (
                    <>
                      <p className="text-xs mt-0.5" style={{ color: "var(--t-text)" }}>
                        @{reshipperInfo?.telegramUsername}
                      </p>
                      {reshipperInfo?.paymentTarget && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--t-subtle)" }}>
                          Pay to: {reshipperInfo.paymentTarget}
                        </p>
                      )}
                      {reshipperInfo?.enabledPaymentMethods && typeof reshipperInfo.enabledPaymentMethods === "object" && !Array.isArray(reshipperInfo.enabledPaymentMethods) && (() => {
                        const labels: Record<string, string> = { usdtEnabled: "USDT", revolutEnabled: "Revolut", paypalEnabled: "PayPal", cryptoEnabled: "Crypto", anonPayEnabled: "AnonPay" };
                        const methods = Object.entries(reshipperInfo.enabledPaymentMethods as Record<string, unknown>).filter(([, v]) => v).map(([k]) => labels[k] ?? k);
                        return methods.length > 0 ? (
                          <p className="text-xs mt-0.5" style={{ color: "var(--t-subtle)" }}>Methods: {methods.join(", ")}</p>
                        ) : null;
                      })()}
                      {reshipperInfo?.reshipperPaymentDetails && typeof reshipperInfo.reshipperPaymentDetails === "object" && (() => {
                        const detailLabels: Record<string, string> = { usdtWallet: "USDT Wallet", revolutHandle: "Revolut", paypalHandle: "PayPal", cryptoCurrency: "Crypto", cryptoNetwork: "Network", cryptoWalletAddress: "Crypto Wallet", anonPayWallet: "AnonPay Wallet", anonPayTicker: "AnonPay Ticker", anonPayNetwork: "AnonPay Network" };
                        const entries = Object.entries(reshipperInfo.reshipperPaymentDetails as Record<string, unknown>).filter(([k, v]) => v && k !== "anonPayEnabled");
                        return entries.length > 0 ? (
                          <div className="mt-1 space-y-0.5">
                            {entries.map(([k, v]) => (
                              <p key={k} className="text-xs" style={{ color: "var(--t-subtle)" }}>{detailLabels[k] ?? k}: {String(v)}</p>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </>
                  )}
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 text-center" style={{ color: "var(--t-blue-deep)" }}>Group Buy</p>
              <h1 className="text-xl font-bold text-center" style={{ color: "var(--t-text)" }}>{pageTitle}</h1>
            </div>
            {/* 2-step progress indicator */}
            <div className="flex items-center gap-2">
              {/* Step 1 — active */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "var(--t-blue-deep)" }}>
                <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold" style={{ color: "var(--t-blue-deep)" }}>1</span>
                </span>
                <span className="text-xs font-semibold text-white whitespace-nowrap">Choose Products</span>
              </div>
              {/* Arrow */}
              <div className="flex-1 flex items-center">
                <div className="flex-1 h-px" style={{ background: "rgba(27,58,122,0.2)" }} />
                <svg className="w-3 h-3 mx-1 shrink-0" fill="none" viewBox="0 0 12 12" style={{ color: "rgba(27,58,122,0.35)" }}>
                  <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {/* Step 2 — inactive */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(27,58,122,0.08)", border: "1px solid rgba(27,58,122,0.2)" }}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(27,58,122,0.18)" }}>
                  <span className="text-[9px] font-bold" style={{ color: "var(--t-blue-deep)" }}>2</span>
                </span>
                <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "rgba(27,58,122,0.6)" }}>Review Order</span>
              </div>
            </div>
          </div>
        )}

        <section className="space-y-3">
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "#1C2B3D" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#E9A020" }}>Your Products</p>
              {gbId && stockViewEnabled && gbCapacity.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStockModalOpen(true)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }}
                  title="View stock levels"
                >
                  <BarChart2 className="w-3 h-3" />
                  Stock levels
                </button>
              )}
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {draft.lineItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {(() => {
                    const itemProduct = products.find(p => p.id === item.productId);
                    // Per-product toggle is authoritative inside a GB; fall back to the
                    // GB-level allowHalfKits only when the product has no explicit setting.
                    // Outside of a GB, half kits are always allowed.
                    const productHalfKit = (itemProduct as any)?.halfKitEnabled;
                    const itemAllowHalfKits = !gbId
                      ? true
                      : (productHalfKit ?? gbAllowHalfKits);
                    return (
                    <div className="flex flex-col gap-3 overflow-hidden">
                      <SearchableProductSelect
                        products={products}
                        value={item.productId ?? ""}
                        onChange={(productId) => handleProductSelect(item.id, productId)}
                        disabledIds={[]}
                        disabled={isLoadingProducts}
                        formatPrice={formatPrice}
                        catOrder={catOrderData?.order}
                        capacity={gbId && stockViewEnabled ? gbCapacity : undefined}
                        popularity={gbId ? gbPopularity : undefined}
                        hidePrices={hideOrderFormPrices}
                      />

                      {/* Action links — protocol info + lab report buttons */}
                      {item.productId && (
                        <div className="flex items-center gap-3 flex-wrap -mt-1">
                          {(() => {
                            const matched = findProtocol(item.productName || "");
                            if (!matched) return null;
                            return (
                              <button
                                type="button"
                                onClick={() => setInfoProtocol(matched)}
                                className="flex items-center gap-1.5 text-sm font-medium transition-colors"
                                style={{ color: "rgba(255,255,255,0.85)" }}
                              >
                                <Info className="w-3.5 h-3.5" />
                                View Protocol
                              </button>
                            );
                          })()}
                          {item.productName && productLabTestsMap[item.productName] === true && (
                            <button
                              type="button"
                              onClick={() => {
                                const found = products.find(p => p.id === item.productId);
                                setLabTestsProduct({ productName: item.productName || "", vendor: (found as any)?.vendor ?? null, gbLabSupplier: gbLabTestSupplier });
                              }}
                              className="flex items-center gap-1.5 text-sm font-medium transition-colors"
                              style={{ color: "#5B8DEF" }}
                            >
                              <TestTube className="w-3.5 h-3.5" />
                              Lab Reports
                            </button>
                          )}
                        </div>
                      )}

                      {/* ── Inline GB Availability (interactive — updates live with qty) ── */}
                      {gbId && stockViewEnabled && item.productId && (() => {
                        const cap = gbCapacity.find(c =>
                          c.productName.trim().toLowerCase() === (item.productName ?? "").trim().toLowerCase()
                        );
                        if (!cap) return null;

                        const myQty = item.quantity;
                        // Others' portion = inventory taken by the rest of the group (blue)
                        const othersFillPct = cap.stock > 0
                          ? Math.min(100, Math.round((cap.totalOrdered / cap.stock) * 100))
                          : cap.totalOrdered > 0 ? 100 : 0;
                        // My portion = my order's share of stock (amber — reacts live to +/−)
                        const myFillPct = cap.stock > 0
                          ? Math.min(100 - othersFillPct, Math.round((myQty / cap.stock) * 100))
                          : 0;
                        const liveFillPct = Math.min(100, othersFillPct + myFillPct);

                        // Status label still reflects overall fullness
                        const statusLabel =
                          liveFillPct >= 95 ? { text: "#FCA5A5", label: "OOS" } :
                          liveFillPct >= 75 ? { text: "#FDBA74", label: "Low" } :
                          liveFillPct >= 50 ? { text: "#FCD34D", label: "Med" } :
                                             { text: "#93C5FD", label: "In Stock" };

                        return (
                          <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full overflow-hidden flex" style={{ background: "rgba(59,130,246,0.12)" }}>
                                {/* Blue = inventory filled by others */}
                                {othersFillPct > 0 && (
                                  <div className="h-full transition-all duration-300" style={{ width: `${othersFillPct}%`, background: "#3B82F6", opacity: 0.65 }} />
                                )}
                                {/* Amber = my order (reacts to +/−) */}
                                {myFillPct > 0 && (
                                  <div className="h-full transition-all duration-300" style={{ width: `${myFillPct}%`, background: "#FBBF24", borderRadius: othersFillPct === 0 ? "9999px" : "0 9999px 9999px 0" }} />
                                )}
                              </div>
                              <span className="text-[10px] font-bold shrink-0 transition-colors duration-300" style={{ color: statusLabel.text }}>{statusLabel.label}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#3B82F6", opacity: 0.65 }} />
                                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>GB order</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#FBBF24" }} />
                                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>My order</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center shrink-0">
                          <div
                            className="flex items-center h-11 rounded-xl overflow-hidden"
                            style={{ background: "#162231", border: "1px solid rgba(255,255,255,0.08)" }}
                          >
                            <button
                              type="button"
                              className="px-3.5 h-full text-lg transition-colors"
                              style={{ color: "rgba(255,255,255,0.85)" }}
                              onClick={() => draft.updateLineItem(item.id, { quantity: itemAllowHalfKits ? prevQty(item.quantity) : Math.max(1, item.quantity - 1) })}
                            >−</button>
                            <input
                              type="number"
                              min={itemAllowHalfKits ? "0.5" : "1"}
                              step={itemAllowHalfKits ? "0.5" : "1"}
                              value={displayQty(item.quantity)}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v) && v > 0) draft.updateLineItem(item.id, { quantity: v });
                              }}
                              className="w-10 text-center text-sm font-bold"
                              style={{ color: "#ffffff", background: "transparent", border: "none", outline: "none", appearance: "textfield", MozAppearance: "textfield" } as React.CSSProperties}
                            />
                            <button
                              type="button"
                              className="px-3.5 h-full text-lg transition-colors"
                              style={{ color: "rgba(255,255,255,0.85)" }}
                              onClick={() => draft.updateLineItem(item.id, { quantity: nextQty(item.quantity) })}
                            >+</button>
                          </div>
                          {itemAllowHalfKits && (
                            <p className="text-xs mt-1 leading-none" style={{ color: "rgba(255,255,255,0.75)" }}>For half kits add .5</p>
                          )}
                        </div>

                        {!hideOrderFormPrices && (
                          <div className="flex-1 text-right">
                            <p className="font-bold text-base" style={{ color: "#ffffff" }}>{formatPrice(item.lineTotal)}</p>
                            {item.unitPrice > 0 && (
                              <p className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>{formatPrice(item.unitPrice)} each</p>
                            )}
                          </div>
                        )}

                        {draft.lineItems.length > 1 && (
                          <button
                            type="button"
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: "rgba(255,255,255,0.75)" }}
                            onClick={() => draft.removeLineItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    ); })()}
                    {draft.lineItems.length > 1 && item !== draft.lineItems[draft.lineItems.length - 1] && (
                      <div className="my-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={draft.addLineItem}
              className="w-full h-10 mt-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
              style={{
                border: "1px dashed rgba(255,255,255,0.35)",
                color: "rgba(255,255,255,0.75)",
                background: "transparent",
              }}
            >
              <Plus className="w-3 h-3" /> Add another product
            </button>

            {/* Real-time kit limit warnings */}
            {gbId && (() => {
              const totalNewKits = draft.lineItems.reduce((sum, item) => sum + item.quantity, 0);
              const perCustomerExceeded = gbMaxKitsPerCustomer != null &&
                (gbKitsOrderedByUser + totalNewKits) > gbMaxKitsPerCustomer;
              const totalExceeded = gbMaxKitsTotal != null &&
                (gbKitsOrderedTotal + totalNewKits) > gbMaxKitsTotal;

              if (!perCustomerExceeded && !totalExceeded) return null;

              return (
                <div className="mt-3 rounded-xl px-4 py-3 flex items-start gap-2.5"
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)" }}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#f87171" }} />
                  <div className="flex flex-col gap-1">
                    {perCustomerExceeded && gbMaxKitsPerCustomer != null && (
                      <p className="text-sm font-medium" style={{ color: "#fca5a5" }}>
                        You can order at most <strong>{gbMaxKitsPerCustomer}</strong> kit{gbMaxKitsPerCustomer !== 1 ? "s" : ""} from this group buy.
                        {gbKitsOrderedByUser > 0 && (
                          <> You already have <strong>{gbKitsOrderedByUser}</strong>, leaving <strong>{Math.max(0, gbMaxKitsPerCustomer - gbKitsOrderedByUser)}</strong> available.</>
                        )}
                      </p>
                    )}
                    {totalExceeded && gbMaxKitsTotal != null && (
                      <p className="text-sm font-medium" style={{ color: "#fca5a5" }}>
                        This group buy only has <strong>{Math.max(0, gbMaxKitsTotal - gbKitsOrderedTotal)}</strong> kit{Math.max(0, gbMaxKitsTotal - gbKitsOrderedTotal) !== 1 ? "s" : ""} remaining in total.
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </section>


        {/* Lab Test Contribution — only for group-buy orders where testing is enabled */}
        {gbId && gbTestingEnabled && (
          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Lab Testing</p>
            <div
              className="rounded-xl border px-4 py-3 transition-all"
              style={{
                borderColor: draft.testingContribution > 0 ? "var(--t-blue-25)" : "#D0DAE4",
                background: draft.testingContribution > 0 ? "var(--t-blue-03)" : "transparent",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <TestTube className="w-4 h-4 shrink-0" style={{ color: draft.testingContribution > 0 ? "var(--t-blue)" : "#8A9AAA" }} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: draft.testingContribution > 0 ? "var(--t-blue)" : "#374151" }}>
                      Contribute to lab testing
                    </p>
                    <p className="text-xs" style={{ color: "#8A9AAA" }}>
                      {draft.testingContribution > 0 ? `${formatPrice(gbTestingContributionAmount)} added to your order` : `${formatPrice(gbTestingContributionAmount)} · Help fund batch quality testing`}
                    </p>
                  </div>
                </div>
                {/* Toggle switch */}
                <button
                  type="button"
                  onClick={() => draft.setTestingContribution(draft.testingContribution > 0 ? 0 : gbTestingContributionAmount)}
                  className="shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none"
                  style={{ background: draft.testingContribution > 0 ? "var(--t-blue)" : "#D1D5DB" }}
                  aria-pressed={draft.testingContribution > 0}
                >
                  <span
                    className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
                    style={{ transform: draft.testingContribution > 0 ? "translateX(24px)" : "translateX(4px)" }}
                  />
                </button>
              </div>
              <AnimatePresence>
                {draft.testingContribution > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-xs text-slate-500 italic mt-2.5 pt-2.5 border-t border-slate-200">
                      After your order is confirmed, visit the{" "}
                      <a
                        href={gbId ? `/testing/${gbId}` : "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                        style={{ color: "var(--t-blue)" }}
                        onClick={e => e.stopPropagation()}
                      >
                        testing pool page
                      </a>
                      {" "}to vote for which product gets tested.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        )}

        <section className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Delivery</p>

          {draft.isTopUp ? (
            <div className="rounded-xl p-4 border-2 border-green-500/30 bg-green-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-bold text-sm text-green-900">{draft.deliveryMethod}</p>
                    <p className="text-xs text-green-600">Included from your previous order</p>
                  </div>
                </div>
                <span className="font-bold text-sm text-green-600">Free</span>
              </div>
            </div>
          ) : isLoadingMethods ? (
            <div className="h-20 flex items-center justify-center text-sm" style={{ color: "#8A9AAA" }}>Loading…</div>
          ) : (
            <div className="space-y-2">
              {deliveryMethods.map(method => {
                const isSelected = draft.deliveryMethodId === method.id;
                const brand = getDeliveryBrand(method.name);
                const isFree = method.price === 0;
                const Icon = brand === "inpost" ? Package : brand === "royal-mail" ? Truck : Truck;
                const isInfoOpen = infoOpenId === method.id;
                const methodInfoEnabled = (method as any).infoEnabled === true;
                const infoText = (method as any).infoText || (method as any).description || getDeliveryFallbackInfo(method.name);
                return (
                  <div key={method.id} className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${isSelected ? "var(--t-blue, #2D6BCC)" : "var(--t-border, #E4E4E7)"}`, boxShadow: isSelected ? "0 1px 3px rgba(45,107,204,0.10)" : undefined }}>
                    {/* Row: selection area + info button + price */}
                    <div
                      className="flex items-center gap-3 px-3.5 py-3 transition-all"
                      style={{ background: isSelected ? "var(--t-blue-08, rgba(45,107,204,0.08))" : "var(--t-surface, #fff)" }}
                    >
                      {/* Clickable selection area (radio + icon tile + name) */}
                      <button
                        type="button"
                        onClick={() => handleDeliverySelect(method.id)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        {/* Radio indicator */}
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all"
                          style={{
                            background: isSelected ? "var(--t-blue, #2D6BCC)" : "transparent",
                            border: `1.5px solid ${isSelected ? "var(--t-blue, #2D6BCC)" : "#D0DAE4"}`,
                          }}
                        >
                          {isSelected && <Check className="w-3 h-3" style={{ color: "#fff" }} strokeWidth={3} />}
                        </div>

                        {/* Icon tile */}
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: isSelected ? "rgba(255,255,255,0.7)" : "var(--t-surface2, #F4F4F5)" }}
                        >
                          <Icon className="w-4 h-4" style={{ color: isSelected ? "var(--t-blue, #2D6BCC)" : "var(--t-muted, #374151)" }} />
                        </div>

                        {/* Name */}
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--t-text, #1A1D1F)" }}>
                          {method.name}
                        </p>
                      </button>

                      {/* Info icon button — only shown when enabled in admin */}
                      {methodInfoEnabled && (
                        <button
                          type="button"
                          onClick={() => setInfoOpenId(isInfoOpen ? null : method.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors"
                          style={{ background: isInfoOpen ? "rgba(45,107,204,0.12)" : "transparent" }}
                          aria-label="Delivery info"
                        >
                          <Info className="w-4 h-4" style={{ color: isInfoOpen ? "var(--t-blue, #2D6BCC)" : "#9CA3AF" }} />
                        </button>
                      )}

                      {/* Price */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold" style={{ color: isFree ? "#059669" : "var(--t-text, #1A1D1F)" }}>
                          {isFree ? "Free" : formatPrice(method.price)}
                        </p>
                      </div>
                    </div>

                    {/* Expandable info panel */}
                    {methodInfoEnabled && isInfoOpen && (
                      <div className="px-4 pb-3 pt-2" style={{ background: isSelected ? "rgba(45,107,204,0.04)" : "var(--t-surface2, #F8F9FA)", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--t-subtle, #6B7280)" }}>{infoText}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Direct Shipping to Home — separate section, shown when GB has directShippingEnabled */}
          {gbId && directShippingInfo?.enabled && (() => {
            const info = directShippingInfo;
            const isDsSelected = draft.deliveryMethodId === "__direct_shipping";
            const selectDirectShipping = () => {
              draft.setDeliveryMethod("__direct_shipping", "Direct Shipping to Home", 0);
              draft.setDirectShippingRequested(true);
            };

            if (!("tiers" in info) || !info.tiers || !info.tierBounds?.length) {
              return (
                <div className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${isDsSelected ? "var(--t-blue, #2D6BCC)" : "var(--t-border, #E4E4E7)"}`, boxShadow: isDsSelected ? "0 2px 8px rgba(45,107,204,0.13)" : undefined }}>
                  <button
                    type="button"
                    onClick={selectDirectShipping}
                    className="flex items-center gap-3 w-full px-3.5 py-3.5 text-left transition-all"
                    style={{ background: isDsSelected ? "rgba(45,107,204,0.07)" : "var(--t-surface, #fff)" }}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all" style={{ background: isDsSelected ? "var(--t-blue, #2D6BCC)" : "transparent", border: `2px solid ${isDsSelected ? "var(--t-blue, #2D6BCC)" : "#CBD5E1"}` }}>
                      {isDsSelected && <Check className="w-3 h-3" style={{ color: "#fff" }} strokeWidth={3} />}
                    </div>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: isDsSelected ? "var(--t-blue, #2D6BCC)" : "var(--t-surface2, #F1F5F9)" }}>
                      <Home className="w-4 h-4" style={{ color: isDsSelected ? "#fff" : "var(--t-muted, #64748B)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold" style={{ color: "var(--t-text, #1A1D1F)" }}>Direct to Home</p>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(45,107,204,0.1)", color: "var(--t-blue, #2D6BCC)" }}>VENDOR</span>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted, #6B7280)" }}>Contact us for quote</p>
                    </div>
                    <p className="text-sm font-bold shrink-0" style={{ color: "var(--t-muted, #94A3B8)" }}>TBD</p>
                  </button>
                </div>
              );
            }

            const { tiers, tierBounds, maxKitsPerPackage, userRegionName, regions } = info;

            // Total filled kits in the order
            const totalKits = draft.lineItems.reduce((s, item) => item.productId ? s + item.quantity : s, 0);

            // Calculate cost using the same algorithm as the backend
            const calcCost = (prices: number[]): number | null => {
              const getTierIdx = (kits: number) => {
                for (let i = 0; i < tierBounds.length; i++) { if (kits <= tierBounds[i]) return i; }
                return tierBounds.length - 1;
              };
              let remaining = totalKits;
              let total = 0;
              while (remaining > 0) {
                const inPkg = Math.min(remaining, maxKitsPerPackage);
                const idx = getTierIdx(inPkg);
                const p = prices[idx];
                if (p == null) return null;
                total += p;
                remaining -= inPkg;
              }
              return parseFloat(total.toFixed(2));
            };

            // Current tier index for a given kit count (first package)
            const currentTierIdx = (() => {
              const kitsInFirstPkg = Math.min(totalKits || 1, maxKitsPerPackage);
              for (let i = 0; i < tierBounds.length; i++) { if (kitsInFirstPkg <= tierBounds[i]) return i; }
              return tierBounds.length - 1;
            })();

            const userRegion = userRegionName ? regions.find(r => r.name === userRegionName) : null;
            const displayRegions = userRegion ? [userRegion] : regions;
            const showAllToggle = !userRegion && regions.length > 3;
            const visibleRegions = showAllToggle && !showAllDsRegions ? displayRegions.slice(0, 3) : displayRegions;

            const estimatedCost = userRegion?.prices ? calcCost(userRegion.prices) : null;

            return (
              <div className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${isDsSelected ? "var(--t-blue, #2D6BCC)" : "var(--t-border, #E4E4E7)"}`, boxShadow: isDsSelected ? "0 2px 8px rgba(45,107,204,0.13)" : undefined }}>
                {/* Header — clickable radio card */}
                <button
                  type="button"
                  onClick={selectDirectShipping}
                  className="flex items-center gap-3 w-full px-3.5 py-3.5 text-left transition-all"
                  style={{ background: isDsSelected ? "rgba(45,107,204,0.07)" : "var(--t-surface, #fff)", borderBottom: "1px solid rgba(45,107,204,0.10)" }}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all" style={{ background: isDsSelected ? "var(--t-blue, #2D6BCC)" : "transparent", border: `2px solid ${isDsSelected ? "var(--t-blue, #2D6BCC)" : "#CBD5E1"}` }}>
                    {isDsSelected && <Check className="w-3 h-3" style={{ color: "#fff" }} strokeWidth={3} />}
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: isDsSelected ? "var(--t-blue, #2D6BCC)" : "var(--t-surface2, #F1F5F9)" }}>
                    <Home className="w-4 h-4" style={{ color: isDsSelected ? "#fff" : "var(--t-muted, #64748B)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold" style={{ color: "var(--t-text, #1A1D1F)" }}>Direct to Home</p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(45,107,204,0.1)", color: "var(--t-blue, #2D6BCC)" }}>VENDOR</span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted, #6B7280)" }}>Shipped direct by the vendor</p>
                  </div>
                  <p className="text-sm font-bold shrink-0" style={{ color: estimatedCost != null && totalKits > 0 ? "var(--t-text, #1A1D1F)" : "var(--t-muted, #94A3B8)" }}>
                    {estimatedCost != null && totalKits > 0 ? `$${estimatedCost.toFixed(2)}` : "TBD"}
                  </p>
                </button>

                {/* Price table */}
                <div className="px-4 py-3">
                  {/* Tier header row */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left py-1 pr-3 font-semibold" style={{ color: "var(--t-muted, #6B7280)", minWidth: 90 }}>Region</th>
                          {tiers.map((tier, ti) => (
                            <th
                              key={ti}
                              className="text-right py-1 px-2 font-semibold rounded-sm"
                              style={{
                                color: ti === currentTierIdx && totalKits > 0 ? "var(--t-blue)" : "var(--t-muted, #6B7280)",
                                background: ti === currentTierIdx && totalKits > 0 ? "rgba(45,107,204,0.08)" : "transparent",
                                minWidth: 48,
                              }}
                            >
                              {tier}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRegions.map((region, ri) => {
                          const isUser = region.name === userRegionName;
                          return (
                            <tr key={ri} style={{ background: isUser ? "rgba(45,107,204,0.06)" : "transparent" }}>
                              <td className="py-1.5 pr-3 font-medium truncate" style={{ color: isUser ? "var(--t-blue)" : "var(--t-text)", maxWidth: 100 }}>
                                {region.name}{isUser && <span className="ml-1 text-[10px] opacity-60">★</span>}
                              </td>
                              {region.prices ? region.prices.map((price, ti) => (
                                <td
                                  key={ti}
                                  className="text-right py-1.5 px-2 tabular-nums rounded-sm"
                                  style={{
                                    color: ti === currentTierIdx && totalKits > 0 ? "var(--t-blue)" : "var(--t-text)",
                                    fontWeight: ti === currentTierIdx && totalKits > 0 ? 700 : 400,
                                    background: ti === currentTierIdx && totalKits > 0 ? "rgba(45,107,204,0.08)" : "transparent",
                                  }}
                                >
                                  ${price}
                                </td>
                              )) : (
                                <td colSpan={tiers.length} className="text-right py-1.5 px-2 italic" style={{ color: "var(--t-muted, #6B7280)" }}>
                                  {region.priceNote ?? region.customNote ?? "Contact for price"}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {showAllToggle && (
                    <button type="button" onClick={() => setShowAllDsRegions(p => !p)} className="mt-1 text-[11px]" style={{ color: "var(--t-blue)" }}>
                      {showAllDsRegions ? "Show less" : `Show all ${regions.length} regions`}
                    </button>
                  )}

                  {/* Live cost estimate */}
                  {totalKits > 0 && (
                    <div className="mt-3 flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "rgba(45,107,204,0.08)" }}>
                      <p className="text-xs" style={{ color: "var(--t-blue)" }}>
                        Estimated cost for <strong>{totalKits}</strong> kit{totalKits !== 1 ? "s" : ""}
                        {totalKits > maxKitsPerPackage && <span className="opacity-70 ml-1">({Math.ceil(totalKits / maxKitsPerPackage)} packages)</span>}
                      </p>
                      <p className="text-sm font-bold tabular-nums" style={{ color: "var(--t-blue)" }}>
                        {estimatedCost != null ? `$${estimatedCost.toFixed(2)}` : userRegion ? "—" : "Select your country"}
                      </p>
                    </div>
                  )}

                  <p className="mt-2 text-[11px]" style={{ color: "var(--t-muted, #9CA3AF)" }}>
                    Price per package · tiers reset every {maxKitsPerPackage} kits
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Reshipper code input — only shown on delivery step when GB has allowReshipperCode enabled */}
          {gbId && gbAllowReshipperCode && legReshippers.length > 0 && myCountryLeg && (
            <div className="rounded-xl px-4 py-3" style={{ background: "rgba(45,107,204,0.05)", border: "1.5px solid var(--t-blue-25, rgba(45,107,204,0.25))" }}>
              <p className="text-xs font-bold mb-2" style={{ color: "var(--t-blue)" }}>Reshipper Code <span className="font-normal text-muted-foreground">(optional)</span></p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. ALICE2024"
                  value={draft.reshipperCode ?? ""}
                  onChange={e => {
                    draft.setReshipperCode(e.target.value.toUpperCase() || null);
                    setReshipperCodeState("idle");
                    setReshipperCodeMsg("");
                  }}
                  onBlur={e => validateReshipperCode(e.target.value)}
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-mono"
                  style={{
                    background: "var(--t-surface, #fff)",
                    border: reshipperCodeState === "valid" ? "1px solid #22c55e" : reshipperCodeState === "invalid" ? "1px solid #ef4444" : "1px solid var(--t-border, #E4E4E7)",
                    color: "var(--t-text)",
                    outline: "none",
                  }}
                />
                {reshipperCodeState === "validating" && <span className="flex items-center px-2 text-xs text-muted-foreground">…</span>}
              </div>
              {reshipperCodeMsg && (
                <p className="text-xs mt-1.5" style={{ color: reshipperCodeState === "valid" ? "#16a34a" : "#ef4444" }}>{reshipperCodeMsg}</p>
              )}
            </div>
          )}
        </section>

        {(draft.directShippingRequested || !gbId) && (
          <section className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Shipping Details</p>
            <div className="rounded-xl p-4 bg-white border border-gray-100 shadow-sm space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1 block">Full Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  placeholder="Jane Smith"
                  value={draft.shippingName}
                  onChange={e => draft.setShippingName(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-200"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1 block">Street Address <span className="text-red-400">*</span></label>
                <textarea
                  placeholder={"123 Example Street\nCity, Postcode"}
                  value={draft.shippingAddress}
                  onChange={e => draft.setShippingAddress(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-200 resize-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1 block">Country</label>
                <select
                  value={draft.shippingCountry}
                  onChange={e => draft.setShippingCountry(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 text-gray-800 focus:outline-none focus:border-blue-200"
                >
                  <option value="">Select country…</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1 block">Phone</label>
                  <input
                    type="tel"
                    placeholder="+44 7700 900000"
                    value={draft.shippingPhone}
                    onChange={e => draft.setShippingPhone(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1 block">Email</label>
                  <input
                    type="email"
                    placeholder="jane@example.com"
                    value={draft.shippingEmail}
                    onChange={e => draft.setShippingEmail(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm border border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-200"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Additional Notes</p>
          <div className="rounded-xl p-4 bg-white border border-gray-100 shadow-sm">
            <textarea
              className="w-full text-sm resize-none rounded-xl p-3 min-h-[80px] bg-gray-50 border border-gray-200 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-200"
              placeholder="Any special instructions? (Optional)"
              value={draft.notes}
              onChange={(e) => draft.setNotes(e.target.value)}
            />
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Tip</p>
          <button
            type="button"
            onClick={handleTipToggle}
            className="w-full flex items-center justify-between px-4 py-2 rounded-xl border transition-all text-sm font-medium"
            style={{
              borderColor: showTip ? "var(--t-blue-25)" : "#D0DAE4",
              borderStyle: showTip ? "solid" : "dashed",
              background: showTip ? "var(--t-blue-03)" : "transparent",
              color: showTip ? "var(--t-blue)" : "#8A9AAA",
            }}
          >
            <div className="flex items-center gap-1.5">
              <Heart className="w-3 h-3" style={{ color: showTip ? "var(--t-blue)" : "#8A9AAA" }} />
              <span>{showTip ? "Tip added" : "Add a tip?"}</span>
              {!showTip && <span className="text-xs font-normal opacity-70">I've added it only because you wanted it</span>}
            </div>
            <div className="flex items-center gap-1.5">
              {showTip && draft.tip > 0 && (
                <span className="font-bold" style={{ color: "var(--t-blue)" }}>{formatPrice(draft.tip)}</span>
              )}
              <ChevronDown className="w-3 h-3 transition-transform" style={{ transform: showTip ? "rotate(180deg)" : "none" }} />
            </div>
          </button>

          <AnimatePresence>
            {showTip && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="rounded-xl mt-1.5 p-3 overflow-hidden bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-2 italic">I've added it only because you wanted it</p>
                  <div className="relative">
                    <select
                      className="w-full appearance-none h-10 rounded-lg px-4 pr-10 text-sm bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-200"
                      value={draft.tip}
                      onChange={(e) => draft.setTip(parseFloat(e.target.value))}
                    >
                      {TIP_OPTIONS.map(amount => (
                        <option key={amount} value={amount}>
                          {amount === 0 ? "No tip" : formatPrice(amount)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 pointer-events-none text-slate-400" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

      </main>
      {/* Stock levels modal */}
      <AnimatePresence>
        {stockModalOpen && stockViewEnabled && gbCapacity.length > 0 && (() => {
          const MODAL_S = {
            available: { bar: "#10B981", text: "#6EE7B7", label: "In Stock" },
            limited:   { bar: "#F59E0B", text: "#FCD34D", label: "Med"      },
            low:       { bar: "#F97316", text: "#FDBA74", label: "Low"      },
            full:      { bar: "#EF4444", text: "#FCA5A5", label: "OOS"      },
          } as const;
          const FILTER_CHIPS: { key: "available" | "limited" | "low" | "full"; label: string; color: string }[] = [
            { key: "available", label: "In Stock", color: "#6EE7B7" },
            { key: "limited",   label: "Med",      color: "#FCD34D" },
            { key: "low",       label: "Low",      color: "#FDBA74" },
            { key: "full",      label: "OOS",      color: "#FCA5A5" },
          ];
          const q = stockSearch.trim().toLowerCase();
          const enriched = gbCapacity.map(cap => {
            const matchedItem = draft.lineItems.find(li =>
              (li.productName ?? "").trim().toLowerCase() === cap.productName.trim().toLowerCase()
            );
            const myQty = matchedItem?.quantity ?? 0;
            const othersFillPct = cap.stock > 0
              ? Math.min(100, Math.round((cap.totalOrdered / cap.stock) * 100))
              : cap.totalOrdered > 0 ? 100 : 0;
            const myFillPct = cap.stock > 0
              ? Math.min(100 - othersFillPct, Math.round((myQty / cap.stock) * 100))
              : 0;
            const liveFillPct = Math.min(100, othersFillPct + myFillPct);
            const liveStatus: "full" | "low" | "limited" | "available" =
              liveFillPct >= 95 ? "full" : liveFillPct >= 75 ? "low" : liveFillPct >= 50 ? "limited" : "available";
            return { cap, myQty, othersFillPct, myFillPct, liveStatus };
          });
          const visibleItems = enriched.filter(({ cap, liveStatus }) => {
            if (q && !cap.productName.toLowerCase().includes(q)) return false;
            if (stockFilter && liveStatus !== stockFilter) return false;
            return true;
          });
          const closeModal = () => { setStockModalOpen(false); setStockSearch(""); setStockFilter(null); };
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4"
              style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
              onClick={closeModal}
            >
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 32 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "#1C2B3D", border: "1px solid rgba(255,255,255,0.1)", maxHeight: "80vh" }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-2">
                    <BarChart2 className="w-4 h-4" style={{ color: "#E9A020" }} />
                    <span className="text-sm font-bold" style={{ color: "#fff" }}>Stock Levels</span>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="p-1.5 rounded-lg"
                    style={{ color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.06)" }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {/* Search */}
                <div className="px-4 py-2.5 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "rgba(255,255,255,0.3)" }} />
                    <input
                      type="text"
                      value={stockSearch}
                      onChange={e => setStockSearch(e.target.value)}
                      placeholder="Search products…"
                      className="w-full pl-8 pr-3 py-2 rounded-xl text-sm outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                    />
                  </div>
                </div>
                {/* Filter chips */}
                <div className="px-4 py-2 flex items-center gap-2 flex-wrap shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)" }}>
                  <button
                    type="button"
                    onClick={() => setStockFilter(null)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: stockFilter === null ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)",
                      color: stockFilter === null ? "#fff" : "rgba(255,255,255,0.45)",
                      border: `1px solid ${stockFilter === null ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)"}`,
                    }}
                  >All</button>
                  {FILTER_CHIPS.map(({ key, label, color }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStockFilter(stockFilter === key ? null : key)}
                      className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: stockFilter === key ? `${MODAL_S[key].bar}22` : "rgba(255,255,255,0.07)",
                        color: stockFilter === key ? color : "rgba(255,255,255,0.45)",
                        border: `1px solid ${stockFilter === key ? `${MODAL_S[key].bar}55` : "rgba(255,255,255,0.08)"}`,
                      }}
                    >{label}</button>
                  ))}
                </div>
                {/* Items */}
                <div className="overflow-y-auto flex-1">
                  {visibleItems.length === 0 ? (
                    <p className="text-center py-8 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>No products found</p>
                  ) : (
                    <div className="px-5 py-3 space-y-4">
                      {visibleItems.map(({ cap, othersFillPct, myFillPct, liveStatus }) => {
                        const s = MODAL_S[liveStatus];
                        return (
                          <div key={cap.productName}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm font-medium truncate pr-2" style={{ color: "rgba(255,255,255,0.85)" }}>
                                {cap.productName}
                              </span>
                              <span className="text-[11px] font-bold shrink-0" style={{ color: s.text }}>{s.label}</span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.07)" }}>
                              {othersFillPct > 0 && (
                                <div className="h-full transition-all duration-300" style={{ width: `${othersFillPct}%`, background: s.bar, opacity: 0.45 }} />
                              )}
                              {myFillPct > 0 && (
                                <div className="h-full rounded-r-full transition-all duration-300" style={{ width: `${myFillPct}%`, background: s.bar }} />
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.bar, opacity: 0.45 }} />
                                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>GB order</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.bar }} />
                                <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>My order</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="px-5 pb-4 pt-2 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                    Your order shown in full colour · GB order in dim · updates every 30s
                  </p>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Lab tests slide-up popup */}
      <AnimatePresence>
        {labTestsProduct && (
          <LabReportPopup
            productName={labTestsProduct.productName}
            vendor={labTestsProduct.vendor ?? undefined}
            gbLabSupplier={labTestsProduct.gbLabSupplier}
            onClose={() => setLabTestsProduct(null)}
          />
        )}
      </AnimatePresence>
      <div
        className="fixed bottom-0 right-0 z-20 backdrop-blur-xl border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{
          left: isMdPlus ? (sidebarExpanded ? 240 : 56) : 0,
          transition: "left 220ms ease",
          background: "var(--t-surface)",
          borderColor: "var(--t-border)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 pt-3" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
          <div className="flex items-center justify-between gap-4 mb-2">
            {!hideOrderTotal && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--t-subtle)" }}>Grand Total</p>
                <p className="text-xl font-bold truncate" style={{ color: "var(--t-text)" }}>{formatPrice(grandTotal)}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--t-subtle)" }}>
                  {draft.deliveryMethod ? `incl. ${draft.deliveryMethod}` : "Choose a delivery method"}
                  {productSubtotal > 0 && draft.vendorShipping > 0 && ` + ${formatPrice(draft.vendorShipping)} vendor shipping`}
                </p>
              </div>
            )}
            <button
              onClick={handleReview}
              className="h-12 px-7 rounded-xl text-sm font-bold text-white flex items-center gap-2 shrink-0 hover:brightness-110 active:scale-[0.98] transition-all"
              style={{ background: "var(--t-blue-deep)" }}
            >
              Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
    </PageLayout>
  );
}
