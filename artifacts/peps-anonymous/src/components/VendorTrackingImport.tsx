import { vendorFetch } from "@/lib/vendor-auth-client";
import { useMemo, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import type { VendorOrder } from "@/pages/VendorPortal";
import { applyVendorTrackingImport, previewVendorTrackingImport } from "@/lib/vendor-tracking-import";
import { Banner, Btn, Card, muted } from "@/components/vendor-ui";

export default function VendorTrackingImport({ orders, onChanged }: { orders: readonly VendorOrder[]; onChanged: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const preview = useMemo(() => text === null ? null : previewVendorTrackingImport(text, orders), [text, orders]);
  const close = () => { setOpen(false); setText(null); setErrors([]); setMessage(""); setFilename(""); };
  const read = async (file?: File) => {
    setText(null); setErrors([]); setMessage(""); setFilename(file?.name ?? "");
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErrors(["Choose a CSV file of 5 MB or smaller."]); return; }
    setReading(true);
    try { setText(await file.text()); }
    catch { setErrors(["Could not read this file. Choose the exported CSV and try again."]); }
    finally { setReading(false); }
  };
  const apply = async () => {
    if (!preview?.updates.length || preview.errors.length || busy) return;
    setBusy(true); setErrors([]); setMessage("");
    try {
      const result = await applyVendorTrackingImport(preview.updates, async row => {
        const response = await vendorFetch(`/api/vendor/orders/${encodeURIComponent(row.id)}`, {
          method: "PATCH", credentials: "include", headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "tracking", carrier: row.carrier, trackingNumber: row.trackingNumber }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(typeof body?.error === "string" ? body.error : `Tracking update failed (${response.status}).`);
        }
      });
      setText(null);
      setMessage(`${result.saved} order${result.saved === 1 ? "" : "s"} updated with tracking and marked shipped.`);
      setErrors(result.failed.map(row => `Order ${row.reference}: ${row.error}`));
      await onChanged();
    } finally { setBusy(false); }
  };
  const issues = [...errors, ...(preview?.errors ?? [])];

  return <div className="mb-4">
    <Btn onClick={() => setOpen(true)} disabled={open} data-testid="button-import-tracking"><Upload className="w-4 h-4" />Import tracking CSV</Btn>
    {open && <Card className="mt-3" title="Import tracking numbers" testId="tracking-import-panel" actions={<Btn onClick={close} disabled={busy || reading}>Close</Btn>}>
      <div className="space-y-3 text-[13px]">
        <p style={muted}>Fill in Carrier and Tracking number in your exported CSV, then upload it here. Rows without tracking are skipped. Other columns, including Paid status, prices and addresses, are ignored.</p>
        <label className="block font-medium">Orders CSV
          <input type="file" accept=".csv,text/csv" disabled={busy || reading} onChange={event => { void read(event.target.files?.[0]); event.target.value = ""; }} className="block mt-2 max-w-full" data-testid="input-tracking-csv" />
        </label>
        {reading && <p role="status">Reading file…</p>}
        {message && <Banner tone={errors.length ? "warning" : "success"} testId="tracking-import-result">{message}</Banner>}
        {issues.length > 0 && <Banner tone="critical" role="alert" testId="tracking-import-errors"><ul className="list-disc pl-4">{issues.slice(0, 20).map((issue, i) => <li key={i}>{issue}</li>)}</ul>{issues.length > 20 && <p>And {issues.length - 20} more issues. Correct the file and upload it again.</p>}</Banner>}
        {preview && !preview.errors.length && <>
          <p style={muted}>{filename}: {preview.updates.length} tracking update{preview.updates.length === 1 ? "" : "s"}; {preview.skipped} blank or unchanged row{preview.skipped === 1 ? "" : "s"} skipped.</p>
          {preview.updates.length > 0 && <>
            <div className="max-h-64 overflow-auto rounded-lg" style={{ border: "1px solid var(--t-border)" }}>
              <table className="w-full text-left text-[13px]" data-testid="tracking-import-preview"><thead><tr><th className="p-2">Order reference</th><th className="p-2">Carrier</th><th className="p-2">Tracking number</th></tr></thead>
                <tbody>{preview.updates.map(row => <tr key={row.id} style={{ borderTop: "1px solid var(--t-border)" }}><td className="p-2">{row.reference}</td><td className="p-2">{row.carrier}</td><td className="p-2 break-all">{row.trackingNumber}</td></tr>)}</tbody>
              </table>
            </div>
            <p style={muted}>Confirming saves tracking, marks these shipments as shipped and sends the usual customer notifications. Failed updates will be listed separately.</p>
            <Btn variant="primary" disabled={busy || reading} onClick={() => { void apply(); }} data-testid="button-confirm-tracking-import">{busy && <Loader2 className="w-4 h-4 animate-spin" />}{busy ? "Importing…" : `Import tracking for ${preview.updates.length} order${preview.updates.length === 1 ? "" : "s"}`}</Btn>
          </>}
        </>}
      </div>
    </Card>}
  </div>;
}
