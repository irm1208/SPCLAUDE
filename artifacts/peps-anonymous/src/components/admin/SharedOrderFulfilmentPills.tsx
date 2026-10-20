import React from "react";
import { wholesaleStatusLabel } from "../../lib/wholesale-status-label";

/** Uses the server's whole-share summary, never the currently filtered members. */
export function SharedOrderFulfilmentPills({ statuses, shareStatus, unavailable = false }: {
  statuses?: string[]; shareStatus?: string; unavailable?: boolean;
}) {
  const labels = unavailable ? ["Status unavailable"]
    : statuses === undefined ? ["Checking status…"]
    : [...statuses];
  if (!unavailable && statuses !== undefined && !labels.some(status => status !== "Paid") && shareStatus) {
    labels.push(shareStatus.charAt(0).toUpperCase() + shareStatus.slice(1));
  }
  if (!labels.length) labels.push("Status unavailable");

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5" aria-label="Shared order status">
      {labels.map(status => {
        const color = status === "Cancelled" ? "#ef4444"
          : status === "Paid" ? "#22c55e"
          : /shipped|completed|delivered/i.test(status) ? "#2D6BCC"
          : /processed|processing/i.test(status) ? "#a855f7"
          : "var(--adm-muted, #64748b)";
        return (
          <span key={status} className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
            {wholesaleStatusLabel(status, "wholesale_shared")}
          </span>
        );
      })}
    </span>
  );
}
