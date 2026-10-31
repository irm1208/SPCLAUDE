import type { SharedSupplier } from "./SupplierSelection";

export type SupplierShippingRules = Record<string, "buyers" | "all_members">;

export function SupplierShippingSplit({ vendors, rules, onChange, disabled = false }: {
  vendors: SharedSupplier[];
  rules: SupplierShippingRules;
  onChange: (rules: SupplierShippingRules) => void;
  disabled?: boolean;
}) {
  if (!vendors.length) return null;
  return (
    <fieldset disabled={disabled} className="space-y-3" data-testid="supplier-shipping-split">
      <legend className="text-xs font-semibold mb-2" style={{ color: "var(--t-text)" }}>Who shares each supplier’s shipping?</legend>
      {vendors.map(vendor => (
        <label key={vendor.id} className="block space-y-1">
          <span className="text-xs font-semibold" style={{ color: "var(--t-muted)" }}>{vendor.name} shipping</span>
          <select value={rules[vendor.id] ?? "buyers"}
            onChange={e => onChange({ ...rules, [vendor.id]: e.target.value as "buyers" | "all_members" })}
            className="w-full h-10 px-3 rounded-lg border text-sm"
            style={{ color: "var(--t-text)", background: "var(--t-surface2)", borderColor: "var(--t-border)" }}>
            <option value="buyers">Only members buying from {vendor.name}</option>
            <option value="all_members">All members with items</option>
          </select>
        </label>
      ))}
      {vendors.length > 1 && <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange({ ...rules, ...Object.fromEntries(vendors.map(v => [v.id, "buyers" as const])) })}
          className="px-3 py-2 rounded-lg border text-xs font-semibold" style={{ color: "var(--t-blue)", borderColor: "var(--t-border)" }}>Split separately by supplier</button>
        <button type="button" onClick={() => onChange({ ...rules, ...Object.fromEntries(vendors.map(v => [v.id, "all_members" as const])) })}
          className="px-3 py-2 rounded-lg border text-xs font-semibold" style={{ color: "var(--t-blue)", borderColor: "var(--t-border)" }}>Share both across everyone</button>
      </div>}
      <p className="text-xs" style={{ color: "var(--t-muted)" }}>Members without items are not charged. “By order size” uses supplier quantities for buyers-only splits, or total order quantities when sharing across everyone.</p>
    </fieldset>
  );
}
