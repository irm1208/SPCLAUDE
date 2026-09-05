import type { TrackingPackageView } from "@workspace/shipping/tracking";
import { ChevronDown, ExternalLink, Package } from "lucide-react";

const statusLabel = (status: string | null) => status ? status.replace(/_/g, " ") : "No tracking update";

function TrackingLegCard({ label, leg }: { label: string; leg: TrackingPackageView["international"] }) {
  return (
    <div className="rounded-lg p-3" style={{ background: "var(--adm-shell)", border: "1px solid var(--adm-border)" }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--adm-muted)" }}>{label}</span>
        <span className="font-mono text-xs font-semibold break-all" style={{ color: "var(--adm-text)" }}>{leg.trackingNumber}</span>
        <a href={`https://t.17track.net/en#nums=${encodeURIComponent(leg.trackingNumber)}`} target="_blank"
          rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold"
          style={{ color: "var(--adm-accent)" }}>Track <ExternalLink className="h-3 w-3" /></a>
      </div>
      <p className="mt-1 text-xs capitalize" style={{ color: "var(--adm-muted)" }}>{statusLabel(leg.status)}</p>
      {leg.lastChecked && <p className="text-[10px]" style={{ color: "var(--adm-muted)" }}>Checked {new Date(leg.lastChecked).toLocaleString()}</p>}
      {leg.events.length > 0 && (
        <details className="mt-2">
          <summary className="flex cursor-pointer items-center gap-1 text-[10px] font-semibold" style={{ color: "var(--adm-accent)" }}>
            <ChevronDown className="h-3 w-3" /> Previous updates ({leg.events.length})
          </summary>
          <ol className="mt-2 space-y-2 border-l pl-3" style={{ borderColor: "var(--adm-border)" }}>
            {leg.events.map((event, index) => (
              <li key={`${event.date}-${index}`} className="text-[10px]" style={{ color: "var(--adm-muted)" }}>
                <strong style={{ color: "var(--adm-text)" }}>{event.status}</strong>
                {event.location ? ` · ${event.location}` : ""}<br />{event.date}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

export function AdminTrackingPackages({ views, status }: { views: TrackingPackageView[]; status?: string | null }) {
  if (views.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--adm-muted)" }}>
        <Package className="h-3.5 w-3.5" /> Physical packages ({views.length})
        {status && <span className="ml-1 normal-case font-normal capitalize">· {statusLabel(status)}</span>}
      </h3>
      <div className="space-y-3">
        {views.map((pkg, index) => (
          <div key={pkg.id} className="space-y-2 rounded-xl p-3" style={{ border: "1px solid var(--adm-border)" }}>
            <div className="flex items-center justify-between text-xs">
              <strong style={{ color: "var(--adm-text)" }}>Package {index + 1}</strong>
              <span className="capitalize" style={{ color: "var(--adm-muted)" }}>{pkg.courier} · {statusLabel(pkg.status)}</span>
            </div>
            <TrackingLegCard label="International" leg={pkg.international} />
            {pkg.local ? (
              <TrackingLegCard label="Local courier" leg={pkg.local} />
            ) : pkg.waitingForLocal ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                Waiting for BMURFS local courier tracking.
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}