import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Globe2, Loader2, Package, RefreshCw, Search, Users } from "lucide-react";

type RegionKey = "UK" | "EU" | "ROW" | "UNKNOWN";

interface BreakdownOrder {
  id: string;
  code: string;
  telegramUsername: string;
  accountCountry: string;
  quantity: number;
  lineTotal: number;
  paymentStatus: string;
}

interface BreakdownProduct {
  productId: string;
  productName: string;
  orderCount: number;
  kitCount: number;
  subtotal: number;
  orders: BreakdownOrder[];
}

interface BreakdownCountry {
  key: string;
  label: string;
  orderCount: number;
  kitCount: number;
  subtotal: number;
  products: BreakdownProduct[];
}

interface BreakdownRegion {
  key: RegionKey;
  label: string;
  orderCount: number;
  kitCount: number;
  subtotal: number;
  countries: BreakdownCountry[];
}

interface BreakdownResponse {
  regions: BreakdownRegion[];
  filters: {
    regions: { key: RegionKey; label: string }[];
    countries: { key: string; label: string; region: RegionKey }[];
    products: { productId: string; productName: string }[];
  };
}

const EMPTY_RESPONSE: BreakdownResponse = { regions: [], filters: { regions: [], countries: [], products: [] } };

function paymentLabel(status: string) {
  return status === "confirmed" || status === "paid" || status === "test_confirmed" ? "Paid" : "Unpaid";
}

