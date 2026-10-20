import React, { useState } from "react";
import { importEuCustomPostage, type CustomPostageOption, type KitPrices } from "@/lib/country-shipping-options";
import { defaultFetcher, onwardApi, type OnwardConfig, type Fetcher } from "@/lib/onward-delivery";

export function EuCustomPostageImport({ gbId, currency, scope, fetcher = defaultFetcher, options, onChange }: {
  gbId: string; currency: string; scope: "admin" | "organiser"; fetcher?: Fetcher;
  options: CustomPostageOption[]; onChange: (options: CustomPostageOption[]) => void;
}) {
  const [config, setConfig] = useState<OnwardConfig | null>(null);
  const [source, setSource] = useState("template");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function load() {
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await onwardApi.getConfig(fetcher, scope, gbId);
      setConfig(data);
      const saved = data.reshippers.filter(row => row.matrix?.rates.some(rate =>
        [rate.pickupSmall, rate.pickupLarge, rate.homeSmall, rate.homeLarge].some(price => price !== null)));
      setSource(saved.length === 1 ? saved[0].username : "template");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load EU postage rates"); }
    finally { setBusy(false); }
  }
  function add() {
    setError(""); setMessage("");
    try {
      const matrix = source === "template" ? config?.template : config?.reshippers.find(row => row.username === source)?.matrix;
      if (!matrix) throw new Error("Choose a source with saved prices.");
      const next = importEuCustomPostage(options, matrix, currency);
      onChange(next);
      setMessage("EU home and pickup options added. Review the prices, then save your postage options. This replaces the EU matrix at checkout for these countries; existing orders and issued payment requests are unchanged.");
      setConfig(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not import EU postage"); }
  }
  return <div className="space-y-2 mb-3 text-xs">
    <button type="button" onClick={load} disabled={busy} className="rounded-lg px-3 py-2 font-semibold text-white bg-[#2D6BCC] disabled:opacity-50">
      {busy ? "Loading EU prices…" : "Add EU home / pickup options"}
    </button>
    {config && <div className="flex flex-wrap items-center gap-2">
      <select aria-label="EU postage price source" value={source} onChange={event => setSource(event.target.value)}
        className="rounded-lg border border-input bg-background p-2">
        <option value="template">Original supplied USD rates</option>
        {config.reshippers.filter(row => row.matrix).map(row =>
          <option key={row.username} value={row.username}>Saved prices — @{row.username} ({row.matrix!.currency})</option>)}
      </select>
      <button type="button" onClick={add} className="rounded-lg border border-input px-3 py-2 font-semibold">Import rates</button>
      <button type="button" onClick={() => setConfig(null)} className="px-2 py-2 underline">Cancel</button>
      <p className="w-full text-muted-foreground">Country-specific home/pickup options. Up to 5 kits or over 5–25 kits is selected automatically. Half kits count as 0.5. Charged with the order, not as a separate matrix payment. Over 25 kits requires an organiser quote.</p>
    </div>}
    {message && <p role="status" className="text-green-700">{message}</p>}
    {error && <p role="alert" className="text-red-600">{error}</p>}
  </div>;
}

export function PostageKitBandInputs({ value, onChange, currency = "$" }: {
  value: KitPrices; onChange: (value: KitPrices) => void; currency?: string;
}) {
  return <div className="grid grid-cols-2 gap-2 text-xs">
    {(["upTo5", "upTo25"] as const).map(key => <label key={key} className="space-y-1 min-w-0">
      <span>{key === "upTo5" ? "Up to 5 kits" : "Over 5–25 kits"} ({currency})</span>
      <input type="number" min="0" max="10000" step="0.01" aria-label={key === "upTo5" ? "Price up to 5 kits" : "Price over 5 through 25 kits"}
        value={value[key] ?? ""} placeholder="Unavailable"
        onChange={event => onChange({ ...value, [key]: event.target.value === "" ? null : Number(event.target.value) })}
        className="w-full rounded-lg border border-input bg-background px-2 py-2" />
    </label>)}
    <p className="col-span-2 text-muted-foreground">Rate applied automatically. Blank means unavailable; over 25 kits needs a quote.</p>
  </div>;
}
