import React, { useState, useRef, useCallback } from "react";
import { Loader2, Upload, Sparkles, CheckCircle2, AlertCircle, AlertTriangle, X, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

function apiUrl(path: string) { return `/api${path}`; }

interface ParsedLineItem {
  rawName: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  matchConfidence: "matched" | "partial" | "unmatched";
}

interface ParsedRow {
  _rowIdx: number;
  telegramUsername: string;
  userFound: boolean;
  deliveryMethodId: string | null;
  deliveryMethodName: string;
  deliveryPrice: number;
  lineItems: ParsedLineItem[];
  notes: string | null;
  productSubtotal: number;
  grandTotal: number;
  confidence: "matched" | "partial" | "unmatched";
}

interface DeliveryMethod { id: string; name: string; price: string | number; }
interface CatalogProduct { id: string; name: string; price: number; }

interface ParseResponse {
  rows: ParsedRow[];
  deliveryMethods: DeliveryMethod[];
  products: CatalogProduct[];
}

interface ImportResult {
  rowIdx: number;
  success: boolean;
  orderId?: string;
  code?: string;
  error?: string;
  duplicate?: boolean;
}

type EditableRow = ParsedRow;

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  matched: {
    bg: "bg-green-50 border-green-200",
    text: "text-green-700",
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
    label: "Matched",
  },
  partial: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
    label: "Partial",
  },
  unmatched: {
    bg: "bg-red-50 border-red-200",
    text: "text-red-700",
    icon: <AlertCircle className="w-3.5 h-3.5 text-red-500" />,
    label: "Unmatched",
  },
};

