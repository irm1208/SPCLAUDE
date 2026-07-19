import { useMemo, useState } from "react";
import {
  ClipboardList, Lightbulb, ShoppingBag, CheckCircle2, DollarSign, Package,
  Copy, Check, Download, Globe,
} from "lucide-react";
import { V2_CARD_BORDER, TILE } from "./theme";
import { loadGb } from "./storage";

// ─── Workspace: Summary Tab ──────────────────────────────────────────────────
// v2 port of the v1 SummaryTab (GbOrganiser.tsx): an exportable one-glance
// rollup of the group buy — per-product, per-status, and per-country totals.
// Everything is computed locally from the stored orders; nothing is persisted.

interface Order {
  id: string;
  memberUsername: string;
  memberName: string;
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";
  products: { name: string; quantity: number; price: number }[];
  total: number;
  paymentMethod: string;
  country: string;
  createdAt: string;
  paidAt?: string;
  shippingOption: string;
  paymentProof?: {
    type: "txid" | "screenshot";
    value: string;
  };
  trackingNumber?: string;
  internalNotes?: string;
  flagged?: {
    note: string;
    dueDate?: string;
    dueTime?: string;
  };
}

const SAMPLE_ORDERS_LOCAL: Order[] = [
  {
    id: "ORD-001",
    memberUsername: "john_doe",
    memberName: "John D.",
    status: "paid",
    products: [
      { name: "Semaglutide 5mg", quantity: 2, price: 45 },
      { name: "BPC-157 5mg", quantity: 1, price: 30 },
    ],
    total: 120,
    paymentMethod: "USDT (TRC20)",
    country: "UK",
    createdAt: "2026-07-10T14:30:00Z",
    paidAt: "2026-07-10T15:00:00Z",
    shippingOption: "Standard Shipping (UK)",
  },
  {
    id: "ORD-002",
    memberUsername: "sarah_m",
    memberName: "Sarah M.",
    status: "pending",
    products: [{ name: "Tirzepatide 10mg", quantity: 1, price: 65 }],
    total: 65,
    paymentMethod: "Revolut",
    country: "France",
    createdAt: "2026-07-11T09:15:00Z",
    shippingOption: "EU Tracked",
  },
  {
    id: "ORD-003",
    memberUsername: "mike_fitness",
    memberName: "Mike F.",
    status: "shipped",
    products: [{ name: "Semaglutide 5mg", quantity: 3, price: 45 }],
    total: 135,
    paymentMethod: "USDT (ERC20)",
    country: "UK",
    createdAt: "2026-07-08T11:00:00Z",
    paidAt: "2026-07-08T12:30:00Z",
    shippingOption: "Standard Shipping (UK)",
  },
  {
    id: "ORD-004",
    memberUsername: "anna_p",
    memberName: "Anna P.",
    status: "processing",
    products: [{ name: "BPC-157 5mg", quantity: 2, price: 30 }],
    total: 60,
    paymentMethod: "PayPal",
    country: "Germany",
    createdAt: "2026-07-09T16:20:00Z",
    paidAt: "2026-07-09T17:00:00Z",
    shippingOption: "EU Tracked",
  },
];

// Badge styles matching OrdersTab's status config
const STATUS_CONFIG: Record<Order["status"], { label: string; color: string; bg: string }> = {
  pending: { label: "Pending Payment", color: "#D97706", bg: "rgba(217,119,6,0.10)" },
  paid: { label: "Paid", color: "#1E7A5C", bg: "rgba(30,122,92,0.10)" },
  processing: { label: "Processing", color: "#4A6CF7", bg: "rgba(74,108,247,0.10)" },
  shipped: { label: "Shipped", color: "#1E7A5C", bg: "rgba(30,122,92,0.10)" },
  delivered: { label: "Delivered", color: "#16A34A", bg: "rgba(22,163,74,0.10)" },
  cancelled: { label: "Cancelled", color: "#EF4444", bg: "rgba(239,68,68,0.10)" },
};

const STATUS_ORDER: Order["status"][] = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];

// Statuses that count as "confirmed" (payment received or further along)
const CONFIRMED_STATUSES: Order["status"][] = ["paid", "processing", "shipped", "delivered"];

const CURRENCY = "GBP";

interface ProductRow {
  name: string;
  totalQty: number;
  orderCount: number;
  revenue: number;
}

