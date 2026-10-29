import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface Review {
  vendorId: string; previewToken: string; preserved: number; updated: number; applied: boolean;
  matches: Array<{ id: string; name: string; cost: string }>;
  skipped: Array<{ id: string; name: string; reason: string }>;
}
export function Fs3SupplierCostImport({ secret, vendorId, vendorName, onApplied, disabledReason, onBusyChange }: {
  secret: string; vendorId: string; vendorName: string; onApplied: () => void | Promise<void>;
  disabledReason?: string; onBusyChange?: (busy: boolean) => void;
}) {
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const request = async (apply: boolean) => {
    if (inFlight.current || disabledReason || (apply && !review)) return;
    inFlight.current = true; setBusy(true); setError(null); onBusyChange?.(true);
    try {
      const response = await fetch("/api/admin/wholesale-products/import-fs3-costs", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ vendorId, apply, ...(apply ? { previewToken: review!.previewToken } : {}) }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? `Could not import FS3 costs (${response.status}).`);
      if (!body || body.vendorId !== vendorId || !Array.isArray(body.matches) ||
          !Array.isArray(body.skipped) || typeof body.previewToken !== "string" ||
          body.applied !== apply || typeof body.updated !== "number") {
        throw new Error("Invalid import response. Review again before applying.");
      }
      setReview(body);
      if (apply) await onApplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import FS3 costs.");
      setReview(null);
    } finally { inFlight.current = false; setBusy(false); onBusyChange?.(false); }
  };
  return <div className="rounded-lg border border-sky-200 bg-white p-3 space-y-3" data-testid="fs3-cost-import">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h4 className="text-sm font-semibold text-slate-800">Fill {vendorName} supplier costs from FS3</h4>
        <p className="text-xs text-slate-500 mt-1">Missing supplier costs only. Existing costs, sell prices, stock and shipping stay unchanged.</p>
      </div>
      <button type="button" data-testid="review-fs3-cost-import" disabled={busy || !!disabledReason} onClick={() => void request(false)}
        className="rounded border border-sky-300 px-3 py-2 text-xs font-semibold text-sky-800 disabled:opacity-50">
        {busy && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}Review FS3 import
      </button>
    </div>
    {disabledReason && <p className="text-xs text-amber-800">{disabledReason}</p>}
    {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
    {review && <div className="space-y-3 text-xs">
      {review.applied
        ? <p role="status" className="font-semibold text-emerald-700">Imported {review.updated} supplier cost{review.updated === 1 ? "" : "s"}. Saved product rows have been refreshed.</p>
        : <p className="text-slate-700"><strong>{review.matches.length}</strong> missing costs can be filled. <strong>{review.preserved}</strong> existing costs will be kept. <strong>{review.skipped.length}</strong> products need review.</p>}
      {review.matches.length > 0 && <details>
        <summary className="cursor-pointer font-semibold text-slate-700">Matched products ({review.matches.length})</summary>
        <div className="mt-2 max-h-60 overflow-y-auto">
          <table className="w-full text-left"><thead><tr><th className="py-1">Product</th><th className="py-1 text-right">Supplier cost (USD)</th></tr></thead>
            <tbody>{review.matches.map(p => <tr key={p.id}><td className="py-1 pr-2">{p.name}</td><td className="text-right">${Number(p.cost).toFixed(2)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>}
      {review.skipped.length > 0 && <details>
        <summary className="cursor-pointer font-semibold text-amber-800">Skipped — needs a unique FS3 price ({review.skipped.length})</summary>
        <ul className="mt-2 max-h-60 list-disc overflow-y-auto pl-5 text-slate-700">
          {review.skipped.map(p => <li key={p.id} className="py-1"><strong>{p.name}</strong> — {p.reason}</li>)}
        </ul>
      </details>}
      {!review.applied && review.matches.length > 0 && <button type="button" disabled={busy || !!disabledReason} data-testid="apply-fs3-cost-import"
        onClick={() => void request(true)} className="rounded bg-slate-800 px-3 py-2 font-semibold text-white disabled:opacity-50">
        Apply {review.matches.length} supplier cost{review.matches.length === 1 ? "" : "s"}
      </button>}
      {!review.applied && review.matches.length === 0 && <p className="text-slate-600">No missing costs with an unambiguous FS3 match. Nothing will be changed.</p>}
    </div>}
  </div>;
}
