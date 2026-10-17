import { useCallback, useEffect, useState } from "react";
import { OnwardDeliveryMatrixPanel } from "./OnwardDelivery";
import { OnwardPaymentManager } from "./OnwardPayments";
import { defaultFetcher, onwardApi, type Fetcher } from "@/lib/onward-delivery";

export function OrganiserOnwardDelivery({ gbId, fetcher = defaultFetcher }: { gbId: string; fetcher?: Fetcher }) {
  return <OrganiserOnwardBody key={gbId} gbId={gbId} fetcher={fetcher} />;
}
function OrganiserOnwardBody({ gbId, fetcher }: { gbId: string; fetcher: Fetcher }) {
  const [names, setNames] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    const abort = new AbortController(); setLoading(true); setError("");
    onwardApi.getConfig(fetcher, "organiser", gbId, { signal: abort.signal }).then(config => {
      if (abort.signal.aborted) return;
      const active = config.reshippers.filter(r => r.enabled).map(r => r.username);
      setNames(active); setSelected(previous => active.includes(previous) ? previous : active[0] ?? "");
    }).catch(e => { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "Could not load reshippers."); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [gbId, fetcher, open, retry]);
  const delegatedFetch: Fetcher = useCallback((url, init) => {
    const from = `/api/reshipper/gb/${encodeURIComponent(gbId)}`;
    const to = `/api/organiser/group-buys/${encodeURIComponent(gbId)}/reshippers/${encodeURIComponent(selected)}`;
    if (!selected || !url.startsWith(`${from}/`)) return Promise.reject(new Error("Choose a reshipper for this group buy."));
    return fetcher(`${to}${url.slice(from.length)}`, init);
  }, [fetcher, gbId, selected]);
  return (
    <div className="space-y-3" data-testid="organiser-onward-delivery">
      <OnwardDeliveryMatrixPanel scope="organiser" gbId={gbId} fetcher={fetcher} />
      <section className="rounded-xl border p-3 space-y-3" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
        <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} className="w-full text-left text-xs font-bold" data-testid="toggle-organiser-onward-payments">
          {open ? "−" : "+"} Onward delivery payment requests
        </button>
        {open && <>
          <p className="text-xs" style={{ color: "var(--t-muted)" }}>Choose a reshipper to issue, confirm, reject or cancel delivery requests. Rates are estimates; existing requests never change when the matrix is edited.</p>
          {loading && <p className="text-xs">Loading reshippers…</p>}
          {error && <p role="alert" className="text-xs text-red-600">{error} <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
          {!loading && !error && (names.length ? <>
            <label className="block text-xs font-semibold">Reshipper
              <select value={selected} onChange={e => setSelected(e.target.value)} className="block mt-1 rounded-lg border p-2 w-full" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="select-organiser-onward-reshipper">
                {names.map(name => <option key={name} value={name}>@{name.replace(/^@/, "")}</option>)}
              </select>
            </label>
            {selected && <OnwardPaymentManager key={selected} gbId={gbId} fetcher={delegatedFetch} walletReadOnly />}
          </> : <p className="text-xs" style={{ color: "var(--t-muted)" }}>Assign and enable a reshipper first.</p>)}
        </>}
      </section>
    </div>
  );
}
