import { useEffect, useState } from "react";

const key = (value: string | null | undefined) => (value ?? "").trim().replace(/^@/, "").toLowerCase();

/** Shared by the active organiser dashboard and Admin's create/edit form. */
export function ParcelDestinationField({ gbId, scope, secret, value, onChange }: {
  gbId: string; scope: "organiser" | "admin"; secret?: string;
  value: string | null; onChange: (value: string | null) => void;
}) {
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/${scope}/group-buys/${gbId}/reshippers`, {
      credentials: "include", signal: controller.signal,
      headers: scope === "admin" ? { "x-admin-secret": secret ?? "" } : {},
    }).then(async response => {
      if (!response.ok) throw new Error("Could not load this group's destination reshippers.");
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error("Invalid reshipper list.");
      setNames([...new Set<string>(rows.map(row => row.reshipperUsername).filter(Boolean))]);
    }).catch(error => {
      if (!controller.signal.aborted) setError(error.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [gbId, scope, secret, attempt]);
  const selectedIsListed = names.some(name => key(name) === key(value));
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold" style={{ color: "var(--t-text)" }}>
        Destination reshipper
        <select
          data-testid="select-parcel-destination"
          value={key(value)}
          disabled={loading || Boolean(error)}
          onChange={event => onChange(names.find(name => key(name) === event.target.value) ?? null)}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          style={{ color: "var(--t-text)", background: "var(--t-surface)", borderColor: "var(--t-border)" }}
        >
          <option value="">{loading ? "Loading destinations…" : "Unassigned — staff confirmation needed"}</option>
          {value && !selectedIsListed && <option value={key(value)}>@{key(value)} (saved assignment)</option>}
          {names.map(name => <option key={key(name)} value={key(name)}>@{key(name)}</option>)}
        </select>
      </label>
      {error && <p role="alert" className="text-xs text-red-600">{error} <button type="button" onClick={() => setAttempt(n => n + 1)}>Retry</button></p>}
      {!value && <p role="status" data-testid="warning-parcel-destination" className="text-xs text-amber-700">
        Destination not confirmed. This parcel stays hidden from members unless its label exactly matches a group reshipper username. Do not infer a destination from AJ/Ghost labels.
      </p>}
      <p className="text-xs" style={{ color: "var(--t-subtle)" }}>Choose the recipient, not the package creator. Direct deliveries use the member's own order tracking.</p>
    </div>
  );
}

export function ParcelDestinationSummary({ value }: { value?: string | null }) {
  return value
    ? <p className="text-xs" data-testid="text-parcel-destination">Destination: @{key(value)}</p>
    : <p role="status" className="text-xs text-amber-700" data-testid="warning-parcel-destination">Destination not confirmed — edit this parcel to select its reshipper.</p>;
}
