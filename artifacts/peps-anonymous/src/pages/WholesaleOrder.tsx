import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ShoppingCart, ArrowRight, Minus, Plus, Truck, Search, Heart, ChevronDown } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useSidebarExpanded } from "@/hooks/use-sidebar-expanded";
import { SiteAnnouncements } from "@/components/SiteAnnouncements";
import { useDraftStore } from "@/hooks/use-draft-store";
import { useAccount } from "@/hooks/use-account";

type StockLevel = "oos" | "low" | "medium" | "high" | "none";

function getStockLevel(stock: number | null | undefined): StockLevel {
  if (stock == null) return "none";
  if (stock <= 0)  return "oos";
  if (stock <= 25) return "low";
  if (stock <= 70) return "medium";
  return "high";
}

const STOCK_META: Record<StockLevel, { label: string; color: string; bg: string; border: string }> = {
  oos:    { label: "Out of Stock",  color: "#ef4444", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.25)"  },
  low:    { label: "Low Stock",     color: "#f97316", bg: "rgba(249,115,22,0.10)", border: "rgba(249,115,22,0.25)" },
  medium: { label: "In Stock",      color: "#eab308", bg: "rgba(234,179,8,0.10)",  border: "rgba(234,179,8,0.25)"  },
  high:   { label: "Well Stocked",  color: "#22c55e", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.25)"  },
  none:   { label: "—",             color: "var(--t-muted)", bg: "transparent", border: "transparent" },
};

interface ProductWithMeta {
  id: string;
  name: string;
  price: number;
  category?: string | null;
  mgSize?: string | null;
  active?: boolean;
  wholesaleEnabled?: boolean;
  stock?: number | null;
  lowStockThreshold?: number | null;
}

interface WholesaleVendorRegion {
  name: string;
  prices?: number[];
  priceNote?: string;
  customNote?: string;
  countries?: string[];
}

interface WholesaleVendor {
  id: string;
  name: string;
  tiers: string[];
  regions: WholesaleVendorRegion[];
  maxKitsPerPackage?: number;
  tierBounds?: number[];
}

