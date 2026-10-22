import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { canonicalReshipperUsername, filterAssignedFulfilmentOrders } from "@/lib/reshipper-fulfilment";
import { buildReshipperFulfilmentTxt, type ReshipperTotalOrder } from "@/lib/reshipper-fulfilment-txt";

export function ReshipperFulfilmentDownload({ orders, groupBuyId, currency, groupBuyName, reshipperUsername, disabled = false }: {
  orders: ReshipperTotalOrder[]; groupBuyId: string; currency: string; groupBuyName: string; reshipperUsername?: string; disabled?: boolean;
}) {
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const inFlight = useRef(false);
  const usernames = [...new Set(orders.map(o => canonicalReshipperUsername(o.reshipperUsername)).filter(Boolean))]
    .filter(name => filterAssignedFulfilmentOrders(orders, name).length > 0).sort();
  const username = reshipperUsername ?? selected;
  const eligible = filterAssignedFulfilmentOrders(orders, username).length > 0;
  const download = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setDownloading(true);
    setError("");
    try {
      const response = await fetch(`/api/organiser/group-buys/${encodeURIComponent(groupBuyId)}/orders`, {
        credentials: "include", cache: "no-store",
      });
      const latest = await response.json();
      if (!response.ok) throw new Error(latest?.error ?? "Could not load the latest orders. Please try again.");
      if (!Array.isArray(latest)) throw new Error("Could not load the latest orders. No file was downloaded.");
      // Never fall back to the page snapshot: manual edits and assignments may
      // have changed since this fulfilment tab was opened.
      const text = buildReshipperFulfilmentTxt(latest, username, currency);
      const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
      const link = document.createElement("a");
      const clean = (s: string) => s.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "orders";
      link.href = url; link.download = `${clean(groupBuyName)}-${clean(canonicalReshipperUsername(username))}-total-order.txt`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not download the reshipper order."); }
    finally { inFlight.current = false; setDownloading(false); }
  };
  return <div className="flex flex-wrap items-center gap-2">
    {!reshipperUsername && <select aria-label="Reshipper to download" value={selected}
      onChange={e => { setSelected(e.target.value); setError(""); }} disabled={disabled || downloading}
      className="h-9 max-w-44 rounded-lg border bg-transparent px-2 text-xs" style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}>
      <option value="">Choose reshipper</option>{usernames.map(name => <option key={name} value={name}>@{name}</option>)}
    </select>}
    <button type="button" onClick={download} disabled={disabled || downloading || !eligible}
      title="Combined items, order total and kits for all assigned active orders, regardless of search. No member names."
      aria-label={reshipperUsername ? `Download total order for ${reshipperUsername}` : "Download selected reshipper total order"}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold disabled:opacity-50"
      style={{ borderColor: "var(--t-border)", color: "var(--t-blue)" }}>
      <Download className="h-3.5 w-3.5" />{downloading ? "Loading latest orders…" : "Download total order"}
    </button>
    {error && <p role="alert" className="w-full text-xs text-red-600">{error}</p>}
  </div>;
}
