import './_group.css';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Clock, RefreshCw, Truck, FileText,
  CheckCircle2, XCircle, ArrowRight, AlertCircle,
  ChevronDown, ChevronUp, ShoppingBag, Users, ArrowLeft,
  Sparkles, CircleAlert,
} from 'lucide-react';

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg: "#F0F3F9",
  surface: "#FFFFFF",
  surface2: "#F4F6FB",
  border: "#E2E8F4",
  text: "#0F172A",
  muted: "#475569",
  subtle: "#94A3B8",
  blue: "#2D6BCC",
  darkBlue: "#1B3A7A",
  gradient: "linear-gradient(135deg, #1B3A7A 0%, #2D6BCC 100%)",
};

// ─── Status meta ──────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; bg: string; glow: string; icon: React.ElementType }> = {
  Draft:      { label: "Draft",      color: "#64748B", bg: "rgba(100,116,139,0.1)", glow: "rgba(100,116,139,0.15)", icon: FileText },
  Submitted:  { label: "Submitted",  color: "#3B82F6", bg: "rgba(59,130,246,0.1)",  glow: "rgba(59,130,246,0.15)",  icon: Clock },
  Processing: { label: "Processing", color: "#8B5CF6", bg: "rgba(139,92,246,0.1)",  glow: "rgba(139,92,246,0.15)",  icon: RefreshCw },
  Shipped:    { label: "Shipped",    color: "#0EA5E9", bg: "rgba(14,165,233,0.1)",  glow: "rgba(14,165,233,0.15)",  icon: Truck },
  Completed:  { label: "Completed",  color: "#10B981", bg: "rgba(16,185,129,0.1)",  glow: "rgba(16,185,129,0.15)",  icon: CheckCircle2 },
  Cancelled:  { label: "Cancelled",  color: "#EF4444", bg: "rgba(239,68,68,0.1)",   glow: "rgba(239,68,68,0.15)",   icon: XCircle },
};

const PAYMENT_META: Record<string, { label: string; color: string; bg: string }> = {
  unpaid:               { label: "Awaiting payment", color: "#94A3B8", bg: "rgba(148,163,184,0.1)" },
  pending_confirmation: { label: "Confirming",        color: "#F59E0B", bg: "rgba(245,158,11,0.1)"  },
  confirmed:            { label: "Paid",              color: "#10B981", bg: "rgba(16,185,129,0.1)"  },
  test_confirmed:       { label: "Test Paid",         color: "#3B82F6", bg: "rgba(59,130,246,0.1)"  },
  failed:               { label: "Failed",            color: "#EF4444", bg: "rgba(239,68,68,0.1)"   },
};

// ─── Types ────────────────────────────────────────────────────────────────────
type LineItem = { productName: string; quantity: number; unitPrice: number; lineTotal: number };
type Order = {
  id: string; code: string; telegramUsername: string;
  status: string; paymentStatus: string; grandTotal: number;
  productSubtotal: number; lineItems: LineItem[];
  adminMessage: string | null; trackingNumber: string | null;
  createdAt: string; notes: string | null;
  deliveryMethod: string; groupBuyId: string | null;
};

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_ORDERS: Order[] = [
  {
    id: "1", code: "SP-A1B2", telegramUsername: "@johndoe",
    status: "Shipped", paymentStatus: "confirmed", grandTotal: 148.50,
    productSubtotal: 130, lineItems: [
      { productName: "BPC-157 5mg", quantity: 3, unitPrice: 28, lineTotal: 84 },
      { productName: "TB-500 2mg", quantity: 2, unitPrice: 23, lineTotal: 46 },
    ],
    adminMessage: null, trackingNumber: "RM123456789GB",
    createdAt: "2026-03-28T10:00:00Z", notes: null,
    deliveryMethod: "Royal Mail Tracked 48", groupBuyId: null,
  },
  {
    id: "2", code: "SP-C3D4", telegramUsername: "@johndoe",
    status: "Submitted", paymentStatus: "unpaid", grandTotal: 62.00,
    productSubtotal: 62, lineItems: [
      { productName: "Ipamorelin 2mg", quantity: 4, unitPrice: 15.50, lineTotal: 62 },
    ],
    adminMessage: "Please send payment within 48 hours to confirm your order.",
    trackingNumber: null, createdAt: "2026-04-08T14:30:00Z",
    notes: "Please ship asap if possible!", deliveryMethod: "InPost Locker", groupBuyId: null,
  },
  {
    id: "3", code: "SP-E5F6", telegramUsername: "@johndoe",
    status: "Completed", paymentStatus: "confirmed", grandTotal: 95.00,
    productSubtotal: 80, lineItems: [
      { productName: "Selank 5mg", quantity: 2, unitPrice: 22, lineTotal: 44 },
      { productName: "Semax 5mg", quantity: 2, unitPrice: 18, lineTotal: 36 },
    ],
    adminMessage: null, trackingNumber: null,
    createdAt: "2026-02-14T09:00:00Z", notes: null,
    deliveryMethod: "Royal Mail Tracked 24", groupBuyId: "gb-spring",
  },
];

