import { useEffect, useState } from "react";
import { Package, AlertTriangle, ExternalLink } from "lucide-react";

export interface VendorShipmentImage { id: string; url: string; filename: string; createdAt: string }
export interface VendorShipment {
  id: string;
  vendorName: string;
  status: string;
  trackingNumber: string | null;
  carrier: string | null;
  trackingMasked: boolean;
  images: VendorShipmentImage[];
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Preparing", processing: "Processing", packed: "Packed", shipped: "Shipped",
  dispatched: "Dispatched", in_transit: "In transit", delivered: "Delivered", cancelled: "Cancelled",
};
export const shipmentStatusLabel = (s: string) => STATUS_LABEL[s] ?? s.replace(/_/g, " ");

// Independent per-vendor fulfilment for one order. Raw tracking is only rendered
// when the server says it isn't masked; masked numbers never get a tracking link.
// Renders nothing for single-shipment orders unless they carry tracking/images,
// so existing order views (and VendorOrderImages) are unaffected.
export function VendorShipments({ orderId, showImages = true }: { orderId: string; showImages?: boolean }) {
  const [shipments, setShipments] = useState<VendorShipment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch(`/api/account/orders/${encodeURIComponent(orderId)}/vendor-shipments`, { credentials: "include" })
      .then(async r => {
        if (r.status === 404) return { shipments: [] };
        if (!r.ok) throw new Error(`Could not load vendor shipments (${r.status})`);
        return r.json().catch(() => ({}));
      })
      .then(body => { if (!cancelled) setShipments(Array.isArray(body?.shipments) ? body.shipments : []); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Could not load vendor shipments"); });
    return () => { cancelled = true; };
  }, [orderId, nonce]);

  if (error) {
    return (
      <div role="alert" data-testid="vendor-shipments-error" className="rounded-xl p-3 text-xs flex items-center gap-2" style={{ border: "1px solid rgba(239,68,68,0.3)", color: "#DC2626" }}>
        <AlertTriangle className="w-4 h-4 shrink-0" />{error}
        <button type="button" className="ml-auto font-bold underline" onClick={() => setNonce(n => n + 1)} data-testid="button-retry-vendor-shipments">Retry</button>
      </div>
    );
  }
  if (shipments === null) return <div className="h-16 rounded-xl animate-pulse" style={{ background: "var(--t-surface2)" }} data-testid="vendor-shipments-loading" />;
  if (!shipments.length) return null;

  return (
    <section aria-label="Vendor shipments" data-testid="vendor-shipments" className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: "var(--t-subtle)" }}>
        <Package className="w-3.5 h-3.5" /> Shipments by vendor
      </p>
      {shipments.map(s => (
        <div key={s.id} className="rounded-xl p-3 space-y-2" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }} data-testid={`vendor-shipment-${s.id}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{s.vendorName}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}>{shipmentStatusLabel(s.status)}</span>
          </div>
          {s.trackingNumber ? (
            <div className="text-xs flex flex-wrap items-center gap-x-2 gap-y-1" style={{ color: "var(--t-muted)" }}>
              <span className="font-mono" style={{ color: "var(--t-text)" }} data-testid={`text-shipment-tracking-${s.id}`}>{s.trackingNumber}</span>
              {s.carrier && <span>· {s.carrier}</span>}
              {!s.trackingMasked && (
                <a href={`https://t.17track.net/en#nums=${encodeURIComponent(s.trackingNumber)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold underline" style={{ color: "var(--t-blue)" }}>
                  <ExternalLink className="w-3 h-3" /> Track
                </a>
              )}
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>No tracking yet</p>
          )}
          {showImages && s.images.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5">
              {s.images.map(img => (
                <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-md overflow-hidden" style={{ border: "1px solid var(--t-border)" }}>
                  <img src={img.url} alt={img.filename} loading="lazy" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
