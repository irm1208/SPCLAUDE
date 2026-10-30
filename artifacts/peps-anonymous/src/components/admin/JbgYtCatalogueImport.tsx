import { useRef, useState } from "react";

interface Review {
  products: { id: string; sku: string; name: string; wholesaleCost: string; wholesalePrice: string; stock: number | null; exists: boolean; needsUpdate: boolean; previousCost: string | null; previousPrice: string | null }[];
  previewToken: string; applied: boolean; created: number; updated: number; preserved: number;
}
export function JbgYtCatalogueImport({ secret, vendorId, onApplied, disabledReason, onBusyChange }: {
  secret: string; vendorId: string; onApplied: () => Promise<void>; disabledReason?: string; onBusyChange?: (busy: boolean) => void;
}) {
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function request(apply: boolean) {
    if (pending.current || disabledReason || (apply && !review)) return;
    pending.current = true; setBusy(true); onBusyChange?.(true); setError("");
    let applied = false;
    try {
      const response = await fetch("/api/admin/wholesale-products/import-jbg-yt", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ vendorId, apply, ...(apply ? { previewToken: review!.previewToken } : {}) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not import JBG/YT products");
      if (!Array.isArray(body.products) || typeof body.previewToken !== "string" || body.applied !== apply) {
        throw new Error("Invalid import response. Review again before importing.");
      }
      setReview(body);
      applied = body.applied;
      if (apply) await onApplied();
    } catch (err) {
      setError(applied ? "Products were saved, but the table could not refresh. Reload the page to see them."
        : err instanceof Error ? err.message : "Could not import products");
      if (!applied) setReview(null);
    } finally { pending.current = false; setBusy(false); onBusyChange?.(false); }
  }
  const missing = review?.products.filter(row => !row.exists).length ?? 0;
  const corrections = review?.products.filter(row => row.needsUpdate).length ?? 0;
  return <div className="space-y-3 rounded-lg border border-sky-200 bg-white p-3">
    <h4 className="text-sm font-semibold text-slate-800">Apply corrected JBG/YT product list</h4>
    <p className="text-xs text-slate-600">56 products from your corrected list. Updates existing JBG/YT catalogue prices and adds missing products. New products start with 100,000 stock; remaining stock on existing products is preserved. Customer orders, other suppliers and shipping settings are not changed.</p>
    <button type="button" disabled={busy || !!disabledReason} onClick={() => void request(false)}
      className="rounded border border-sky-300 px-3 py-2 text-xs font-semibold text-sky-800 disabled:opacity-50">
      {busy ? "Working…" : "Review JBG/YT products"}
    </button>
    {disabledReason && <p className="text-xs text-amber-800">{disabledReason}</p>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {review && <div className="space-y-3 text-xs">
      {review.applied ? <p role="status" className="font-semibold text-emerald-700">Added {review.created} products. Corrected {review.updated} products. {review.preserved} products already matched.</p>
        : <p>{missing} new products to add. {corrections} existing products to correct. {review.preserved} products already match.</p>}
      <details>
        <summary className="cursor-pointer font-semibold">Review products, SKUs and prices ({review.products.length})</summary>
        <div className="mt-2 max-h-80 overflow-auto">
          <table className="w-full text-left">
            <thead><tr><th>Product</th><th>SKU</th><th>Supplier cost</th><th>Sell price</th><th>Stock</th></tr></thead>
            <tbody>{review.products.map(row => <tr key={row.id} className="border-t border-slate-100">
              <td className="p-1">{row.name}{row.exists && (row.needsUpdate ? " (correct prices)" : " (already matches)")}</td><td className="p-1">{row.sku}</td>
              <td className="p-1">{row.needsUpdate && <span className="block text-slate-500">Was {row.previousCost == null ? "unset" : `$${row.previousCost}`}</span>}${row.wholesaleCost}</td>
              <td className="p-1">{row.needsUpdate && <span className="block text-slate-500">Was {row.previousPrice == null ? "unset" : `$${row.previousPrice}`}</span>}${row.wholesalePrice}</td>
              <td className="p-1">{row.stock?.toLocaleString() ?? "Not set"}{row.exists && " (kept)"}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </details>
      {!review.applied && missing + corrections > 0 && <button type="button" disabled={busy || !!disabledReason} onClick={() => void request(true)}
        className="rounded bg-slate-800 px-3 py-2 font-semibold text-white disabled:opacity-50">Apply JBG/YT list ({missing + corrections} products)</button>}
    </div>}
  </div>;
}