export default function WholesaleOrder() {
  const [, setLocation] = useLocation();
  const { account, isLoading: accountLoading } = useAccount();

  const [products, setProducts] = useState<ProductWithMeta[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [productSearch, setProductSearch] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCountry, setShippingCountry] = useState("");
  const [tip, setTip] = useState<number>(0);
  const [showTip, setShowTip] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState<string | null>(null);
  const [vendor, setVendor] = useState<WholesaleVendor | null>(null);
  const [vendorLoading, setVendorLoading] = useState(true);
  const [selectedRegionIdx, setSelectedRegionIdx] = useState<number | null>(null);
  const [regionAutoSelected, setRegionAutoSelected] = useState(false);

  useEffect(() => {
    if (!accountLoading && (!account || !account.isWholesale)) {
      setLocation("/");
    }
  }, [accountLoading, account, setLocation]);

  useEffect(() => {
    if (account?.telegramUsername) {
      setTelegramUsername(account.telegramUsername.replace(/^@/, ""));
    }
  }, [account]);

  const draftInitialised = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore draft on mount: edit/reorder sessionStorage keys take priority, then DB draft
  useEffect(() => {
    const editRaw = sessionStorage.getItem("peps:edit-wholesale");
    const reorderRaw = sessionStorage.getItem("peps:reorder-wholesale");

    if (editRaw) {
      try {
        const d = JSON.parse(editRaw);
        if (d.quantities) setQuantities(d.quantities);
        setFullName(d.fullName ?? "");
        setPhone(d.phone ?? "");
        setEmail(d.email ?? "");
        setShippingAddress(d.shippingAddress ?? "");
        setShippingCountry(d.shippingCountry ?? "");
        if (d.notes != null) setNotes(d.notes);
        if (d.tip != null) setTip(d.tip);
        if (d.orderId) setEditOrderId(d.orderId);
        if (d.code) setEditCode(d.code);
      } catch { }
      sessionStorage.removeItem("peps:edit-wholesale");
      draftInitialised.current = true;
    } else if (reorderRaw) {
      try {
        const parsed: Record<string, number> = JSON.parse(reorderRaw);
        setQuantities(parsed);
      } catch { }
      sessionStorage.removeItem("peps:reorder-wholesale");
      draftInitialised.current = true;
    } else {
      // Load from DB
      fetch("/api/account/wholesale-draft", { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          const d = data?.draft;
          if (d) {
            if (d.quantities) setQuantities(d.quantities as Record<string, number>);
            if (d.fullName) setFullName(d.fullName as string);
            if (d.phone) setPhone(d.phone as string);
            if (d.email) setEmail(d.email as string);
            if (d.shippingAddress) setShippingAddress(d.shippingAddress as string);
            if (d.shippingCountry) setShippingCountry(d.shippingCountry as string);
            if (d.notes != null) setNotes(d.notes as string);
            if (d.tip != null) setTip(d.tip as number);
            if (d.editOrderId) setEditOrderId(d.editOrderId as string);
            if (d.editCode) setEditCode(d.editCode as string);
          }
        })
        .catch(() => {})
        .finally(() => { draftInitialised.current = true; });
    }
  }, []);

  // Auto-save to DB (debounced 1.5 s) whenever form fields change
  useEffect(() => {
    if (!draftInitialised.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/account/wholesale-draft", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: { quantities, fullName, phone, email, shippingAddress, shippingCountry, notes, tip, editOrderId, editCode },
        }),
      }).catch(() => {});
    }, 1500);
  }, [quantities, fullName, phone, email, shippingAddress, shippingCountry, notes, tip, editOrderId, editCode]);

  useEffect(() => {
    if (!vendor || !shippingCountry) return;
    const normalised = shippingCountry.trim().toLowerCase();
    const matchIdx = vendor.regions.findIndex(r =>
      (r.countries ?? []).some(c => c.trim().toLowerCase() === normalised)
    );
    if (matchIdx !== -1) {
      setSelectedRegionIdx(matchIdx);
      setRegionAutoSelected(true);
    } else {
      setRegionAutoSelected(false);
    }
  }, [shippingCountry, vendor]);

  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    setProductsLoading(true);
    fetch("/api/wholesale/products")
      .then(r => r.ok ? r.json() : [])
      .then(d => setProducts(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setProductsLoading(false));

    fetch("/api/wholesale-vendor")
      .then(r => r.ok ? r.json() : null)
      .then(d => setVendor(d))
      .catch(() => {})
      .finally(() => setVendorLoading(false));
    fetch("/api/config")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setPageMessage(d.wholesalePageMessage ?? null);
          setRequiresApproval(d.wholesaleRequiresApproval ?? false);
        }
      })
      .catch(() => {});
  }, []);

  if (accountLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-muted)" }} />
        </div>
      </PageLayout>
    );
  }

  if (!account || !account.isWholesale) return null;

  const activeProducts = products.filter(p => p.active !== false);

  const setQty = (id: string, val: number) => {
    const rounded = Math.round(val);
    setQuantities(prev => {
      if (rounded <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: rounded };
    });
  };

  const lineItems = activeProducts
    .filter(p => (quantities[p.id] ?? 0) > 0)
    .map(p => ({
      productId: p.id,
      productName: p.name,
      quantity: quantities[p.id],
      unitPrice: p.price,
      lineTotal: parseFloat((p.price * quantities[p.id]).toFixed(2)),
    }));

  const productSubtotal = parseFloat(lineItems.reduce((s, i) => s + i.lineTotal, 0).toFixed(2));
  const totalKits = lineItems.reduce((s, i) => s + i.quantity, 0);

  const getTierIndex = (kits: number, tierBounds: number[]): number => {
    for (let i = 0; i < tierBounds.length; i++) {
      if (kits <= tierBounds[i]) return i;
    }
    return tierBounds.length - 1;
  };

  const calcPackageShipping = (kits: number, region: WholesaleVendorRegion): number | null => {
    if (!vendor || region.customNote || region.priceNote || !region.prices) return null;
    const bounds: number[] = vendor.tierBounds ?? vendor.tiers.map((_: string, i: number) => (i + 1) * 5);
    const tierIdx = getTierIndex(kits, bounds);
    return region.prices[tierIdx] ?? null;
  };

  const calcTotalShipping = (kits: number, region: WholesaleVendorRegion): number | null => {
    if (!vendor || region.customNote || region.priceNote || !region.prices) return null;
    const maxPkg: number = vendor.maxKitsPerPackage ?? 25;
    let remaining = kits;
    let total = 0;
    while (remaining > 0) {
      const inThisPackage = Math.min(remaining, maxPkg);
      const price = calcPackageShipping(inThisPackage, region);
      if (price === null) return null;
      total += price;
      remaining -= inThisPackage;
    }
    return total;
  };

  const selectedRegion = vendor && selectedRegionIdx !== null ? vendor.regions[selectedRegionIdx] ?? null : null;
  const computedVendorShipping = (vendor && selectedRegion && totalKits > 0)
    ? calcTotalShipping(totalKits, selectedRegion)
    : null;

  const handleReview = () => {
    setError("");
    if (!telegramUsername.trim()) { setError("Please enter your Telegram username."); return; }
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (!phone.trim()) { setError("Please enter your phone number."); return; }
    if (!shippingAddress.trim()) { setError("Please enter your shipping address."); return; }
    if (!shippingCountry.trim()) { setError("Please select your shipping country."); return; }
    if (lineItems.length === 0) { setError("Add at least one item to your order."); return; }
    if (vendorLoading) { setError("Shipping configuration is still loading — please wait a moment and try again."); return; }
    if (vendor && selectedRegionIdx === null) { setError("Please select your shipping region."); return; }

    const generateId = () => Math.random().toString(36).substring(2, 9);

    useDraftStore.setState({
      orderId: editOrderId,
      code: editCode,
      groupBuyId: null,
      orderType: "wholesale",
      telegramUsername: `@${telegramUsername.trim().replace(/^@/, "")}`,
      deliveryMethodId: null,
      deliveryMethod: "Vendor Shipping",
      deliveryPrice: 0,
      vendorShipping: computedVendorShipping ?? 0,
      tip: tip,
      notes: [
        notes,
        selectedRegion ? `Shipping region: ${selectedRegion.name}` : "",
      ].filter(Boolean).join("\n"),
      isTopUp: false,
      testingContribution: 0,
      shippingName: fullName.trim(),
      shippingPhone: phone.trim(),
      shippingEmail: email.trim(),
      shippingAddress: shippingAddress.trim(),
      shippingCountry: shippingCountry.trim(),
      lineItems: lineItems.map(item => ({
        id: generateId(),
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    });

    // Clear DB draft now that the order is proceeding to review
    fetch("/api/account/wholesale-draft", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: null }),
    }).catch(() => {});
    setLocation("/review");
  };

  const searchQ = productSearch.trim().toLowerCase();
  const visibleProducts = searchQ
    ? activeProducts.filter(p => p.name.toLowerCase().includes(searchQ))
    : activeProducts;

  const categoryGroups = visibleProducts.reduce<Record<string, ProductWithMeta[]>>((acc, p) => {
    const cat = p.category ?? "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const isLoading = productsLoading;

  return (
    <PageLayout>
      <div style={{ background: "var(--t-bg)", minHeight: "100%" }}>
        <SiteAnnouncements />
        <main className="px-4 py-5 pb-36 max-w-3xl mx-auto w-full space-y-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            <div className="space-y-1">
              <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>Wholesale Order</h1>
              <p className="text-sm" style={{ color: "var(--t-muted)" }}>
                {requiresApproval
                  ? "Submit your order for admin review. Once approved, you will receive payment instructions."
                  : "Select products and quantities, then proceed to review."}
              </p>
            </div>

            {pageMessage && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "color-mix(in srgb, var(--t-blue) 8%, var(--t-surface))", border: "1px solid color-mix(in srgb, var(--t-blue) 25%, transparent)", color: "var(--t-text)" }}>
                <p className="whitespace-pre-wrap leading-relaxed">{pageMessage}</p>
              </div>
            )}

            {/* Customer section */}
            <section className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Customer</p>
              <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Telegram Username</label>
                  <div className="flex items-center gap-2 h-10 px-3 rounded-lg border text-sm" style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)" }}>
                    <span style={{ color: "var(--t-muted)" }}>@</span>
                    <input
                      type="text"
                      value={telegramUsername}
                      onChange={e => setTelegramUsername(e.target.value)}
                      placeholder="username"
                      className="flex-1 bg-transparent outline-none"
                      style={{ color: "var(--t-text)" }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="e.g. Jane Smith"
                      className="w-full h-10 px-3 rounded-lg border text-sm bg-transparent outline-none"
                      style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. +44 7700 000000"
                      className="w-full h-10 px-3 rounded-lg border text-sm bg-transparent outline-none"
                      style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Email Address <span style={{ fontWeight: 400 }}>(optional)</span></label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="e.g. jane@example.com"
                      className="w-full h-10 px-3 rounded-lg border text-sm bg-transparent outline-none"
                      style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Shipping Address</label>
                  <textarea
                    value={shippingAddress}
                    onChange={e => setShippingAddress(e.target.value)}
                    placeholder={"Street address, city, postcode…"}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent outline-none resize-none"
                    style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Country</label>
                  <select
                    value={shippingCountry}
                    onChange={e => setShippingCountry(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
                    style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)", color: shippingCountry ? "var(--t-text)" : "var(--t-muted)" }}
                  >
                    <option value="">Select country…</option>
                    <optgroup label="Common">
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Netherlands">Netherlands</option>
                      <option value="Spain">Spain</option>
                      <option value="Italy">Italy</option>
                      <option value="Sweden">Sweden</option>
                      <option value="Norway">Norway</option>
                      <option value="Denmark">Denmark</option>
                      <option value="Finland">Finland</option>
                      <option value="Poland">Poland</option>
                      <option value="Belgium">Belgium</option>
                      <option value="Switzerland">Switzerland</option>
                      <option value="Austria">Austria</option>
                      <option value="Portugal">Portugal</option>
                      <option value="Ireland">Ireland</option>
                      <option value="New Zealand">New Zealand</option>
                    </optgroup>
                    <optgroup label="Europe">
                      <option value="Albania">Albania</option>
                      <option value="Andorra">Andorra</option>
                      <option value="Belarus">Belarus</option>
                      <option value="Bosnia and Herzegovina">Bosnia and Herzegovina</option>
                      <option value="Bulgaria">Bulgaria</option>
                      <option value="Croatia">Croatia</option>
                      <option value="Cyprus">Cyprus</option>
                      <option value="Czech Republic">Czech Republic</option>
                      <option value="Estonia">Estonia</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Greece">Greece</option>
                      <option value="Hungary">Hungary</option>
                      <option value="Iceland">Iceland</option>
                      <option value="Kosovo">Kosovo</option>
                      <option value="Latvia">Latvia</option>
                      <option value="Liechtenstein">Liechtenstein</option>
                      <option value="Lithuania">Lithuania</option>
                      <option value="Luxembourg">Luxembourg</option>
                      <option value="Malta">Malta</option>
                      <option value="Moldova">Moldova</option>
                      <option value="Monaco">Monaco</option>
                      <option value="Montenegro">Montenegro</option>
                      <option value="North Macedonia">North Macedonia</option>
                      <option value="Romania">Romania</option>
                      <option value="Russia">Russia</option>
                      <option value="San Marino">San Marino</option>
                      <option value="Serbia">Serbia</option>
                      <option value="Slovakia">Slovakia</option>
                      <option value="Slovenia">Slovenia</option>
                      <option value="Turkey">Turkey</option>
                      <option value="Ukraine">Ukraine</option>
                    </optgroup>
                    <optgroup label="Americas">
                      <option value="Argentina">Argentina</option>
                      <option value="Bolivia">Bolivia</option>
                      <option value="Brazil">Brazil</option>
                      <option value="Chile">Chile</option>
                      <option value="Colombia">Colombia</option>
                      <option value="Costa Rica">Costa Rica</option>
                      <option value="Cuba">Cuba</option>
                      <option value="Dominican Republic">Dominican Republic</option>
                      <option value="Ecuador">Ecuador</option>
                      <option value="El Salvador">El Salvador</option>
                      <option value="Guatemala">Guatemala</option>
                      <option value="Honduras">Honduras</option>
                      <option value="Jamaica">Jamaica</option>
                      <option value="Mexico">Mexico</option>
                      <option value="Nicaragua">Nicaragua</option>
                      <option value="Panama">Panama</option>
                      <option value="Paraguay">Paraguay</option>
                      <option value="Peru">Peru</option>
                      <option value="Trinidad and Tobago">Trinidad and Tobago</option>
                      <option value="Uruguay">Uruguay</option>
                      <option value="Venezuela">Venezuela</option>
                    </optgroup>
                    <optgroup label="Asia Pacific">
                      <option value="Bangladesh">Bangladesh</option>
                      <option value="Cambodia">Cambodia</option>
                      <option value="China">China</option>
                      <option value="Hong Kong">Hong Kong</option>
                      <option value="India">India</option>
                      <option value="Indonesia">Indonesia</option>
                      <option value="Japan">Japan</option>
                      <option value="Malaysia">Malaysia</option>
                      <option value="Myanmar">Myanmar</option>
                      <option value="Pakistan">Pakistan</option>
                      <option value="Philippines">Philippines</option>
                      <option value="Singapore">Singapore</option>
                      <option value="South Korea">South Korea</option>
                      <option value="Sri Lanka">Sri Lanka</option>
                      <option value="Taiwan">Taiwan</option>
                      <option value="Thailand">Thailand</option>
                      <option value="Vietnam">Vietnam</option>
                    </optgroup>
                    <optgroup label="Middle East &amp; Africa">
                      <option value="Egypt">Egypt</option>
                      <option value="Ethiopia">Ethiopia</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Israel">Israel</option>
                      <option value="Jordan">Jordan</option>
                      <option value="Kenya">Kenya</option>
                      <option value="Kuwait">Kuwait</option>
                      <option value="Lebanon">Lebanon</option>
                      <option value="Morocco">Morocco</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="Qatar">Qatar</option>
                      <option value="Saudi Arabia">Saudi Arabia</option>
                      <option value="South Africa">South Africa</option>
                      <option value="Tunisia">Tunisia</option>
                      <option value="United Arab Emirates">United Arab Emirates</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--t-muted)" }}>Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Any special instructions…"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent outline-none resize-none"
                    style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                  />
                </div>
              </div>
            </section>

            {/* Tip Section */}
            <section className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Tip</p>
              <button
                type="button"
                onClick={() => {
                  if (showTip) { setTip(0); }
                  setShowTip(prev => !prev);
                }}
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
                  {!showTip && <span className="text-xs font-normal opacity-70">Support the team</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  {showTip && tip > 0 && (
                    <span className="font-bold" style={{ color: "var(--t-blue)" }}>${tip.toFixed(2)}</span>
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
                      <p className="text-xs text-slate-500 mb-2 italic">Optional — 100% appreciated</p>
                      <div className="relative">
                        <select
                          className="w-full appearance-none h-10 rounded-lg px-4 pr-10 text-sm bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-200"
                          value={tip}
                          onChange={e => setTip(parseFloat(e.target.value))}
                        >
                          {[0, 2, 5, 10, 15, 20].map(amount => (
                            <option key={amount} value={amount}>
                              {amount === 0 ? "No tip" : `$${amount}`}
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

            {/* Vendor Shipping Section */}
            {vendor && (
              <section className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Truck className="w-3.5 h-3.5" style={{ color: "#8A9AAA" }} />
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>
                    Vendor Shipping — {vendor.name}
                  </p>
                </div>

                {/* Region selector */}
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--t-border)" }}>
                  <div className="px-4 py-3" style={{ background: "var(--t-surface2)", borderBottom: "1px solid var(--t-border)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>Select your shipping region</p>
                      {regionAutoSelected && selectedRegionIdx !== null && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--t-blue) 10%, transparent)", color: "var(--t-blue)" }}>
                          Auto-selected
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {vendor.regions.map((region, ri) => {
                        const isSelected = selectedRegionIdx === ri;
                        return (
                          <button
                            key={ri}
                            onClick={() => {
                              setSelectedRegionIdx(isSelected ? null : ri);
                              setRegionAutoSelected(false);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                            style={
                              isSelected
                                ? { background: "var(--t-blue-08)", borderColor: "var(--t-blue)", color: "var(--t-blue-deep)" }
                                : { background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-muted)" }
                            }
                          >
                            {region.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pricing table */}
                  <div
                    className="grid text-[10px] font-bold uppercase tracking-widest px-3 py-2"
                    style={{
                      gridTemplateColumns: `1fr repeat(${vendor.tiers.length}, minmax(0,1fr))${totalKits > 0 && selectedRegionIdx !== null ? " 80px" : ""}`,
                      background: "var(--t-surface2)",
                      borderBottom: "1px solid var(--t-border)",
                      color: "var(--t-subtle)",
                    }}
                  >
                    <span>Region</span>
                    {vendor.tiers.map((t, i) => {
                      const bounds: number[] = vendor.tierBounds ?? vendor.tiers.map((_: string, j: number) => (j + 1) * 5);
                      const maxPkg: number = vendor.maxKitsPerPackage ?? 25;
                      const isActive = totalKits > 0 && getTierIndex(Math.min(totalKits, maxPkg), bounds) === i;
                      return (
                        <span key={i} className="text-center" style={{ color: isActive ? "var(--t-blue-deep)" : undefined, fontWeight: isActive ? 800 : undefined }}>
                          {t}
                        </span>
                      );
                    })}
                    {totalKits > 0 && selectedRegionIdx !== null && <span className="text-center" style={{ color: "var(--t-blue-deep)" }}>Your Total</span>}
                  </div>
                  {vendor.regions.map((region, ri) => {
                    const bounds: number[] = vendor.tierBounds ?? vendor.tiers.map((_: string, j: number) => (j + 1) * 5);
                    const maxPkg: number = vendor.maxKitsPerPackage ?? 25;
                    const tierIndex = totalKits > 0 ? getTierIndex(Math.min(totalKits, maxPkg), bounds) : -1;
                    const totalShipping = totalKits > 0 && selectedRegionIdx === ri ? calcTotalShipping(totalKits, region) : null;
                    const isSelectedRow = selectedRegionIdx === ri;
                    return (
                      <div
                        key={ri}
                        className="grid items-start px-3 py-2.5 text-xs"
                        style={{
                          gridTemplateColumns: `1fr repeat(${vendor.tiers.length}, minmax(0,1fr))${totalKits > 0 && selectedRegionIdx !== null ? " 80px" : ""}`,
                          borderTop: ri === 0 ? undefined : "1px solid var(--t-border)",
                          background: isSelectedRow ? "color-mix(in srgb, var(--t-blue) 5%, var(--t-surface))" : "var(--t-surface)",
                        }}
                      >
                        <span className="font-semibold pr-2 leading-snug" style={{ color: isSelectedRow ? "var(--t-blue-deep)" : "var(--t-text)" }}>{region.name}</span>
                        {region.customNote ? (
                          <span className="col-span-full mt-1 text-[11px] leading-relaxed" style={{ color: "var(--t-muted)", whiteSpace: "pre-line" }}>
                            {region.customNote}
                          </span>
                        ) : region.priceNote ? (
                          <span className="col-span-full text-center font-semibold" style={{ color: "var(--t-muted)" }}>{region.priceNote}</span>
                        ) : (
                          <>
                            {vendor.tiers.map((_, ti) => {
                              const price = region.prices?.[ti];
                              const isActive = tierIndex === ti;
                              return (
                                <span key={ti} className="text-center font-semibold" style={{ color: isActive ? "var(--t-blue-deep)" : "var(--t-muted)", fontWeight: isActive ? 800 : 600 }}>
                                  {price != null ? `$${price}` : "—"}
                                </span>
                              );
                            })}
                            {totalKits > 0 && selectedRegionIdx !== null && (
                              <span className="text-center font-bold" style={{ color: isSelectedRow ? "var(--t-blue-deep)" : "var(--t-subtle)" }}>
                                {totalShipping != null ? `$${totalShipping}` : "—"}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {vendor && selectedRegionIdx !== null && totalKits > 0 && (() => {
                  const maxPkg: number = vendor.maxKitsPerPackage ?? 25;
                  const packages = Math.ceil(totalKits / maxPkg);
                  return packages > 1 ? (
                    <p className="text-[11px] px-1 font-medium" style={{ color: "var(--t-blue-deep)" }}>
                      ℹ️ Your order of {totalKits} kits spans {packages} packages (max {maxPkg}/package). Shipping is summed across all packages.
                    </p>
                  ) : null;
                })()}
                <p className="text-[11px] px-1" style={{ color: "var(--t-muted)" }}>
                  Vendor shipping is charged separately based on your total kit quantity. Prices shown in USD.
                </p>
              </section>
            )}

            {/* Products section */}
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8A9AAA" }}>Products</p>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--t-muted)" }} />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search products…"
                    className="w-full h-8 pl-8 pr-3 rounded-lg text-xs outline-none border"
                    style={{ background: "var(--t-surface2)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                  />
                </div>
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2 py-4 px-1" style={{ color: "var(--t-muted)" }}>
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading products…
                </div>
              ) : activeProducts.length === 0 ? (
                <div className="px-4 py-8 text-center rounded-xl" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                  <p className="text-sm" style={{ color: "var(--t-muted)" }}>No products available for wholesale ordering at this time.</p>
                </div>
              ) : Object.keys(categoryGroups).length === 0 ? (
                <div className="px-4 py-8 text-center rounded-xl" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                  <p className="text-sm" style={{ color: "var(--t-muted)" }}>No products match your search.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(categoryGroups).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
                    <div key={category}>
                      <p className="text-[11px] font-semibold uppercase tracking-widest mb-2 px-1" style={{ color: "var(--t-subtle)" }}>
                        {category}
                      </p>
                      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--t-border)" }}>
                        <div
                          className="grid grid-cols-[1fr_72px_124px] sm:grid-cols-[1fr_80px_80px_130px] text-[10px] font-semibold uppercase tracking-widest px-3 sm:px-4 py-2"
                          style={{
                            background: "var(--t-surface2)",
                            color: "var(--t-subtle)",
                            borderBottom: "1px solid var(--t-border)",
                          }}
                        >
                          <span>Product &amp; Stock</span>
                          <span className="text-right pr-3">Size</span>
                          <span className="text-right pr-3">Unit Price</span>
                          <span className="text-center">Qty</span>
                        </div>
                        {items.map((product, idx) => {
                          const qty = quantities[product.id] ?? 0;
                          const currentStock = product.stock ?? null;
                          const currentLevel = getStockLevel(currentStock);
                          const isOos = currentLevel === "oos";
                          const afterStock = currentStock != null ? Math.max(0, currentStock - qty) : null;
                          const afterLevel = qty > 0 && afterStock != null ? getStockLevel(afterStock) : currentLevel;
                          const displayMeta = STOCK_META[afterLevel];
                          const hasStockInfo = currentLevel !== "none";
                          // Bar fill: scale relative to 100 units (matches thresholds: 0/25/70/100)
                          const fillPct = hasStockInfo
                            ? Math.min(Math.max(afterStock ?? currentStock ?? 0, 0) / 100, 1) * 100
                            : 0;
                          return (
                            <div
                              key={product.id}
                              className="grid items-center grid-cols-[1fr_72px_124px] sm:grid-cols-[1fr_80px_80px_130px] px-3 sm:px-4 py-3"
                              style={{
                                background: isOos
                                  ? "var(--t-surface)"
                                  : qty > 0
                                  ? "color-mix(in srgb, var(--t-blue) 5%, var(--t-surface))"
                                  : "var(--t-surface)",
                                borderTop: idx === 0 ? undefined : "1px solid var(--t-border)",
                                opacity: isOos ? 0.55 : 1,
                              }}
                            >
                              <div className="min-w-0 pr-2 sm:pr-3 space-y-1.5">
                                <p className="text-sm font-semibold break-words" style={{ color: "var(--t-text)" }}>
                                  {product.name}
                                </p>
                                {/* Stock bar */}
                                {hasStockInfo && (
                                  <div className="space-y-0.5 max-w-[160px]">
                                    <div
                                      className="h-[3px] rounded-full overflow-hidden"
                                      style={{ background: "var(--t-border)" }}
                                    >
                                      <div
                                        className="h-full rounded-full transition-all duration-300"
                                        style={{ width: `${fillPct}%`, background: displayMeta.color }}
                                      />
                                    </div>
                                    <p className="text-[10px] font-semibold" style={{ color: displayMeta.color }}>
                                      {isOos ? "Out of Stock" : displayMeta.label}
                                    </p>
                                  </div>
                                )}
                                {/* Line total */}
                                {qty > 0 && (
                                  <p className="text-xs font-semibold" style={{ color: "var(--t-blue)" }}>
                                    = ${(product.price * qty).toFixed(2)}
                                  </p>
                                )}
                              </div>
                              <div className="hidden sm:block text-right pr-3">
                                <span className="text-xs" style={{ color: "var(--t-muted)" }}>
                                  {product.mgSize ?? "—"}
                                </span>
                              </div>
                              <div className="text-right pr-2 sm:pr-3 min-w-0">
                                <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>
                                  ${product.price.toFixed(2)}
                                </span>
                                {/* Size shown inline on mobile (column hidden) */}
                                {product.mgSize && (
                                  <p className="sm:hidden text-[10px] mt-0.5" style={{ color: "var(--t-subtle)" }}>
                                    {product.mgSize}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 justify-center">
                                <button
                                  onClick={() => setQty(product.id, qty - 1)}
                                  disabled={qty === 0}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 shrink-0"
                                  style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}
                                >
                                  <Minus className="w-3 h-3" style={{ color: "var(--t-muted)" }} />
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={qty === 0 ? "" : qty}
                                  onChange={e => {
                                    const v = parseInt(e.target.value, 10);
                                    setQty(product.id, isNaN(v) ? 0 : Math.max(0, v));
                                  }}
                                  placeholder="0"
                                  className="w-14 h-7 text-center rounded-lg text-sm font-semibold outline-none border"
                                  style={{
                                    background: "var(--t-surface2)",
                                    borderColor: "var(--t-border)",
                                    color: "var(--t-text)",
                                  }}
                                />
                                <button
                                  onClick={() => setQty(product.id, qty + 1)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0"
                                  style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}
                                >
                                  <Plus className="w-3 h-3" style={{ color: "var(--t-muted)" }} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

          </motion.div>
        </main>

        <TotalBarShell>
          <div className="max-w-3xl mx-auto px-4 pt-3 pb-4">
            {(() => {
              const lowItems = lineItems.filter(li => {
                const p = activeProducts.find(x => x.id === li.productId);
                return getStockLevel(p?.stock) === "low";
              });
              if (lowItems.length === 0) return null;
              return (
                <div className="mb-2 px-3 py-2 rounded-lg text-xs flex items-start gap-2"
                  style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", color: "#f97316" }}>
                  <span className="mt-px">⚠</span>
                  <span>{lowItems.length} item{lowItems.length !== 1 ? "s" : ""} in your order {lowItems.length !== 1 ? "have" : "has"} low stock — order soon to avoid delays.</span>
                </div>
              );
            })()}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                  {lineItems.length === 0
                    ? "No items selected"
                    : `${lineItems.length} product${lineItems.length !== 1 ? "s" : ""} · ${totalKits} kit${totalKits !== 1 ? "s" : ""}`}
                </p>
                {productSubtotal > 0 && (
                  <div>
                    <p className="text-lg font-bold" style={{ color: "var(--t-text)" }}>
                      ${productSubtotal.toFixed(2)}
                    </p>
                    {computedVendorShipping !== null && (
                      <p className="text-xs font-medium" style={{ color: "var(--t-muted)" }}>
                        + ${computedVendorShipping.toFixed(2)} vendor shipping ({selectedRegion?.name})
                      </p>
                    )}
                    {vendor && selectedRegionIdx === null && totalKits > 0 && (
                      <p className="text-xs" style={{ color: "#F24908" }}>Select a shipping region above</p>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={handleReview}
                disabled={lineItems.length === 0}
                className="flex items-center gap-2 h-12 px-6 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 active:scale-[0.98]"
                style={{ background: "var(--t-blue)" }}
              >
                <ShoppingCart className="w-4 h-4" />
                Review Order
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </TotalBarShell>
      </div>
    </PageLayout>
  );
}

function TotalBarShell({ children }: { children: React.ReactNode }) {
  const expanded = useSidebarExpanded();
  return (
    <div
      className="fixed bottom-0 right-0 backdrop-blur-xl border-t z-20 transition-[left] duration-200"
      style={{
        background: "var(--t-surface)",
        borderColor: "var(--t-border)",
        left: typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches
          ? (expanded ? 264 : 64)
          : 0,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {children}
    </div>
  );
}
