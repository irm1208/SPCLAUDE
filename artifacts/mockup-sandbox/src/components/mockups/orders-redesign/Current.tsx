import './_group.css';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Clock, RefreshCw, Truck, FileText,
  CheckCircle2, XCircle, ArrowRight, AlertCircle,
  ChevronDown, ChevronUp, ShoppingBag,
  Users, ArrowLeft,
} from 'lucide-react';

// ─── Theme tokens ──────────────────────────────────────────────────────────────
const T = {
  bg: "#F4F4F5",
  surface: "#FFFFFF",
  surface2: "#F4F4F5",
  border: "#E4E4E7",
  text: "#1A1D1F",
  muted: "#4B5563",
  subtle: "#71717A",
};

// ─── Meta ──────────────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  Draft:      { label: "Draft",      color: "#64748B", bg: "rgba(100,116,139,0.1)", icon: FileText },
  Submitted:  { label: "Submitted",  color: "#2D6BCC", bg: "rgba(45,107,204,0.1)",  icon: Clock },
  Processing: { label: "Processing", color: "#2D6BCC", bg: "rgba(45,107,204,0.1)",  icon: RefreshCw },
  Shipped:    { label: "Shipped",    color: "#7C3AED", bg: "rgba(124,58,237,0.1)", icon: Truck },
  Completed:  { label: "Completed",  color: "#16A34A", bg: "rgba(22,163,74,0.1)",  icon: CheckCircle2 },
  Cancelled:  { label: "Cancelled",  color: "#DC2626", bg: "rgba(220,38,38,0.1)",  icon: XCircle },
};

const PAYMENT_META: Record<string, { label: string; color: string }> = {
  unpaid:               { label: "Unpaid",  color: "#94A3B8" },
  pending_confirmation: { label: "Pending", color: "#2D6BCC" },
  confirmed:            { label: "Paid",    color: "#16A34A" },
  test_confirmed:       { label: "Test OK", color: "#2D6BCC" },
  failed:               { label: "Failed",  color: "#DC2626" },
};

// ─── Types ─────────────────────────────────────────────────────────────────────
type LineItem = { productName: string; quantity: number; unitPrice: number; lineTotal: number };
type Order = {
  id: string; code: string; telegramUsername: string;
  status: string; paymentStatus: string; grandTotal: number;
  productSubtotal: number; lineItems: LineItem[];
  adminMessage: string | null; trackingNumber: string | null;
  createdAt: string; notes: string | null;
  deliveryMethod: string; groupBuyId: string | null;
};

