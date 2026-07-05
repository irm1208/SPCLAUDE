import { useState } from "react";
import {
  Users, Boxes, ShoppingBag, Search, SlidersHorizontal, LayoutGrid, List,
  Plus, ArrowRight, Package, RotateCcw, ChevronLeft, ChevronRight,
} from "lucide-react";

// ─── Theme tokens (light) — mirror of the app's --t-* light values ───────────
const T = {
  bg: "#F4F4F5",
  surface: "#FFFFFF",
  surface2: "#F4F4F5",
  border: "#E4E4E7",
  text: "#1A1D1F",
  muted: "#374151",
  subtle: "#6B7280",
  faint: "#9CA3AF",
  blue: "#2D6BCC",
  blueDeep: "#1B3A7A",
  shadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.03)",
};

const WHOLESALE_ACCENT = "#10B981";
const SHOP_ACCENT = "#7C3AED";

const STATUS_META: Record<string, { label: string; color: string }> = {
  Draft: { label: "Draft", color: "#64748B" },
  Submitted: { label: "Submitted", color: "#2D6BCC" },
  Processing: { label: "Processing", color: "#2D6BCC" },
  Shipped: { label: "Shipped", color: "#2D6BCC" },
  Completed: { label: "Completed", color: "#16A34A" },
  Cancelled: { label: "Cancelled", color: "#DC2626" },
};

const PAYMENT_META: Record<string, { label: string; color: string }> = {
  unpaid: { label: "Unpaid", color: "#94A3B8" },
  pending_confirmation: { label: "Pending", color: "#2D6BCC" },
  confirmed: { label: "Paid", color: "#16A34A" },
  test_confirmed: { label: "Test OK", color: "#2D6BCC" },
  failed: { label: "Failed", color: "#DC2626" },
};

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const fmtC = (n: number) => "$" + n.toFixed(2);

// ─── Sample data ─────────────────────────────────────────────────────────────
type LI = { quantity: number; productName: string; lineTotal: number };
type Kind = "gb" | "wholesale" | "shop";
type SampleOrder = {
  id: string;
  code: string;
  kind: Kind;
  title: string;
  accent: string;
  status: string;
  paymentStatus: string;
  timeAgo: string;
  lineItems: LI[];
  grandTotal: number;
  secondary?: "reorder" | "tracking";
};

const KIND_META: Record<Kind, { label: string; Icon: typeof Users }> = {
  gb: { label: "Group Buy", Icon: Users },
  wholesale: { label: "Wholesale", Icon: Boxes },
  shop: { label: "Shop", Icon: ShoppingBag },
};

const ORDERS: SampleOrder[] = [
  {
    id: "1", code: "A1B2C3", kind: "gb", title: "Winter BPC Protocol", accent: "#5B8DEF",
    status: "Shipped", paymentStatus: "confirmed", timeAgo: "2 days ago", secondary: "tracking",
    lineItems: [
      { quantity: 2, productName: "BPC-157 5mg", lineTotal: 90 },
      { quantity: 1, productName: "TB-500 5mg", lineTotal: 55 },
      { quantity: 1, productName: "Ipamorelin 5mg", lineTotal: 40 },
    ], grandTotal: 185,
  },
  {
    id: "2", code: "D4E5F6", kind: "gb", title: "Summer Recomp Stack", accent: "#F59E0B",
    status: "Processing", paymentStatus: "confirmed", timeAgo: "5 hours ago", secondary: "tracking",
    lineItems: [
      { quantity: 3, productName: "CJC-1295 no DAC 2mg", lineTotal: 96 },
      { quantity: 2, productName: "GHRP-2 5mg", lineTotal: 64 },
    ], grandTotal: 175,
  },
  {
    id: "3", code: "G7H8I9", kind: "wholesale", title: "Wholesale Order", accent: WHOLESALE_ACCENT,
    status: "Submitted", paymentStatus: "pending_confirmation", timeAgo: "1 day ago", secondary: "reorder",
    lineItems: [
      { quantity: 10, productName: "BPC-157 10mg", lineTotal: 350 },
      { quantity: 10, productName: "TB-500 10mg", lineTotal: 420 },
    ], grandTotal: 795,
  },
  {
    id: "4", code: "J1K2L3", kind: "shop", title: "Shop Order", accent: SHOP_ACCENT,
    status: "Completed", paymentStatus: "confirmed", timeAgo: "3 weeks ago",
    lineItems: [
      { quantity: 1, productName: "Melanotan II 10mg", lineTotal: 45 },
      { quantity: 2, productName: "PT-141 10mg", lineTotal: 70 },
    ], grandTotal: 130,
  },
  {
    id: "5", code: "M4N5O6", kind: "gb", title: "Longevity Peptides", accent: "#22D3EE",
    status: "Submitted", paymentStatus: "unpaid", timeAgo: "6 hours ago",
    lineItems: [
      { quantity: 1, productName: "Epithalon 10mg", lineTotal: 60 },
      { quantity: 1, productName: "GHK-Cu 50mg", lineTotal: 48 },
      { quantity: 1, productName: "SS-31 10mg", lineTotal: 75 },
    ], grandTotal: 198,
  },
  {
    id: "6", code: "P7Q8R9", kind: "wholesale", title: "Wholesale Order", accent: WHOLESALE_ACCENT,
    status: "Shipped", paymentStatus: "confirmed", timeAgo: "1 week ago", secondary: "reorder",
    lineItems: [
      { quantity: 20, productName: "Semaglutide 5mg", lineTotal: 1100 },
      { quantity: 15, productName: "Tirzepatide 10mg", lineTotal: 1350 },
      { quantity: 10, productName: "Retatrutide 10mg", lineTotal: 980 },
      { quantity: 10, productName: "AOD-9604 5mg", lineTotal: 260 },
    ], grandTotal: 3760,
  },
  {
    id: "7", code: "S1T2U3", kind: "shop", title: "Shop Order", accent: SHOP_ACCENT,
    status: "Cancelled", paymentStatus: "failed", timeAgo: "1 month ago",
    lineItems: [
      { quantity: 1, productName: "Selank 10mg", lineTotal: 42 },
    ], grandTotal: 42,
  },
  {
    id: "8", code: "V4W5X6", kind: "gb", title: "Healing Blend", accent: "#A78BFA",
    status: "Draft", paymentStatus: "unpaid", timeAgo: "just now",
    lineItems: [
      { quantity: 2, productName: "BPC-157 + TB-500 Blend", lineTotal: 130 },
    ], grandTotal: 130,
  },
  {
    id: "9", code: "Y7Z8A9", kind: "shop", title: "Shop Order", accent: SHOP_ACCENT,
    status: "Shipped", paymentStatus: "confirmed", timeAgo: "4 days ago",
    lineItems: [
      { quantity: 1, productName: "Tesamorelin 10mg", lineTotal: 88 },
      { quantity: 1, productName: "Ipamorelin 5mg", lineTotal: 40 },
    ], grandTotal: 128,
  },
];

