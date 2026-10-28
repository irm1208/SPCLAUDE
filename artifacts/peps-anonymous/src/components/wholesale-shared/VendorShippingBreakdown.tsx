import { Truck } from "lucide-react";
import type { WholesaleVendorShippingLine } from "@/hooks/use-wholesale-shares";

const money = (n: number) => `$${n.toFixed(2)}`;

// Display-only per-vendor shipping lines. Amounts are server-authoritative; the
// aggregate shipping shown elsewhere remains the sum. Hidden for single-vendor lists.
export function VendorShippingBreakdown({ lines, label, testId }: {
  lines: WholesaleVendorShippingLine[] | undefined | null;
  label?: string;
  testId?: string;
}) {
  if (!lines || lines.length < 2) return null;
  return (
    <div className="rounded-lg px-3 py-2 space-y-1" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }} data-testid={testId ?? "vendor-shipping-breakdown"}>
      <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: "var(--t-muted)" }}>
        <Truck className="w-3 h-3" /> {label ?? "Shipping by vendor"}
      </p>
      {lines.map(l => (
        <div key={l.vendorId} className="flex items-center justify-between text-xs" data-testid={`vendor-shipping-${l.vendorId}`}>
          <span style={{ color: "var(--t-muted)" }}>{l.vendorName} · {l.kits} kit{l.kits === 1 ? "" : "s"}</span>
          <span className="font-semibold" style={{ color: "var(--t-text)" }}>{l.shipping != null ? money(l.shipping) : "—"}</span>
        </div>
      ))}
    </div>
  );
}

export function VendorGroupHeader({ name }: { name: string | null }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest px-3 pt-2 pb-1" style={{ color: "var(--t-blue)", background: "var(--t-surface2)" }} data-testid="vendor-group-header">
      {name ?? "Other"}
    </p>
  );
}
