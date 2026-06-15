import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import {
  Package, Loader2, MapPin, Clock, CheckCircle2,
  Truck, AlertTriangle, RefreshCw, Box, ChevronDown, ChevronUp, ArrowLeft,
} from "lucide-react";

type TrackingEvent = {
  date: string;
  status: string;
  location: string;
};

type TrackingPackage = {
  id: string;
  label: string;
  carrier: string;
  trackingNumber: string;
  status: string;
  statusCode: number;
  items: string[];
  cachedEvents: TrackingEvent[];
  lastChecked: string | null;
};

type TrackingLink = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  packages: TrackingPackage[];
  pendingItems?: string[];
  updatedAt: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.FC<any> }> = {
  pending:          { label: "Pending",            color: "#94A3B8", bg: "rgba(148,163,184,0.1)", icon: Clock },
  in_transit:       { label: "In Transit",         color: "#3B82F6", bg: "rgba(59,130,246,0.1)",  icon: Truck },
  out_for_delivery: { label: "Out for Delivery",   color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  icon: Package },
  attempted:        { label: "Delivery Attempted", color: "#F97316", bg: "rgba(249,115,22,0.1)",  icon: AlertTriangle },
  delivered:        { label: "Delivered",          color: "#22C55E", bg: "rgba(34,197,94,0.1)",   icon: CheckCircle2 },
  exception:        { label: "Exception",          color: "#EF4444", bg: "rgba(239,68,68,0.1)",   icon: AlertTriangle },
  expired:          { label: "Expired",            color: "#64748B", bg: "rgba(100,116,139,0.1)", icon: Clock },
};

function fmt(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  } catch { return dateStr; }
}

