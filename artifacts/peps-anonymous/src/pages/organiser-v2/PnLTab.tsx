import { useState, useEffect } from "react";
import { V2_CARD_BORDER } from "./theme";
import {
  BarChart3, TrendingUp, TrendingDown, Loader2, Check, CheckCircle2,
  DollarSign, Package, ShoppingBag, Lightbulb, ChevronDown, ChevronRight
} from "lucide-react";

// ─── Workspace: P&L Tab ──────────────────────────────────────────────────────
// Track revenue, costs, and profit for this group buy

interface PnlData {
  gbName: string;
  orders: { total: number; confirmed: number };
  revenue: { total: number; products: number; delivery: number };
  costs: { materials: number; lab: number; shipping: number; misc: number; platformFee: number; total: number; notes: string | null };
  profit: { gross: number; marginPct: number };
  productBreakdown: { name: string; totalQty: number; totalRevenue: number }[];
}

interface PnLTabProps {
  selectedGbId?: string;
}

const SAMPLE_DATA: PnlData = {
  gbName: "Sample Group Buy",
  orders: { total: 45, confirmed: 42 },
  revenue: { total: 6750.00, products: 6000.00, delivery: 750.00 },
  costs: { materials: 3200.00, lab: 450.00, shipping: 890.00, misc: 210.00, platformFee: 337.50, total: 5087.50, notes: "Material costs from Vendor A" },
  profit: { gross: 1662.50, marginPct: 24.6 },
  productBreakdown: [
    { name: "Product A", totalQty: 120, totalRevenue: 3600.00 },
    { name: "Product B", totalQty: 80, totalRevenue: 2400.00 },
  ],
};

const COST_FIELDS = [
  { key: "materials", label: "Materials", sub: "Raw materials, components" },
  { key: "lab", label: "Lab Testing", sub: "Quality control, testing" },
  { key: "shipping", label: "Vendor Shipping", sub: "Shipping from vendor to you" },
  { key: "misc", label: "Miscellaneous", sub: "Other costs" },
  { key: "platformFee", label: "Platform Fee", sub: "Transaction & platform fees" },
] as const;