// ─── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_ORDERS: Order[] = [
  {
    id: "1", code: "SP-A1B2", telegramUsername: "@johndoe",
    status: "Shipped", paymentStatus: "confirmed", grandTotal: 148.50,
    productSubtotal: 130, lineItems: [
      { productName: "BPC-157 5mg", quantity: 3, unitPrice: 28, lineTotal: 84 },
      { productName: "TB-500 2mg", quantity: 2, unitPrice: 23, lineTotal: 46 },
    ],
    adminMessage: null,
    trackingNumber: "RM123456789GB",
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
    trackingNumber: null,
    createdAt: "2026-04-08T14:30:00Z", notes: "Please ship asap if possible!",
    deliveryMethod: "InPost Locker", groupBuyId: null,
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

// ─── OrderCard ─────────────────────────────────────────────────────────────────
function OrderCard({ order, onManage }: { order: Order; onManage: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const sm = STATUS_META[order.status] ?? { label: order.status, color: "#64748B", bg: "rgba(100,116,139,0.1)", icon: FileText };
  const pm = PAYMENT_META[order.paymentStatus] ?? { label: order.paymentStatus, color: "#94A3B8" };
  const StatusIcon = sm.icon;
  const createdDate = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const isPaid = order.paymentStatus === "confirmed" || order.paymentStatus === "test_confirmed";

  return (
    <motion.div layout className="rounded-2xl overflow-hidden shadow-sm"
      style={{ background: T.surface, border: `1px solid ${T.border}` }}>

      <div className="h-1 w-full" style={{ background: sm.color, opacity: 0.7 }} />

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] font-bold tracking-widest px-2 py-0.5 rounded-lg"
                style={{ background: T.surface2, color: T.text }}>
                {order.code}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: sm.bg, color: sm.color }}>
                <StatusIcon className="w-2.5 h-2.5" />
                {sm.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px]" style={{ color: T.subtle }}>{createdDate}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: isPaid ? "rgba(22,163,74,0.1)" : "rgba(148,163,184,0.1)", color: pm.color }}>
                {pm.label}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold leading-none" style={{ color: T.text }}>£{order.grandTotal.toFixed(2)}</p>
            <p className="text-[10px] mt-1" style={{ color: T.subtle }}>
              {order.lineItems.length} item{order.lineItems.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {order.deliveryMethod && (
          <div className="flex items-center gap-1.5">
            <Package className="w-3 h-3 shrink-0" style={{ color: T.subtle }} />
            <span className="text-[11px]" style={{ color: T.muted }}>{order.deliveryMethod}</span>
          </div>
        )}

        {order.adminMessage && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
            style={{ background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.25)" }}>
            <AlertCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed" style={{ color: T.muted }}>{order.adminMessage}</p>
          </div>
        )}

        {order.trackingNumber && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
            style={{ background: "rgba(45,107,204,0.06)", border: "1px solid rgba(45,107,204,0.18)" }}>
            <Truck className="w-3.5 h-3.5 shrink-0" style={{ color: "#2D6BCC" }} />
            <span className="font-semibold" style={{ color: "#2D6BCC" }}>Tracking:</span>
            <span className="font-mono truncate" style={{ color: T.text }}>{order.trackingNumber}</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex-1 h-9 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
            style={{ background: T.surface2, color: T.muted }}>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Hide items" : `${order.lineItems.length} item${order.lineItems.length !== 1 ? "s" : ""}`}
          </button>
          <button
            onClick={onManage}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-[11px] font-bold text-white transition-opacity active:opacity-80"
            style={{ background: "linear-gradient(135deg, #2D6BCC, #1B3A7A)" }}>
            Manage <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: T.border }}>
              {order.lineItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs gap-2">
                  <span className="flex-1 min-w-0 truncate font-medium" style={{ color: T.muted }}>{item.productName}</span>
                  <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: T.surface2, color: T.subtle }}>×{item.quantity}</span>
                  <span className="shrink-0 font-bold text-[11px]" style={{ color: T.text }}>£{item.lineTotal.toFixed(2)}</span>
                </div>
              ))}
              {order.notes && (
                <p className="text-[11px] italic pt-2 border-t" style={{ color: T.subtle, borderColor: T.border }}>{order.notes}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function Current() {
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

  return (
    <div className="min-h-screen" style={{ background: T.bg }}>
      <div className="max-w-md mx-auto px-4 pt-4 pb-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <ArrowLeft className="w-4 h-4" style={{ color: T.muted }} />
            </button>
            <div>
              <h1 className="text-base font-bold" style={{ color: T.text }}>My Orders</h1>
              <p className="text-[11px]" style={{ color: T.subtle }}>{totalOrders} orders total</p>
            </div>
          </div>
          <button className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <RefreshCw className="w-3.5 h-3.5" style={{ color: T.muted }} />
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total",     value: totalOrders, color: T.text    },
            { label: "Active",    value: totalActive,  color: "#2D6BCC" },
            { label: "Completed", value: completed,    color: "#16A34A" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3 text-center shadow-sm" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <p className="text-2xl font-bold leading-none mb-1" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: T.subtle }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Toggle */}
        <div className="flex gap-1.5 p-1 rounded-2xl" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          {([
            { id: "active"   as const, label: "Active",   Icon: Package, count: totalActive   },
            { id: "previous" as const, label: "Previous",  Icon: Clock,   count: totalPrevious },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveFilter(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-semibold transition-all"
              style={activeFilter === tab.id
                ? { background: "linear-gradient(135deg, #2D6BCC, #1B3A7A)", color: "white" }
                : { color: T.muted }}>
              <tab.Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: activeFilter === tab.id ? "rgba(255,255,255,0.2)" : T.surface2 }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {nothingAtAll && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingBag className="w-10 h-10 mb-3" style={{ color: T.subtle }} />
            <p className="text-sm font-semibold" style={{ color: T.muted }}>
              {activeFilter === "active" ? "No active orders" : "No previous orders"}
            </p>
            <p className="text-xs mt-1" style={{ color: T.subtle }}>
              {activeFilter === "active" ? "Your current orders will appear here" : "Completed and cancelled orders appear here"}
            </p>
          </div>
        )}

        {/* Group Buy Orders */}
        {hasGb && (
          <>
            <div className="flex items-center gap-2 px-0.5 pt-1">
              <div className="flex-1 h-px" style={{ background: T.border }} />
              <span className="text-[10px] font-bold uppercase tracking-widest px-2" style={{ color: T.subtle }}>Group Buy Orders</span>
              <div className="flex-1 h-px" style={{ background: T.border }} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(45,107,204,0.1)" }}>
                  <Users className="w-3.5 h-3.5" style={{ color: "#2D6BCC" }} />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: T.text }}>{MOCK_GB.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-[10px] font-semibold" style={{ color: T.subtle }}>Closed · {gbShown.length} orders</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3 pl-1 border-l-2 ml-3.5" style={{ borderColor: "rgba(45,107,204,0.25)" }}>
                <AnimatePresence>
                  {gbShown.map((order, i) => (
                    <motion.div key={order.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <OrderCard order={order} onManage={() => {}} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </>
        )}

        {/* Regular Orders */}
        {hasRegular && (
          <div className="space-y-3">
            {hasGb && (
              <div className="flex items-center gap-3 px-1">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: T.surface2 }}>
                  <ShoppingBag className="w-3.5 h-3.5" style={{ color: T.muted }} />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: T.text }}>My Orders</p>
                  <p className="text-[10px]" style={{ color: T.subtle }}>{regularShown.length} order{regularShown.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            )}
            <AnimatePresence>
              {regularShown.map((order, i) => (
                <motion.div key={order.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <OrderCard order={order} onManage={() => {}} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
}