function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function SummaryTab({ selectedGbId }: { selectedGbId?: string } = {}) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const orders = useMemo<Order[]>(
    () => (selectedGbId ? loadGb<Order[]>(selectedGbId, "orders", SAMPLE_ORDERS_LOCAL, "orders") : []),
    [selectedGbId]
  );

  const active = useMemo(() => orders.filter(o => o.status !== "cancelled"), [orders]);

  const productRows = useMemo<ProductRow[]>(() => {
    const map = new Map<string, ProductRow>();
    for (const o of active) {
      for (const p of o.products) {
        const row = map.get(p.name) ?? { name: p.name, totalQty: 0, orderCount: 0, revenue: 0 };
        row.totalQty += p.quantity;
        row.orderCount += 1;
        row.revenue += p.quantity * p.price;
        map.set(p.name, row);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [active]);

  const statusCounts = useMemo(() => {
    const counts = new Map<Order["status"], number>();
    for (const o of orders) counts.set(o.status, (counts.get(o.status) ?? 0) + 1);
    return counts;
  }, [orders]);

  const countryRows = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number }>();
    for (const o of active) {
      const key = o.country || "Unknown";
      const row = map.get(key) ?? { orders: 0, revenue: 0 };
      row.orders += 1;
      row.revenue += o.total;
      map.set(key, row);
    }
    return Array.from(map.entries())
      .map(([country, r]) => ({ country, ...r }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [active]);

  const totalOrders = orders.length;
  const confirmedOrders = orders.filter(o => CONFIRMED_STATUSES.includes(o.status)).length;
  const totalRevenue = active.reduce((s, o) => s + o.total, 0);
  const unitsSold = active.reduce((s, o) => s + o.products.reduce((q, p) => q + p.quantity, 0), 0);

  const handleCopy = async () => {
    const lines = [
      `Group Buy Summary`,
      `Generated: ${new Date().toLocaleString("en-GB")}`,
      "─".repeat(40),
      `Orders: ${totalOrders} total · ${confirmedOrders} confirmed`,
      `Revenue: ${CURRENCY} ${totalRevenue.toFixed(2)} · ${unitsSold} units`,
      "",
      "Products:",
      ...productRows.map(r => `  ${r.name} ×${r.totalQty} (${r.orderCount} orders) = ${CURRENCY} ${r.revenue.toFixed(2)}`),
      "",
      "Statuses:",
      ...STATUS_ORDER.filter(s => (statusCounts.get(s) ?? 0) > 0).map(s => `  ${STATUS_CONFIG[s].label}: ${statusCounts.get(s)}`),
      "",
      "Countries:",
      ...countryRows.map(c => `  ${c.country}: ${c.orders} orders · ${CURRENCY} ${c.revenue.toFixed(2)}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  const handleDownloadCsv = () => {
    const rows = [
      ["Product", "Total Qty", "Order Count", `Revenue (${CURRENCY})`],
      ...productRows.map(r => [r.name, r.totalQty, r.orderCount, r.revenue.toFixed(2)]),
    ];
    const csv = rows.map(row => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gb-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  if (!selectedGbId) {
    return (
      <div className="rounded-xl p-8 sm:p-12 bg-white text-center" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <ClipboardList className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--t-subtle)" }} />
        <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>
          No Group Buy Selected
        </h3>
        <p className="text-[13px]" style={{ color: "var(--t-subtle)" }}>
          Select a group buy to view its summary
        </p>
      </div>
    );
  }

  const thStyle = { color: "var(--t-subtle)" } as const;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="rounded-xl p-4 sm:p-5 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold" style={{ color: "var(--t-text)" }}>Summary</h2>
            <p className="text-[12px] sm:text-[13px] mt-1" style={{ color: "var(--t-subtle)" }}>
              Order rollup for this group buy, computed from your order list
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="h-9 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-white hover:bg-black/[0.02] transition-colors"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: copied ? "#16A34A" : "var(--t-text)" }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy as text"}
            </button>
            <button
              onClick={handleDownloadCsv}
              className="h-9 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold bg-white hover:bg-black/[0.02] transition-colors"
              style={{ border: `1px solid ${V2_CARD_BORDER}`, color: downloaded ? "#16A34A" : "var(--t-text)" }}
            >
              {downloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              {downloaded ? "Downloaded" : "Download CSV"}
            </button>
          </div>
        </div>
      </div>

      {/* Explainer */}
      <div className="rounded-xl p-4 sm:p-5 bg-gradient-to-br from-purple-50 to-violet-50" style={{ border: "1px solid #DDD6FE" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#7C5CFC", color: "#fff" }}>
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold mb-1" style={{ color: "var(--t-text)" }}>One-Glance Rollup</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
              Everything below is derived live from your orders — totals, per-product quantities, statuses, and delivery countries. Use the export buttons to share the rollup with your reshipper or keep it for your records.
            </p>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile icon={ShoppingBag} tile={TILE.blue} value={String(totalOrders)} label="Total orders" />
        <StatTile icon={CheckCircle2} tile={TILE.green} value={String(confirmedOrders)} label="Confirmed orders" />
        <StatTile icon={DollarSign} tile={TILE.violet} value={`${CURRENCY} ${totalRevenue.toFixed(2)}`} label="Total revenue" />
        <StatTile icon={Package} tile={TILE.orange} value={String(unitsSold)} label="Units sold" />
      </div>

      {/* Per-product rollup */}
      <div className="rounded-xl bg-white overflow-hidden" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${V2_CARD_BORDER}` }}>
          <h3 className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>Product Rollup</h3>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--t-subtle)" }}>Cancelled orders excluded · sorted by revenue</p>
        </div>
        {productRows.length === 0 ? (
          <p className="px-4 py-8 text-center text-[12px]" style={{ color: "var(--t-muted)" }}>No orders yet.</p>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: "var(--t-surface2)" }}>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={thStyle}>Product</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider" style={thStyle}>Qty</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider" style={thStyle}>Orders</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider" style={thStyle}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {productRows.map(r => (
                <tr key={r.name} style={{ borderTop: `1px solid ${V2_CARD_BORDER}` }}>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: "var(--t-text)" }}>{r.name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: "var(--t-muted)" }}>{r.totalQty}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: "var(--t-muted)" }}>{r.orderCount}</td>
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums" style={{ color: "var(--t-text)" }}>{CURRENCY} {r.revenue.toFixed(2)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: `1px solid ${V2_CARD_BORDER}`, background: "var(--t-surface2)" }}>
                <td className="px-4 py-2.5 font-bold" style={{ color: "var(--t-text)" }}>Total</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums" style={{ color: "var(--t-text)" }}>{unitsSold}</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums" style={{ color: "var(--t-text)" }}>{active.length}</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums" style={{ color: "var(--t-text)" }}>{CURRENCY} {totalRevenue.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Per-status breakdown + per-country rollup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white p-4" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <h3 className="text-[13px] font-bold mb-3" style={{ color: "var(--t-text)" }}>By Status</h3>
          {totalOrders === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {STATUS_ORDER.filter(s => (statusCounts.get(s) ?? 0) > 0).map(s => {
                const cfg = STATUS_CONFIG[s];
                const count = statusCounts.get(s) ?? 0;
                return (
                  <div key={s} className="flex items-center justify-between gap-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <span className="text-[12px] font-bold tabular-nums" style={{ color: "var(--t-text)" }}>
                      {count} <span className="font-normal" style={{ color: "var(--t-subtle)" }}>({((count / totalOrders) * 100).toFixed(0)}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-4" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
          <div className="flex items-center gap-1.5 mb-3">
            <Globe className="w-3.5 h-3.5" style={{ color: "var(--t-subtle)" }} />
            <h3 className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>By Delivery Country</h3>
          </div>
          {countryRows.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>No delivery data yet.</p>
          ) : (
            <div className="space-y-2">
              {countryRows.map(c => (
                <div key={c.country} className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="font-semibold" style={{ color: "var(--t-text)" }}>{c.country}</span>
                  <span className="tabular-nums" style={{ color: "var(--t-muted)" }}>
                    {c.orders} {c.orders === 1 ? "order" : "orders"} · <span className="font-bold" style={{ color: "var(--t-text)" }}>{CURRENCY} {c.revenue.toFixed(2)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, tile, value, label }: {
  icon: typeof Package; tile: { fg: string; bg: string }; value: string; label: string;
}) {
  return (
    <div className="rounded-xl p-4 bg-white" style={{ border: `1px solid ${V2_CARD_BORDER}` }}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: tile.bg }}>
          <Icon className="w-5 h-5" style={{ color: tile.fg }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xl sm:text-2xl font-bold leading-none truncate" style={{ color: "var(--t-text)" }}>{value}</div>
          <div className="text-[11.5px] sm:text-[12px] mt-1" style={{ color: "var(--t-subtle)" }}>{label}</div>
        </div>
      </div>
    </div>
  );
}
