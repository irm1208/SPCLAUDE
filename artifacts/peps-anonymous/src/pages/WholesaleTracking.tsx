import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Search, Clock, CheckCircle2, AlertTriangle, Truck, ExternalLink,
  ChevronRight, RefreshCw, XCircle, Bell, BellOff, ArrowLeft, Loader2, Link2, Info
} from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useAccount, useAccountOrderDetail, useWholesaleTracking, useUpdateWholesaleTrackingPrefs, type WholesaleTrackingOrder, type WholesaleTrackingParcel } from "@/hooks/use-account";
import { useThemeStore } from "@/hooks/use-theme";
import { formatOrderMoney, getLatestTrackingEvent, formatSafeDateTime, formatSafeTimeAgo, normalizeTrackingParcels, trackingHistoryId } from "./wholesale-tracking-model";

const ATTENTION_STATUSES = [
  "redirected",
  "seized",
  "return_to_sender",
  "exception",
  "attempted",
  "undeliverable",
  "expired",
];

function isAttentionNeeded(status: string | null | undefined): boolean {
  if (!status) return false;
  return ATTENTION_STATUSES.includes(status.toLowerCase());
}

function getStatusInfo(status: string | null | undefined) {
  if (!status) return { label: "Pending", color: "#64748B", bg: "rgba(100,116,139,0.1)", icon: Clock };
  const s = status.toLowerCase();

  if (s === "delivered") return { label: "Delivered", color: "#16A34A", bg: "rgba(22,163,74,0.1)", icon: CheckCircle2 };
  if (isAttentionNeeded(s)) return { label: "Attention Needed", color: "#DC2626", bg: "rgba(220,38,38,0.1)", icon: AlertTriangle };
  return { label: "In Transit", color: "var(--t-blue)", bg: "var(--t-blue-10)", icon: Truck };
}


