export interface SharedSupplier { id: string; name: string }

export function SupplierSelection({ vendors, selected, onChange, disabled = false }: {
  vendors: SharedSupplier[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-2" data-testid="shared-supplier-selection">
      <legend className="text-xs font-bold mb-2" style={{ color: "var(--t-text)" }}>Suppliers for this shared order</legend>
      <div className="flex flex-wrap gap-2">
        {vendors.map(vendor => (
          <label key={vendor.id} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer"
            style={{ borderColor: "var(--t-border)", color: "var(--t-text)", background: selected.includes(vendor.id) ? "var(--t-blue-08)" : "var(--t-surface)" }}>
            <input type="checkbox" checked={selected.includes(vendor.id)}
              onChange={e => onChange(e.target.checked ? [...selected, vendor.id] : selected.filter(id => id !== vendor.id))} />
            {vendor.name}
          </label>
        ))}
        {vendors.length > 1 && <button type="button" className="text-xs font-semibold px-2" style={{ color: "var(--t-blue)" }}
          onClick={() => onChange(vendors.map(v => v.id))}>Select both suppliers</button>}
      </div>
      <p className="text-xs" style={{ color: "var(--t-muted)" }}>Choose one supplier or both. Each supplier has its own shipping charge, shared only by members ordering from that supplier.</p>
      {selected.length === 0 && <p className="text-xs" role="alert" style={{ color: "#dc2626" }}>Select at least one supplier.</p>}
    </fieldset>
  );
}
