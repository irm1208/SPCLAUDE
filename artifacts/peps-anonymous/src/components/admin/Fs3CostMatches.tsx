import { useCallback, useEffect, useState } from "react";
import type { Fs3CostMatch } from "@workspace/api-zod/fs3-costs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const apiUrl = (path: string) => `/api${path}`;

interface Props {
  secret: string;
  costs: { productName: string; unitCost: number }[];
  vendors: { id: string; name: string }[];
  onChanged: () => Promise<void>;
}
export function Fs3CostMatches({ secret, costs, vendors, onChanged }: Props) {
  const [matches, setMatches] = useState<Fs3CostMatch[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [productName, setProductName] = useState("");
  const [costName, setCostName] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch(apiUrl("/admin/fs3-cost-matches"), {
      headers: { "x-admin-secret": secret }, credentials: "omit", cache: "no-store", signal,
    });
    if (!res.ok) throw new Error("Unable to load reviewed product matches.");
    const data = await res.json();
    if (!signal?.aborted) { setMatches(data); setLoaded(true); }
  }, [secret]);
  useEffect(() => {
    const controller = new AbortController();
    setLoaded(false); setMatches([]); setError("");
    const reload = () => {
      if (!document.hidden) refresh(controller.signal).catch(e => {
        if (!controller.signal.aborted) setError(e.message);
      });
    };
    refresh(controller.signal).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    window.addEventListener("focus", reload);
    const timer = window.setInterval(reload, 60_000);
    return () => {
      controller.abort(); window.removeEventListener("focus", reload); window.clearInterval(timer);
    };
  }, [refresh]);
  const save = async (remove?: Fs3CostMatch) => {
    setBusy(true); setError("");
    try {
      const res = await fetch(apiUrl("/admin/fs3-cost-matches"), {
        method: remove ? "DELETE" : "POST", credentials: "omit",
        headers: { "x-admin-secret": secret, "Content-Type": "application/json" },
        body: JSON.stringify(remove
          ? { vendorId: remove.vendorId, productName: remove.productName }
          : { vendorId: vendorId || null, productName, costName, reviewNote, reviewed }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Unable to save product match.");
      if (!remove) { setProductName(""); setCostName(""); setReviewNote(""); setReviewed(false); }
      await Promise.all([refresh(), onChanged()]);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save product match."); }
    finally { setBusy(false); }
  };
  const resetReview = () => setReviewed(false);
  return <section className="border-t border-border pt-3 space-y-3" aria-label="Reviewed product name matches">
    <div>
      <h3 className="text-sm font-semibold">Reviewed product name matches</h3>
      <p className="text-xs text-muted-foreground mt-1">
        Map an ordered name to a saved supplier cost only after checking the compound and dose.
        Exact catalogue costs take priority. Matches never change product names in TXT files.
        Legacy matches do not apply to named suppliers.
      </p>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!loaded && <Button size="sm" variant="outline" disabled={busy} onClick={() => {
      setError(""); void refresh().catch(e => setError(e.message));
    }}>Reload matches</Button>}
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {matches.map(m => <div key={JSON.stringify([m.vendorId, m.productName])} className="border rounded-md p-2 text-xs space-y-1">
        <div className="flex justify-between items-start gap-2">
          <p className="break-words min-w-0"><strong>{m.productName}</strong> → {m.costName}
            <span className="block text-muted-foreground">
              {m.vendorId ? vendors.find(v => v.id === m.vendorId)?.name ?? `Supplier ${m.vendorId}` : "Legacy products only"}
              {!costs.some(c => c.productName.trim().toLowerCase() === m.costName.trim().toLowerCase()) && " · Target price missing"}
            </span>
          </p>
          <div className="flex gap-1 shrink-0">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => {
              setVendorId(m.vendorId ?? ""); setProductName(m.productName);
              setCostName(m.costName); setReviewNote(m.reviewNote); setReviewed(false);
            }}>Edit</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => {
              if (window.confirm(`Revoke the cost match for "${m.productName}"? Unpriced products may no longer export.`)) void save(m);
            }}>Revoke</Button>
          </div>
        </div>
        <p className="text-muted-foreground break-words">{m.reviewNote} · {m.reviewedBy} · {new Date(m.reviewedAt).toLocaleString()}</p>
      </div>)}
      {loaded && !matches.length && <p className="text-xs text-muted-foreground">No reviewed matches.</p>}
    </div>
    <fieldset disabled={busy || !loaded} className="space-y-2">
      <legend className="text-xs font-semibold mb-2">Add or replace a reviewed match</legend>
      <label className="block text-xs">Supplier scope
        <select className="block mt-1 w-full rounded-md border bg-background p-2 text-sm" value={vendorId}
          onChange={e => { setVendorId(e.target.value); resetReview(); }}>
          <option value="">Legacy products only</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </label>
      <label className="block text-xs">Ordered product name
        <Input value={productName} maxLength={200} placeholder="Exact name on the order"
          onChange={e => { setProductName(e.target.value); resetReview(); }} />
      </label>
      <label className="block text-xs">Saved supplier-cost name
        <select className="block mt-1 w-full rounded-md border bg-background p-2 text-sm" value={costName}
          onChange={e => { setCostName(e.target.value); resetReview(); }}>
          <option value="">Choose a saved cost</option>
          {costs.map(c => <option key={c.productName} value={c.productName}>{c.productName} — ${c.unitCost.toFixed(2)}</option>)}
        </select>
      </label>
      <label className="block text-xs">Review note
        <Input value={reviewNote} maxLength={500} placeholder="Why these names represent the same supplier product"
          onChange={e => { setReviewNote(e.target.value); resetReview(); }} />
      </label>
      <label className="flex gap-2 items-start text-xs">
        <input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />
        I have checked the compound, modification and dose and approve this cost match for this supplier scope.
      </label>
      <Button size="sm" disabled={busy || !loaded || !reviewed || !productName.trim() || !costName || !reviewNote.trim()}
        onClick={() => void save()}>Approve and save match</Button>
    </fieldset>
  </section>;
}
