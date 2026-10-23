import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, ClipboardCopy, Download, ListChecks, Loader2, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { centsToMoneyString } from "@/lib/exact-money";
import {
  parseSupplierList,
  reviewSupplierList,
  supplierListTxt,
  reviewSupplierDelivery,
  type SupplierDelivery,
  type SupplierCost,
  type SupplierDraftRow,
} from "@/lib/fs3-pasted-list";

interface Fs3PastedListProps {
  costs: SupplierCost[];
  loading: boolean;
  error: string;
  onRefresh: () => Promise<void>;
}

const usd = (cents: bigint | null) => (cents === null ? "—" : `$${centsToMoneyString(cents)}`);
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const fieldCls =
  "h-8 w-full rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary";
const emptyDelivery: SupplierDelivery = { shipping: "", name: "", address: "", country: "", phone: "" };

export function Fs3PastedList({ costs, loading, error, onRefresh }: Fs3PastedListProps) {
  const [text, setText] = useState("");
  const [reviewedText, setReviewedText] = useState<string | null>(null);
  const [rows, setRows] = useState<SupplierDraftRow[] | null>(null);
  const [parseError, setParseError] = useState("");
  const [copyMsg, setCopyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [delivery, setDelivery] = useState<SupplierDelivery>(emptyDelivery);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  // Live recompute: refreshed costs or row edits immediately reprice.
  const review = useMemo(() => (rows ? reviewSupplierList(rows, costs) : null), [rows, costs]);
  const stale = rows !== null && reviewedText !== text;
  const priceError = error || refreshError;
  const pricesBlocked = loading || refreshing || !!priceError;
  const deliveryReview = reviewSupplierDelivery(delivery, review?.totalCents ?? 0n);
  const canExport = !!review && review.ready && deliveryReview.ready && !pricesBlocked && !stale && review.lines.length > 0;
  const partialCents = useMemo(
    () => (review ? review.lines.reduce((s, l) => s + (l.lineCents ?? 0n), 0n) : 0n),
    [review],
  );
  const noCatalogue = !pricesBlocked && costs.length === 0;

  const flash = (ok: boolean, msg: string) => {
    setCopyMsg({ ok, text: msg });
    if (copyTimer.current) clearTimeout(copyTimer.current);
    if (ok) copyTimer.current = setTimeout(() => setCopyMsg(null), 2500);
  };

  const handleReview = () => {
    setCopyMsg(null);
    try {
      const parsed = parseSupplierList(text);
      setRows(parsed);
      setReviewedText(text);
      setParseError(parsed.length === 0 ? "No product lines found. Paste one product per line." : "");
    } catch (e) {
      setRows(null);
      setReviewedText(null);
      setParseError(`Could not read the list: ${errText(e)}`);
    }
  };

  const handleReset = () => {
    setText(""); setRows(null); setReviewedText(null); setParseError(""); setCopyMsg(null);
    setDelivery(emptyDelivery);
  };

  const updateRow = (id: number, patch: Partial<SupplierDraftRow>) => {
    setCopyMsg(null);
    setRows(prev => (prev ? prev.map(r => (r.id === id ? { ...r, ...patch } : r)) : prev));
  };
  const removeRow = (id: number) => {
    setCopyMsg(null);
    setRows(prev => (prev ? prev.filter(r => r.id !== id) : prev));
  };

  const buildTxt = (): string | null => {
    if (!review || !canExport) return null;
    try { return supplierListTxt(review, delivery); }
    catch (e) { flash(false, `Export blocked: ${errText(e)}`); return null; }
  };

  const handleCopy = async () => {
    const txt = buildTxt();
    if (txt === null) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard is unavailable in this browser");
      await navigator.clipboard.writeText(txt);
      flash(true, "Priced list copied");
    } catch (e) {
      flash(false, `Copy failed (${errText(e)}). Allow clipboard access or use Download TXT instead.`);
    }
  };

  const handleDownload = () => {
    const txt = buildTxt();
    if (txt === null) return;
    const url = URL.createObjectURL(new Blob([txt], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `fs3-supplier-list-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError("");
    setCopyMsg(null);
    try { await onRefresh(); }
    catch { setRefreshError("Unable to refresh saved prices. Try again before exporting."); }
    finally { setRefreshing(false); }
  };

  const sortedCosts = useMemo(
    () => [...costs].sort((a, b) => a.productName.localeCompare(b.productName)),
    [costs],
  );

  return (
    <Card className="p-4 space-y-4 border-2 border-blue-200 min-w-0" data-testid="panel-fs3-pasted-list">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Price a pasted list</h3>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleRefresh}
          disabled={refreshing || loading} data-testid="button-refresh-prices">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />Refresh saved prices
        </Button>
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
          Quantity is in FS3 price units (usually kits) — quantity 1 is one saved-price unit, not one vial.
          Prices in USD; fractional quantities allowed up to 6 decimals. Line totals round half-up to cents.
          Only exact or uniquely normalised names auto-match; pick a product to override.
        </p>
      </div>

      {pricesBlocked && (
        <div
          role={priceError ? "alert" : "status"}
          data-testid="status-fs3-costs"
          className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs ${
            priceError ? "border-red-300 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-800"
          }`}
        >
          <span className="flex items-center gap-1.5">
            {priceError ? <AlertTriangle className="w-3.5 h-3.5" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {priceError ? `Saved prices failed to load: ${priceError} Export is disabled.` : "Loading saved prices… export is disabled until loaded."}
          </span>
        </div>
      )}

      {noCatalogue && (
        <div role="status" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900" data-testid="status-empty-catalogue">
          No saved prices yet. Add your wholesale costs in <span className="font-semibold">My Prices</span> first — unmatched lines are never priced at zero.
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="fs3-pasted-list" className="text-xs font-semibold">Pasted supplier list</label>
        <textarea
          id="fs3-pasted-list"
          data-testid="input-pasted-list"
          className="w-full h-36 text-xs font-mono border border-border rounded-md p-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-y"
          placeholder={"HGH 36IU x 10\nTirzepatide 30mg × 5\nBPC 10mg\t2   (2 tab-separated columns)"}
          value={text}
          onChange={e => setText(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="gap-1.5" disabled={!text.trim()} onClick={handleReview} data-testid="button-review-list">
          <ListChecks className="w-3.5 h-3.5" />Review list
        </Button>
        <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground" onClick={handleReset} data-testid="button-reset-list">
          <RotateCcw className="w-3.5 h-3.5" />Reset
        </Button>
      </div>

      {parseError && <p role="alert" className="text-xs text-red-600" data-testid="text-parse-error">{parseError}</p>}

      {stale && (
        <p role="status" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900" data-testid="status-stale">
          Pasted text changed since the last review. Click Review list again before exporting.
        </p>
      )}

      {review && review.lines.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-md border border-border max-w-full" data-testid="table-scroll">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold">Pasted line</th>
                  <th className="px-2 py-2 text-left font-semibold">Saved product</th>
                  <th className="px-2 py-2 text-left font-semibold w-24">Quantity</th>
                  <th className="px-2 py-2 text-right font-semibold">Unit cost</th>
                  <th className="px-2 py-2 text-right font-semibold">Line total</th>
                  <th className="px-2 py-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {review.lines.map((line, i) => {
                  const d = line.draft;
                  const n = i + 1;
                  const bad = line.errors.length > 0;
                  return (
                    <tr key={d.id} className={bad ? "bg-red-50/60" : ""} data-testid={`row-supplier-${d.id}`}>
                      <td className="px-2 py-1.5 align-top font-mono text-[11px] max-w-[200px] break-words">
                        {d.original}
                        {bad && (
                          <ul className="mt-1 space-y-0.5 font-sans text-[11px] text-red-600" data-testid={`text-errors-${d.id}`}>
                            {line.errors.map(err => <li key={err}>{err}</li>)}
                          </ul>
                        )}
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <select
                          aria-label={`Saved product for line ${n}`}
                          data-testid={`select-product-${d.id}`}
                          className={fieldCls}
                          value={line.cost?.id ?? ""}
                          onChange={e => updateRow(d.id, { costId: e.target.value === "" ? null : Number(e.target.value) })}
                        >
                          <option value="">— Choose saved product —</option>
                          {sortedCosts.map(c => <option key={c.id} value={c.id}>{c.productName}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <input
                          aria-label={`Quantity for line ${n}`}
                          data-testid={`input-quantity-${d.id}`}
                          inputMode="decimal"
                          className={`${fieldCls} tabular-nums`}
                          value={d.quantity}
                          onChange={e => updateRow(d.id, { quantity: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-1.5 align-top text-right tabular-nums" data-testid={`text-unit-${d.id}`}>{usd(line.unitCents)}</td>
                      <td className="px-2 py-1.5 align-top text-right tabular-nums font-semibold" data-testid={`text-line-${d.id}`}>{usd(line.lineCents)}</td>
                      <td className="px-2 py-1.5 align-top text-right">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-600"
                          aria-label={`Remove line ${n}`} onClick={() => removeRow(d.id)} data-testid={`button-remove-${d.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <fieldset className="min-w-0 space-y-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-xs font-semibold">Wholesale TXT — delivery details</legend>
            <p className="text-xs text-muted-foreground">USD shipping is added once to the product total. Enter 0 for free shipping. These details are used only for this list; no order is placed or changed.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([
                ["shipping", "Package / shipping (USD)", "e.g. 70.00"],
                ["name", "Recipient name", "Full name"],
                ["address", "Delivery address", "Street, city and postcode"],
                ["country", "Country", "Destination country"],
                ["phone", "Phone number", "Include country code"],
              ] as const).map(([key, label, placeholder]) => (
                <label key={key} className={`min-w-0 space-y-1 text-xs ${key === "address" ? "sm:col-span-2" : ""}`}>
                  <span>{label} *</span>
                  {key === "address" ? (
                    <textarea className={`${fieldCls} h-20 py-2`} required maxLength={1000}
                      placeholder={placeholder} value={delivery[key]} data-testid={`input-delivery-${key}`}
                      onChange={e => { setDelivery(prev => ({ ...prev, [key]: e.target.value })); setCopyMsg(null); }} />
                  ) : (
                    <input className={fieldCls} required type={key === "phone" ? "tel" : "text"}
                      inputMode={key === "shipping" ? "decimal" : undefined}
                      maxLength={key === "phone" ? 80 : 200}
                      placeholder={placeholder} value={delivery[key]} data-testid={`input-delivery-${key}`}
                      onChange={e => { setDelivery(prev => ({ ...prev, [key]: e.target.value })); setCopyMsg(null); }} />
                  )}
                </label>
              ))}
            </div>
            {!deliveryReview.ready && <p role="status" data-testid="status-delivery" className="text-xs text-muted-foreground">{deliveryReview.errors.join(" ")}</p>}
            <p className="text-sm font-semibold" data-testid="text-grand-total">
              {review.ready && deliveryReview.ready ? `Grand Total: ${usd(deliveryReview.grandTotalCents)}` : "Complete the items and delivery details to calculate the grand total."}
            </p>
          </fieldset>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div data-testid="text-total">
              {review.ready ? (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Product total (USD, before shipping)</p>
                  <p className="text-lg font-bold tabular-nums" style={{ color: "var(--brand-navy)" }}>${centsToMoneyString(review.totalCents)}</p>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Partial subtotal — not a grand total</p>
                  <p className="text-lg font-bold tabular-nums text-muted-foreground">${centsToMoneyString(partialCents)}</p>
                  <p className="text-[11px] text-red-600">{review.issueCount} issue{review.issueCount === 1 ? "" : "s"} to resolve before export.</p>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled={!canExport} onClick={handleCopy} data-testid="button-copy-list">
                <ClipboardCopy className="w-3.5 h-3.5" />Copy priced list
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled={!canExport} onClick={handleDownload} data-testid="button-download-txt">
                <Download className="w-3.5 h-3.5" />Download TXT
              </Button>
            </div>
          </div>
          {copyMsg && (
            <p role={copyMsg.ok ? "status" : "alert"} data-testid="status-copy"
              className={`flex items-center gap-1.5 text-xs font-semibold ${copyMsg.ok ? "text-green-600" : "text-red-600"}`}>
              {copyMsg.ok ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}{copyMsg.text}
            </p>
          )}
        </>
      )}

      {review && review.lines.length === 0 && rows && rows.length === 0 && !parseError && (
        <p className="text-xs text-muted-foreground">All lines removed. Paste a list and review again.</p>
      )}
    </Card>
  );
}

export default Fs3PastedList;