// ─── Status pill (outlined) ──────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: "#64748B" };
  return (
    <span
      className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0"
      style={{ color: m.color, background: hexToRgba(m.color, 0.08), border: `1px solid ${hexToRgba(m.color, 0.28)}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

// ─── Order card ──────────────────────────────────────────────────────────────
function OrderCard({ o }: { o: SampleOrder }) {
  const pay = PAYMENT_META[o.paymentStatus] ?? PAYMENT_META.unpaid;
  const { label: kindLabel, Icon } = KIND_META[o.kind];
  const visible = o.lineItems.slice(0, 3);
  const extra = o.lineItems.length - visible.length;
  const done = o.status === "Completed";
  const cancelled = o.status === "Cancelled";
  const terminal = done || cancelled;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col"
      style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: T.shadow }}
    >
      {/* header */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: hexToRgba(o.accent, 0.12), border: `1px solid ${hexToRgba(o.accent, 0.22)}` }}
        >
          <Icon className="w-[18px] h-[18px]" style={{ color: o.accent }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14px] font-bold truncate" style={{ color: T.text }}>{o.title}</p>
            <StatusPill status={o.status} />
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11.5px]" style={{ color: T.subtle }}>
            <Icon className="w-3.5 h-3.5" />
            <span className="font-medium">{kindLabel}</span>
            <span>· {o.timeAgo}</span>
          </div>
        </div>
      </div>

      {/* info row */}
      <div className="flex items-center justify-between mt-3.5 pb-3.5" style={{ borderBottom: `1px dashed ${T.border}` }}>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.faint }}>Code</span>
          <span className="text-[12px] font-semibold" style={{ color: T.muted }}>#{o.code}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.faint }}>Payment</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: pay.color, background: hexToRgba(pay.color, 0.1) }}>
            {pay.label}
          </span>
        </div>
      </div>

      {/* line items */}
      <div className="flex flex-col gap-2 mt-3.5">
        {visible.map((li, i) => (
          <div key={i} className="flex items-center gap-2 text-[12.5px]">
            <span className="w-5 shrink-0 font-semibold" style={{ color: T.faint }}>{li.quantity}×</span>
            <span className="flex-1 truncate" style={{ color: T.text }}>{li.productName}</span>
            <span className="font-semibold shrink-0" style={{ color: T.muted }}>{fmtC(li.lineTotal)}</span>
          </div>
        ))}
        {extra > 0 && (
          <span className="text-[11px] pl-7" style={{ color: T.subtle }}>+{extra} more item{extra > 1 ? "s" : ""}</span>
        )}
      </div>

      {/* total */}
      <div className="flex items-center justify-between mt-3.5 pt-3.5" style={{ borderTop: `1px solid ${T.border}` }}>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.faint }}>Total</span>
        <span className="text-[16px] font-extrabold" style={{ color: T.text }}>{fmtC(o.grandTotal)}</span>
      </div>

      {/* actions */}
      <div className="mt-4">
        {terminal ? (
          <div className="flex items-center gap-2">
            <div
              className="flex-1 text-center text-[11.5px] font-medium py-2.5 rounded-xl"
              style={done
                ? { color: "#16A34A", background: hexToRgba("#16A34A", 0.08) }
                : { color: "#DC2626", background: hexToRgba("#DC2626", 0.07) }}
            >
              {done ? "Order completed" : "Order cancelled"}
            </div>
            <button
              className="flex-1 h-10 rounded-xl text-[12.5px] font-bold flex items-center justify-center gap-1.5"
              style={{ background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}
            >
              Details <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {o.secondary && (
              <button
                className="flex-1 h-10 rounded-xl text-[12.5px] font-semibold flex items-center justify-center gap-1.5"
                style={{ background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}
              >
                {o.secondary === "reorder"
                  ? <><RotateCcw className="w-3.5 h-3.5" />Reorder</>
                  : <><Package className="w-3.5 h-3.5" />Tracking</>}
              </button>
            )}
            <button
              className="flex-1 h-10 rounded-xl text-[12.5px] font-bold text-white flex items-center justify-center gap-1.5"
              style={{ background: T.blueDeep }}
            >
              Manage <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export function OrdersDashboard() {
  const [tab, setTab] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const statuses = ["Submitted", "Processing", "Shipped", "Completed", "Cancelled"];
  const tabs = [
    { id: "all", label: "All", count: ORDERS.length },
    ...statuses
      .map((s) => ({ id: s, label: STATUS_META[s].label, count: ORDERS.filter((o) => o.status === s).length }))
      .filter((t) => t.count > 0),
  ];

  const shown = tab === "all" ? ORDERS : ORDERS.filter((o) => o.status === tab);

  return (
    <div className="min-h-screen w-full" style={{ background: T.bg }}>
      <div className="mx-auto max-w-[1120px] px-8 py-7">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[26px] font-bold leading-tight" style={{ color: T.text }}>Orders</h1>
            <p className="text-[13px] mt-1" style={{ color: T.subtle }}>Manage and track all your orders</p>
          </div>
          <button
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-semibold text-white shrink-0"
            style={{ background: T.blueDeep }}
          >
            <Plus className="w-4 h-4" /> New Order
          </button>
        </div>

        {/* Tabs + toolbar */}
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-1">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-semibold transition-all"
                  style={active
                    ? { background: T.surface, color: T.text, boxShadow: T.shadow, border: `1px solid ${T.border}` }
                    : { background: "transparent", color: T.subtle, border: "1px solid transparent" }}
                >
                  {t.label}
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={active
                      ? { background: hexToRgba(T.blue, 0.1), color: T.blue }
                      : { background: T.surface2, color: T.faint }}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 h-10 px-3 rounded-xl w-[240px]"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: T.faint }} />
              <span className="text-[12.5px] flex-1" style={{ color: T.faint }}>Search orders…</span>
              <kbd
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ background: T.surface2, color: T.subtle, border: `1px solid ${T.border}` }}
              >⌘K</kbd>
            </div>
            <button
              className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-[12.5px] font-semibold"
              style={{ background: T.surface, color: T.muted, border: `1px solid ${T.border}` }}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
            </button>
            <div
              className="flex items-center gap-0.5 h-10 p-1 rounded-xl"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}
            >
              <button
                onClick={() => setView("grid")}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={view === "grid" ? { background: hexToRgba(T.blue, 0.1) } : {}}
              >
                <LayoutGrid className="w-4 h-4" style={{ color: view === "grid" ? T.blue : T.faint }} />
              </button>
              <button
                onClick={() => setView("list")}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={view === "list" ? { background: hexToRgba(T.blue, 0.1) } : {}}
              >
                <List className="w-4 h-4" style={{ color: view === "list" ? T.blue : T.faint }} />
              </button>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shown.map((o) => <OrderCard key={o.id} o={o} />)}
        </div>

        {/* Pagination */}
        <div
          className="flex items-center justify-between gap-3 mt-5 px-5 py-3.5 rounded-2xl flex-wrap"
          style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: T.shadow }}
        >
          <span className="text-[12.5px]" style={{ color: T.subtle }}>
            Showing <span style={{ color: T.text, fontWeight: 600 }}>1</span> to{" "}
            <span style={{ color: T.text, fontWeight: 600 }}>{shown.length}</span> of{" "}
            <span style={{ color: T.text, fontWeight: 600 }}>{shown.length}</span> orders
          </span>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ border: `1px solid ${T.border}`, background: T.surface }}>
              <ChevronLeft className="w-4 h-4" style={{ color: T.faint }} />
            </button>
            {[1, 2, 3, 4].map((p) => (
              <button
                key={p}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[12.5px] font-semibold"
                style={p === 1
                  ? { background: T.blueDeep, color: "#fff" }
                  : { color: T.muted, background: T.surface, border: `1px solid ${T.border}` }}
              >
                {p}
              </button>
            ))}
            <button className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ border: `1px solid ${T.border}`, background: T.surface }}>
              <ChevronRight className="w-4 h-4" style={{ color: T.muted }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
