import { useEffect, useState } from "react";

type Product = { id: string; productId?: string; name: string; labReportId?: number | null };
type Report = { id: number; peptideName: string; nominalDose?: string | null; supplier: string; batchCode?: string | null; testDate?: string | null };

/** Uses the existing role-scoped product endpoints; never edits the global product. */
export function GroupBuyProductLabReports({ gbId, adminSecret }: { gbId: string; adminSecret?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [query, setQuery] = useState("");
  const [reportId, setReportId] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const base = `/api/${adminSecret !== undefined ? "admin" : "organiser"}/group-buys/${encodeURIComponent(gbId)}/products`;
  const product = products.find(p => (p.productId ?? p.id) === productId);

  useEffect(() => {
    if (!expanded) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch(base, { credentials: "include", signal: controller.signal,
      headers: adminSecret !== undefined ? { "x-admin-secret": adminSecret } : {} })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) throw new Error(data.error || "Could not load group-buy products.");
        if (!controller.signal.aborted) setProducts(data);
      })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [expanded, base, adminSecret]);

  function selectProduct(id: string) {
    const selected = products.find(p => (p.productId ?? p.id) === id);
    setProductId(id);
    setReportId(selected?.labReportId == null ? "" : String(selected.labReportId));
    setQuery(selected?.name.replace(/\d+(?:\.\d+)?\s*(?:mg|iu|mcg|ml)\b/gi, "").trim() ?? "");
    setReports([]);
    setError(""); setMessage("");
  }

  useEffect(() => {
    if (!expanded || !product) return;
    const controller = new AbortController();
    setSearching(true); setReports([]);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ limit: "100", q: query.trim() });
        const response = await fetch(`/api/lab-tests?${params}`, { signal: controller.signal, credentials: "include" });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) throw new Error(data.error || "Could not search lab reports.");
        if (!controller.signal.aborted) { setReports(data); setError(""); }
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not search lab reports.");
      } finally { if (!controller.signal.aborted) setSearching(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [expanded, productId, Boolean(product), query]);

  async function save() {
    if (!product || saving) return;
    setSaving(true); setError(""); setMessage("");
    const id = reportId ? Number(reportId) : null;
    try {
      const response = await fetch(`${base}/${encodeURIComponent(productId)}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json", ...(adminSecret !== undefined ? { "x-admin-secret": adminSecret } : {}) },
        body: JSON.stringify({ labReportId: id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the report selection.");
      setProducts(previous => previous.map(p => (p.productId ?? p.id) === productId ? { ...p, labReportId: id } : p));
      setMessage(id == null ? "Automatic matching restored for this product in this group buy." : `Report #${id} saved. Only this report will be shown for this product in this group buy.`);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save the report selection."); }
    finally { setSaving(false); }
  }

  const inputClass = "mt-1 w-full min-w-0 rounded-lg border bg-transparent px-3 py-2 text-sm";
  const inputStyle = { borderColor: "var(--t-border)", color: "var(--t-text)", background: "var(--t-surface)" };
  return <details className="rounded-xl border p-4" style={{ borderColor: "var(--t-border)", color: "var(--t-text)", gridColumn: "1 / -1" }}
    onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary className="cursor-pointer text-sm font-semibold">Product lab reports</summary>
    <div className="mt-3 space-y-3">
      <p className="text-xs" style={{ color: "var(--t-muted)" }}>Choose one report for a product in this group buy only. Leave Automatic matching to keep the usual report search. Other group buys are unchanged.</p>
      <fieldset disabled={saving || loading} className="space-y-3 min-w-0">
        <label className="block text-xs font-medium">Product
          <select aria-label="Lab report product" className={inputClass} style={inputStyle} value={productId}
            onChange={event => selectProduct(event.target.value)}>
            <option value="">{loading ? "Loading products…" : "Choose a group-buy product…"}</option>
            {products.map(p => <option key={p.productId ?? p.id} value={p.productId ?? p.id}>{p.name}{p.labReportId ? ` — Report #${p.labReportId}` : ""}</option>)}
          </select>
        </label>
        {product && <>
          <label className="block text-xs font-medium">Find a report by compound or batch
            <input aria-label="Search product lab reports" className={inputClass} style={inputStyle} value={query} onChange={event => setQuery(event.target.value)} />
          </label>
          <label className="block text-xs font-medium">Lab report
            <select aria-label="Lab report" className={inputClass} style={inputStyle} value={reportId} onChange={event => { setReportId(event.target.value); setMessage(""); }}>
              <option value="">Automatic matching</option>
              {reportId && !reports.some(report => String(report.id) === reportId) && <option value={reportId}>Saved selection — Report #{reportId}</option>}
              {reports.map(report => <option key={report.id} value={report.id}>#{report.id} · {report.peptideName}{report.nominalDose ? ` ${report.nominalDose}` : ""} · {report.batchCode || "No batch"} · {report.supplier}{report.testDate ? ` · ${report.testDate}` : ""}</option>)}
            </select>
          </label>
          <p className="text-xs" role="status" style={{ color: "var(--t-muted)" }}>{searching ? "Searching reports…" : `${reports.length} results. Refine the search if your report is not listed.`}</p>
          <button type="button" onClick={save} disabled={saving || reportId === String(product.labReportId ?? "")}
            className="rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50" style={{ background: "var(--t-blue)", color: "#fff" }}>{saving ? "Saving…" : "Save lab report"}</button>
        </>}
      </fieldset>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      {message && <p role="status" className="text-xs">{message}</p>}
    </div>
  </details>;
}
