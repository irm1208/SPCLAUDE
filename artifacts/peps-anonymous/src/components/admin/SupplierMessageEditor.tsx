import { useEffect, useRef, useState } from "react";

export function SupplierMessageEditor({ secret, vendorId, vendorName, initialMessage, onSaved }: {
  secret: string; vendorId: string; vendorName: string; initialMessage: string; onSaved: (message: string) => void;
}) {
  const [message, setMessage] = useState(initialMessage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  useEffect(() => { setMessage(initialMessage); }, [vendorId, initialMessage]);
  async function save() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(""); setSaved(false);
    try {
      const response = await fetch(`/api/admin/wholesale-vendors/${encodeURIComponent(vendorId)}/message`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ message }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not save the supplier message.");
      if (body.vendorId !== vendorId || typeof body.message !== "string") throw new Error("Invalid save response. Please retry.");
      onSaved(body.message); setMessage(body.message); setSaved(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save the supplier message."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-3" aria-label={`${vendorName} wholesale message`}>
    <label className="block text-sm font-semibold text-slate-800" htmlFor={`supplier-message-${vendorId}`}>{vendorName} — message on wholesale page</label>
    <p className="text-xs text-slate-500">Shown only when this supplier is selected. Plain text, up to 2,000 characters. Leave blank and save to remove it.</p>
    <textarea id={`supplier-message-${vendorId}`} value={message} maxLength={2000} rows={3} disabled={busy}
      onChange={e => { setMessage(e.target.value); setSaved(false); }}
      className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400"
      placeholder="Lead times, shipping information or a message for this supplier’s customers…" />
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => void save()} disabled={busy}
        className="rounded bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save supplier message"}</button>
      <span className="text-xs text-slate-500">{message.length}/2,000</span>
      {saved && <span role="status" className="text-xs text-emerald-700">Supplier message saved.</span>}
    </div>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </section>;
}
