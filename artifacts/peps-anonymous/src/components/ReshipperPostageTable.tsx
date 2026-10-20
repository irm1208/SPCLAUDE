import { Pencil, Trash2 } from "lucide-react";
import { COUNTRY_LIST } from "../data/countries";
import { isEuOnwardDestination, normalizeShippingCountry, type CustomPostageOption, type KitPrices } from "../lib/country-shipping-options";

type Entry = { option: CustomPostageOption; index: number; editable: boolean };
type CountryRow = { code: string; name: string; pickup?: Entry; home?: Entry };

/** Group only recognised imported EU options; never guess from editable labels.
 * Non-standard and duplicate options stay in the ordinary editor.
 */
export function groupEuPostageRows(entries: Entry[]) {
  const countries = new Map<string, CountryRow>();
  const indexes = new Set<number>();
  for (const entry of entries) {
    const { option } = entry;
    const match = /^eu-postage-([A-Z]{2})-(pickup|home)$/.exec(option.id);
    const code = normalizeShippingCountry(option.country);
    if (option.source !== "eu-postage" || !option.kitPrices || !match || match[1] !== code || !isEuOnwardDestination(code)) continue;
    const row = countries.get(code!) ?? { code: code!, name: COUNTRY_LIST.find(country => country.code === code)?.name ?? code! };
    const kind = match[2] as "pickup" | "home";
    if (row[kind]) continue;
    row[kind] = entry;
    countries.set(code!, row);
    indexes.add(entry.index);
  }
  return { rows: [...countries.values()].sort((a, b) => a.name.localeCompare(b.name)), indexes };
}

export function ReshipperPostageTable({ entries, currency, onChange, onEdit, onRemove }: {
  entries: Entry[];
  currency: string;
  onChange: (index: number, prices: KitPrices) => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const { rows } = groupEuPostageRows(entries);
  if (!rows.length) return null;
  function priceCell(row: CountryRow, kind: "pickup" | "home", band: keyof KitPrices) {
    const entry = row[kind];
    const service = kind === "pickup" ? "pickup point" : "home delivery";
    const label = `${row.name} ${service} ${band === "upTo5" ? "up to 5 kits" : "over 5 to 25 kits"}`;
    if (!entry) return <td key={`${kind}-${band}`} aria-label={`${row.name} ${service} unavailable`}
      className="px-2 py-2 text-center" style={{ color: "var(--t-muted)" }}>—</td>;
    return <td key={`${kind}-${band}`} className="px-2 py-2">
      <input aria-label={label} title={label} type="number" min="0" step="0.01" inputMode="decimal"
        disabled={!entry.editable} value={entry.option.kitPrices![band] ?? ""} placeholder="—"
        className="w-full min-w-16 rounded-md border px-2 py-2 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
        style={{ color: "var(--t-text)", borderColor: "var(--t-border)", background: "var(--t-surface)" }}
        onChange={event => {
          const value = event.target.value === "" ? null : Number(event.target.value);
          if (value !== null && !Number.isFinite(value)) return;
          onChange(entry.index, { ...entry.option.kitPrices!, [band]: value });
        }} />
    </td>;
  }
  return <div className="min-w-0 max-w-full space-y-2">
    <p className="text-xs" style={{ color: "var(--t-subtle)" }}>
      Edit rates directly below. Prices in {currency}; half kits count as 0.5. Blank rates are unavailable.
    </p>
    <div role="region" aria-label="Country postage prices" tabIndex={0}
      className="max-w-full overflow-x-auto rounded-xl border" style={{ borderColor: "var(--t-border)" }}>
      <table className="w-full min-w-[660px] border-collapse text-sm" style={{ color: "var(--t-text)" }}>
        <caption className="sr-only">EU country postage rates in {currency}, by delivery service and kit quantity</caption>
        <thead style={{ background: "var(--t-surface2)" }}>
          <tr className="text-xs">
            <th rowSpan={2} scope="col" className="sticky left-0 z-10 px-3 py-3 text-left min-w-[140px]" style={{ background: "var(--t-surface2)" }}>Country</th>
            <th colSpan={2} scope="colgroup" className="px-2 pt-3 pb-1 text-center">Pickup point</th>
            <th colSpan={2} scope="colgroup" className="px-2 pt-3 pb-1 text-center">Home delivery</th>
            <th rowSpan={2} scope="col" className="px-2 py-3"><span className="sr-only">Option settings</span></th>
          </tr>
          <tr className="text-[11px]" style={{ color: "var(--t-muted)" }}>
            {["pickup", "home"].flatMap(kind => [
              <th key={`${kind}-small`} scope="col" className="px-2 pb-3 font-medium">Up to 5 kits</th>,
              <th key={`${kind}-large`} scope="col" className="px-2 pb-3 font-medium">Over 5–25 kits</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => <tr key={row.code} className="border-t" style={{ borderColor: "var(--t-border)" }}>
            <th scope="row" className="sticky left-0 z-10 px-3 py-2 text-left font-medium" style={{ background: "var(--t-surface)" }}>{row.name}</th>
            {priceCell(row, "pickup", "upTo5")}{priceCell(row, "pickup", "upTo25")}
            {priceCell(row, "home", "upTo5")}{priceCell(row, "home", "upTo25")}
            <td className="px-2 py-2 align-top">
              {(row.pickup?.editable || row.home?.editable) && <details className="text-xs min-w-16">
                <summary className="cursor-pointer py-2 font-semibold" style={{ color: "var(--t-blue)" }}>Options</summary>
                <div className="space-y-2 pt-1">
                  {(["pickup", "home"] as const).map(kind => {
                    const entry = row[kind];
                    if (!entry?.editable) return null;
                    const service = kind === "pickup" ? "pickup point" : "home delivery";
                    return <div key={kind} className="flex items-center gap-1">
                      <span className="text-[10px] min-w-9">{kind === "pickup" ? "Pickup" : "Home"}</span>
                      <button type="button" aria-label={`Edit ${row.name} ${service} settings`} title={`Edit ${service} settings`}
                        onClick={() => onEdit(entry.index)} className="p-2 rounded-md" style={{ background: "var(--t-surface2)" }}><Pencil className="w-3 h-3" /></button>
                      <button type="button" aria-label={`Remove ${row.name} ${service}`} title={`Remove ${service}`}
                        onClick={() => onRemove(entry.index)} className="p-2 rounded-md" style={{ color: "var(--t-error, #dc2626)", background: "var(--t-surface2)" }}><Trash2 className="w-3 h-3" /></button>
                    </div>;
                  })}
                </div>
              </details>}
            </td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <p className="text-[11px] sm:hidden" style={{ color: "var(--t-muted)" }}>Swipe across the table to see all prices.</p>
  </div>;
}
