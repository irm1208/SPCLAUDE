import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function MarkOrdersPaid({ groupBuyId, orderIds, onSaved, label = "Mark as paid", allowed = true }: {
  groupBuyId: string; orderIds: string[]; onSaved: () => void | Promise<void>; label?: string; allowed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  async function save() {
    if (!note.trim() || saving) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/organiser/group-buys/${encodeURIComponent(groupBuyId)}/orders/mark-paid`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds, note: note.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to confirm payment.");
      setResult(`${data.updated} order${data.updated === 1 ? "" : "s"} marked paid.${data.skipped ? ` ${data.skipped} already paid; left unchanged.` : ""}`);
      // Do not offer a duplicate payment action if a refresh fails after saving.
      setOpen(false); setNote("");
      try { await onSaved(); }
      catch { setError("Payment saved, but the order list could not refresh. Please refresh the page."); }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to confirm payment.");
    } finally { setSaving(false); }
  }
  return <span className="inline-flex flex-col items-start gap-1" onClick={event => event.stopPropagation()}>
    <button type="button" disabled={!orderIds.length || !allowed || orderIds.length > 100} onClick={() => { setError(""); setResult(""); setNote(""); setOpen(true); }}
      className="rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
      style={{ background: "var(--t-blue-10)", border: "1px solid var(--t-border)", color: "var(--t-blue-deep)" }}>{label}</button>
    {!allowed && <span className="text-xs" style={{ color: "var(--t-muted)" }}>Admin must enable payment-status editing for this group buy.</span>}
    {orderIds.length > 100 && <span className="text-xs" style={{ color: "var(--t-muted)" }}>Select up to 100 orders at a time.</span>}
    {result && <span role="status" className="text-xs" style={{ color: "var(--t-text)" }}>{result}</span>}
    {error && !open && <span role="alert" className="text-xs text-red-600">{error}</span>}
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark {orderIds.length === 1 ? "order" : `${orderIds.length} orders`} as paid</DialogTitle>
          <DialogDescription>Only confirm money you have received. This confirms the main order payment, not a separate outstanding balance. No blockchain transaction ID is required.</DialogDescription>
        </DialogHeader>
        <label className="text-sm font-semibold">Payment note (staff only)
          <textarea value={note} onChange={event => setNote(event.target.value)} maxLength={2000} rows={4} disabled={saving}
            placeholder="e.g. Bank transfer received; checked statement."
            className="mt-2 w-full rounded-lg border p-3 text-sm" />
        </label>
        <p className="text-xs" style={{ color: "var(--t-muted)" }}>Required. Saved on every selected order with your username and the date/time. Already-paid orders are left unchanged.</p>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
          <button type="button" disabled={!note.trim() || saving} onClick={save} className="rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
            style={{ background: "var(--t-blue-deep)" }}>{saving ? "Saving…" : "Confirm paid"}</button>
        </div>
      </DialogContent>
    </Dialog>
  </span>;
}