export function ImportTab({ secret }: { secret: string }) {
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [importSummary, setImportSummary] = useState<{ successCount: number; failCount: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawText(String(ev.target?.result ?? ""));
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleParse = useCallback(async () => {
    if (!rawText.trim()) return;
    setParsing(true);
    setParseError("");
    setRows([]);
    setImportResults(null);
    setImportSummary(null);
    try {
      const res = await fetch(apiUrl("/admin/orders/bulk-import/parse"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ rawText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error ?? "Parsing failed");
        return;
      }
      const parsed = data as ParseResponse;
      setDeliveryMethods(parsed.deliveryMethods ?? []);
      setProducts(parsed.products ?? []);
      setRows((parsed.rows ?? []).map(r => ({ ...r })));
    } catch {
      setParseError("Network error — please try again");
    } finally {
      setParsing(false);
    }
  }, [rawText, secret]);

  const updateRow = (rowIdx: number, field: keyof EditableRow, value: any) => {
    setRows(prev => prev.map(r => {
      if (r._rowIdx !== rowIdx) return r;
      const updated = { ...r, [field]: value };
      if (field === "deliveryMethodId") {
        const dm = deliveryMethods.find(d => d.id === value);
        updated.deliveryMethodName = dm?.name ?? "";
        updated.deliveryPrice = dm ? parseFloat(String(dm.price)) : 0;
        updated.grandTotal = updated.productSubtotal + updated.deliveryPrice;
      }
      return updated;
    }));
  };

  const updateLineItem = (rowIdx: number, liIdx: number, field: keyof ParsedLineItem, value: any) => {
    setRows(prev => prev.map(r => {
      if (r._rowIdx !== rowIdx) return r;
      const lineItems = r.lineItems.map((li, i) => {
        if (i !== liIdx) return li;
        const updated: ParsedLineItem = { ...li, [field]: value };
        if (field === "productName") {
          const match = products.find(p => p.name === value);
          updated.productId = match?.id ?? null;
          updated.unitPrice = match?.price ?? li.unitPrice;
          updated.matchConfidence = match ? "matched" : "partial";
        }
        return updated;
      });
      const productSubtotal = lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
      return { ...r, lineItems, productSubtotal, grandTotal: productSubtotal + r.deliveryPrice };
    }));
  };

  const removeRow = (rowIdx: number) => {
    setRows(prev => prev.filter(r => r._rowIdx !== rowIdx));
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    setImportResults(null);
    setImportSummary(null);
    setParseError("");
    try {
      const payload = rows.map(r => ({
        telegramUsername: r.telegramUsername,
        deliveryMethodId: r.deliveryMethodId,
        lineItems: r.lineItems.map(li => ({
          productId: li.productId ?? "",
          productName: li.productName,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
        })),
        notes: r.notes,
        status: "Submitted",
      }));
      const res = await fetch(apiUrl("/admin/orders/bulk-import/confirm"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ rows: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error ?? "Import failed");
        return;
      }
      setImportResults(data.results ?? []);
      setImportSummary({ successCount: data.successCount, failCount: data.failCount });
      if (data.successCount > 0 && data.failCount === 0) setRows([]);
    } catch {
      setParseError("Network error during import");
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setRawText("");
    setRows([]);
    setParseError("");
    setImportResults(null);
    setImportSummary(null);
  };

  const matchedCount = rows.filter(r => r.confidence === "matched").length;
  const partialCount = rows.filter(r => r.confidence === "partial").length;
  const unmatchedCount = rows.filter(r => r.confidence === "unmatched").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: "var(--adm-text)" }}>AI Bulk Order Import</h2>
        <p className="text-sm mt-1" style={{ color: "var(--adm-muted)" }}>
          Paste any raw order data — CSV, spreadsheet paste, plain text, or JSON — and let AI parse it into structured orders for review.
        </p>
      </div>

      {/* Import result summary */}
      {importSummary && (
        <div className={`rounded-xl p-4 border ${importSummary.failCount === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-center gap-2 font-semibold text-sm">
            {importSummary.failCount === 0
              ? <CheckCircle2 className="w-4 h-4 text-green-600" />
              : <AlertTriangle className="w-4 h-4 text-amber-600" />}
            <span>
              {importSummary.successCount} order{importSummary.successCount !== 1 ? "s" : ""} imported successfully
              {importSummary.failCount > 0 ? `, ${importSummary.failCount} failed` : ""}.
            </span>
          </div>
          {importResults && importResults.filter(r => r.duplicate).length > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              {importResults.filter(r => r.duplicate).length} potential duplicate{importResults.filter(r => r.duplicate).length !== 1 ? "s" : ""} detected (imported anyway — please review).
            </p>
          )}
          {importResults && importResults.filter(r => !r.success).length > 0 && (
            <ul className="mt-2 space-y-1">
              {importResults.filter(r => !r.success).map((r, i) => (
                <li key={i} className="text-xs text-red-600">Row {r.rowIdx + 1}: {r.error}</li>
              ))}
            </ul>
          )}
          <button onClick={handleReset} className="mt-3 text-xs font-medium text-blue-600 hover:underline">
            Start new import
          </button>
        </div>
      )}

      {/* Input area */}
      {!importSummary && (
        <div className="rounded-xl border p-4 space-y-3" style={{ background: "var(--adm-btn)", borderColor: "var(--adm-border)" }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
              Paste order data or upload a file
            </label>
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept=".csv,.json,.txt" className="hidden" onChange={handleFileUpload} />
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:brightness-95"
                style={{ background: "var(--adm-content)", borderColor: "var(--adm-border)", color: "var(--adm-muted)" }}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload CSV / JSON
              </button>
            </div>
          </div>
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={"Paste order data here…\n\nExamples:\n• @username, BPC 157 10mg ×2, Standard Shipping\n• CSV with columns: username, product, quantity, delivery\n• JSON array of orders\n• Plain text list copied from a spreadsheet"}
            rows={8}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y font-mono"
            style={{
              background: "var(--adm-content)",
              border: "1px solid var(--adm-border)",
              color: "var(--adm-text)",
              minHeight: "120px",
            }}
          />
          {parseError && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {parseError}
            </div>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleParse}
              disabled={!rawText.trim() || parsing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              style={{ background: "#F24908" }}
            >
              {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {parsing ? "Parsing with AI…" : "Parse with AI"}
            </button>
            {rawText && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ color: "var(--adm-muted)" }}
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && !importSummary && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
              {rows.length} order{rows.length !== 1 ? "s" : ""} parsed
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {matchedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {matchedCount} matched
                </span>
              )}
              {partialCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  {partialCount} partial
                </span>
              )}
              {unmatchedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
                  {unmatchedCount} issues
                </span>
              )}
            </div>
            <button
              onClick={handleParse}
              disabled={parsing}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:brightness-95"
              style={{ background: "var(--adm-btn)", borderColor: "var(--adm-border)", color: "var(--adm-muted)" }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${parsing ? "animate-spin" : ""}`} />
              Re-parse
            </button>
          </div>

          {/* Row cards */}
          <div className="space-y-2">
            {rows.map((row, displayIdx) => {
              const cs = CONFIDENCE_STYLES[row.confidence];
              const isExpanded = expandedRow === row._rowIdx;
              return (
                <div key={row._rowIdx} className={`rounded-xl border overflow-hidden ${cs.bg}`}>
                  {/* Row header — always visible */}
                  <div className="flex items-center gap-2 px-3 py-2.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-400 w-5 text-center shrink-0">{displayIdx + 1}</span>
                    <span className="shrink-0">{cs.icon}</span>

                    {/* Username */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-slate-400">@</span>
                      <input
                        value={row.telegramUsername.replace(/^@/, "")}
                        onChange={e => updateRow(row._rowIdx, "telegramUsername", `@${e.target.value}`)}
                        className="text-sm font-semibold rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-orange-400 border border-transparent focus:border-orange-300 bg-white/70 w-28"
                        style={{ color: row.userFound ? "#059669" : "#DC2626" }}
                        title={row.userFound ? "User found in database" : "User not found in database"}
                      />
                      {!row.userFound && (
                        <span className="text-[10px] text-red-500 font-medium shrink-0">?</span>
                      )}
                    </div>

                    {/* Products summary (truncated) */}
                    <span className="text-xs text-slate-600 flex-1 min-w-0 truncate">
                      {row.lineItems.map(li => `${li.productName} ×${li.quantity}`).join(", ")}
                    </span>

                    {/* Delivery selector */}
                    <select
                      value={row.deliveryMethodId ?? ""}
                      onChange={e => updateRow(row._rowIdx, "deliveryMethodId", e.target.value)}
                      className="text-xs rounded px-1.5 py-1 border outline-none bg-white/80 max-w-[130px] shrink-0"
                      style={{ borderColor: "var(--adm-border)" }}
                    >
                      {deliveryMethods.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>

                    {/* Grand total */}
                    <span className="text-xs font-semibold text-slate-700 w-14 text-right shrink-0">
                      ${row.grandTotal.toFixed(2)}
                    </span>

                    {/* Confidence badge */}
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cs.text} bg-white/60 shrink-0`}>
                      {cs.label}
                    </span>

                    {/* Expand / remove */}
                    <button
                      onClick={() => setExpandedRow(isExpanded ? null : row._rowIdx)}
                      className="p-1 rounded hover:bg-white/50 text-slate-500 shrink-0"
                      title={isExpanded ? "Collapse" : "Expand to edit"}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => removeRow(row._rowIdx)}
                      className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 shrink-0"
                      title="Remove row"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Expanded detail editor */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-white/50 pt-3 space-y-3 bg-white/40">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Line Items</p>
                        {row.lineItems.map((li, liIdx) => {
                          const liCs = CONFIDENCE_STYLES[li.matchConfidence];
                          return (
                            <div key={liIdx} className="flex items-center gap-2 flex-wrap">
                              <span className="shrink-0">{liCs.icon}</span>
                              {/* Product selector */}
                              <select
                                value={li.productName}
                                onChange={e => updateLineItem(row._rowIdx, liIdx, "productName", e.target.value)}
                                className="flex-1 text-xs rounded px-2 py-1 border outline-none bg-white min-w-0"
                                style={{ borderColor: li.matchConfidence === "unmatched" ? "#EF4444" : li.matchConfidence === "partial" ? "#F59E0B" : "#6EE7B7" }}
                              >
                                {li.matchConfidence !== "matched" && (
                                  <option value={li.productName}>{li.rawName !== li.productName ? `${li.rawName} → ` : ""}{li.productName}</option>
                                )}
                                {products.map(p => (
                                  <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                              </select>
                              {/* Quantity */}
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-xs text-slate-500">×</span>
                                <input
                                  type="number"
                                  min="0.5"
                                  step="0.5"
                                  value={li.quantity}
                                  onChange={e => updateLineItem(row._rowIdx, liIdx, "quantity", parseFloat(e.target.value) || 1)}
                                  className="w-14 text-xs rounded px-1.5 py-1 border outline-none bg-white text-center"
                                  style={{ borderColor: "var(--adm-border)" }}
                                />
                              </div>
                              {/* Unit price */}
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-xs text-slate-500">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={li.unitPrice}
                                  onChange={e => updateLineItem(row._rowIdx, liIdx, "unitPrice", parseFloat(e.target.value) || 0)}
                                  className="w-16 text-xs rounded px-1.5 py-1 border outline-none bg-white text-center"
                                  style={{ borderColor: "var(--adm-border)" }}
                                />
                              </div>
                              <span className="text-xs text-slate-500 w-16 text-right shrink-0">
                                = ${(li.quantity * li.unitPrice).toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">Notes</label>
                        <input
                          value={row.notes ?? ""}
                          onChange={e => updateRow(row._rowIdx, "notes", e.target.value || null)}
                          placeholder="Optional notes…"
                          className="w-full text-xs rounded px-2 py-1.5 border outline-none bg-white"
                          style={{ borderColor: "var(--adm-border)" }}
                        />
                      </div>

                      {/* Totals summary */}
                      <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                        <span>Products: <b>${row.productSubtotal.toFixed(2)}</b></span>
                        <span>Delivery: <b>${row.deliveryPrice.toFixed(2)}</b></span>
                        <span>Total: <b className="text-slate-900">${row.grandTotal.toFixed(2)}</b></span>
                      </div>

                      {/* Issue warning */}
                      {row.confidence === "unmatched" && (
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 border border-red-200">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-red-600">
                            {!row.userFound && "User not found in database. "}
                            {row.lineItems.some(li => li.matchConfidence === "unmatched") && "Some products could not be matched. "}
                            Please correct before importing.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Import action */}
          {parseError && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {parseError}
            </div>
          )}
          <div className="flex items-center gap-3 flex-wrap pt-2 border-t" style={{ borderColor: "var(--adm-border)" }}>
            <button
              onClick={handleImport}
              disabled={importing || rows.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              style={{ background: "#F24908" }}
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {importing ? "Importing…" : `Import ${rows.length} order${rows.length !== 1 ? "s" : ""}`}
            </button>
            <p className="text-xs flex-1" style={{ color: "var(--adm-muted)" }}>
              {unmatchedCount > 0
                ? `${unmatchedCount} row${unmatchedCount !== 1 ? "s" : ""} have unresolved issues — you can still import, but review first.`
                : "All rows look good. Click to create orders."}
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {rows.length === 0 && !parsing && !importSummary && !rawText && (
        <div className="text-center py-16 rounded-xl border-2 border-dashed" style={{ borderColor: "var(--adm-border)" }}>
          <Sparkles className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--adm-faint)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--adm-muted)" }}>Paste order data above to get started</p>
          <p className="text-xs mt-1" style={{ color: "var(--adm-faint)" }}>
            Supports CSV, JSON, spreadsheet paste, or plain text lists
          </p>
        </div>
      )}
    </div>
  );
}
