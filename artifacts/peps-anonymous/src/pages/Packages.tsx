import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, RefreshCw, CheckCircle, Clock, Truck, AlertCircle, MapPin, ChevronDown, ChevronUp, Globe } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { SiteAnnouncements } from "@/components/SiteAnnouncements";

type MaskedEvent = {
  date: string;
  status: string;
  location: string;
};

type Shipment = {
  id: string;
  label: string;
  carrier: string;
  status: string;
  origin: string;
  estimatedDelivery: string | null;
  events: MaskedEvent[];
  lastChecked: string | null;
  createdAt: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:          { label: "Registered",         color: "#64748B", bg: "rgba(100,116,139,0.12)", icon: Clock },
  in_transit:       { label: "In Transit",          color: "var(--t-blue)", bg: "var(--t-blue-12)",  icon: Truck },
  out_for_delivery: { label: "Out for Delivery",    color: "var(--t-blue)", bg: "rgba(245,158,11,0.12)",  icon: Truck },
  attempted:        { label: "Attempted Delivery",  color: "var(--t-blue)", bg: "rgba(249,115,22,0.12)",  icon: AlertCircle },
  delivered:        { label: "Delivered",           color: "#22C55E", bg: "rgba(34,197,94,0.12)",   icon: CheckCircle },
  exception:        { label: "Alert",               color: "#EF4444", bg: "rgba(239,68,68,0.12)",   icon: AlertCircle },
  expired:          { label: "Expired",             color: "#94A3B8", bg: "rgba(148,163,184,0.12)", icon: AlertCircle },
};

function statusCfg(status: string) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch { return dateStr; }
}

function ShipmentCard({ shipment }: { shipment: Shipment }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusCfg(shipment.status);
  const Icon = cfg.icon;
  const hasEvents = shipment.events.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden"
      style={{ background: "white", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-base leading-tight">{shipment.label}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Globe className="w-3 h-3 text-slate-400 shrink-0" />
              <p className="text-xs text-slate-400">{shipment.carrier} · From {shipment.origin}</p>
            </div>
          </div>
          <span
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold shrink-0"
            style={{ color: cfg.color, background: cfg.bg }}
          >
            <Icon className="w-3.5 h-3.5" />
            {cfg.label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              background: cfg.color,
              width: shipment.status === "pending" ? "8%"
                : shipment.status === "in_transit" ? "45%"
                : shipment.status === "out_for_delivery" ? "80%"
                : shipment.status === "delivered" ? "100%"
                : shipment.status === "exception" ? "50%"
                : "15%",
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">Updated {timeAgo(shipment.lastChecked)}</p>
          {shipment.estimatedDelivery && (
            <p className="text-xs font-semibold text-slate-500">Est. {fmtDate(shipment.estimatedDelivery)}</p>
          )}
        </div>
      </div>

      {/* Latest event */}
      {hasEvents && (
        <div className="px-4 pb-3">
          <div className="rounded-xl p-3 text-sm" style={{ background: "rgba(248,250,252,1)", border: "1px solid rgba(0,0,0,0.05)" }}>
            <p className="font-semibold text-slate-700 text-xs">{shipment.events[0].status}</p>
            {shipment.events[0].location && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <p className="text-xs text-slate-400">{shipment.events[0].location}</p>
              </div>
            )}
            {shipment.events[0].date && (
              <p className="text-xs text-slate-400 mt-0.5">{shipment.events[0].date}</p>
            )}
          </div>
        </div>
      )}

      {/* Expand/collapse timeline */}
      {hasEvents && shipment.events.length > 1 && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-blue-600 hover:text-blue-600 transition-colors"
            style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
          >
            {expanded ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Hide history</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> View history ({shipment.events.length - 1} more events)</>
            )}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                  <div className="pt-3 relative">
                    {/* Timeline line */}
                    <div className="absolute left-[23px] top-6 bottom-2 w-px bg-slate-100" />
                    <div className="space-y-3">
                      {shipment.events.slice(1).map((ev, i) => (
                        <div key={i} className="flex items-start gap-3 relative">
                          <div className="w-3 h-3 rounded-full bg-slate-200 mt-0.5 shrink-0 relative z-10" style={{ marginLeft: "6px" }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-600">{ev.status}</p>
                            {ev.location && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                <p className="text-xs text-slate-400">{ev.location}</p>
                              </div>
                            )}
                            {ev.date && <p className="text-xs text-slate-400 mt-0.5">{ev.date}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}

export default function Packages() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/shipments");
      const data = await r.json();
      setShipments(Array.isArray(data) ? data : []);
    } catch { setShipments([]); }
    setLoading(false);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [load]);

  const active = shipments.filter(s => s.status !== "delivered" && s.status !== "expired");
  const delivered = shipments.filter(s => s.status === "delivered" || s.status === "expired");

  return (
    <PageLayout>
    <div className="flex flex-col pb-6" style={{ background: "#F8FAFC", minHeight: "100%" }}>
      <SiteAnnouncements />

      <main className="flex-1 px-4 py-4 max-w-md mx-auto w-full flex flex-col gap-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 text-white flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, var(--t-blue) 0%, var(--t-blue) 100%)" }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-5 h-5 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Inventory Tracker</span>
            </div>
            <h1 className="text-xl font-bold text-white">Group Packages</h1>
            <p className="text-xs text-white/70 mt-1">Live shipment status — no tracking numbers shown</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-opacity bg-white/15"
          >
            <RefreshCw className={`w-4 h-4 text-white/80 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
            <p className="text-sm text-slate-400">Loading shipments…</p>
          </div>
        ) : shipments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-8 text-center"
            style={{ background: "white", border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "var(--t-blue-08)" }}>
              <Package className="w-7 h-7 text-blue-600" />
            </div>
            <p className="font-bold text-slate-700 mb-1">No active shipments</p>
            <p className="text-sm text-slate-400">Group shipments will appear here when dispatched.</p>
          </motion.div>
        ) : (
          <>
            {active.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-0.5">Active Shipments</p>
                {active.map(s => <ShipmentCard key={s.id} shipment={s} />)}
              </div>
            )}

            {delivered.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-0.5">Completed</p>
                {delivered.map(s => <ShipmentCard key={s.id} shipment={s} />)}
              </div>
            )}
          </>
        )}
      </main>

    </div>
    </PageLayout>
  );
}