export function GroupBuyOrderBreakdown({
  endpoint,
  currency,
  headers,
  onOpenOrder,
}: {
  endpoint: string;
  currency: string;
  headers?: HeadersInit;
  onOpenOrder?: (orderId: string, orderCode: string) => void;
}) {
  const [data, setData] = useState<BreakdownResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [region, setRegion] = useState("all");
  const [country, setCountry] = useState("all");
  const [productId, setProductId] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (paymentStatus !== "all") params.set("paymentStatus", paymentStatus);
    if (region !== "all") params.set("region", region);
    if (country !== "all") params.set("country", country);
    if (productId !== "all") params.set("productId", productId);
    if (search.trim()) params.set("search", search.trim());
    return params.toString();
  }, [country, paymentStatus, productId, region, search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${endpoint}${query ? `?${query}` : ""}`, { credentials: "include", headers });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load the breakdown");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the breakdown");
    } finally {
      setLoading(false);
    }
  }, [endpoint, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const toggle = (key: string) => setExpanded(previous => {
    const next = new Set(previous);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const fmtMoney = (value: number) => `${currency} ${value.toFixed(2)}`;
  const rowMeta = (orders: number, kits: number, subtotal: number) =>
    `${orders} order${orders === 1 ? "" : "s"} · ${kits} kit${kits === 1 ? "" : "s"} · ${fmtMoney(subtotal)}`;

  return (
    <section className="rounded-xl overflow-hidden" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
      <div className="p-4 flex flex-col gap-3" style={{ borderBottom: "1px solid var(--t-border)" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Globe2 className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
              <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Country & Product Breakdown</h3>
            </div>
            <p className="text-[11px] mt-1" style={{ color: "var(--t-muted)" }}>
              Account country → product → customer orders. Totals update with the filters below.
            </p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="p-2 rounded-lg" style={{ color: "var(--t-muted)", background: "var(--t-surface2)" }} title="Refresh breakdown">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <label className="relative lg:col-span-1">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5" style={{ color: "var(--t-muted)" }} />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Order or customer" className="w-full h-9 rounded-lg pl-8 pr-2 text-xs" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }} />
          </label>
          <select value={paymentStatus} onChange={event => setPaymentStatus(event.target.value)} className="h-9 rounded-lg px-2 text-xs" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
            <option value="all">All payments</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option>
          </select>
          <select value={region} onChange={event => { setRegion(event.target.value); setCountry("all"); }} className="h-9 rounded-lg px-2 text-xs" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
            <option value="all">All regions</option>
            {data.filters.regions.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
          <select value={country} onChange={event => setCountry(event.target.value)} className="h-9 rounded-lg px-2 text-xs" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
            <option value="all">All countries</option>
            {data.filters.countries.filter(option => region === "all" || option.region === region).map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
          <select value={productId} onChange={event => setProductId(event.target.value)} className="h-9 rounded-lg px-2 text-xs" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
            <option value="all">All products</option>
            {data.filters.products.map(option => <option key={option.productId} value={option.productId}>{option.productName}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--t-blue)" }} /></div>
      ) : error ? (
        <div className="p-4 text-xs font-medium" style={{ color: "#dc2626" }}>{error}</div>
      ) : data.regions.length === 0 ? (
        <div className="p-7 text-center text-xs" style={{ color: "var(--t-muted)" }}>No matching active orders.</div>
      ) : (
        <div className="p-3 space-y-2">
          {data.regions.map(regionNode => {
            const regionKey = `r:${regionNode.key}`;
            const regionOpen = expanded.has(regionKey);
            return (
              <div key={regionNode.key} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--t-border)" }}>
                <button onClick={() => toggle(regionKey)} className="w-full p-3 flex items-center justify-between gap-3 text-left" style={{ background: "var(--t-surface2)" }}>
                  <span className="flex items-center gap-2 font-bold text-sm" style={{ color: "var(--t-text)" }}>{regionOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}{regionNode.label}</span>
                  <span className="text-[11px]" style={{ color: "var(--t-muted)" }}>{rowMeta(regionNode.orderCount, regionNode.kitCount, regionNode.subtotal)}</span>
                </button>
                {regionOpen && <div className="p-2 space-y-1">
                  {regionNode.countries.map(countryNode => {
                    const countryKey = `${regionKey}:c:${countryNode.key}`;
                    const countryOpen = expanded.has(countryKey);
                    return <div key={countryNode.key} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--t-border)" }}>
                      <button onClick={() => toggle(countryKey)} className="w-full px-3 py-2.5 flex items-center justify-between gap-3 text-left">
                        <span className="flex items-center gap-2 text-xs font-bold" style={{ color: "var(--t-text)" }}>{countryOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}{countryNode.label}</span>
                        <span className="text-[10px]" style={{ color: "var(--t-muted)" }}>{rowMeta(countryNode.orderCount, countryNode.kitCount, countryNode.subtotal)}</span>
                      </button>
                      {countryOpen && <div className="px-2 pb-2 space-y-1">
                        {countryNode.products.map(product => {
                          const productKey = `${countryKey}:p:${product.productId}`;
                          const productOpen = expanded.has(productKey);
                          return <div key={product.productId} className="rounded-md" style={{ background: "var(--t-surface2)" }}>
                            <button onClick={() => toggle(productKey)} className="w-full px-3 py-2 flex items-center justify-between gap-3 text-left">
                              <span className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--t-text)" }}><Package className="w-3.5 h-3.5" />{product.productName}</span>
                              <span className="text-[10px]" style={{ color: "var(--t-muted)" }}>{rowMeta(product.orderCount, product.kitCount, product.subtotal)}</span>
                            </button>
                            {productOpen && <div className="px-3 pb-2 space-y-1">
                              {product.orders.map(order => <button key={order.id} onClick={() => onOpenOrder?.(order.id, order.code)} className="w-full p-2 rounded-md flex items-center justify-between gap-3 text-left" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                                <span className="min-w-0"><span className="text-[11px] font-bold" style={{ color: "var(--t-blue)" }}>#{order.code}</span><span className="text-[11px] ml-2" style={{ color: "var(--t-text)" }}>{order.telegramUsername}</span><span className="text-[10px] ml-2" style={{ color: "var(--t-muted)" }}>{order.accountCountry}</span></span>
                                <span className="flex items-center gap-2 shrink-0"><span className="text-[10px]" style={{ color: "var(--t-muted)" }}>{order.quantity} · {fmtMoney(order.lineTotal)}</span><span className="text-[10px] font-bold" style={{ color: paymentLabel(order.paymentStatus) === "Paid" ? "#16a34a" : "#b45309" }}>{paymentLabel(order.paymentStatus)}</span></span>
                              </button>)}
                            </div>}
                          </div>;
                        })}
                      </div>}
                    </div>;
                  })}
                </div>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}