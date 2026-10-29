import { useState } from "react";
import "./_group.css";

// Vendor section extracted from WholesaleOrder.tsx. Network/account state is
// replaced locally for the isolated design preview; no production requests.
export function Current() {
  const vendors = [{ id: "uther", name: "Uther" }, { id: "preview", name: "Second vendor (example)" }];
  const [selectedVendorId, setSelectedVendorId] = useState("uther");
  const [pendingVendorId, setPendingVendorId] = useState<string | null>(null);
  const vendorUnavailable = false;
  const requestVendorChange = (id: string) => setPendingVendorId(id);
  const confirmVendorChange = () => { if (pendingVendorId) setSelectedVendorId(pendingVendorId); setPendingVendorId(null); };
  return (
    <div className="wholesale-source min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-6">Wholesale Order</h1>
      {vendors.length > 1 && (
        <section className="space-y-2" aria-label="Vendor" data-testid="section-vendor-picker">
          <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>Vendor</p>
          <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>Each order ships from one vendor. Prices and shipping follow the vendor you pick.</p>
            {vendorUnavailable && !selectedVendorId && (
              <p role="alert" className="text-xs font-semibold" style={{ color: "#b45309" }}>
                The vendor saved on this order is no longer available. Choose a vendor to continue — your items will be priced from its catalogue.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {vendors.map(v => {
                const on = v.id === selectedVendorId;
                return (
                  <button key={v.id} type="button" onClick={() => requestVendorChange(v.id)} aria-pressed={on}
                    className="h-9 px-4 rounded-lg text-sm font-semibold border transition-colors"
                    style={on ? { background: "var(--t-blue)", color: "#fff", borderColor: "var(--t-blue)" }
                      : { background: "var(--t-surface2)", color: "var(--t-text)", borderColor: "var(--t-border)" }}>
                    {v.name}
                  </button>
                );
              })}
            </div>
            {pendingVendorId && (
              <div role="alertdialog" aria-label="Confirm vendor change" className="rounded-lg p-3 space-y-2" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.3)" }}>
                <p className="text-xs" style={{ color: "var(--t-text)" }}>
                  Switch to <strong>{vendors.find(v => v.id === pendingVendorId)?.name}</strong>? This clears your basket — items aren't carried across vendors or repriced.
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={confirmVendorChange} className="h-8 px-3 rounded-lg text-xs font-bold text-white" style={{ background: "#b45309" }}>Clear basket &amp; switch</button>
                  <button type="button" onClick={() => setPendingVendorId(null)} className="h-8 px-3 rounded-lg text-xs font-semibold" style={{ background: "var(--t-chip)", color: "var(--t-text)" }}>Keep current vendor</button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