export default function WholesaleTracking() {
  const [, setLocation] = useLocation();
  const { account, isLoading: accountLoading } = useAccount();
  const { data, isLoading: dataLoading, error, refetch } = useWholesaleTracking();
  const updatePrefs = useUpdateWholesaleTrackingPrefs();
  const [filter, setFilter] = useState<"All" | "In transit" | "Attention needed" | "Delivered">("All");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  React.useEffect(() => {
    if (!accountLoading && !account) {
      setLocation("/login");
    }
  }, [accountLoading, account, setLocation]);

  const orders = data?.orders || [];

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (filter === "All") return true;
      if (filter === "In transit") return !isAttentionNeeded(o.trackingStatus) && o.trackingStatus?.toLowerCase() !== "delivered";
      if (filter === "Attention needed") return isAttentionNeeded(o.trackingStatus);
      if (filter === "Delivered") return o.trackingStatus && o.trackingStatus.toLowerCase() === "delivered";
      return true;
    });
  }, [orders, filter]);

  const counts = useMemo(() => ({
    all: orders.length,
    inTransit: orders.filter(o => !isAttentionNeeded(o.trackingStatus) && o.trackingStatus?.toLowerCase() !== "delivered").length,
    attention: orders.filter(o => isAttentionNeeded(o.trackingStatus)).length,
    delivered: orders.filter(o => o.trackingStatus && o.trackingStatus.toLowerCase() === "delivered").length,
  }), [orders]);

  if (accountLoading || (dataLoading && !data)) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--t-muted)" }} />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button onClick={() => setLocation("/account")} className="flex items-center gap-1.5 text-sm font-semibold mb-6 transition-opacity hover:opacity-70" style={{ color: "var(--t-muted)" }}>
            <ArrowLeft className="w-4 h-4" />
            Back to Account
          </button>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <h2 className="text-red-900 font-bold mb-2">Failed to load tracking data</h2>
            <p className="text-red-700 text-sm mb-4">There was an issue communicating with the logistics server.</p>
            <button onClick={() => refetch()} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-red-700 transition-colors">
              Retry
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10 pb-32">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={() => setLocation("/account")} className="flex items-center gap-1.5 text-sm font-semibold mb-3 transition-opacity hover:opacity-70" style={{ color: "var(--t-muted)" }}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: "var(--t-text)" }}>Logistics Control Room</h1>
            <p className="text-sm mt-1" style={{ color: "var(--t-subtle)" }}>Direct Wholesale Tracking</p>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <button
              role="switch"
              aria-checked={data?.alertsEnabled ?? false}
              aria-label="Wholesale tracking alerts"
              onClick={() => updatePrefs.mutate(!data?.alertsEnabled)}
              disabled={updatePrefs.isPending}
              className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-xl border transition-all active:scale-95 disabled:opacity-50"
              style={{
                background: data?.alertsEnabled ? "var(--t-blue-10)" : "var(--t-surface)",
                borderColor: data?.alertsEnabled ? "var(--t-blue-20)" : "var(--t-border)",
                color: data?.alertsEnabled ? "var(--t-blue)" : "var(--t-muted)"
              }}
            >
              {updatePrefs.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> :
               data?.alertsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              <span className="text-xs md:text-sm font-bold hidden sm:inline">
                {data?.alertsEnabled ? "Alerts Enabled" : "Alerts Off"}
              </span>
            </button>
            <p className="text-[11px] max-w-[200px]" style={{ color: "var(--t-subtle)" }}>
              When enabled, updates appear in your in-app feed and linked Telegram or Discord.
            </p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20 rounded-3xl" style={{ border: "1px dashed var(--t-border)", background: "var(--t-surface)" }}>
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ background: "var(--t-blue-05)" }}>
              <Package className="w-8 h-8" style={{ color: "var(--t-blue-40)" }} />
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: "var(--t-text)" }}>No active shipments</h2>
            <p className="text-sm max-w-md mx-auto" style={{ color: "var(--t-subtle)" }}>
              You don't have any direct wholesale orders with active tracking numbers. Tracking numbers appear here once dispatched.
            </p>
            <button onClick={() => setLocation("/wholesale")} className="mt-6 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity" style={{ background: "var(--t-blue)" }}>
              Place Wholesale Order
            </button>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex overflow-x-auto gap-2 mb-6 pb-2 no-scrollbar">
              {(["All", "In transit", "Attention needed", "Delivered"] as const).map(f => {
                const isActive = filter === f;
                const count = f === "All" ? counts.all : f === "In transit" ? counts.inTransit : f === "Attention needed" ? counts.attention : counts.delivered;

                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                    style={{
                      background: isActive ? "var(--t-text)" : "var(--t-surface)",
                      color: isActive ? "var(--t-surface)" : "var(--t-muted)",
                      border: `1px solid ${isActive ? "transparent" : "var(--t-border)"}`,
                      boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.1)" : "none"
                    }}
                  >
                    {f}
                    <span className="flex items-center justify-center min-w-[20px] h-5 rounded-md text-[11px] px-1.5"
                      style={{
                        background: isActive ? "rgba(255,255,255,0.2)" : "var(--t-bg)",
                        color: isActive ? "var(--t-surface)" : "var(--t-subtle)"
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* List */}
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 rounded-2xl" style={{ border: "1px dashed var(--t-border)", background: "var(--t-surface)" }}>
                <Search className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--t-subtle)", opacity: 0.5 }} />
                <p className="text-sm font-semibold" style={{ color: "var(--t-muted)" }}>No shipments match this filter.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {filteredOrders.map(order => (
                    <OrderTrackingCard key={order.id} order={order} onOrderDetails={() => setSelectedOrderId(order.id)} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
      <OrderDetailsDialog orderId={selectedOrderId} onOpenChange={open => { if (!open) setSelectedOrderId(null); }} />
    </PageLayout>
  );
}

function OrderTrackingCard({ order, onOrderDetails }: { order: WholesaleTrackingOrder, onOrderDetails: () => void }) {
  const { label, color, bg, icon: StatusIcon } = getStatusInfo(order.trackingStatus);
  const parcels = normalizeTrackingParcels(order);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group relative"
      style={{ border: "1px solid var(--t-border)", background: "var(--t-surface)" }}
    >
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="font-mono text-sm font-bold tracking-tight bg-slate-100 px-2 py-0.5 rounded-md" style={{ color: "var(--t-text)", background: "var(--t-bg)" }}>
                #{order.code}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" style={{ color, background: bg }}>
                <StatusIcon className="w-3.5 h-3.5" />
                {label}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-2.5">
              {order.trackingNumbers.map(tn => (
                <a
                  key={tn}
                  href={`https://t.17track.net/en#nums=${encodeURIComponent(tn)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-medium px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-slate-50"
                  style={{ color: "var(--t-blue)", borderColor: "var(--t-blue-20)", background: "var(--t-blue-03)" }}
                  onClick={e => e.stopPropagation()}
                >
                  <Truck className="w-3.5 h-3.5 opacity-70" />
                  {tn}
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            <button
              onClick={onOrderDetails}
              className="inline-flex items-center gap-1 text-sm font-bold transition-opacity hover:opacity-70 px-3 py-1.5 rounded-lg bg-slate-100"
              style={{ color: "var(--t-text)", background: "var(--t-bg)" }}
            >
              Order Details
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3 mt-2">
          {parcels.map(parcel => <TrackingParcelRow key={parcel.trackingNumber} orderId={order.id} parcel={parcel} />)}
        </div>
      </div>
    </motion.div>
  );
}

function TrackingParcelRow({ orderId, parcel }: { orderId: string; parcel: WholesaleTrackingParcel }) {
  const [showPrevious, setShowPrevious] = useState(false);
  const latestEvent = getLatestTrackingEvent(parcel.events);
  const olderEvents = parcel.events
    .filter(event => event !== latestEvent)
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const { label, color } = getStatusInfo(parcel.status);
  const historyId = trackingHistoryId(orderId, parcel.trackingNumber);
  const formattedDate = latestEvent ? formatSafeDateTime(latestEvent.date) : null;
  const checkedAgo = formatSafeTimeAgo(parcel.lastChecked);
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)" }}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="font-mono text-xs font-bold" style={{ color: "var(--t-blue)" }}>{parcel.trackingNumber}</span>
        <span className="text-xs font-semibold" style={{ color }}>{label}</span>
      </div>
          {latestEvent ? (
            <div className="flex gap-4 relative">
              <div className="w-1.5 bg-blue-500 rounded-full shrink-0" style={{ background: color, opacity: 0.6 }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate mb-0.5" style={{ color: "var(--t-text)" }}>
                  {latestEvent.status}
                </p>
                <div className="flex items-center gap-3 text-xs" style={{ color: "var(--t-subtle)" }}>
                  <span className="truncate max-w-[50%]">{latestEvent.location || "Carrier Network"}</span>
                  {formattedDate && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                      <span className="shrink-0">{formattedDate}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--t-muted)" }}>
              <Info className="w-4 h-4 opacity-50" />
              Awaiting carrier updates
            </div>
          )}

          {checkedAgo && (
            <div className="flex justify-end mt-2 pt-2 border-t text-[10px] uppercase tracking-wider font-semibold" style={{ borderColor: "var(--t-border)", color: "var(--t-subtle)", opacity: 0.7 }}>
              Checked {checkedAgo}
            </div>
          )}
           <button type="button" onClick={() => setShowPrevious(!showPrevious)} aria-expanded={showPrevious} aria-controls={olderEvents.length > 0 ? historyId : undefined}
             disabled={olderEvents.length === 0} className="mt-3 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed" style={{ color: "var(--t-blue)" }}>
             Previous updates ({olderEvents.length})
           </button>
           {olderEvents.length > 0 && <div id={historyId} hidden={!showPrevious} className="mt-2 space-y-2">
                {olderEvents.map((event, index) => <div key={`${event.date}-${index}`} className="text-xs border-t pt-2" style={{ borderColor: "var(--t-border)", color: "var(--t-muted)" }}>
                  <span className="font-semibold">{event.status}</span>{event.location ? ` — ${event.location}` : ""} {formatSafeDateTime(event.date) ? `· ${formatSafeDateTime(event.date)}` : ""}
                </div>)}
           </div>}
        </div>
  );
}

function OrderDetailsDialog({ orderId, onOpenChange }: { orderId: string | null; onOpenChange: (open: boolean) => void }) {
  const { data: order, isLoading, error, refetch } = useAccountOrderDetail(orderId, !!orderId);
  return (
    <Dialog.Root open={!!orderId} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-xl" style={{ background: "var(--t-surface)" }}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <Dialog.Title className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Order Details</Dialog.Title>
            <Dialog.Close aria-label="Close order details" className="p-1 rounded"><XCircle className="w-5 h-5" /></Dialog.Close>
          </div>
          {isLoading ? <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
            : error ? <div className="py-6 text-center"><p className="text-sm mb-3">Failed to load order details.</p><button className="text-sm font-bold" onClick={() => refetch()}>Retry</button></div>
            : !order?.lineItems?.length ? <p className="py-6 text-center text-sm" style={{ color: "var(--t-muted)" }}>No order items found.</p>
            : <div className="space-y-3">{order.lineItems.map((item, index) => <div key={`${item.productName}-${index}`} className="border-b pb-3 text-sm" style={{ borderColor: "var(--t-border)" }}>
              <div className="font-semibold" style={{ color: "var(--t-text)" }}>{item.productName}</div>
              <div className="flex justify-between mt-1" style={{ color: "var(--t-muted)" }}><span>Qty {item.quantity} · {formatOrderMoney(item.unitPrice, order.currency)}</span><span>{formatOrderMoney(item.lineTotal, order.currency)}</span></div>
            </div>)}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