const MOCK_GB = { id: "gb-spring", name: "Spring 2026 Group Buy", status: "closed" };

// ─── OrderCard ────────────────────────────────────────────────────────────────
function OrderCard({ order, onManage, index }: { order: Order; onManage: () => void; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const sm = STATUS_META[order.status] ?? STATUS_META["Draft"];
  const pm = PAYMENT_META[order.paymentStatus] ?? { label: order.paymentStatus, color: C.subtle, bg: "rgba(148,163,184,0.1)" };
  const StatusIcon = sm.icon;
  const createdDate = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const isPaid = order.paymentStatus === "confirmed" || order.paymentStatus === "test_confirmed";
  const hasLogistics = order.deliveryMethod || order.trackingNumber || order.adminMessage;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.28 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(15,23,42,0.07), 0 4px 12px rgba(15,23,42,0.04)" }}
    >
      {/* ── Zone A: Identity ─────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">

        {/* Row 1: status badge (dominant) + amount */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold"
            style={{ background: sm.bg, color: sm.color }}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {sm.label}
          </span>
          <div className="text-right shrink-0">
            <p className="text-[22px] font-bold leading-none tabular-nums" style={{ color: C.text }}>
              £{order.grandTotal.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Row 2: order code + date + payment status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-mono text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-lg"
            style={{ background: C.surface2, color: C.muted, border: `1px solid ${C.border}` }}
          >
            {order.code}
          </span>
          <span className="text-[11px]" style={{ color: C.subtle }}>{createdDate}</span>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg ml-auto"
            style={{ background: pm.bg, color: pm.color }}
          >
            {isPaid && <CheckCircle2 className="w-2.5 h-2.5" />}
            {pm.label}
          </span>
        </div>
      </div>

      {/* ── Zone B: Logistics ────────────────────────────────────────── */}
      {hasLogistics && (
        <div
          className="mx-3 mb-3 rounded-xl overflow-hidden"
          style={{ background: C.surface2, border: `1px solid ${C.border}` }}
        >
          {/* Delivery */}
          {order.deliveryMethod && (
            <div
              className="flex items-center gap-2 px-3 py-2.5"
              style={{ borderBottom: (order.trackingNumber || order.adminMessage) ? `1px solid ${C.border}` : undefined }}
            >
              <Package className="w-3.5 h-3.5 shrink-0" style={{ color: C.subtle }} />
              <span className="text-[11px] font-medium" style={{ color: C.muted }}>{order.deliveryMethod}</span>
            </div>
          )}

          {/* Tracking — highlighted */}
          {order.trackingNumber && (
            <div
              className="flex items-center gap-3 px-3 py-2.5"
              style={{
                background: "rgba(45,107,204,0.05)",
                borderBottom: order.adminMessage ? `1px solid ${C.border}` : undefined,
              }}
            >
              <Truck className="w-3.5 h-3.5 shrink-0" style={{ color: C.blue }} />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: C.blue }}>Tracking</p>
                <p className="font-mono text-[12px] font-bold truncate" style={{ color: C.text }}>{order.trackingNumber}</p>
              </div>
            </div>
          )}

          {/* Admin message */}
          {order.adminMessage && (
            <div className="flex items-start gap-2 px-3 py-2.5" style={{ background: "rgba(245,158,11,0.04)" }}>
              <CircleAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed" style={{ color: C.muted }}>{order.adminMessage}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Zone C: Action strip ─────────────────────────────────────── */}
      <div className="flex border-t" style={{ borderColor: C.border }}>
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-1 flex items-center justify-center gap-1.5 h-11 text-[11px] font-semibold transition-colors"
          style={{ color: C.muted }}
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Hide items" : `${order.lineItems.length} item${order.lineItems.length !== 1 ? "s" : ""}`}
        </button>
        <div className="w-px self-stretch" style={{ background: C.border }} />
        <button
          onClick={onManage}
          className="flex-1 flex items-center justify-center gap-1.5 h-11 text-[11px] font-bold text-white active:opacity-90"
          style={{ background: C.darkBlue }}
        >
          Manage <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Expandable items panel ───────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t" style={{ borderColor: C.border }}>
              <div className="px-4 py-3 space-y-2.5">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: C.subtle }}>Order Contents</p>
                {order.lineItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: C.border, color: C.muted }}
                    >
                      {item.quantity}
                    </span>
                    <span className="flex-1 text-[11px] font-medium truncate" style={{ color: C.text }}>{item.productName}</span>
                    <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: C.text }}>£{item.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
                {order.notes && (
                  <p className="text-[11px] italic pt-2 border-t" style={{ color: C.subtle, borderColor: C.border }}>"{order.notes}"</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function Redesign() {
  const [activeFilter, setActiveFilter] = useState<"active" | "previous">("active");

  const isActive = (o: Order) => ["Draft","Submitted","Processing","Shipped"].includes(o.status);
  const isPrev   = (o: Order) => ["Completed","Cancelled"].includes(o.status);

  const regularOrders = MOCK_ORDERS.filter(o => !o.groupBuyId);
  const gbOrders      = MOCK_ORDERS.filter(o => o.groupBuyId === "gb-spring");

  const regularShown = activeFilter === "active" ? regularOrders.filter(isActive) : regularOrders.filter(isPrev);
  const gbShown      = activeFilter === "active" ? gbOrders.filter(isActive) : gbOrders.filter(isPrev);

  const totalActive   = regularOrders.filter(isActive).length + gbOrders.filter(isActive).length;
  const totalPrevious = regularOrders.filter(isPrev).length   + gbOrders.filter(isPrev).length;
  const totalOrders   = MOCK_ORDERS.length;
  const completed     = MOCK_ORDERS.filter(o => o.status === "Completed").length;

  const hasGb = gbShown.length > 0;
  const hasRegular = regularShown.length > 0;
  const nothingAtAll = !hasRegular && !hasGb;

  const stats = [
    { label: "Total", value: totalOrders,  color: C.blue,    bg: "rgba(45,107,204,0.08)"  },
    { label: "Active",  value: totalActive,   color: "#8B5CF6", bg: "rgba(139,92,246,0.08)" },
    { label: "Done",    value: completed,     color: "#10B981", bg: "rgba(16,185,129,0.08)" },
  ];

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      {/* Header gradient */}
      <div className="relative overflow-hidden" style={{ background: C.gradient }}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 70% 50%, white 0%, transparent 60%)"
        }} />
        <div className="relative px-4 pt-5 pb-8">
          {/* Nav row */}
          <div className="flex items-center justify-between mb-5">
            <button className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 backdrop-blur-sm">
              <ArrowLeft className="w-4 h-4 text-white/90" />
            </button>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 backdrop-blur-sm">
              <RefreshCw className="w-4 h-4 text-white/70" />
            </button>
          </div>

          {/* Title */}
          <div className="mb-5">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Customer Portal</p>
            <h1 className="text-2xl font-bold text-white leading-tight">My Orders</h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {stats.map(s => (
              <div key={s.label} className="rounded-2xl p-3 text-center bg-white/10 backdrop-blur-sm">
                <p className="text-[22px] font-bold text-white leading-none mb-1">{s.value}</p>
                <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom curve */}
        <div className="absolute bottom-0 left-0 right-0 h-5" style={{
          background: C.bg,
          borderRadius: "20px 20px 0 0",
        }} />
      </div>

      {/* Content */}
      <div className="px-4 pt-2 pb-8 space-y-5 -mt-1">

        {/* Tab toggle */}
        <div
          className="flex gap-1 p-1 rounded-2xl"
          style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}
        >
          {([
            { id: "active"   as const, label: "Active",   Icon: Package, count: totalActive   },
            { id: "previous" as const, label: "History",  Icon: Clock,   count: totalPrevious },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className="relative flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-semibold transition-all"
              style={activeFilter === tab.id
                ? { background: C.gradient, color: "white", boxShadow: "0 2px 8px rgba(45,107,204,0.3)" }
                : { color: C.muted }}
            >
              <tab.Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                  style={activeFilter === tab.id
                    ? { background: "rgba(255,255,255,0.25)", color: "white" }
                    : { background: C.surface2, color: C.muted }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {nothingAtAll && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center rounded-3xl"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}
          >
            {activeFilter === "active" ? (
              <>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: C.surface2 }}>
                  <ShoppingBag className="w-7 h-7" style={{ color: C.subtle }} />
                </div>
                <p className="text-sm font-bold mb-1" style={{ color: C.text }}>No active orders</p>
                <p className="text-xs mb-5" style={{ color: C.subtle }}>Your current orders will appear here</p>
                <button
                  className="h-10 px-6 rounded-xl text-xs font-bold text-white flex items-center gap-2"
                  style={{ background: C.gradient, boxShadow: "0 2px 8px rgba(45,107,204,0.3)" }}
                >
                  Place an Order <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: C.surface2 }}>
                  <Clock className="w-7 h-7" style={{ color: C.subtle }} />
                </div>
                <p className="text-sm font-bold mb-1" style={{ color: C.text }}>No previous orders</p>
                <p className="text-xs" style={{ color: C.subtle }}>Completed and cancelled orders appear here</p>
              </>
            )}
          </motion.div>
        )}

        {/* Group Buy Orders */}
        {hasGb && (
          <div className="space-y-3">
            {/* GB header */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: "linear-gradient(135deg, rgba(45,107,204,0.08) 0%, rgba(27,58,122,0.06) 100%)", border: `1px solid rgba(45,107,204,0.15)` }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(45,107,204,0.15)" }}>
                <Users className="w-4 h-4" style={{ color: C.blue }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: C.text }}>{MOCK_GB.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-[10px] font-semibold" style={{ color: C.blue }}>Closed · {gbShown.length} order{gbShown.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <Sparkles className="w-4 h-4 shrink-0" style={{ color: C.blue, opacity: 0.5 }} />
            </div>

            {/* GB orders — indented with left border */}
            <div className="pl-3">
              <div className="pl-3 space-y-3 border-l-2" style={{ borderColor: "rgba(45,107,204,0.2)" }}>
                {gbShown.map((order, i) => (
                  <OrderCard key={order.id} order={order} onManage={() => {}} index={i} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Separator */}
        {hasGb && hasRegular && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: C.border }} />
            <span className="text-[10px] font-bold uppercase tracking-widest px-2" style={{ color: C.subtle }}>My Orders</span>
            <div className="flex-1 h-px" style={{ background: C.border }} />
          </div>
        )}

        {/* Regular Orders */}
        {hasRegular && (
          <div className="space-y-3">
            {regularShown.map((order, i) => (
              <OrderCard key={order.id} order={order} onManage={() => {}} index={i} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
