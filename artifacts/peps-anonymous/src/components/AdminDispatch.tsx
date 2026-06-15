import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Loader2, Package, PackageCheck, Printer, Check, AlertTriangle,
  ChevronRight, RefreshCw, Truck, X, CheckSquare, Square,
  Upload, ImagePlus, ZoomIn, Trash2, ChevronDown, ChevronUp, Camera, Bell,
} from "lucide-react";

function apiUrl(path: string) { return `/api${path}`; }

// ─── DispatchPhotoThumb — lazy-loads a single dispatch photo ─────────────────
function DispatchPhotoThumb({ imageId, headers }: { imageId: string; headers: Record<string, string> }) {
  const [src, setSrc] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl(`/admin/dispatch/images/${imageId}`), { headers, credentials: "omit" })
      .then(r => r.json())
      .then(d => { if (!cancelled && d.imageData) setSrc(d.imageData); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [imageId, headers]);

  if (!src) return <span className="text-[10px] text-muted-foreground italic">Loading…</span>;

  return (
    <>
      <img
        src={src}
        alt="Dispatch photo"
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        className="h-10 w-10 object-cover rounded border border-border cursor-zoom-in hover:opacity-80 transition-opacity shrink-0"
      />
      {open && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <img src={src} alt="Dispatch photo" className="max-w-full max-h-full rounded-xl shadow-2xl" />
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}

// ─── shared types ────────────────────────────────────────────────────────────
interface GbStub { id: string; name: string }

interface GbParcelItem {
  name: string;
  qty: number;
  dispatchedQty?: number;
  remainingQty: number;
}
interface DispatchParcel {
  id: string;
  label: string;
  reshipperUsername: string | null;
  carrier: string;
  trackingNumber: string;
  status: string;
  items: GbParcelItem[];
}

interface DispatchOrder {
  id: string;
  code?: string | null;
  telegramUsername: string;
  status: string;
  deliveryMethod: string | null;
  shippingName?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingPostcode?: string | null;
  shippingCountry?: string | null;
  reshipperUsername?: string | null;
  routingType?: string | null;
  lineItems: { productName: string; quantity: number }[];
  reason?: string;
}

interface ScopeOptions {
  reshippers: string[];
  countryLegs: { id: string; countryName: string; countryCode: string }[];
}

// ─── Types reused from ShippedItemsTab ───────────────────────────────────────
interface Fs3GbOrder {
  id: string; code?: string | null; telegramUsername: string; status: string;
  paymentStatus?: string | null; grandTotal: string | number | null;
  shippingCountry: string | null; shippingName?: string | null;
  shippingAddress?: string | null; deliveryMethod: string | null;
  createdAt: string;
  lineItems?: { productName: string; quantity: number; unitPrice?: number; lineTotal?: number }[];
  routingType?: string | null; reshipperUsername?: string | null;
  dispatchedByReshipper?: string | null;
  directShippingRequested?: boolean; trackingNumber?: string | null;
  trackingNumbers?: string[] | null; orderType?: string | null;
  dispatchArchivedAt?: string | null;
}
interface Fs3GbParcel {
  id: string; groupBuyId: string; reshipperUsername: string | null;
  label: string; carrier: string; trackingNumber: string; status: string;
  items: { name: string; qty: number }[]; createdAt: string;
}

// ─── half-kit types ───────────────────────────────────────────────────────────
interface HalfKitOrder {
  id: string;
  code?: string | null;
  telegramUsername: string;
  status: string;
  halfKitItems: { productName: string; quantity: number }[];
  totalHalfKits: number;
}
interface HalfKitReshipper {
  username: string | null;
  orders: HalfKitOrder[];
  totalHalfKits: number;
}

// ─── main export ─────────────────────────────────────────────────────────────
export function AdminDispatch({ secret }: { secret: string }) {
  const headers = useMemo(() => ({ "x-admin-secret": secret }), [secret]);
  const [subTab, setSubTab] = useState<"packing" | "halfkits" | "dispatched" | "archived-dispatched" | "shipped">("packing");
  const [groupBuys, setGroupBuys] = useState<GbStub[]>([]);
  const [selectedGb, setSelectedGb] = useState("");

  useEffect(() => {
    fetch(apiUrl("/admin/group-buys-list"), { headers, credentials: "omit" })
      .then(r => r.json())
      .then(d => setGroupBuys(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [headers]);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      {/* Sub-tab toggle */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-muted w-fit">
        {([
          ["packing", "Dispatch & Packing Slips"],
          ["halfkits", "Half Kits"],
          ["dispatched", "Dispatched Orders"],
          ["archived-dispatched", "Archived Dispatched"],
          ["shipped", "Shipped Items"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              subTab === id
                ? "bg-white shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* GB selector — shared */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Group Buy</label>
        <select
          value={selectedGb}
          onChange={e => setSelectedGb(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2 bg-background min-w-[240px] max-w-xs"
        >
          <option value="">— Select group buy —</option>
          {groupBuys.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {subTab === "packing" && (
        <PackingSlipsTab secret={secret} selectedGb={selectedGb} headers={headers} />
      )}
      {subTab === "halfkits" && (
        <HalfKitsTab selectedGb={selectedGb} headers={headers} />
      )}
      {subTab === "dispatched" && (
        <DispatchedOrdersTab selectedGb={selectedGb} headers={headers} />
      )}
      {subTab === "archived-dispatched" && (
        <ArchivedDispatchedOrdersTab selectedGb={selectedGb} headers={headers} />
      )}
      {subTab === "shipped" && (
        <ShippedItemsContent secret={secret} selectedGb={selectedGb} headers={headers} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HalfKitsTab — per-reshipper breakdown of orders containing half-kit items
// ─────────────────────────────────────────────────────────────────────────────
function HalfKitsTab({
  selectedGb,
  headers,
}: {
  selectedGb: string;
  headers: Record<string, string>;
}) {
  const [data, setData] = useState<HalfKitReshipper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>("");

  // Reset when GB changes
  useEffect(() => {
    setData([]);
    setSelectedKey("");
    setError("");
  }, [selectedGb]);

  useEffect(() => {
    if (!selectedGb) return;
    setLoading(true);
    setError("");
    fetch(apiUrl(`/admin/dispatch/${selectedGb}/half-kits`), { headers, credentials: "omit" })
      .then(r => r.json())
      .then(d => setData(Array.isArray(d.reshippers) ? d.reshippers : []))
      .catch(() => setError("Failed to load half-kit data"))
      .finally(() => setLoading(false));
  }, [selectedGb, headers]);

  if (!selectedGb) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Select a group buy to view half-kit orders</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-muted-foreground justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading half-kit orders…</span>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600 py-6 text-center">{error}</p>;
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground border rounded-xl bg-muted/20">
        <PackageCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No half-kit orders found</p>
        <p className="text-xs mt-1 opacity-70">All orders in this group buy have whole-kit quantities only.</p>
      </div>
    );
  }

  const selected = data.find(g => (g.username ?? "__direct__") === selectedKey) ?? null;

  return (
    <div className="space-y-4">
      {/* Reshipper picker */}
      <Section title="Reshipper">
        <div className="flex flex-wrap gap-1.5">
          {data.map(group => {
            const key = group.username ?? "__direct__";
            const active = selectedKey === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedKey(active ? "" : key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-input hover:bg-muted"
                }`}
              >
                {group.username ?? "Direct"}
                <span className={`font-bold rounded-full px-1.5 py-0.5 text-[10px] ${
                  active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"
                }`}>
                  {group.totalHalfKits} × ½
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Orders for selected reshipper */}
      {selected && (
        <Section title={`Orders — ${selected.username ?? "Direct"} (${selected.orders.length})`}>
          <div className="divide-y divide-border -mx-4 -mb-4">
            {selected.orders.map(order => (
              <div key={order.id} className="px-4 py-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-foreground">
                    {order.code ? `@${order.code}` : order.id.slice(0, 8)}
                  </span>
                  <span className="text-xs text-muted-foreground">{order.telegramUsername}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    order.status === "Shipped" || order.status === "Completed"
                      ? "bg-green-100 text-green-700"
                      : order.status === "Confirmed"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {order.status}
                  </span>
                  <span className="ml-auto text-xs font-semibold text-amber-700">
                    {order.totalHalfKits} × ½ kit
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {order.halfKitItems.map((item, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 rounded px-1.5 py-0.5 font-medium"
                    >
                      {item.quantity}× {item.productName}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {!selectedKey && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Select a reshipper above to see their half-kit orders.
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PackingSlipsTab — dispatch workflow with packing slip generation
// ─────────────────────────────────────────────────────────────────────────────
function PackingSlipsTab({
  secret,
  selectedGb,
  headers,
}: {
  secret: string;
  selectedGb: string;
  headers: Record<string, string>;
}) {
  const [scopeType, setScopeType] = useState<"reshipper" | "country" | "">("");
  const [scopeId, setScopeId] = useState("");
  const [scopeOptions, setScopeOptions] = useState<ScopeOptions | null>(null);
  const [scopeLoading, setScopeLoading] = useState(false);

  const [parcels, setParcels] = useState<DispatchParcel[]>([]);
  const [parcelsLoading, setParcelsLoading] = useState(false);
  const [selectedParcelIds, setSelectedParcelIds] = useState<Set<string>>(new Set());

  const [computing, setComputing] = useState(false);
  const [computeResult, setComputeResult] = useState<{
    fulfillable: DispatchOrder[];
    unfulfillable: DispatchOrder[];
  } | null>(null);

  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showPrint, setShowPrint] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Notify InPost QR upload
  const [notifyingQr, setNotifyingQr] = useState(false);
  const [notifyQrMsg, setNotifyQrMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Marking unfulfillable (already-dispatched) orders as Shipped
  const [markingUnfulfillable, setMarkingUnfulfillable] = useState(false);
  const [markUnfulfillableMsg, setMarkUnfulfillableMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Order overview for the selected reshipper
  interface OverviewOrder { id: string; code: string; telegramUsername: string | null; shippingName: string | null; status: string }
  const [overviewOrders, setOverviewOrders] = useState<OverviewOrder[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [ovExpanded, setOvExpanded] = useState<Record<string, boolean>>({ dispatched: false, ready: true, cannot: true, pending: false });
  const [ovCannotSelected, setOvCannotSelected] = useState<Set<string>>(new Set());

  // Reset downstream when GB changes
  useEffect(() => {
    setScopeType("");
    setScopeId("");
    setScopeOptions(null);
    setParcels([]);
    setSelectedParcelIds(new Set());
    setComputeResult(null);
    setSelectedOrderIds(new Set());
    setConfirmMsg(null);
  }, [selectedGb]);

  // Load scope options when GB selected
  useEffect(() => {
    if (!selectedGb) { setScopeOptions(null); return; }
    setScopeLoading(true);
    fetch(apiUrl(`/admin/dispatch/${selectedGb}/scope-options`), { headers, credentials: "omit" })
      .then(r => r.json())
      .then(d => setScopeOptions(d))
      .catch(() => setScopeOptions(null))
      .finally(() => setScopeLoading(false));
  }, [selectedGb, headers]);

  // Reset downstream when scope changes
  useEffect(() => {
    setScopeId("");
    setParcels([]);
    setSelectedParcelIds(new Set());
    setComputeResult(null);
    setSelectedOrderIds(new Set());
  }, [scopeType]);

  // Load parcels when scope + scopeId set
  useEffect(() => {
    if (!selectedGb || !scopeType || !scopeId) {
      setParcels([]);
      return;
    }

    setParcelsLoading(true);
    const params = new URLSearchParams({ scopeType, scopeId });
    fetch(apiUrl(`/admin/dispatch/${selectedGb}/parcels?${params}`), { headers, credentials: "omit" })
      .then(r => r.json())
      .then(d => {
        setParcels(Array.isArray(d) ? d : []);
        setSelectedParcelIds(new Set());
        setComputeResult(null);
        setSelectedOrderIds(new Set());
      })
      .catch(() => setParcels([]))
      .finally(() => setParcelsLoading(false));
  }, [selectedGb, scopeType, scopeId, headers]);

  // Load all orders for the selected reshipper for the overview panel
  useEffect(() => {
    setOverviewOrders([]);
    if (scopeType !== "reshipper" || !scopeId || !selectedGb) return;
    setOverviewLoading(true);
    const norm = scopeId.replace(/^@/, "");
    fetch(apiUrl(`/admin/orders?groupBuyId=${selectedGb}&reshipper=${encodeURIComponent(norm)}&pageSize=999`), { headers, credentials: "omit" })
      .then(r => r.json())
      .then((data: unknown) => {
        const raw = Array.isArray(data) ? data : (Array.isArray((data as any)?.orders) ? (data as any).orders : []);
        setOverviewOrders((raw as any[]).filter(o => !o.deletedAt));
      })
      .catch(() => {})
      .finally(() => setOverviewLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGb, scopeType, scopeId, headers]);

  const toggleParcel = (id: string) =>
    setSelectedParcelIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleOrder = (id: string) =>
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAllOrders = () =>
    setSelectedOrderIds(new Set(computeResult?.fulfillable.map(o => o.id) ?? []));

  const handleCompute = async () => {
    if (!selectedGb || selectedParcelIds.size === 0) return;
    setComputing(true);
    setComputeResult(null);
    setSelectedOrderIds(new Set());
    try {
      const r = await fetch(apiUrl(`/admin/dispatch/${selectedGb}/compute`), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          parcelIds: [...selectedParcelIds],
          scopeType,
          scopeId,
        }),
      });
      const d = await r.json();
      setComputeResult(d);
      setSelectedOrderIds(new Set(d.fulfillable.map((o: DispatchOrder) => o.id)));
      // Supplement overview with any orders compute found that the broad fetch may have missed
      setOverviewOrders(prev => {
        const existingIds = new Set(prev.map(o => o.id));
        const extras: OverviewOrder[] = [...d.fulfillable, ...d.unfulfillable]
          .filter((o: DispatchOrder) => !existingIds.has(o.id))
          .map((o: DispatchOrder) => ({
            id: o.id,
            code: o.code,
            telegramUsername: (o as any).telegramUsername ?? null,
            shippingName: (o as any).shippingName ?? null,
            status: (o as any).status ?? "Processing",
          }));
        return extras.length > 0 ? [...prev, ...extras] : prev;
      });
    } catch {
      setComputeResult(null);
    } finally {
      setComputing(false);
    }
  };

  // Derived overview categories — updated reactively as compute runs
  const ovDispatched = useMemo(() => overviewOrders.filter(o => ["Shipped", "Completed"].includes(o.status)), [overviewOrders]);
  const readyIds = useMemo(() => new Set(computeResult?.fulfillable.map(o => o.id) ?? []), [computeResult]);
  const cannotIds = useMemo(() => new Set(computeResult?.unfulfillable.map(o => o.id) ?? []), [computeResult]);
  const ovReady = useMemo(() => overviewOrders.filter(o => readyIds.has(o.id)), [overviewOrders, readyIds]);
  const ovCannot = useMemo(() => overviewOrders.filter(o => cannotIds.has(o.id)), [overviewOrders, cannotIds]);
  const ovPending = useMemo(() => overviewOrders.filter(o =>
    !["Shipped", "Completed", "Cancelled"].includes(o.status) && !readyIds.has(o.id) && !cannotIds.has(o.id)
  ), [overviewOrders, readyIds, cannotIds]);

  const handleMarkUnfulfillableShipped = async (specificIds?: string[]) => {
    const idsToMark = specificIds && specificIds.length > 0
      ? specificIds
      : (computeResult?.unfulfillable.map(o => o.id) ?? []);
    if (idsToMark.length === 0) return;
    if (scopeType !== "reshipper" || !scopeId) return;
    setMarkingUnfulfillable(true);
    setMarkUnfulfillableMsg(null);
    try {
      const r = await fetch(apiUrl(`/admin/dispatch/${selectedGb}/mark-shipped-by-reshipper`), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ reshipper: scopeId, orderIds: idsToMark }),
      });
      const d = await r.json();
      if (r.ok) {
        setMarkUnfulfillableMsg({ ok: true, text: `✓ ${d.marked} order${d.marked !== 1 ? "s" : ""} marked as Shipped` });
        const markedSet = new Set(idsToMark);
        // Update local order statuses so overview reflects immediately
        setOverviewOrders(prev => prev.map(o => markedSet.has(o.id) ? { ...o, status: "Shipped" } : o));
        // Remove from compute result
        setComputeResult(prev => prev ? { ...prev, unfulfillable: prev.unfulfillable.filter(o => !markedSet.has(o.id)) } : prev);
        setOvCannotSelected(new Set());
      } else {
        setMarkUnfulfillableMsg({ ok: false, text: d.error ?? "Failed" });
      }
    } catch {
      setMarkUnfulfillableMsg({ ok: false, text: "Network error" });
    } finally {
      setMarkingUnfulfillable(false);
    }
  };

  const handleConfirm = async () => {
    if (selectedOrderIds.size === 0) return;
    setConfirming(true);
    setConfirmMsg(null);
    try {
      const r = await fetch(apiUrl(`/admin/dispatch/${selectedGb}/confirm`), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          orderIds: [...selectedOrderIds],
          parcelIds: [...selectedParcelIds],
        }),
      });
      const d = await r.json();
      if (d.ok) {
        setConfirmMsg({ ok: true, text: `Dispatch confirmed for ${d.confirmed} order${d.confirmed !== 1 ? "s" : ""}. Stock deducted. Re-run Calculate to see remaining orders.` });
        // Clear stale compute result so admin is prompted to re-run — ensures any
        // remaining orders (e.g. second half-kit order for the same product) reappear.
        setComputeResult(null);
        setSelectedOrderIds(new Set());
        // Reload parcels to show updated dispatchedQty
        if (selectedGb && scopeType && scopeId) {
          const params = new URLSearchParams({ scopeType, scopeId });
          fetch(apiUrl(`/admin/dispatch/${selectedGb}/parcels?${params}`), { headers, credentials: "omit" })
            .then(r2 => r2.json())
            .then(d2 => setParcels(Array.isArray(d2) ? d2 : []))
            .catch(() => {});
        }
      } else {
        setConfirmMsg({ ok: false, text: d.error ?? "Confirm failed" });
      }
    } catch {
      setConfirmMsg({ ok: false, text: "Network error" });
    } finally {
      setConfirming(false);
    }
  };

  const selectedOrders = useMemo(
    () => (computeResult?.fulfillable ?? []).filter(o => selectedOrderIds.has(o.id)),
    [computeResult, selectedOrderIds],
  );

  const inpostSelectedOrders = useMemo(
    () => selectedOrders.filter(o => o.deliveryMethod?.toLowerCase().includes("inpost")),
    [selectedOrders],
  );

  const handleNotifyInpostQr = async () => {
    if (inpostSelectedOrders.length === 0) return;
    setNotifyingQr(true);
    setNotifyQrMsg(null);
    try {
      const r = await fetch(apiUrl(`/admin/dispatch/${selectedGb}/notify-qr`), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ orderIds: inpostSelectedOrders.map(o => o.id) }),
      });
      const d = await r.json();
      if (d.ok) {
        setNotifyQrMsg({ ok: true, text: `Notified ${d.sent} customer${d.sent !== 1 ? "s" : ""} to upload their QR code${d.skipped ? ` (${d.skipped} skipped — no chat ID)` : ""}.` });
      } else {
        setNotifyQrMsg({ ok: false, text: d.error ?? "Notification failed" });
      }
    } catch {
      setNotifyQrMsg({ ok: false, text: "Network error" });
    } finally {
      setNotifyingQr(false);
    }
  };

  if (!selectedGb) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <PackageCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Select a group buy to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Step 1: Scope ── */}
      <Section title="1. Scope">
        {scopeLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["reshipper", "country"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setScopeType(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    scopeType === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-input hover:bg-muted"
                  }`}
                >
                  {t === "reshipper" ? "Reshipper" : "Country Leg"}
                </button>
              ))}
            </div>

            {scopeType === "reshipper" && scopeOptions && (
              scopeOptions.reshippers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reshippers have delivered parcels yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {scopeOptions.reshippers.map(r => (
                    <button
                      key={r}
                      onClick={() => setScopeId(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        scopeId === r
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input hover:bg-muted"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )
            )}

            {scopeType === "country" && scopeOptions && (
              scopeOptions.countryLegs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No country legs for this group buy.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {scopeOptions.countryLegs.map(leg => (
                    <button
                      key={leg.id}
                      onClick={() => setScopeId(leg.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        scopeId === leg.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input hover:bg-muted"
                      }`}
                    >
                      {leg.countryName}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </Section>

      {/* ── Step 2: Parcels ── */}
      {scopeType && scopeId && (
        <Section title="2. Select Delivered Parcels">
          {parcelsLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : parcels.length === 0 ? (
            <p className="text-sm text-muted-foreground">No delivered parcels found for this scope.</p>
          ) : (
            <div className="space-y-2">
              {parcels.map(p => {
                const checked = selectedParcelIds.has(p.id);
                const totalRemaining = p.items.reduce((s, i) => s + i.remainingQty, 0);
                const totalDispatched = p.items.reduce((s, i) => s + (i.dispatchedQty ?? 0), 0);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleParcel(p.id)}
                    className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        checked ? "bg-primary border-primary" : "border-muted-foreground/40"
                      }`}>
                        {checked && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">{p.label}</span>
                          {p.reshipperUsername && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                              {p.reshipperUsername}
                            </span>
                          )}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            p.status === "delivered"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {p.status.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">{p.trackingNumber}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {p.items.map((item, i) => {
                            const fullyDispatched = item.remainingQty <= 0;
                            const isHalfKit = item.dispatchedQty != null && item.dispatchedQty % 1 !== 0;
                            return (
                              <span
                                key={i}
                                className={`text-[11px] px-2 py-0.5 rounded border font-medium flex items-center gap-1 ${
                                  fullyDispatched
                                    ? isHalfKit
                                      ? "bg-amber-50 border-amber-200 text-amber-700"
                                      : "bg-red-50 border-red-200 text-red-600"
                                    : "bg-slate-50 border-slate-200 text-slate-700"
                                }`}
                              >
                                <span className={fullyDispatched ? "line-through" : ""}>
                                  {item.name} ×{item.remainingQty}
                                </span>
                                {item.dispatchedQty ? (
                                  <span className={`font-normal ${fullyDispatched && isHalfKit ? "text-amber-600" : "text-slate-400"}`}>
                                    {isHalfKit ? "½" : ""} ({item.dispatchedQty} sent)
                                  </span>
                                ) : null}
                              </span>
                            );
                          })}
                        </div>
                        {totalDispatched > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            {totalDispatched} already dispatched · {totalRemaining} remaining
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={handleCompute}
                disabled={selectedParcelIds.size === 0 || computing}
                className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {computing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                {computing ? "Computing…" : `Compute Fulfillable Orders (${selectedParcelIds.size} parcel${selectedParcelIds.size !== 1 ? "s" : ""})`}
              </button>
            </div>
          )}
        </Section>
      )}

      {/* ── Order Overview (reshipper scope) ── */}
      {scopeType === "reshipper" && scopeId && (
        <Section title={`All Orders — ${scopeId}${overviewOrders.length > 0 ? ` (${overviewOrders.length} total)` : ""}`}>
          {overviewLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading orders…
            </div>
          ) : overviewOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders found for this reshipper.</p>
          ) : (
            <div className="space-y-2">

              {/* Confirmed Dispatched */}
              <div className="rounded-xl border border-green-200 overflow-hidden">
                <button
                  onClick={() => setOvExpanded(p => ({ ...p, dispatched: !p.dispatched }))}
                  className="w-full flex items-center gap-3 px-4 py-2.5 bg-green-50 text-left hover:bg-green-100 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <span className="text-sm font-semibold text-green-800 flex-1">Confirmed Dispatched ({ovDispatched.length})</span>
                  <span className="text-[11px] text-green-600">{ovExpanded.dispatched ? "▲" : "▼"}</span>
                </button>
                {ovExpanded.dispatched && (
                  <div className="divide-y divide-green-50 max-h-56 overflow-y-auto">
                    {ovDispatched.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-4 py-2">None yet.</p>
                    ) : ovDispatched.map(o => (
                      <div key={o.id} className="flex items-center gap-2 px-4 py-2 text-xs">
                        <span className="font-mono text-slate-700 shrink-0">#{o.code}</span>
                        {o.telegramUsername && <span className="text-slate-500 shrink-0">@{o.telegramUsername.replace(/^@/, "")}</span>}
                        {o.shippingName && <span className="text-slate-400 truncate min-w-0">{o.shippingName}</span>}
                        <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">{o.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ready to Dispatch */}
              <div className="rounded-xl border border-blue-200 overflow-hidden">
                <button
                  onClick={() => setOvExpanded(p => ({ ...p, ready: !p.ready }))}
                  className="w-full flex items-center gap-3 px-4 py-2.5 bg-blue-50 text-left hover:bg-blue-100 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-sm font-semibold text-blue-800 flex-1">
                    Ready to Dispatch ({ovReady.length})
                    {!computeResult && <span className="ml-2 text-xs font-normal text-blue-400">— select parcels &amp; run Calculate</span>}
                  </span>
                  <span className="text-[11px] text-blue-600">{ovExpanded.ready ? "▲" : "▼"}</span>
                </button>
                {ovExpanded.ready && (
                  <div className="divide-y divide-blue-50 max-h-56 overflow-y-auto">
                    {ovReady.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-4 py-2">{computeResult ? "No orders can be fulfilled from the selected parcels." : "Run Calculate to see ready orders."}</p>
                    ) : ovReady.map(o => (
                      <div key={o.id} className="flex items-center gap-2 px-4 py-2 text-xs">
                        <span className="font-mono text-slate-700 shrink-0">#{o.code}</span>
                        {o.telegramUsername && <span className="text-slate-500 shrink-0">@{o.telegramUsername.replace(/^@/, "")}</span>}
                        {o.shippingName && <span className="text-slate-400 truncate min-w-0">{o.shippingName}</span>}
                        <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">{o.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cannot Fulfill */}
              <div className="rounded-xl border border-amber-200 overflow-hidden">
                <button
                  onClick={() => setOvExpanded(p => ({ ...p, cannot: !p.cannot }))}
                  className="w-full flex items-center gap-3 px-4 py-2.5 bg-amber-50 text-left hover:bg-amber-100 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-sm font-semibold text-amber-800 flex-1">
                    Cannot Fulfill ({ovCannot.length})
                    {!computeResult && <span className="ml-2 text-xs font-normal text-amber-400">— run Calculate to populate</span>}
                  </span>
                  {ovCannot.length > 0 && computeResult && (
                    <button
                      onClick={e => { e.stopPropagation(); handleMarkUnfulfillableShipped(ovCannotSelected.size > 0 ? [...ovCannotSelected] : undefined); }}
                      disabled={markingUnfulfillable}
                      className="mr-2 shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                    >
                      {markingUnfulfillable ? "Marking…" : ovCannotSelected.size > 0 ? `Mark ${ovCannotSelected.size} Shipped` : "Mark all Shipped"}
                    </button>
                  )}
                  <span className="text-[11px] text-amber-600">{ovExpanded.cannot ? "▲" : "▼"}</span>
                </button>
                {ovExpanded.cannot && (
                  <div>
                    {markUnfulfillableMsg && (
                      <p className={`text-xs px-4 py-1.5 font-medium ${markUnfulfillableMsg.ok ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"}`}>
                        {markUnfulfillableMsg.text}
                      </p>
                    )}
                    {ovCannot.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-4 py-2">{computeResult ? "No unfulfillable orders." : "Run Calculate to see these."}</p>
                    ) : (
                      <div>
                        <div className="flex items-center gap-3 px-4 py-1.5 bg-amber-50/70 border-b border-amber-100">
                          <span className="text-[11px] text-amber-700 font-medium">
                            {ovCannotSelected.size > 0 ? `${ovCannotSelected.size} selected` : "Tick orders to mark individually"}
                          </span>
                          <button
                            onClick={() => setOvCannotSelected(new Set(ovCannot.map(o => o.id)))}
                            className="text-[11px] text-amber-600 hover:underline"
                          >
                            Select all
                          </button>
                          {ovCannotSelected.size > 0 && (
                            <button
                              onClick={() => setOvCannotSelected(new Set())}
                              className="text-[11px] text-amber-600 hover:underline"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="divide-y divide-amber-50 max-h-64 overflow-y-auto">
                          {ovCannot.map(o => {
                            const sel = ovCannotSelected.has(o.id);
                            return (
                              <div
                                key={o.id}
                                onClick={() => setOvCannotSelected(prev => {
                                  const next = new Set(prev);
                                  next.has(o.id) ? next.delete(o.id) : next.add(o.id);
                                  return next;
                                })}
                                className={`cursor-pointer flex items-center gap-2 px-4 py-2 text-xs transition-colors ${sel ? "bg-amber-50" : "hover:bg-amber-50/40"}`}
                              >
                                <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${sel ? "bg-amber-500 border-amber-500" : "border-amber-300"}`}>
                                  {sel && <Check className="w-2 h-2 text-white" />}
                                </div>
                                <span className="font-mono text-slate-700 shrink-0">#{o.code}</span>
                                {o.telegramUsername && <span className="text-slate-500 shrink-0">@{o.telegramUsername.replace(/^@/, "")}</span>}
                                {o.shippingName && <span className="text-slate-400 truncate min-w-0">{o.shippingName}</span>}
                                <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">{o.status}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pending / No Stock */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setOvExpanded(p => ({ ...p, pending: !p.pending }))}
                  className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-50 text-left hover:bg-slate-100 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                  <span className="text-sm font-semibold text-slate-700 flex-1">
                    Pending / Not Assigned ({ovPending.length})
                    {computeResult && ovPending.length > 0 && <span className="ml-2 text-xs font-normal text-slate-400">— no stock allocated in these parcels</span>}
                  </span>
                  <span className="text-[11px] text-slate-500">{ovExpanded.pending ? "▲" : "▼"}</span>
                </button>
                {ovExpanded.pending && (
                  <div className="divide-y divide-slate-50 max-h-56 overflow-y-auto">
                    {ovPending.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-4 py-2">{computeResult ? "All orders accounted for." : "Awaiting Calculate…"}</p>
                    ) : ovPending.map(o => (
                      <div key={o.id} className="flex items-center gap-2 px-4 py-2 text-xs">
                        <span className="font-mono text-slate-700 shrink-0">#{o.code}</span>
                        {o.telegramUsername && <span className="text-slate-500 shrink-0">@{o.telegramUsername.replace(/^@/, "")}</span>}
                        {o.shippingName && <span className="text-slate-400 truncate min-w-0">{o.shippingName}</span>}
                        <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{o.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </Section>
      )}

      {/* ── Step 3: Orders ── */}
      {computeResult && (
        <Section
          title={`3. Select Orders to Dispatch (${selectedOrderIds.size} selected)`}
          action={
            <button
              onClick={selectAllOrders}
              className="text-xs text-primary hover:underline"
            >
              Select all fulfillable
            </button>
          }
        >
          <div className="space-y-4">
            {/* Fulfillable */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <h4 className="text-sm font-semibold text-foreground">
                  Ready ({computeResult.fulfillable.length})
                </h4>
              </div>
              {computeResult.fulfillable.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-4">No orders can be fulfilled from the selected parcels.</p>
              ) : (
                <div className="space-y-1.5">
                  {computeResult.fulfillable.map(o => {
                    const checked = selectedOrderIds.has(o.id);
                    return (
                      <div
                        key={o.id}
                        onClick={() => toggleOrder(o.id)}
                        className={`cursor-pointer rounded-lg border p-3 transition-colors flex gap-3 items-start ${
                          checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          checked ? "bg-primary border-primary" : "border-muted-foreground/40"
                        }`}>
                          {checked && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <OrderSummary o={o} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Unfulfillable */}
            {computeResult.unfulfillable.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <h4 className="text-sm font-semibold text-foreground">
                    Cannot Fulfil ({computeResult.unfulfillable.length})
                  </h4>
                </div>
                <div className="space-y-1.5">
                  {computeResult.unfulfillable.map(o => (
                    <div key={o.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                      <OrderSummary o={o} />
                      {o.reason && (
                        <p className="text-[10px] text-amber-700 mt-1.5 pl-0 flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                          {o.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {selectedOrderIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => setShowPrint(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print Packing Slips ({selectedOrderIds.size})
                </button>

                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-green-700 transition-colors"
                >
                  {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {confirming ? "Confirming…" : "Confirm Dispatch"}
                </button>

                {inpostSelectedOrders.length > 0 && (
                  <button
                    onClick={handleNotifyInpostQr}
                    disabled={notifyingQr}
                    title="Send a Telegram message to InPost customers asking them to upload their QR code"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                  >
                    {notifyingQr ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                    {notifyingQr ? "Notifying…" : `Notify InPost QR (${inpostSelectedOrders.length})`}
                  </button>
                )}

                {confirmMsg && (
                  <span className={`text-sm font-medium ${confirmMsg.ok ? "text-green-600" : "text-red-600"}`}>
                    {confirmMsg.ok ? "✓ " : "✗ "}{confirmMsg.text}
                  </span>
                )}
                {notifyQrMsg && (
                  <span className={`text-sm font-medium ${notifyQrMsg.ok ? "text-indigo-600" : "text-red-600"}`}>
                    {notifyQrMsg.ok ? "✓ " : "✗ "}{notifyQrMsg.text}
                  </span>
                )}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Print Modal ── */}
      {showPrint && selectedOrders.length > 0 && (
        <PrintModal orders={selectedOrders} onClose={() => setShowPrint(false)} />
      )}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── OrderSummary ─────────────────────────────────────────────────────────────
function OrderSummary({ o }: { o: DispatchOrder }) {
  const kits = o.lineItems.reduce((s, li) => s + li.quantity, 0);
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono font-bold text-foreground">
          {o.code ? `@${o.code}` : o.id.slice(0, 8)}
        </span>
        <span className="text-xs text-muted-foreground">{o.telegramUsername}</span>
        {o.reshipperUsername && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            {o.reshipperUsername}
          </span>
        )}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
          {kits} kit{kits !== 1 ? "s" : ""}
        </span>
        {o.deliveryMethod && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            {o.deliveryMethod}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {o.lineItems.map((li, i) => {
          const isHalfKit = li.quantity % 1 !== 0;
          return (
            <span
              key={i}
              className={`text-[10px] rounded px-1.5 py-0.5 border ${
                isHalfKit
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              {isHalfKit ? "½ " : ""}{li.quantity}× {li.productName}
            </span>
          );
        })}
      </div>
      {o.shippingName && (
        <p className="text-[10px] text-muted-foreground mt-1">{o.shippingName}</p>
      )}
    </div>
  );
}

// ─── PrintModal ───────────────────────────────────────────────────────────────
function PrintModal({ orders, onClose }: { orders: DispatchOrder[]; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState<"a4" | "4x6">("a4");

  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) return;

    const a4Styles = `
    @page { size: A4 landscape; margin: 10mm; }
    .slip-grid { display: flex; flex-wrap: wrap; gap: 4mm; }
    .slip {
      width: calc(33.333% - 2.67mm);
      border: 1.5px solid #1a1a1a;
      border-radius: 4px;
      padding: 4mm 5mm;
      break-inside: avoid;
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
      gap: 2mm;
      background: #fff;
    }
    .order-no { font-size: 10pt; font-weight: 700; color: #111; border-bottom: 1px solid #e5e7eb; padding-bottom: 1.5mm; }
    .order-username { font-size: 7.5pt; color: #6b7280; margin-top: 0.5mm; }
    .items { flex: 1; }
    .item-row { font-size: 8.5pt; color: #222; line-height: 1.5; }
    .item-qty { font-weight: 700; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 1mm 0; }
    .total-kits { font-size: 9pt; font-weight: 700; color: #111; }
    .shipping-label { font-size: 9pt; font-weight: 600; color: #1d4ed8; }
    .address { font-size: 8pt; color: #374151; line-height: 1.45; }
    .address strong { font-weight: 600; }`;

    const label4x6Styles = `
    @page { size: 100mm 150mm; margin: 0; }
    .slip-grid { display: block; }
    .slip {
      width: 100mm;
      height: 150mm;
      padding: 6mm 7mm;
      display: flex;
      flex-direction: column;
      gap: 0;
      background: #fff;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      box-sizing: border-box;
    }
    .slip:last-child { page-break-after: avoid; break-after: avoid; }
    .label-header {
      border-bottom: 2px solid #111;
      padding-bottom: 3mm;
      margin-bottom: 3mm;
    }
    .order-no { font-size: 15pt; font-weight: 800; color: #111; line-height: 1.1; }
    .order-username { font-size: 9pt; color: #6b7280; margin-top: 1mm; }
    .items { flex: 1; margin-bottom: 3mm; }
    .item-row { font-size: 10pt; color: #111; line-height: 1.7; }
    .item-qty { font-weight: 800; }
    .divider { border: none; border-top: 1.5px solid #d1d5db; margin: 2.5mm 0; }
    .total-kits { font-size: 11pt; font-weight: 800; color: #111; margin-bottom: 2mm; }
    .shipping-label { font-size: 9.5pt; font-weight: 700; color: #1d4ed8; margin-bottom: 2mm; }
    .address { font-size: 9pt; color: #374151; line-height: 1.5; margin-top: auto; padding-top: 2mm; border-top: 1px solid #e5e7eb; }
    .address strong { font-weight: 700; font-size: 10pt; }
    .label-footer {
      margin-top: auto;
      padding-top: 2.5mm;
      border-top: 1.5px solid #111;
      font-size: 7.5pt;
      color: #9ca3af;
      text-align: center;
    }`;

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Packing Slips</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; }
    ${format === "4x6" ? label4x6Styles : a4Styles}
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  ${content}
  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Packing Slips — {orders.length} order{orders.length !== 1 ? "s" : ""}</h2>
          <div className="flex items-center gap-2">
            {/* Format selector */}
            <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs font-semibold">
              <button
                onClick={() => setFormat("a4")}
                className="px-3 py-1.5 transition-colors"
                style={{ background: format === "a4" ? "var(--primary)" : "transparent", color: format === "a4" ? "var(--primary-foreground)" : "var(--muted-foreground)" }}
              >
                A4 Landscape
              </button>
              <button
                onClick={() => setFormat("4x6")}
                className="px-3 py-1.5 transition-colors"
                style={{ background: format === "4x6" ? "var(--primary)" : "transparent", color: format === "4x6" ? "var(--primary-foreground)" : "var(--muted-foreground)" }}
              >
                4×6 Labels
              </button>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Format hint */}
        {format === "4x6" && (
          <div className="px-5 py-2 text-xs text-muted-foreground border-b border-border" style={{ background: "rgba(45,107,204,0.05)" }}>
            📦 4×6 label mode — one order per 100mm × 150mm label. Set your printer paper size to <strong>4×6"</strong> or <strong>100×150mm</strong>.
          </div>
        )}

        {/* Preview */}
        <div className="flex-1 overflow-y-auto p-5">
          <div ref={printRef}>
            {format === "4x6" ? (
              <div className="slip-grid">
                {orders.map(o => <LabelSlip key={o.id} order={o} />)}
              </div>
            ) : (
              <div className="slip-grid" style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                {orders.map(o => <PackingSlip key={o.id} order={o} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LabelSlip — 4×6 single-label layout ──────────────────────────────────────
function LabelSlip({ order: o }: { order: DispatchOrder }) {
  const kits = o.lineItems.reduce((s, li) => s + li.quantity, 0);
  const addressParts = [o.shippingAddress, o.shippingCity, o.shippingPostcode, o.shippingCountry].filter(Boolean);

  return (
    <div className="slip" style={{
      width: "calc(100mm)", maxWidth: "380px",
      minHeight: "150mm", border: "1.5px solid #e5e7eb",
      borderRadius: "6px", padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: "0",
      fontSize: "13px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: "#fff", marginBottom: "16px",
    }}>
      {/* Header: code + username */}
      <div className="label-header" style={{ borderBottom: "2px solid #111", paddingBottom: "8px", marginBottom: "8px" }}>
        <div className="order-no" style={{ fontSize: "20px", fontWeight: 800, color: "#111", lineHeight: 1.1 }}>
          {o.code ? `@${o.code}` : o.telegramUsername}
        </div>
        {o.code && o.telegramUsername && (
          <div className="order-username" style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
            {o.telegramUsername}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="items" style={{ flex: 1, marginBottom: "8px" }}>
        {o.lineItems.map((li, i) => (
          <div key={i} className="item-row" style={{ fontSize: "12px", color: "#111", lineHeight: 1.7 }}>
            <span className="item-qty" style={{ fontWeight: 800 }}>{li.quantity}×</span> {li.productName}
          </div>
        ))}
      </div>

      <hr className="divider" style={{ border: "none", borderTop: "1.5px solid #d1d5db", margin: "6px 0" }} />

      {/* Total kits */}
      <div className="total-kits" style={{ fontSize: "13px", fontWeight: 800, color: "#111", marginBottom: "4px" }}>
        Total Kits — {kits}
      </div>

      {/* Shipping method */}
      {o.deliveryMethod && (
        <div className="shipping-label" style={{ fontSize: "11px", fontWeight: 700, color: "#1d4ed8", marginBottom: "6px" }}>
          {o.deliveryMethod}
        </div>
      )}

      {/* Address block — pushed to bottom */}
      {(o.shippingName || addressParts.length > 0) && (
        <div className="address" style={{
          marginTop: "auto", paddingTop: "7px",
          borderTop: "1px solid #e5e7eb",
          fontSize: "11px", color: "#374151", lineHeight: 1.5,
        }}>
          {o.shippingName && <div style={{ fontWeight: 700, fontSize: "12px" }}>{o.shippingName}</div>}
          {addressParts.map((part, i) => <div key={i}>{part}</div>)}
        </div>
      )}

      {/* Footer */}
      <div className="label-footer" style={{ marginTop: "8px", paddingTop: "6px", borderTop: "1.5px solid #111", fontSize: "8px", color: "#9ca3af", textAlign: "center" }}>
        Salt & Peps · pepsanonymous.co.uk
      </div>
    </div>
  );
}

// ─── PackingSlip card ─────────────────────────────────────────────────────────
function PackingSlip({ order: o }: { order: DispatchOrder }) {
  const kits = o.lineItems.reduce((s, li) => s + li.quantity, 0);

  const addressParts = [
    o.shippingAddress,
    o.shippingCity,
    o.shippingPostcode,
    o.shippingCountry,
  ].filter(Boolean);

  return (
    <div className="slip" style={{
      border: "1.5px solid #1a1a1a",
      borderRadius: "4px",
      padding: "7px 9px",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      fontSize: "11px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: "#fff",
      width: "calc(33.333% - 8px)",
    }}>
      {/* Order number + username */}
      <div className="order-no" style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "4px" }}>
        <div style={{ fontWeight: 700, fontSize: "12px", color: "#111" }}>
          {o.code ? `@${o.code}` : o.telegramUsername}
        </div>
        {o.code && o.telegramUsername && (
          <div className="order-username" style={{ fontSize: "9px", color: "#6b7280", marginTop: "1px" }}>
            {o.telegramUsername}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="items" style={{ flex: 1 }}>
        {o.lineItems.map((li, i) => (
          <div key={i} className="item-row" style={{ color: "#222", lineHeight: 1.5 }}>
            <span className="item-qty" style={{ fontWeight: 700 }}>{li.quantity}×</span> {li.productName}
          </div>
        ))}
      </div>

      <hr className="divider" style={{ border: "none", borderTop: "1px solid #e5e7eb" }} />

      {/* Total kits */}
      <div className="total-kits" style={{ fontWeight: 700, color: "#111", fontSize: "10.5px" }}>
        Total Kits — {kits}
      </div>

      {/* Shipping */}
      {o.deliveryMethod && (
        <div className="shipping-label" style={{ fontSize: "10.5px", color: "#1d4ed8", fontWeight: 600 }}>
          Shipping — {o.deliveryMethod}
        </div>
      )}

      {/* Name + Address */}
      {(o.shippingName || addressParts.length > 0) && (
        <div className="address" style={{ fontSize: "10px", color: "#374151", lineHeight: 1.4 }}>
          {o.shippingName && <div style={{ fontWeight: 600 }}>{o.shippingName}</div>}
          {addressParts.map((part, i) => <div key={i}>{part}</div>)}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── DispatchImageUploader ────────────────────────────────────────────────────
interface OcrResult {
  ocr: { orderCode: string | null; telegramUsername: string | null; memberName: string | null; notes: string | null };
  match: { orderId: string; orderCode: string; telegramUsername: string; shippingName: string | null; status: string; confidence: "high" | "medium" | "low" } | null;
}
interface PendingImage {
  id: string;
  file: File;
  dataUrl: string;
  status: "pending" | "processing" | "done" | "error";
  ocrResult?: OcrResult;
  selectedOrderId?: string; // admin can override match
  saved?: boolean;
  error?: string;
}

function DispatchImageUploader({ gbId, headers, orders }: {
  gbId: string;
  headers: Record<string, string>;
  orders: Fs3GbOrder[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<PendingImage[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (item: PendingImage) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "processing" } : i));
    try {
      const r = await fetch(apiUrl(`/admin/dispatch/${gbId}/ocr-image`), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ imageData: item.dataUrl, filename: item.file.name }),
        signal: AbortSignal.timeout(90000),
      });
      if (!r.ok) {
        const errData = await r.json().catch(() => ({})) as { error?: string };
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "error", error: errData.error ?? "OCR failed" } : i));
        return;
      }
      const d: OcrResult = await r.json();
      setItems(prev => prev.map(i => i.id === item.id ? {
        ...i,
        status: "done",
        ocrResult: d,
        selectedOrderId: d.match?.orderId ?? "",
      } : i));
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "error", error: "OCR failed" } : i));
    }
  }, [gbId, headers]);

  const compressForOcr = useCallback((dataUrl: string): Promise<string> => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1500;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      const id = Math.random().toString(36).slice(2);
      reader.onload = async (e) => {
        const raw = e.target?.result as string;
        const dataUrl = await compressForOcr(raw);
        const item: PendingImage = { id, file, dataUrl, status: "pending" };
        setItems(prev => [...prev, item]);
        processFile(item).catch(() => {});
      };
      reader.readAsDataURL(file);
    });
  }, [processFile, compressForOcr]);

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { addFiles(e.target.files); e.target.value = ""; }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const saveImage = async (item: PendingImage) => {
    if (!item.selectedOrderId || !item.ocrResult) return;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "processing" } : i));
    try {
      const r = await fetch(apiUrl(`/admin/dispatch/${gbId}/save-dispatch-image`), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          orderId: item.selectedOrderId,
          imageData: item.dataUrl,
          filename: item.file.name,
          ocrOrderCode: item.ocrResult.ocr.orderCode ?? undefined,
          ocrUsername: item.ocrResult.ocr.telegramUsername ?? undefined,
        }),
      });
      if (r.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, saved: true, status: "done" } : i));
      } else {
        const d = await r.json();
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "error", error: d.error ?? "Save failed" } : i));
      }
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "error", error: "Network error" } : i));
    }
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const confidenceColor = (c?: "high" | "medium" | "low") =>
    c === "high" ? "text-green-700 bg-green-50 border-green-200" :
    c === "medium" ? "text-amber-700 bg-amber-50 border-amber-200" :
    "text-slate-600 bg-slate-50 border-slate-200";

  const unsavedCount = items.filter(i => !i.saved && i.status !== "error").length;

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 border-b border-indigo-100 transition-colors text-left"
      >
        <Camera className="w-4 h-4 text-indigo-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-indigo-800">Upload Dispatch Photos</p>
          <p className="text-xs text-indigo-500">AI reads packing slips and matches each photo to an order</p>
        </div>
        {unsavedCount > 0 && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">{unsavedCount}</span>
        )}
        {expanded ? <ChevronUp className="w-4 h-4 text-indigo-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-indigo-500 shrink-0" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4 bg-white">
          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-indigo-200 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
          >
            <Upload className="w-8 h-8 text-indigo-400" />
            <p className="text-sm font-medium text-indigo-700">Drop photos here or click to browse</p>
            <p className="text-xs text-muted-foreground">JPEG, PNG, WebP · Multiple files OK</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFilePick} />

          {/* Image queue */}
          {items.length > 0 && (
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className={`border rounded-xl overflow-hidden ${item.saved ? "border-green-200 bg-green-50/40" : "border-border bg-background"}`}>
                  <div className="flex gap-3 p-3">
                    {/* Thumbnail */}
                    {item.dataUrl && (
                      <div className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-border bg-slate-100 cursor-zoom-in group"
                        onClick={() => setLightbox(item.dataUrl)}>
                        <img src={item.dataUrl} alt={item.file.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    )}
                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-foreground truncate">{item.file.name}</p>
                        <button onClick={() => removeItem(item.id)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {item.status === "processing" && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Reading packing slip…</span>
                        </div>
                      )}

                      {item.status === "error" && (
                        <p className="text-xs text-red-600">{item.error}</p>
                      )}

                      {item.status === "done" && item.ocrResult && !item.saved && (
                        <div className="space-y-1.5">
                          {/* OCR extracted data */}
                          <div className="flex flex-wrap gap-1">
                            {item.ocrResult.ocr.orderCode && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-mono">#{item.ocrResult.ocr.orderCode}</span>
                            )}
                            {item.ocrResult.ocr.telegramUsername && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-mono">{item.ocrResult.ocr.telegramUsername}</span>
                            )}
                            {item.ocrResult.ocr.memberName && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600">{item.ocrResult.ocr.memberName}</span>
                            )}
                          </div>

                          {/* Match / order selector */}
                          <div className="flex items-center gap-2">
                            <select
                              value={item.selectedOrderId ?? ""}
                              onChange={e => setItems(prev => prev.map(i => i.id === item.id ? { ...i, selectedOrderId: e.target.value } : i))}
                              className="flex-1 text-xs border rounded-lg px-2 py-1 bg-background"
                            >
                              <option value="">— No match / skip —</option>
                              {orders.map(o => (
                                <option key={o.id} value={o.id}>
                                  #{o.code} · {o.telegramUsername}{o.shippingName ? ` · ${o.shippingName}` : ""}
                                </option>
                              ))}
                            </select>
                            {item.ocrResult.match && item.selectedOrderId === item.ocrResult.match.orderId && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${confidenceColor(item.ocrResult.match.confidence)}`}>
                                {item.ocrResult.match.confidence}
                              </span>
                            )}
                          </div>

                          {item.selectedOrderId && (
                            <button
                              onClick={() => saveImage(item)}
                              className="w-full text-xs font-semibold py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                            >
                              Save to Order
                            </button>
                          )}
                        </div>
                      )}

                      {item.saved && (
                        <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
                          <Check className="w-3.5 h-3.5" />
                          Saved successfully
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Dispatch photo" className="max-w-full max-h-[90vh] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(null)}><X className="w-6 h-6" /></button>
        </div>
      )}
    </div>
  );
}

// DispatchedOrdersTab — shows orders confirmed via Dispatch & Packing Slips
// ─────────────────────────────────────────────────────────────────────────────
interface GbInfo {
  id: string;
  name: string;
  qrCouriers: string[];
  qrUploadMessage: string | null;
}

type NotifyResult = { orderId: string; username: string; status: "sent" | "failed" | "no_chat_id" };

function DispatchedOrdersTab({
  selectedGb,
  headers,
}: {
  selectedGb: string;
  headers: Record<string, string>;
}) {
  const [orders, setOrders] = useState<Fs3GbOrder[]>([]);
  const [gbInfo, setGbInfo] = useState<GbInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedReshipper, setSelectedReshipper] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dispatchImagesMap, setDispatchImagesMap] = useState<Record<string, { id: string; filename: string }[]>>({});

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Notification state
  const [customMessage, setCustomMessage] = useState("");
  const [notifying, setNotifying] = useState(false);
  const [notifyResult, setNotifyResult] = useState<{ sent: number; failed: number; skipped: number; results: NotifyResult[] } | null>(null);
  const [notifyError, setNotifyError] = useState("");

  // Print state
  const [showPrint, setShowPrint] = useState(false);

  // Archive state
  const [archiving, setArchiving] = useState(false);
  const [undispatching, setUndispatching] = useState(false);
  const [undispatchMsg, setUndispatchMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [archiveMsg, setArchiveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Re-attribute state
  const [reattributing, setReattributing] = useState(false);
  const [reattributeMsg, setReattributeMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Recovery: unshipped orders for the selected reshipper
  interface UnshippedOrder { id: string; code: string; telegramUsername: string | null; shippingName: string | null; status: string | null }
  const [unshippedOrders, setUnshippedOrders] = useState<UnshippedOrder[]>([]);
  const [unshippedSelected, setUnshippedSelected] = useState<Set<string>>(new Set());
  const [unshippedExpanded, setUnshippedExpanded] = useState(false);
  const [markingShipped, setMarkingShipped] = useState(false);

  // Click & Drop export state
  const [cdServiceCode, setCdServiceCode] = useState("CRL24");
  const [cdWeightG, setCdWeightG] = useState("500");
  const [cdExporting, setCdExporting] = useState(false);

  // Helper: does a delivery method require QR code upload?
  const needsQr = (deliveryMethod: string | null): boolean => {
    if (!deliveryMethod || !gbInfo || gbInfo.qrCouriers.length === 0) return false;
    const dm = deliveryMethod.toLowerCase();
    return gbInfo.qrCouriers.some(c => dm.includes(c.toLowerCase()));
  };

  useEffect(() => {
    if (!selectedGb) {
      setOrders([]); setGbInfo(null); setSelectedReshipper(""); setSearch("");
      setSelectedIds(new Set()); setNotifyResult(null); setNotifyError("");
      return;
    }
    setLoading(true);
    setError("");
    setNotifyResult(null);
    setNotifyError("");
    Promise.all([
      fetch(apiUrl(`/admin/orders?groupBuyId=${selectedGb}&dispatchConfirmed=true&dispatchArchived=false&pageSize=999`), { headers, credentials: "omit" }).then(r => r.json()),
      fetch(apiUrl(`/admin/dispatch/${selectedGb}/gb-info`), { headers, credentials: "omit" }).then(r => r.json()),
      fetch(apiUrl(`/admin/dispatch/${selectedGb}/dispatch-images-map`), { headers, credentials: "omit" }).then(r => r.json()).catch(() => ({})),
    ])
      .then(([ordersData, gbData, imagesMap]) => {
        const raw: Fs3GbOrder[] = Array.isArray(ordersData) ? ordersData : (Array.isArray(ordersData?.orders) ? ordersData.orders : []);
        const dispatched = raw.filter(o => !(o as any).deletedAt);
        setOrders(dispatched);
        setGbInfo(gbData?.id ? gbData as GbInfo : null);
        setDispatchImagesMap(imagesMap && typeof imagesMap === "object" && !Array.isArray(imagesMap) ? imagesMap : {});
        // Auto-populate custom message from GB's qr message if set
        if (gbData?.qrUploadMessage && !customMessage) {
          setCustomMessage(gbData.qrUploadMessage);
        }
      })
      .catch(() => setError("Failed to load dispatched orders"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGb, headers]);

  useEffect(() => { setSelectedReshipper(""); setSelectedIds(new Set()); setUnshippedOrders([]); setUnshippedSelected(new Set()); setUnshippedExpanded(false); }, [selectedGb]);

  // When a reshipper is selected, check if they have unshipped orders in this GB (direct match only)
  useEffect(() => {
    setUnshippedOrders([]); setUnshippedSelected(new Set()); setUnshippedExpanded(false);
    if (!selectedGb || !selectedReshipper || selectedReshipper === "__direct__") return;
    const norm = selectedReshipper.replace(/^@/, "");
    fetch(apiUrl(`/admin/dispatch/${selectedGb}/unshipped-by-reshipper?reshipper=${encodeURIComponent(norm)}`), { headers, credentials: "omit" })
      .then(r => r.json())
      .then(data => {
        const orders: UnshippedOrder[] = Array.isArray(data?.orders) ? data.orders : [];
        setUnshippedOrders(orders);
        setUnshippedSelected(new Set(orders.map((o: UnshippedOrder) => o.id)));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGb, selectedReshipper]);

  // Prefer dispatchedByReshipper (stamped at confirm time) over the order's own reshipperUsername
  const effectiveReshipper = (o: Fs3GbOrder): string | null =>
    o.dispatchedByReshipper ?? o.reshipperUsername ?? null;

  const allReshippers = useMemo(() => {
    const s = new Set<string>();
    orders.forEach(o => { const r = effectiveReshipper(o); if (r) s.add(r); });
    return [...s].sort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const filtered = useMemo(() => {
    let result = orders;
    if (selectedReshipper === "__direct__") {
      result = result.filter(o => !effectiveReshipper(o));
    } else if (selectedReshipper) {
      result = result.filter(o => effectiveReshipper(o) === selectedReshipper);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(o =>
        (o.telegramUsername ?? "").toLowerCase().includes(q) ||
        (o.code ?? "").toLowerCase().includes(q) ||
        (o.shippingName ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, selectedReshipper, search]);

  const totalKits = useMemo(() =>
    filtered.reduce((s, o) =>
      s + (o.lineItems ?? []).reduce((s2, li) => s2 + li.quantity, 0), 0),
  [filtered]);

  const qrOrderIds = useMemo(() =>
    filtered.filter(o => needsQr(o.deliveryMethod)).map(o => o.id),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [filtered, gbInfo]);

  const toggleOrder = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setNotifyResult(null);
  };

  const selectAllQr = () => {
    setSelectedIds(new Set(qrOrderIds));
    setNotifyResult(null);
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map(o => o.id)));
    setNotifyResult(null);
  };

  const clearSelection = () => { setSelectedIds(new Set()); setNotifyResult(null); };

  const handleMarkShipped = async () => {
    if (!selectedReshipper || selectedReshipper === "__direct__" || unshippedSelected.size === 0) return;
    setMarkingShipped(true);
    try {
      const r = await fetch(apiUrl(`/admin/dispatch/${selectedGb}/mark-shipped-by-reshipper`), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ reshipper: selectedReshipper, orderIds: [...unshippedSelected] }),
      });
      const d = await r.json();
      if (r.ok) {
        // Remove the marked orders from the unshipped list
        setUnshippedOrders(prev => prev.filter(o => !unshippedSelected.has(o.id)));
        setUnshippedSelected(new Set());
        // Reload the dispatched orders list
        const ordersData = await fetch(apiUrl(`/admin/orders?groupBuyId=${selectedGb}&dispatchConfirmed=true&dispatchArchived=false&pageSize=999`), { headers, credentials: "omit" }).then(r2 => r2.json());
        const raw: Fs3GbOrder[] = Array.isArray(ordersData) ? ordersData : (Array.isArray(ordersData?.orders) ? ordersData.orders : []);
        setOrders(raw.filter(o => !(o as any).deletedAt));
      } else {
        alert(d.error ?? "Failed to mark as shipped");
      }
    } catch {
      alert("Network error");
    } finally {
      setMarkingShipped(false);
    }
  };

  const handleUndispatch = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Un-dispatch ${selectedIds.size} order${selectedIds.size !== 1 ? "s" : ""}? This will move them back to Dispatch & Packing Slips and restore parcel stock.`)) return;
    setUndispatching(true);
    setUndispatchMsg(null);
    try {
      const r = await fetch(apiUrl(`/admin/dispatch/${selectedGb}/undispatch`), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ orderIds: [...selectedIds] }),
      });
      const d = await r.json();
      if (d.ok) {
        setUndispatchMsg({ ok: true, text: `${d.undispatched} order${d.undispatched !== 1 ? "s" : ""} moved back to dispatch` });
        setOrders(prev => prev.filter(o => !selectedIds.has(o.id)));
        setSelectedIds(new Set());
      } else {
        setUndispatchMsg({ ok: false, text: d.error ?? "Un-dispatch failed" });
      }
    } catch {
      setUndispatchMsg({ ok: false, text: "Network error" });
    } finally {
      setUndispatching(false);
    }
  };

  const handleArchive = async () => {
    if (selectedIds.size === 0) return;
    setArchiving(true);
    setArchiveMsg(null);
    try {
      const r = await fetch(apiUrl(`/admin/dispatch/${selectedGb}/archive-orders`), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ orderIds: [...selectedIds], archive: true }),
      });
      const d = await r.json();
      if (d.ok) {
        setArchiveMsg({ ok: true, text: `${d.updated} order${d.updated !== 1 ? "s" : ""} archived` });
        setOrders(prev => prev.filter(o => !selectedIds.has(o.id)));
        setSelectedIds(new Set());
      } else {
        setArchiveMsg({ ok: false, text: d.error ?? "Archive failed" });
      }
    } catch {
      setArchiveMsg({ ok: false, text: "Network error" });
    } finally {
      setArchiving(false);
    }
  };

  const handleReattribute = async (reshipper: string) => {
    if (selectedIds.size === 0) return;
    setReattributing(true);
    setReattributeMsg(null);
    try {
      const r = await fetch(apiUrl(`/admin/dispatch/${selectedGb}/reattribute`), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ orderIds: [...selectedIds], reshipper }),
      });
      const d = await r.json();
      if (r.ok) {
        setReattributeMsg({ ok: true, text: `${d.updated} order${d.updated !== 1 ? "s" : ""} attributed to ${reshipper}` });
        // Re-fetch orders to reflect the change
        const ordersData = await fetch(apiUrl(`/admin/orders?groupBuyId=${selectedGb}&dispatchConfirmed=true&dispatchArchived=false&pageSize=999`), { headers, credentials: "omit" }).then(r2 => r2.json());
        const raw: Fs3GbOrder[] = Array.isArray(ordersData) ? ordersData : (Array.isArray(ordersData?.orders) ? ordersData.orders : []);
        setOrders(raw.filter(o => !(o as any).deletedAt));
        setSelectedIds(new Set());
      } else {
        setReattributeMsg({ ok: false, text: d.error ?? "Failed to re-attribute" });
      }
    } catch {
      setReattributeMsg({ ok: false, text: "Network error" });
    } finally {
      setReattributing(false);
    }
  };

  const handleClickDropExport = async () => {
    if (selectedIds.size === 0) return;
    setCdExporting(true);
    try {
      const ids = [...selectedIds].join(",");
      const params = new URLSearchParams({ orderIds: ids, serviceCode: cdServiceCode, weightG: cdWeightG });
      const url = apiUrl(`/admin/dispatch/${selectedGb}/click-drop-csv?${params}`);
      const r = await fetch(url, { headers, credentials: "omit" });
      if (!r.ok) { const d = await r.json(); alert(d.error ?? "Export failed"); return; }
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const cd = r.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? "click-drop.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert("Export failed — network error");
    } finally {
      setCdExporting(false);
    }
  };

  const handleNotify = async () => {
    if (selectedIds.size === 0) return;
    setNotifying(true);
    setNotifyResult(null);
    setNotifyError("");
    try {
      const r = await fetch(apiUrl(`/admin/dispatch/${selectedGb}/notify-qr`), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ orderIds: [...selectedIds], customMessage: customMessage.trim() || undefined }),
      });
      const d = await r.json();
      if (d.ok) {
        setNotifyResult(d);
      } else {
        setNotifyError(d.error ?? "Failed to send notifications");
      }
    } catch {
      setNotifyError("Network error");
    } finally {
      setNotifying(false);
    }
  };

  if (!selectedGb) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <PackageCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Select a group buy to view dispatched orders</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-muted-foreground justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading dispatched orders…</span>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600 py-6 text-center">{error}</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground border rounded-xl bg-muted/20">
        <PackageCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No dispatched orders yet</p>
        <p className="text-xs mt-1 opacity-70">Confirm dispatch via the Dispatch &amp; Packing Slips tab to see orders here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dispatch Image Uploader */}
      {selectedGb && (
        <DispatchImageUploader gbId={selectedGb} headers={headers} orders={orders} />
      )}

      {/* Summary bar */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-green-50 border-green-200">
        <PackageCheck className="w-5 h-5 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-800">
            {orders.length} order{orders.length !== 1 ? "s" : ""} dispatched
            {totalKits !== orders.length && (
              <span className="font-normal text-green-700"> · {totalKits.toFixed(totalKits % 1 === 0 ? 0 : 1)} total kits</span>
            )}
          </p>
          <p className="text-xs text-green-600 mt-0.5">
            Status: Shipped or Completed
            {filtered.length !== orders.length && ` · showing ${filtered.length}`}
            {gbInfo && gbInfo.qrCouriers.length > 0 && (
              <span> · QR couriers: {gbInfo.qrCouriers.join(", ")}</span>
            )}
          </p>
        </div>
      </div>

      {/* Recovery banner — unshipped orders for selected reshipper */}
      {unshippedOrders.length > 0 && selectedReshipper && selectedReshipper !== "__direct__" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 overflow-hidden">
          {/* Header row */}
          <button
            onClick={() => setUnshippedExpanded(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-100 transition-colors"
          >
            <span className="text-amber-600 text-base shrink-0">⚠</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                {unshippedOrders.length} order{unshippedOrders.length !== 1 ? "s" : ""} for {selectedReshipper} not yet marked as Shipped
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Likely confirmed via Dispatch &amp; Packing Slips before status tracking was added. Click to select.
              </p>
            </div>
            <span className="text-xs text-amber-600 shrink-0">{unshippedExpanded ? "▲" : "▼"}</span>
          </button>

          {/* Selectable order list */}
          {unshippedExpanded && (
            <div className="border-t border-amber-200 bg-white">
              {/* Select all / deselect all */}
              <div className="flex items-center gap-3 px-4 py-2 border-b border-amber-100">
                <button
                  onClick={() => setUnshippedSelected(new Set(unshippedOrders.map(o => o.id)))}
                  className="text-xs text-amber-700 underline hover:text-amber-900"
                >Select all</button>
                <span className="text-amber-300">·</span>
                <button
                  onClick={() => setUnshippedSelected(new Set())}
                  className="text-xs text-amber-700 underline hover:text-amber-900"
                >Deselect all</button>
                <span className="text-xs text-amber-600 ml-auto">{unshippedSelected.size} selected</span>
              </div>

              {/* Order rows */}
              <div className="max-h-60 overflow-y-auto divide-y divide-amber-50">
                {unshippedOrders.map(o => (
                  <label key={o.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-amber-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={unshippedSelected.has(o.id)}
                      onChange={e => {
                        setUnshippedSelected(prev => {
                          const next = new Set(prev);
                          e.target.checked ? next.add(o.id) : next.delete(o.id);
                          return next;
                        });
                      }}
                      className="accent-amber-600"
                    />
                    <span className="font-mono text-xs text-slate-700 shrink-0">#{o.code}</span>
                    {o.telegramUsername && <span className="text-xs text-slate-500">@{o.telegramUsername.replace(/^@/, "")}</span>}
                    {o.shippingName && <span className="text-xs text-slate-400 truncate">{o.shippingName}</span>}
                    <span className="ml-auto text-xs text-amber-600 shrink-0">{o.status}</span>
                  </label>
                ))}
              </div>

              {/* Action button */}
              <div className="px-4 py-3 border-t border-amber-200 flex justify-end">
                <button
                  onClick={handleMarkShipped}
                  disabled={markingShipped || unshippedSelected.size === 0}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {markingShipped ? "Marking…" : `Mark ${unshippedSelected.size} as Shipped`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reshipper filter pills */}
      {allReshippers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedReshipper("")}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              selectedReshipper === ""
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-input hover:bg-muted"
            }`}
          >
            All ({orders.length})
          </button>
          {allReshippers.map(r => {
            const count = orders.filter(o => effectiveReshipper(o) === r).length;
            return (
              <button
                key={r}
                onClick={() => setSelectedReshipper(selectedReshipper === r ? "" : r)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedReshipper === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-input hover:bg-muted"
                }`}
              >
                {r} ({count})
              </button>
            );
          })}
          {orders.some(o => !effectiveReshipper(o)) && (
            <button
              onClick={() => setSelectedReshipper(selectedReshipper === "__direct__" ? "" : "__direct__")}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedReshipper === "__direct__"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-input hover:bg-muted"
              }`}
            >
              Direct ({orders.filter(o => !effectiveReshipper(o)).length})
            </button>
          )}
          <p className="w-full text-[11px] text-muted-foreground mt-0.5">
            Click a reshipper pill to check for orders confirmed via Dispatch &amp; Packing Slips that aren't marked Shipped yet.</p>
        </div>
      )}

      {/* Search */}
      <input
        type="search"
        placeholder="Search by username, code or name…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
      />

      {/* Selection toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select orders to notify"}
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {qrOrderIds.length > 0 && (
            <button
              onClick={selectAllQr}
              className="px-2.5 py-1 rounded text-[11px] font-medium border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
            >
              Select all QR ({qrOrderIds.length})
            </button>
          )}
          <button
            onClick={selectAllFiltered}
            className="px-2.5 py-1 rounded text-[11px] font-medium border border-input bg-background hover:bg-muted transition-colors"
          >
            Select all ({filtered.length})
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={clearSelection}
              className="px-2.5 py-1 rounded text-[11px] font-medium border border-input bg-background hover:bg-muted transition-colors"
            >
              Clear
            </button>
          )}
          {selectedIds.size > 0 && allReshippers.length > 0 && (
            <div className="relative group">
              <button
                disabled={reattributing}
                className="px-2.5 py-1 rounded text-[11px] font-medium border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-50"
              >
                {reattributing ? "Attributing…" : "Attribute to reshipper ▾"}
              </button>
              <div className="absolute left-0 top-full mt-1 z-20 bg-white border rounded-lg shadow-lg min-w-[160px] hidden group-hover:block group-focus-within:block">
                {allReshippers.map(r => (
                  <button
                    key={r}
                    onClick={() => handleReattribute(r)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => setShowPrint(true)}
            className="px-2.5 py-1 rounded text-[11px] font-medium border border-primary text-primary bg-background hover:bg-primary/5 transition-colors flex items-center gap-1"
          >
            <Printer className="w-3 h-3" />
            {selectedIds.size > 0
              ? `Print Slips (${selectedIds.size})`
              : `Print Slips (All ${filtered.length})`}
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={handleUndispatch}
              disabled={undispatching}
              title="Move selected orders back to Dispatch & Packing Slips"
              className="px-2.5 py-1 rounded text-[11px] font-medium border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-50"
            >
              {undispatching ? "Un-dispatching…" : `↩ Un-dispatch (${selectedIds.size})`}
            </button>
          )}
          {selectedIds.size > 0 && (
            <button
              onClick={handleArchive}
              disabled={archiving}
              title="Move selected orders to Archived Dispatched Orders"
              className="px-2.5 py-1 rounded text-[11px] font-medium border border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              {archiving ? "Archiving…" : `Archive (${selectedIds.size})`}
            </button>
          )}
        </div>
      </div>
      {reattributeMsg && (
        <p className={`text-xs px-3 py-2 rounded border ${reattributeMsg.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {reattributeMsg.text}
        </p>
      )}
      {archiveMsg && (
        <p className={`text-xs px-3 py-2 rounded border ${archiveMsg.ok ? "bg-slate-50 text-slate-600 border-slate-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {archiveMsg.ok ? "✓ " : "✗ "}{archiveMsg.text}
        </p>
      )}
      {undispatchMsg && (
        <p className={`text-xs px-3 py-2 rounded border ${undispatchMsg.ok ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {undispatchMsg.ok ? "✓ " : "✗ "}{undispatchMsg.text}
        </p>
      )}

      {/* Orders list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No orders match your filter.</p>
      ) : (
        <Section title={`Dispatched Orders${filtered.length !== orders.length ? ` (${filtered.length} of ${orders.length})` : ` (${orders.length})`}`}>
          <div className="divide-y divide-border -mx-4 -mb-4">
            {filtered.map(o => {
              const kits = (o.lineItems ?? []).reduce((s, li) => s + li.quantity, 0);
              const qr = needsQr(o.deliveryMethod);
              const selected = selectedIds.has(o.id);
              const notified = notifyResult?.results.find(r => r.orderId === o.id);
              return (
                <div
                  key={o.id}
                  onClick={() => toggleOrder(o.id)}
                  className={`px-4 py-3 flex gap-3 cursor-pointer transition-colors ${
                    selected ? "bg-blue-50" : "hover:bg-muted/30"
                  }`}
                >
                  {/* Checkbox */}
                  <div className="pt-0.5 shrink-0">
                    {selected
                      ? <CheckSquare className="w-4 h-4 text-primary" />
                      : <Square className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-foreground">
                        {o.code ? `@${o.code}` : o.id.slice(0, 8)}
                      </span>
                      <span className="text-xs text-muted-foreground">{o.telegramUsername}</span>
                      {o.reshipperUsername && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          {o.reshipperUsername}
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        o.status === "Completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {o.status}
                      </span>
                      {o.deliveryMethod && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                          qr
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {o.deliveryMethod}{qr ? " 📲" : ""}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground font-medium shrink-0">
                        {kits.toFixed(kits % 1 === 0 ? 0 : 1)} kit{kits !== 1 ? "s" : ""}
                      </span>
                      {/* Notification result badge */}
                      {notified && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          notified.status === "sent" ? "bg-green-100 text-green-700" :
                          notified.status === "no_chat_id" ? "bg-slate-100 text-slate-500" :
                          "bg-red-100 text-red-600"
                        }`}>
                          {notified.status === "sent" ? "✓ Sent" :
                           notified.status === "no_chat_id" ? "No Telegram" :
                           "✗ Failed"}
                        </span>
                      )}
                    </div>
                    {/* Line items */}
                    <div className="flex flex-wrap gap-1">
                      {(o.lineItems ?? []).map((li, i) => {
                        const isHalfKit = li.quantity % 1 !== 0;
                        return (
                          <span
                            key={i}
                            className={`text-[10px] rounded px-1.5 py-0.5 border ${
                              isHalfKit
                                ? "bg-amber-50 border-amber-200 text-amber-800"
                                : "bg-slate-50 border-slate-200 text-slate-600"
                            }`}
                          >
                            {isHalfKit ? "½ " : ""}{li.quantity}× {li.productName}
                          </span>
                        );
                      })}
                    </div>
                    {/* Shipping address */}
                    {(o.shippingName || o.shippingCountry) && (
                      <p className="text-[10px] text-muted-foreground">
                        {[o.shippingName, o.shippingCountry].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {/* Tracking number */}
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <Truck className="w-3 h-3 shrink-0 text-muted-foreground" />
                      {(() => {
                        const nums = [
                          ...(o.trackingNumbers ?? []),
                          ...(o.trackingNumber && !(o.trackingNumbers ?? []).includes(o.trackingNumber) ? [o.trackingNumber] : []),
                        ].filter(Boolean);
                        if (nums.length === 0) return <span className="text-muted-foreground italic">No tracking number</span>;
                        return <span className="font-mono text-blue-700">{nums.join(", ")}</span>;
                      })()}
                    </div>
                    {/* Dispatch photos */}
                    <div className="flex items-center gap-2 text-[10px]">
                      <Camera className="w-3 h-3 shrink-0 text-muted-foreground" />
                      {(dispatchImagesMap[o.id] ?? []).length === 0 ? (
                        <span className="text-muted-foreground italic">No dispatch photo</span>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(dispatchImagesMap[o.id] ?? []).map(img => (
                            <DispatchPhotoThumb key={img.id} imageId={img.id} headers={headers} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Click & Drop export panel */}
      {selectedIds.size > 0 && (
        <Section title={`Click & Drop CSV — ${selectedIds.size} order${selectedIds.size !== 1 ? "s" : ""}`}>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Exports selected orders as a CSV file ready to import into{" "}
              <a href="https://click-and-drop.royalmail.com" target="_blank" rel="noopener noreferrer" className="underline">
                Royal Mail Click &amp; Drop
              </a>. Import it there to generate tracked labels in bulk, then print 4-per-A4 from Click &amp; Drop.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Service</label>
                <select
                  value={cdServiceCode}
                  onChange={e => setCdServiceCode(e.target.value)}
                  className="text-sm border rounded-lg px-3 py-2 bg-background"
                >
                  <option value="CRL24">Royal Mail 24 (Tracked) — CRL24</option>
                  <option value="CRL48">Royal Mail 48 (Tracked) — CRL48</option>
                  <option value="STL1">Royal Mail 1st Class Letter — STL1</option>
                  <option value="STL2">Royal Mail 2nd Class Letter — STL2</option>
                  <option value="OLA">Royal Mail Online Postage 1st Class</option>
                  <option value="OLB">Royal Mail Online Postage 2nd Class</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Weight (g)</label>
                <input
                  type="number"
                  min="1"
                  max="30000"
                  value={cdWeightG}
                  onChange={e => setCdWeightG(e.target.value)}
                  className="text-sm border rounded-lg px-3 py-2 bg-background w-28"
                  placeholder="500"
                />
              </div>
            </div>
            <button
              onClick={handleClickDropExport}
              disabled={cdExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {cdExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              {cdExporting ? "Generating…" : `Download CSV (${selectedIds.size} labels)`}
            </button>
          </div>
        </Section>
      )}

      {/* Notification panel */}
      {selectedIds.size > 0 && (
        <Section title={`Notify ${selectedIds.size} order${selectedIds.size !== 1 ? "s" : ""} — QR Upload Reminder`}>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              A Telegram message will be sent to each selected customer asking them to upload their QR code. The message below will be appended after the standard prompt.
            </p>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">
                Additional message (optional)
              </label>
              <textarea
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                rows={3}
                placeholder={gbInfo?.qrUploadMessage || "e.g. Visit inpost.co.uk to get your QR code, then upload it to your order page."}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-background resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleNotify}
                disabled={notifying}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {notifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                {notifying ? "Sending…" : `Send QR Reminder (${selectedIds.size})`}
              </button>
              {notifyError && (
                <span className="text-sm text-red-600">✗ {notifyError}</span>
              )}
            </div>
            {notifyResult && (
              <div className="rounded-lg border px-4 py-3 bg-muted/30 text-sm space-y-1">
                <p className="font-medium">
                  ✓ {notifyResult.sent} sent
                  {notifyResult.failed > 0 && <span className="text-red-600"> · {notifyResult.failed} failed</span>}
                  {notifyResult.skipped > 0 && <span className="text-muted-foreground"> · {notifyResult.skipped} skipped (no Telegram linked)</span>}
                </p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Print Modal ── */}
      {showPrint && (
        <PrintModal
          orders={(selectedIds.size > 0 ? orders.filter(o => selectedIds.has(o.id)) : filtered).map(o => ({
            id: o.id,
            code: o.code,
            telegramUsername: o.telegramUsername,
            status: o.status,
            deliveryMethod: o.deliveryMethod,
            shippingName: o.shippingName,
            shippingAddress: o.shippingAddress,
            shippingCountry: o.shippingCountry,
            reshipperUsername: o.reshipperUsername ?? o.dispatchedByReshipper,
            routingType: o.routingType,
            lineItems: (o.lineItems ?? []).map(li => ({ productName: li.productName, quantity: li.quantity })),
          }))}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ArchivedDispatchedOrdersTab — shows archived dispatched orders with restore option
// ─────────────────────────────────────────────────────────────────────────────
function ArchivedDispatchedOrdersTab({
  selectedGb,
  headers,
}: {
  selectedGb: string;
  headers: Record<string, string>;
}) {
  const [orders, setOrders] = useState<Fs3GbOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dispatchImagesMap, setDispatchImagesMap] = useState<Record<string, { id: string; filename: string }[]>>({});

  const loadOrders = useCallback(async () => {
    if (!selectedGb) { setOrders([]); setDispatchImagesMap({}); return; }
    setLoading(true);
    setError("");
    try {
      const [data, imagesMap] = await Promise.all([
        fetch(
          apiUrl(`/admin/orders?groupBuyId=${selectedGb}&dispatchConfirmed=true&dispatchArchived=true&pageSize=999`),
          { headers, credentials: "omit" },
        ).then(r => r.json()),
        fetch(apiUrl(`/admin/dispatch/${selectedGb}/dispatch-images-map`), { headers, credentials: "omit" })
          .then(r => r.json()).catch(() => ({})),
      ]);
      const raw: Fs3GbOrder[] = Array.isArray(data) ? data : (Array.isArray(data?.orders) ? data.orders : []);
      setOrders(raw.filter(o => !(o as any).deletedAt));
      setDispatchImagesMap(imagesMap && typeof imagesMap === "object" && !Array.isArray(imagesMap) ? imagesMap : {});
    } catch {
      setError("Failed to load archived orders");
    } finally {
      setLoading(false);
    }
  }, [selectedGb, headers]);

  useEffect(() => { loadOrders(); setSelectedIds(new Set()); setRestoreMsg(null); setSearch(""); }, [selectedGb]);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.trim().toLowerCase();
    return orders.filter(o =>
      (o.telegramUsername ?? "").toLowerCase().includes(q) ||
      (o.code ?? "").toLowerCase().includes(q) ||
      (o.shippingName ?? "").toLowerCase().includes(q),
    );
  }, [orders, search]);

  const toggleOrder = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filtered.map(o => o.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleRestore = async () => {
    if (selectedIds.size === 0) return;
    setRestoring(true);
    setRestoreMsg(null);
    try {
      const r = await fetch(apiUrl(`/admin/dispatch/${selectedGb}/archive-orders`), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ orderIds: [...selectedIds], archive: false }),
      });
      const d = await r.json();
      if (d.ok) {
        setRestoreMsg({ ok: true, text: `${d.updated} order${d.updated !== 1 ? "s" : ""} restored to Dispatched Orders` });
        setOrders(prev => prev.filter(o => !selectedIds.has(o.id)));
        setSelectedIds(new Set());
      } else {
        setRestoreMsg({ ok: false, text: d.error ?? "Restore failed" });
      }
    } catch {
      setRestoreMsg({ ok: false, text: "Network error" });
    } finally {
      setRestoring(false);
    }
  };

  if (!selectedGb) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Select a group buy to view archived dispatched orders</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-muted-foreground justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading archived orders…</span>
      </div>
    );
  }

  if (error) return <p className="text-sm text-red-600 py-6 text-center">{error}</p>;

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground border rounded-xl bg-muted/20">
        <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No archived dispatched orders</p>
        <p className="text-xs mt-1 opacity-70">Archive orders from the Dispatched Orders tab to see them here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-slate-50 border-slate-200">
        <Package className="w-5 h-5 text-slate-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-700">
            {orders.length} archived order{orders.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            These orders have been archived from the Dispatched Orders view. Restore to move them back.
          </p>
        </div>
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Search by username, code or name…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full text-sm border rounded-lg px-3 py-2 bg-background"
      />

      {/* Selection toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select orders to restore"}
        </span>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={selectAll}
            className="px-2.5 py-1 rounded text-[11px] font-medium border border-input bg-background hover:bg-muted transition-colors"
          >
            Select all ({filtered.length})
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={clearSelection}
              className="px-2.5 py-1 rounded text-[11px] font-medium border border-input bg-background hover:bg-muted transition-colors"
            >
              Clear
            </button>
          )}
          {selectedIds.size > 0 && (
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="px-2.5 py-1 rounded text-[11px] font-medium border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              {restoring ? "Restoring…" : `Restore to Dispatched (${selectedIds.size})`}
            </button>
          )}
        </div>
      </div>

      {restoreMsg && (
        <p className={`text-xs px-3 py-2 rounded border ${restoreMsg.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {restoreMsg.ok ? "✓ " : "✗ "}{restoreMsg.text}
        </p>
      )}

      {/* Orders list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No orders match your filter.</p>
      ) : (
        <Section title={`Archived Dispatched Orders (${filtered.length}${filtered.length !== orders.length ? ` of ${orders.length}` : ""})`}>
          <div className="divide-y divide-border -mx-4 -mb-4">
            {filtered.map(o => {
              const kits = (o.lineItems ?? []).reduce((s, li) => s + li.quantity, 0);
              const selected = selectedIds.has(o.id);
              return (
                <div
                  key={o.id}
                  onClick={() => toggleOrder(o.id)}
                  className={`px-4 py-3 flex gap-3 cursor-pointer transition-colors ${
                    selected ? "bg-blue-50" : "hover:bg-muted/30"
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    {selected
                      ? <CheckSquare className="w-4 h-4 text-primary" />
                      : <Square className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-foreground">
                        {o.code ? `@${o.code}` : o.id.slice(0, 8)}
                      </span>
                      <span className="text-xs text-muted-foreground">{o.telegramUsername}</span>
                      {o.reshipperUsername && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          {o.reshipperUsername}
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        o.status === "Completed" ? "bg-emerald-100 text-emerald-700" : "bg-green-100 text-green-700"
                      }`}>
                        {o.status}
                      </span>
                      {o.deliveryMethod && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium bg-slate-50 text-slate-600 border-slate-200">
                          {o.deliveryMethod}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground font-medium shrink-0">
                        {kits.toFixed(kits % 1 === 0 ? 0 : 1)} kit{kits !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(o.lineItems ?? []).map((li, i) => (
                        <span key={i} className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600">
                          {li.quantity}× {li.productName}
                        </span>
                      ))}
                    </div>
                    {(o.shippingName || o.shippingCountry) && (
                      <p className="text-[10px] text-muted-foreground">
                        {[o.shippingName, o.shippingCountry].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {/* Tracking number */}
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <Truck className="w-3 h-3 shrink-0 text-muted-foreground" />
                      {(() => {
                        const nums = [
                          ...(o.trackingNumbers ?? []),
                          ...(o.trackingNumber && !(o.trackingNumbers ?? []).includes(o.trackingNumber) ? [o.trackingNumber] : []),
                        ].filter(Boolean);
                        if (nums.length === 0) return <span className="text-muted-foreground italic">No tracking number</span>;
                        return <span className="font-mono text-blue-700">{nums.join(", ")}</span>;
                      })()}
                    </div>
                    {/* Dispatch photos */}
                    <div className="flex items-center gap-2 text-[10px]">
                      <Camera className="w-3 h-3 shrink-0 text-muted-foreground" />
                      {(dispatchImagesMap[o.id] ?? []).length === 0 ? (
                        <span className="text-muted-foreground italic">No dispatch photo</span>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(dispatchImagesMap[o.id] ?? []).map(img => (
                            <DispatchPhotoThumb key={img.id} imageId={img.id} headers={headers} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ShippedItemsContent — copy of the existing "Shipped Items" analysis logic
// ─────────────────────────────────────────────────────────────────────────────
type RoutingType = "" | "reshipper" | "direct" | "wholesale";

function ShippedItemsContent({
  secret,
  selectedGb,
  headers,
}: {
  secret: string;
  selectedGb: string;
  headers: Record<string, string>;
}) {
  const [parcels, setParcels] = useState<Fs3GbParcel[]>([]);
  const [orders, setOrders] = useState<Fs3GbOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [routingType, setRoutingType] = useState<RoutingType>("");
  const [selectedReshippers, setSelectedReshippers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedGb) { setParcels([]); setOrders([]); return; }
    setLoading(true);
    Promise.all([
      fetch(apiUrl(`/admin/group-buys/${selectedGb}/parcels`), { headers, credentials: "omit" }).then(r => r.json()),
      fetch(apiUrl(`/admin/orders?groupBuyId=${selectedGb}&pageSize=999`), { headers, credentials: "omit" }).then(r => r.json()),
    ])
      .then(([p, o]) => {
        setParcels(Array.isArray(p) ? p : []);
        setOrders(Array.isArray(o) ? o : (Array.isArray(o?.orders) ? o.orders : []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedGb, headers]);

  useEffect(() => { setSelectedReshippers(new Set()); }, [routingType]);

  const allReshippers = useMemo(() => {
    const r = new Set<string>();
    orders.forEach(o => { if (o.reshipperUsername) r.add(o.reshipperUsername); });
    return [...r].sort();
  }, [orders]);

  const isParcelShipped = (p: Fs3GbParcel) =>
    ["in_transit", "out_for_delivery", "attempted", "delivered"].includes(p.status);

  const isOrderShipped = (o: Fs3GbOrder) =>
    o.status === "Shipped" || o.status === "Completed" ||
    !!(o.trackingNumber) || !!(o.trackingNumbers?.length);

  const shippedItems = useMemo(() => {
    const map = new Map<string, number>();
    if (routingType === "reshipper") {
      const rf = selectedReshippers.size > 0 ? selectedReshippers : null;
      parcels.forEach(p => {
        if (!isParcelShipped(p)) return;
        if (rf && (!p.reshipperUsername || !rf.has(p.reshipperUsername))) return;
        (p.items ?? []).forEach(item => {
          const key = item.name.trim();
          map.set(key, (map.get(key) ?? 0) + item.qty);
        });
      });
    } else if (routingType === "direct" || routingType === "wholesale") {
      orders
        .filter(o => routingType === "wholesale"
          ? (o.orderType === "wholesale" || o.routingType === "wholesale")
          : (o.routingType === "direct" || o.directShippingRequested))
        .forEach(o => {
          if (!isOrderShipped(o)) return;
          (o.lineItems ?? []).forEach(li => {
            const key = li.productName.trim();
            map.set(key, (map.get(key) ?? 0) + li.quantity);
          });
        });
    } else {
      parcels.forEach(p => {
        if (!isParcelShipped(p)) return;
        (p.items ?? []).forEach(item => {
          const key = item.name.trim();
          map.set(key, (map.get(key) ?? 0) + item.qty);
        });
      });
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [parcels, orders, routingType, selectedReshippers]);

  const orderedItems = useMemo(() => {
    const map = new Map<string, number>();
    const addLineItems = (o: Fs3GbOrder) => {
      (o.lineItems ?? []).forEach(li => {
        const key = li.productName.trim().toLowerCase();
        map.set(key, (map.get(key) ?? 0) + li.quantity);
      });
    };
    if (routingType === "reshipper") {
      const rf = selectedReshippers.size > 0 ? selectedReshippers : null;
      orders.filter(o => o.reshipperUsername && (!rf || rf.has(o.reshipperUsername))).forEach(addLineItems);
    } else if (routingType === "direct" || routingType === "wholesale") {
      orders.filter(o => routingType === "wholesale"
        ? (o.orderType === "wholesale" || o.routingType === "wholesale")
        : (o.routingType === "direct" || o.directShippingRequested)).forEach(addLineItems);
    } else {
      orders.forEach(addLineItems);
    }
    return map;
  }, [orders, routingType, selectedReshippers]);

  const combinedItems = useMemo(() => {
    const keys = new Set<string>();
    shippedItems.forEach(([name]) => keys.add(name.toLowerCase()));
    orderedItems.forEach((_, key) => keys.add(key));
    return [...keys].map(key => {
      const shippedQty = shippedItems.find(([n]) => n.toLowerCase() === key)?.[1] ?? 0;
      const orderedQty = orderedItems.get(key) ?? 0;
      const displayName = shippedItems.find(([n]) => n.toLowerCase() === key)?.[0] ?? key;
      const delta = shippedQty - orderedQty;
      return { key, displayName, shippedQty, orderedQty, delta };
    }).sort((a, b) => (b.shippedQty || b.orderedQty) - (a.shippedQty || a.orderedQty));
  }, [shippedItems, orderedItems]);

  const totalShipped = shippedItems.reduce((s, [, q]) => s + q, 0);

  if (!selectedGb) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Select a group buy to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Type</label>
          <div className="flex gap-1">
            {([["", "All"], ["reshipper", "Reshipper"], ["direct", "Direct"], ["wholesale", "Wholesale"]] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setRoutingType(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  routingType === id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-input hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground self-center mt-4" />}
      </div>

      {routingType === "reshipper" && allReshippers.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Reshippers</label>
            {selectedReshippers.size > 0 && (
              <button onClick={() => setSelectedReshippers(new Set())} className="text-[10px] text-primary hover:underline">clear</button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allReshippers.map(r => {
              const hasShippedParcel = parcels.filter(isParcelShipped).some(p => p.reshipperUsername === r);
              const checked = selectedReshippers.has(r);
              return (
                <button
                  key={r}
                  onClick={() => setSelectedReshippers(prev => {
                    const next = new Set(prev);
                    next.has(r) ? next.delete(r) : next.add(r);
                    return next;
                  })}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    checked ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-muted"
                  }`}
                >
                  {hasShippedParcel && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
                  {r}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Shipped items table */}
      {combinedItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-xl bg-muted/30">
          <PackageCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No shipped items yet</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left font-medium w-8">#</th>
                <th className="px-4 py-2.5 text-left font-medium">Item</th>
                <th className="px-3 py-2.5 text-right font-medium">Ordered</th>
                <th className="px-3 py-2.5 text-right font-medium">Shipped</th>
                <th className="px-4 py-2.5 text-right font-medium">+/−</th>
              </tr>
            </thead>
            <tbody>
              {combinedItems.map(({ key, displayName, shippedQty, orderedQty, delta }, i) => (
                <tr key={key} className={`border-t border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-foreground">{displayName}</td>
                  <td className="px-3 py-2.5 text-right text-sm tabular-nums text-slate-600">
                    {orderedQty > 0 ? orderedQty : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm tabular-nums font-semibold text-slate-800">
                    {shippedQty > 0 ? shippedQty : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {orderedQty === 0 && shippedQty > 0 ? (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">? unmatched</span>
                    ) : delta === 0 && shippedQty > 0 ? (
                      <span className="text-[11px] font-semibold text-green-700">✓</span>
                    ) : delta > 0 ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">+{delta} surplus</span>
                    ) : delta < 0 ? (
                      <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">{delta} short</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex justify-between items-center gap-4">
            <span className="text-xs text-muted-foreground">{combinedItems.length} product{combinedItems.length !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-4 text-xs">
              {combinedItems.some(r => r.orderedQty > 0) && (
                <span className="text-slate-500">Ordered: <span className="font-bold text-slate-700">{combinedItems.reduce((s, r) => s + r.orderedQty, 0)}</span></span>
              )}
              <span className="text-slate-500">Shipped: <span className="font-bold text-slate-700">{totalShipped}</span></span>
              {(() => {
                const totalDeficit = combinedItems.reduce((s, r) => r.delta < 0 ? s + Math.abs(r.delta) : s, 0);
                const totalSurplus = combinedItems.reduce((s, r) => r.delta > 0 ? s + r.delta : s, 0);
                return <>
                  {totalDeficit > 0 && <span className="text-red-600 font-bold">−{totalDeficit} short</span>}
                  {totalSurplus > 0 && <span className="text-emerald-600 font-bold">+{totalSurplus} surplus</span>}
                </>;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Parcels list */}
      {routingType === "reshipper" && parcels.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parcels</h4>
          <div className="space-y-1.5">
            {parcels
              .filter(p => selectedReshippers.size === 0 || (p.reshipperUsername && selectedReshippers.has(p.reshipperUsername)))
              .map(p => {
                const shipped = isParcelShipped(p);
                return (
                  <div key={p.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs ${shipped ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${shipped ? "bg-green-500" : "bg-slate-300"}`} />
                    <span className="font-medium text-foreground min-w-0 truncate">{p.label}</span>
                    {p.reshipperUsername && <span className="text-purple-600 shrink-0 font-medium">{p.reshipperUsername}</span>}
                    <span className="text-muted-foreground font-mono shrink-0">{p.trackingNumber}</span>
                    <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${shipped ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {p.status.replace(/_/g, " ")}
                    </span>
                    {p.items.length > 0 && <span className="text-muted-foreground shrink-0">{p.items.length} item{p.items.length !== 1 ? "s" : ""}</span>}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
