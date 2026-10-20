import { useEffect, useState } from "react";
import { apiUrl, type GroupBuy } from "./shared/core";

export function DedicatedDirectShippingSettings({ gb, secret, onUpdate }: {
  gb: GroupBuy; secret: string; onUpdate?: (gb: GroupBuy) => void;
}) {
  const [enabled, setEnabled] = useState(Boolean(gb.directShippingEnabled));
  const [minimum, setMinimum] = useState(String(gb.directShippingMinKits ?? 30));
  const [vendor, setVendor] = useState(gb.directShippingVendorId ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setEnabled(Boolean(gb.directShippingEnabled)); setMinimum(String(gb.directShippingMinKits ?? 30));
    setVendor(gb.directShippingVendorId ?? "");
  }, [gb.id, gb.directShippingEnabled, gb.directShippingMinKits, gb.directShippingVendorId]);
  useEffect(() => { setMessage(""); }, [gb.id]);
  const valid = minimum.trim() !== "" && Number.isFinite(Number(minimum)) && Number(minimum) >= 0 && Number(minimum) <= 100000 && Number(minimum) * 2 === Math.round(Number(minimum) * 2);
  async function save() {
    if (!valid) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(apiUrl(`/admin/group-buys/${gb.id}`), {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ directShippingEnabled: enabled, directShippingMinKits: Number(minimum), directShippingVendorId: vendor.trim() || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save Direct Shipping settings.");
      onUpdate?.(data); setMessage("Direct Shipping settings saved.");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-border p-4 space-y-3">
    <h3 className="font-semibold text-sm">Dedicated Direct Shipping</h3>
    <p className="text-xs text-muted-foreground">Ships from the supplier directly to the member. Separate from country postage, which routes through reshippers. Orders are never switched automatically.</p>
    <fieldset disabled={busy} className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={e => { setEnabled(e.target.checked); setMessage(""); }} />
        Offer Direct Shipping to eligible members
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium">Minimum kits
          <input aria-label="Dedicated Direct Shipping minimum kits" type="number" required min="0" max="100000" step="0.5" value={minimum}
            onChange={e => { setMinimum(e.target.value); setMessage(""); }}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-medium">Wholesale vendor ID (optional)
          <input value={vendor} onChange={e => { setVendor(e.target.value); setMessage(""); }}
            className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">Available at {valid ? minimum : "the minimum"} kits or more; half kits count as 0.5. Only shown when enabled and eligible.</p>
      <button type="button" disabled={!valid || busy} onClick={save} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">{busy ? "Saving…" : "Save Direct Shipping"}</button>
    </fieldset>
    {message && <p role="status" className="text-xs">{message}</p>}
  </section>;
}