function PackageCard({
  pkg, open, onToggle,
}: {
  pkg: TrackingPackage;
  open: boolean;
  onToggle: () => void;
}) {
  const cfg = STATUS_CONFIG[pkg.status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const sortedEvents = [...pkg.cachedEvents].sort((a, b) => (b.date > a.date ? 1 : -1));

  return (
    <div
      className="rounded-2xl overflow-hidden transition-shadow"
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: open ? "0 4px 20px rgba(0,0,0,0.10)" : "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      {/* ── Header (always visible) ── */}
      <div
        className="flex items-start gap-3 px-5 py-4 cursor-pointer select-none"
        onClick={onToggle}
      >
        {/* Status icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: cfg.bg }}
        >
          <Icon className="w-5 h-5" style={{ color: cfg.color }} />
        </div>

        {/* Labels */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm text-slate-800">{pkg.label}</p>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: cfg.bg, color: cfg.color }}
            >
              {cfg.label}
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400 mt-0.5">{pkg.trackingNumber}</p>

          {/* Product names — shown only when collapsed */}
          {!open && pkg.items.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {pkg.items.map((item, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md"
                  style={{ background: "rgba(37,99,235,0.06)", color: "#1E40AF" }}
                >
                  <Box className="w-2.5 h-2.5" />
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Chevron */}
        <span className="text-slate-400 shrink-0 mt-1">
          {open
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />}
        </span>
      </div>

      {/* ── Expanded body ── */}
      {open && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          {/*
            Desktop: 2-pane grid — left side has items + metadata,
            right side has the tracking timeline.
            Mobile/tablet: stacked vertically.
          */}
          <div className="lg:grid lg:grid-cols-[200px_1fr]">

            {/* Left pane: items + last-updated */}
            <div
              className="px-5 py-4 lg:border-r"
              style={{ borderColor: "rgba(0,0,0,0.05)" }}
            >
              {pkg.items.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {pkg.items.map((item, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg"
                      style={{ background: "rgba(37,99,235,0.06)", color: "#1E40AF" }}
                    >
                      <Box className="w-3 h-3" />
                      {item}
                    </span>
                  ))}
                </div>
              )}

              {pkg.lastChecked && (
                <p className="text-[10px] text-slate-300 flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5" />
                  Last updated {fmt(pkg.lastChecked)}
                </p>
              )}

              {pkg.items.length === 0 && !pkg.lastChecked && (
                <p className="text-[11px] text-slate-300 italic">No item details</p>
              )}
            </div>

            {/* Right pane: events timeline */}
            <div className="px-5 py-4">
              {sortedEvents.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  No tracking updates yet. Check back soon.
                </p>
              ) : (
                <div className="relative pl-5">
                  {/* Vertical timeline line */}
                  <div
                    className="absolute left-1.5 top-2 bottom-2 w-px"
                    style={{ background: "rgba(0,0,0,0.08)" }}
                  />
                  {sortedEvents.map((ev, i) => (
                    <div key={i} className="relative mb-4 last:mb-0">
                      <div
                        className="absolute -left-[15px] top-1.5 w-2 h-2 rounded-full"
                        style={{ background: i === 0 ? "#3B82F6" : "#CBD5E1" }}
                      />
                      <p className="text-xs font-semibold text-slate-700 leading-snug">{ev.status}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {ev.location && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <MapPin className="w-3 h-3" />{ev.location}
                          </span>
                        )}
                        {ev.date && (
                          <span className="text-[11px] text-slate-400">{fmt(ev.date)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackingPage() {
  const [, slugParams] = useRoute("/track/:slug");
  const [, parcelParams] = useRoute("/track/parcel/:parcelId");
  const [, memberParams] = useRoute("/track/gb/:gbId/member/:memberUsername");

  const isMemberRoute = !!memberParams?.gbId;
  const isParcelRoute = !!parcelParams?.parcelId;
  const itemsQs = isParcelRoute ? new URLSearchParams(window.location.search).get("items") : null;
  const apiUrl = isMemberRoute
    ? `/api/track/gb/${memberParams!.gbId}/member/${encodeURIComponent(memberParams!.memberUsername)}`
    : isParcelRoute
      ? `/api/track/parcel/${parcelParams!.parcelId}${itemsQs ? `?items=${encodeURIComponent(itemsQs)}` : ""}`
      : `/api/track/${slugParams?.slug ?? ""}`;

  const [link, setLink] = useState<TrackingLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const togglePkg = (id: string) =>
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  useEffect(() => {
    if (!apiUrl || apiUrl.endsWith("/")) return;
    setLoading(true);
    fetch(apiUrl)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(d => {
        if (d) setLink(d);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [apiUrl]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (notFound || !link) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: "#F8FAFC" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(239,68,68,0.1)" }}>
          <Package className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-700 mb-2">Tracking page not found</h1>
        <p className="text-sm text-slate-400">This tracking link may have expired or doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>

      {/* ── Page header ── */}
      <div style={{ background: "linear-gradient(135deg, #0D1B2A 0%, #1E3A5F 100%)" }}>
        {/* Responsive max-width: narrows on mobile, widens on tablet/desktop */}
        <div className="max-w-lg sm:max-w-2xl lg:max-w-5xl mx-auto px-5 pt-5 pb-8">
          {/* Back button row */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 mb-5 -ml-1 group"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all group-active:scale-95"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              <Truck className="w-4 h-4 text-white" />
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Shipment Tracking
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white leading-tight mb-1">{link.title}</h1>
          {link.description && (
            <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.6)" }}>{link.description}</p>
          )}
          <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.35)" }}>
            {link.packages.length} package{link.packages.length !== 1 ? "s" : ""}
            {(link.pendingItems?.length ?? 0) > 0 && (
              <span> · {link.pendingItems!.length} item{link.pendingItems!.length !== 1 ? "s" : ""} not yet dispatched</span>
            )}
            {link.packages.length > 0 && (
              <>
                {" · "}
                <button
                  className="underline underline-offset-2 hover:opacity-80 transition-opacity"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  onClick={() => {
                    const allIds = new Set(link.packages.map(p => p.id));
                    const allOpen = link.packages.every(p => openIds.has(p.id));
                    setOpenIds(allOpen ? new Set() : allIds);
                  }}
                >
                  {link.packages.every(p => openIds.has(p.id)) ? "Collapse all" : "Expand all"}
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── Package cards ── */}
      <div className="max-w-lg sm:max-w-2xl lg:max-w-5xl mx-auto px-4 py-6 space-y-6">
        {link.packages.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {link.packages.map(pkg => {
              const isOpen = openIds.has(pkg.id);
              return (
                <div key={pkg.id} className={isOpen ? "lg:col-span-2" : ""}>
                  <PackageCard
                    pkg={pkg}
                    open={isOpen}
                    onToggle={() => togglePkg(pkg.id)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* ── Not yet dispatched ── */}
        {(link.pendingItems?.length ?? 0) > 0 && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(148,163,184,0.12)" }}>
                <Clock className="w-5 h-5" style={{ color: "#94A3B8" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-slate-700">Not Yet Dispatched</span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(148,163,184,0.12)", color: "#94A3B8" }}
                  >
                    Awaiting shipment
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {link.pendingItems!.length} item{link.pendingItems!.length !== 1 ? "s" : ""} from your order {link.packages.length > 0 ? "not yet assigned to a parcel" : "not yet dispatched"}
                </p>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="space-y-2">
                {link.pendingItems!.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Box className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                    <span className="text-sm text-slate-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {link.packages.length === 0 && (link.pendingItems?.length ?? 0) === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-slate-400">No packages yet on this tracking page.</p>
          </div>
        )}
      </div>
    </div>
  );
}
