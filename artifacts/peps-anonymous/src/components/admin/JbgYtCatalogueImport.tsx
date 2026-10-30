import { useRef, useState } from "react";

interface Review {
  products: { id: string; sku: string; name: string; wholesaleCost: string; wholesalePrice: string; stock: number; exists: boolean }[];
  previewToken: string; applied: boolean; created: number; preserved: number;
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
      if (apply) await onApplied();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import products"); setReview(null);
    } finally { pending.current = false; setBusy(false); onBusyChange?.(false); }
  }
  const missing = review?.products.filter(row => !row.exists).length ?? 0;
  return <div className="space-y-3 rounded-lg border border-sky-200 bg-white p-3">
    <h4 className="text-sm font-semibold text-slate-800">Import JBG/YT product list</h4>
    <p className="text-xs text-slate-600">56 products from your supplied list. Supplier cost and sell price are separate USD values, with 100,000 stock per new product. Below-cost sell prices are kept exactly as supplied. Existing products and shipping settings are not changed.</p>
    <button type="button" disabled={busy || !!disabledReason} onClick={() => void request(false)}
      className="rounded border border-sky-300 px-3 py-2 text-xs font-semibold text-sky-800 disabled:opacity-50">
      {busy ? "Working…" : "Review JBG/YT products"}
    </button>
    {disabledReason && <p className="text-xs text-amber-800">{disabledReason}</p>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {review && <div className="space-y-3 text-xs">
      {review.applied ? <p role="status" className="font-semibold text-emerald-700">Added {review.created} products. {review.preserved} existing products kept unchanged.</p>
        : <p>{missing} new products to add. {review.preserved} existing products will be kept unchanged.</p>}
      <details>
        <summary className="cursor-pointer font-semibold">Review products, SKUs and prices ({review.products.length})</summary>
        <div className="mt-2 max-h-80 overflow-auto">
          <table className="w-full text-left">
            <thead><tr><th>Product</th><th>SKU</th><th>Supplier cost</th><th>Sell price</th><th>Stock</th></tr></thead>
            <tbody>{review.products.map(row => <tr key={row.id} className="border-t border-slate-100">
              <td className="p-1">{row.name}{row.exists && " (existing — unchanged)"}</td><td className="p-1">{row.sku}</td>
              <td className="p-1">${row.wholesaleCost}</td><td className="p-1">${row.wholesalePrice}</td><td className="p-1">{row.stock.toLocaleString()}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </details>
      {!review.applied && missing > 0 && <button type="button" disabled={busy || !!disabledReason} onClick={() => void request(true)}
        className="rounded bg-slate-800 px-3 py-2 font-semibold text-white disabled:opacity-50">Import {missing} JBG/YT products</button>}
    </div>}
  </div>;
}
