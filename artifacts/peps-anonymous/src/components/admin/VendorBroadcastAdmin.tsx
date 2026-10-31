import { type FormEvent, useCallback, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Megaphone } from "lucide-react";

/* Admin: send a prioritised announcement to one or all vendors (shows in their portal bell; critical/high also go to Telegram). */
const card = { background: "var(--t-surface)", border: "1px solid var(--t-border)" };
const input = "w-full rounded-xl px-3 py-2 text-sm";
const PRIORITIES = [
  ["critical", "Critical — red badge, Home banner, Telegram"],
  ["high", "High — amber badge, Telegram"],
  ["normal", "Normal — blue badge, portal only"],
  ["low", "Low — grey, portal only"],
] as const;
async function err(r: Response, f: string) { const b = await r.json().catch(() => null); return `${b && typeof b.error === "string" ? b.error : f} (${r.status})`; }

export default function VendorBroadcastAdmin({ secret, vendors }: { secret: string; vendors: { id: string; name: string }[] }) {
  const headers = useCallback((): HeadersInit => ({ "x-admin-secret": secret, "content-type": "application/json" }), [secret]);
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number][0]>("normal");
  const [vendorId, setVendorId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) { setMsg({ ok: false, text: "Give the announcement a title." }); return; }
    if (!window.confirm(`Send this ${priority} announcement to ${vendorId ? vendors.find(v => v.id === vendorId)?.name : "ALL vendors"}?`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/vendor-notifications/broadcast", { method: "POST", credentials: "include", headers: headers(), body: JSON.stringify({ priority, title: title.trim(), body: body.trim(), vendorIds: vendorId ? [vendorId] : undefined }) });
      if (!r.ok) throw new Error(await err(r, "Could not send"));
      const b = await r.json(); setMsg({ ok: true, text: `Sent to ${b.sent} vendor${b.sent === 1 ? "" : "s"}.` }); setTitle(""); setBody("");
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not send" }); } finally { setBusy(false); }
  };
  return (
    <section className="rounded-2xl p-4 space-y-3" style={card} data-testid="section-vendor-broadcast">
      <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--t-text)" }}><Megaphone className="w-4 h-4" style={{ color: "var(--t-blue)" }} />Announce to vendors</h3>
      <p className="text-sm" style={{ color: "var(--t-muted)" }}>Shows in the vendor portal notification bell with the priority you choose. Use critical only when vendors must stop and act.</p>
      {msg && <div role={msg.ok ? "status" : "alert"} data-testid="text-broadcast-result" className="rounded-xl p-2.5 text-sm flex gap-2 items-center" style={{ background: msg.ok ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.08)", color: msg.ok ? "#15803D" : "#B91C1C" }}>{msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{msg.text}</div>}
      <form onSubmit={send} className="grid sm:grid-cols-2 gap-2">
        <select aria-label="Priority" value={priority} onChange={e => setPriority(e.target.value as typeof priority)} className={input} style={card} data-testid="select-broadcast-priority">{PRIORITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select aria-label="Vendor" value={vendorId} onChange={e => setVendorId(e.target.value)} className={input} style={card} data-testid="select-broadcast-vendor"><option value="">All vendors</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
        <input aria-label="Title" placeholder="Title (e.g. Bank holiday: no collections Monday)" value={title} onChange={e => setTitle(e.target.value)} maxLength={140} className={`${input} sm:col-span-2`} style={card} data-testid="input-broadcast-title" />
        <textarea aria-label="Details" placeholder="Details (optional)" rows={3} value={body} onChange={e => setBody(e.target.value)} maxLength={1000} className={`${input} sm:col-span-2`} style={card} data-testid="input-broadcast-body" />
        <div className="sm:col-span-2 flex justify-end"><button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: priority === "critical" ? "#B91C1C" : "#1B3A7A" }} data-testid="button-broadcast">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}Send announcement</button></div>
      </form>
    </section>
  );
}