export default function PnLTab({ selectedGbId }: PnLTabProps = {}) {
  const [data, setData] = useState<PnlData | null>(null);
  const [loading, setLoading] = useState(false);
  const [costs, setCosts] = useState({
    materials: "",
    lab: "",
    shipping: "",
    misc: "",
    platformFee: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("costs");

  useEffect(() => {
    if (!selectedGbId) return;
    setData(SAMPLE_DATA);
    setCosts({
      materials: SAMPLE_DATA.costs.materials > 0 ? String(SAMPLE_DATA.costs.materials) : "",
      lab: SAMPLE_DATA.costs.lab > 0 ? String(SAMPLE_DATA.costs.lab) : "",
      shipping: SAMPLE_DATA.costs.shipping > 0 ? String(SAMPLE_DATA.costs.shipping) : "",
      misc: SAMPLE_DATA.costs.misc > 0 ? String(SAMPLE_DATA.costs.misc) : "",
      platformFee: SAMPLE_DATA.costs.platformFee > 0 ? String(SAMPLE_DATA.costs.platformFee) : "",
      notes: SAMPLE_DATA.costs.notes || "",
    });
  }, [selectedGbId]);

  // Live-computed gross profit from current (unsaved) cost inputs
  const liveRevenue = data?.revenue.total ?? 0;
  const liveTotalCosts = COST_FIELDS.reduce((sum, { key }) => sum + (parseFloat(costs[key]) || 0), 0);
  const liveGrossProfit = liveRevenue - liveTotalCosts;
  const liveMarginPct = liveRevenue > 0 ? (liveGrossProfit / liveRevenue) * 100 : 0;

  const handleSaveCosts = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!selectedGbId) {
    return (
      <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <BarChart3 className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
        <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>
          No Group Buy Selected
        </h3>
        <p className="text-[13px]" style={{ color: "var(--t-subtle)" }}>
          Select a group buy to view profit & loss
        </p>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="rounded-xl p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: "var(--t-blue)" }} />
        <p className="text-[13px]" style={{ color: "var(--t-subtle)" }}>Loading P&L data...</p>
      </div>
    );
  }

  const currency = "GBP";

  const kpiCards = [
    { label: "Revenue", value: `${currency} ${liveRevenue.toFixed(2)}`, sub: `${data.orders.confirmed} confirmed orders`, color: "var(--t-blue)" },
    { label: "Total Costs", value: `${currency} ${liveTotalCosts.toFixed(2)}`, sub: "All expenses tracked", color: "var(--t-text)" },
    { label: "Gross Profit", value: `${currency} ${liveGrossProfit.toFixed(2)}`, sub: `${liveMarginPct.toFixed(1)}% margin (live)`, color: liveGrossProfit >= 0 ? "#16A34A" : "#DC2626" },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--t-text)" }}>Profit & Loss</h2>
        <p className="text-[12px] sm:text-[13px] mt-1" style={{ color: "var(--t-subtle)" }}>
          Track your revenue, costs, and profit for {data.gbName}
        </p>
      </div>

      {/* Explainer */}
      <div className="rounded-xl p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-teal-50" style={{ border: "1px solid #A7F3D0" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#10B981", color: "#fff" }}>
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>How P&L Works</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
              <strong style={{ color: "var(--t-text)" }}>Revenue</strong> is calculated automatically from confirmed orders. Enter your <strong style={{ color: "var(--t-text)" }}>costs</strong> below (materials, shipping, etc.) and your <strong style={{ color: "var(--t-text)" }}>gross profit</strong> updates live. This helps you see if your group buy is profitable before you finalize it.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpiCards.map(card => (
          <div key={card.label} className="rounded-xl p-4 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--t-subtle)" }}>{card.label}</p>
              {card.label === "Gross Profit" && (
                liveGrossProfit >= 0 ? <TrendingUp className="w-4 h-4" style={{ color: card.color }} /> : <TrendingDown className="w-4 h-4" style={{ color: card.color }} />
              )}
            </div>
            <p className="text-[20px] sm:text-[24px] font-bold mb-1" style={{ color: card.color }}>{card.value}</p>
            <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* White Container */}
      <div className="rounded-xl p-4 bg-white space-y-3" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>

        {/* Cost Inputs Section */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <button
            onClick={() => toggleSection("costs")}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-black/[0.02] transition-colors"
            style={{ background: "var(--t-surface2)", borderBottom: expandedSection === "costs" ? `1px solid ${V2_CARD_BORDER}` : "none" }}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
              <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--t-text)" }}>
                Cost Inputs
              </span>
              <span className="text-[10px] font-normal" style={{ color: "var(--t-subtle)" }}>— Gross Profit updates live as you type</span>
            </div>
            {expandedSection === "costs" ? (
              <ChevronDown className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
            ) : (
              <ChevronRight className="w-5 h-5" style={{ color: "var(--t-subtle)" }} />
            )}
          </button>

          {expandedSection === "costs" && (
            <form onSubmit={handleSaveCosts} className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COST_FIELDS.map(({ key, label, sub }) => (
                  <div key={key}>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-subtle)" }}>
                      {label}
                    </label>
                    <p className="text-[10px] mb-1.5" style={{ color: "var(--t-muted)" }}>{sub}</p>
                    <div className="flex items-center gap-1 px-3 h-10 rounded-lg" style={{ border: `1px solid ${V2_CARD_BORDER}`, background: "#fff" }}>
                      <span className="text-[12px] font-semibold shrink-0" style={{ color: "var(--t-subtle)" }}>{currency}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={costs[key]}
                        onChange={(e) => setCosts(c => ({ ...c, [key]: e.target.value }))}
                        placeholder="0.00"
                        className="flex-1 bg-transparent text-[13px] outline-none"
                        style={{ color: "var(--t-text)" }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--t-subtle)" }}>
                  Notes
                </label>
                <textarea
                  value={costs.notes}
                  onChange={(e) => setCosts(c => ({ ...c, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional notes…"
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
                  style={{ border: `1px solid ${V2_CARD_BORDER}`, color: "var(--t-text)", background: "#fff" }}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="h-10 px-5 rounded-lg text-[13px] font-bold text-white flex items-center gap-2"
                style={{ background: saved ? "#16A34A" : "var(--t-blue)" }}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {saving ? "Saving..." : saved ? "Saved!" : "Save Costs"}
              </button>
            </form>
          )}
        </div>

        {/* Revenue Breakdown Section */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <button
            onClick={() => toggleSection("revenue")}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-black/[0.02] transition-colors"
            style={{ background: "var(--t-surface2)", borderBottom: expandedSection === "revenue" ? `1px solid ${V2_CARD_BORDER}` : "none" }}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
              <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--t-text)" }}>
                Revenue Breakdown
              </span>
            </div>
            {expandedSection === "revenue" ? (
              <ChevronDown className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
            ) : (
              <ChevronRight className="w-5 h-5" style={{ color: "var(--t-subtle)" }} />
            )}
          </button>

          {expandedSection === "revenue" && (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg" style={{ background: "var(--t-surface2)" }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--t-subtle)" }}>Products</p>
                  <p className="text-[18px] font-bold" style={{ color: "var(--t-text)" }}>{currency} {data.revenue.products.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: "var(--t-surface2)" }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--t-subtle)" }}>Delivery</p>
                  <p className="text-[18px] font-bold" style={{ color: "var(--t-text)" }}>{currency} {data.revenue.delivery.toFixed(2)}</p>
                </div>
              </div>

              {data.productBreakdown.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--t-subtle)" }}>By Product</p>
                  <div className="space-y-2">
                    {data.productBreakdown.map(product => (
                      <div key={product.name} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "var(--t-surface2)" }}>
                        <div>
                          <p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{product.name}</p>
                          <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>{product.totalQty} units</p>
                        </div>
                        <p className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>{currency} {product.totalRevenue.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Product Breakdown Section */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <button
            onClick={() => toggleSection("products")}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-black/[0.02] transition-colors"
            style={{ background: "var(--t-surface2)", borderBottom: expandedSection === "products" ? `1px solid ${V2_CARD_BORDER}` : "none" }}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" style={{ color: "var(--t-subtle)" }} />
              <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--t-text)" }}>
                Product Breakdown
              </span>
            </div>
            {expandedSection === "products" ? (
              <ChevronDown className="w-5 h-5" style={{ color: "var(--t-blue)" }} />
            ) : (
              <ChevronRight className="w-5 h-5" style={{ color: "var(--t-subtle)" }} />
            )}
          </button>

          {expandedSection === "products" && (
            <div className="p-4">
              {data.productBreakdown.length > 0 ? (
                <div className="space-y-2">
                  {data.productBreakdown.map(product => (
                    <div key={product.name} className="flex items-center justify-between p-3 rounded-lg" style={{ border: `1px solid ${V2_CARD_BORDER}`, background: "#fff" }}>
                      <div>
                        <p className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>{product.name}</p>
                        <p className="text-[11px]" style={{ color: "var(--t-subtle)" }}>{product.totalQty} units sold</p>
                      </div>
                      <p className="text-[16px] font-bold" style={{ color: "var(--t-blue)" }}>{currency} {product.totalRevenue.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-center" style={{ color: "var(--t-subtle)" }}>No product data available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
