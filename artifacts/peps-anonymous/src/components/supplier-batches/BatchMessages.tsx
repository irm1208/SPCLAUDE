import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supplierRequest, type SupplierBatch } from "@/lib/supplier-batches";

interface Preview { token: string; references: string[]; text: string; recipients?: string[]; recipientCount: number; telegramCount: number; missingAccounts: number }
interface Recipient { username: string; displayName: string; telegramAvailable: boolean }
interface Receipt { requestKey: string; recipientCount: number; telegramCount: number; references: string[] }
interface History extends Receipt { createdAt: string; message: string; delivery: Record<string, number>; targetUsernames?: string[] }
interface Props { groupBuyId: string; batches: SupplierBatch[]; headers?: Record<string, string> }
const button = "rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50";

/** Admin-only composer. No mutation uses the supplier-data query cache. */
export function BatchMessages({ groupBuyId, batches, headers }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [targetMode, setTargetMode] = useState<"all" | "selected">("all");
  const [targetUsernames, setTargetUsernames] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const requestKey = useRef<string | null>(null);
  // Once sending starts, preserve payload + key on an ambiguous network failure.
  const [locked, setLocked] = useState(false);
  const history = useQuery({
    queryKey: ["supplier-batch-messages", groupBuyId],
    queryFn: () => supplierRequest<History[]>("admin", groupBuyId, "/messages", undefined, "GET", headers),
    enabled: open, refetchInterval: open ? 15_000 : false,
  });
  const active = batches.filter(b => b.state !== "released");
  const selectionKey = JSON.stringify(selected.map(id => {
    const b = batches.find(b => b.id === id);
    return [id, b?.state, b?.snapshot.token];
  }));
  const members = useQuery({
    queryKey: ["supplier-batch-message-recipients", groupBuyId, selectionKey],
    queryFn: () => supplierRequest<Recipient[]>("admin", groupBuyId, "/messages/recipients",
      { batchIds: selected }, "POST", headers),
    enabled: open && selected.length > 0 && targetMode === "selected",
    refetchInterval: open && selected.length > 0 && targetMode === "selected" ? 15_000 : false,
  });
  const availableMembers = members.data ?? [];
  const recipientKey = targetMode === "selected"
    ? JSON.stringify(availableMembers.map(m => [m.username, m.telegramAvailable])) : "all";
  const filteredMembers = availableMembers.filter(m => `${m.displayName} ${m.username}`.toLowerCase().includes(search.toLowerCase()));
  const invalidTargets = targetMode === "selected" && (!targetUsernames.length || members.isError
    || targetUsernames.some(name => !availableMembers.some(m => m.username === name)));
  const recipientPayload = targetMode === "selected" ? { targetUsernames } : {};
  useEffect(() => {
    if (!locked) setPreview(null);
  }, [selectionKey, recipientKey, locked]);
  const change = () => { setPreview(null); setReceipt(null); setError(""); requestKey.current = null; };
  async function run(send: boolean) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError("");
    try {
      if (!send) {
        setPreview(await supplierRequest<Preview>("admin", groupBuyId, "/messages/preview",
          { batchIds: selected, message, ...recipientPayload }, "POST", headers));
      } else if (preview) {
        requestKey.current ??= crypto.randomUUID();
        setLocked(true);
        const result = await supplierRequest<Receipt>("admin", groupBuyId, "/messages/send",
          { batchIds: selected, message, ...recipientPayload, previewToken: preview.token, requestKey: requestKey.current, confirm: true }, "POST", headers);
        setReceipt(result); setLocked(false); setPreview(null); setMessage(""); setSelected([]); setTargetUsernames([]); requestKey.current = null;
        void history.refetch();
      }
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status && status < 500) { setLocked(false); setPreview(null); requestKey.current = null; }
      setError(e instanceof Error ? e.message : "Could not send the message.");
    } finally { busyRef.current = false; setBusy(false); }
  }
  return <section className="rounded-xl border p-3 space-y-3" style={{ borderColor: "var(--t-border, #D0DAE4)", color: "var(--t-text, #0F1F38)" }}>
    <button type="button" className={button} style={{ background: "#1B3A7A", color: "white" }}
      aria-expanded={open} onClick={() => setOpen(v => !v)}>Message batch members</button>
    {open && <>
      <p className="text-xs">Select supplier batches, then message everyone in them or choose specific members.
        Each recipient receives one website notification, even if they appear in multiple batches.
        Telegram is attempted for linked accounts with status notifications enabled.</p>
      <fieldset disabled={busy || locked} className="space-y-2">
        <legend className="text-xs font-semibold mb-2">Batches to message</legend>
        {!active.length && <p className="text-xs">No active supplier batches are available.</p>}
        <div className="max-h-52 overflow-y-auto space-y-2">
          {active.map(b => <label key={b.id} className="flex items-center gap-2 text-xs">
            <input type="checkbox" data-testid={`batch-message-batch-${b.id}`} checked={selected.includes(b.id)} onChange={e => {
              change(); setTargetUsernames([]); setSelected(ids => e.target.checked ? [...ids, b.id] : ids.filter(id => id !== b.id));
            }} />
            <span>{b.reference} — {b.snapshot.region.name} · {b.state === "ordered" ? "Submitted to vendor" : "Prepared"}</span>
          </label>)}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`${button} border`} aria-pressed={targetMode === "all"}
            onClick={() => { change(); setTargetMode("all"); setTargetUsernames([]); }}>All batch members</button>
          <button type="button" className={`${button} border`} aria-pressed={targetMode === "selected"}
            data-testid="batch-message-select-users"
            onClick={() => { change(); setTargetMode("selected"); setTargetUsernames([]); }}>Choose specific members</button>
        </div>
        {targetMode === "selected" && <div className="rounded-lg border p-3 space-y-2 text-xs">
          {!selected.length ? <p>Select a batch first.</p> : <>
            <label className="block">Search batch members
              <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                className="mt-1 w-full rounded-lg border p-2 bg-transparent" />
            </label>
            {members.isLoading && <p>Loading members…</p>}
            {members.isError && <p role="alert">Could not load batch members. <button type="button"
              className="underline" onClick={() => members.refetch()}>Retry</button></p>}
            <div className="flex flex-wrap items-center gap-3">
              <span>{targetUsernames.length} members selected</span>
              <button type="button" className="underline" onClick={() => {
                change(); setTargetUsernames(names => [...new Set([...names, ...filteredMembers.map(m => m.username)])]);
              }}>Select all shown</button>
              <button type="button" className="underline" onClick={() => { change(); setTargetUsernames([]); }}>Clear selection</button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredMembers.map(m => <label key={m.username} className="flex gap-2 items-start">
                <input type="checkbox" checked={targetUsernames.includes(m.username)}
                  data-testid={`batch-message-member-${m.username}`} onChange={e => {
                    change(); setTargetUsernames(names => e.target.checked ? [...names, m.username] : names.filter(n => n !== m.username));
                  }} />
                <span>{m.displayName} · {m.telegramAvailable ? "Website + Telegram" : "Website only"}</span>
              </label>)}
            </div>
            {!members.isLoading && !members.isError && !filteredMembers.length && <p>No matching current members.</p>}
          </>}
        </div>}
        <label className="block text-xs font-semibold">Message
          <textarea rows={5} maxLength={2000} value={message} onChange={e => { change(); setMessage(e.target.value); }}
            className="mt-1 w-full rounded-xl border p-3 text-sm bg-transparent" placeholder="Write your update to these batch members…" />
        </label>
        <p className="text-xs">{message.length.toLocaleString("en-GB")}/2,000 characters</p>
      </fieldset>
      {locked && <p className="text-xs text-amber-700">Delivery request not yet confirmed. Retry the same send below; it will not create duplicate notifications.</p>}
      {preview && <div className="rounded-xl border p-3 space-y-2 text-xs" data-testid="batch-message-preview">
        <p className="font-semibold">{preview.recipientCount} unique members · {preview.telegramCount} Telegram-enabled · {preview.recipientCount - preview.telegramCount} website-only</p>
        <p>Batches: {preview.references.join(", ")}</p>
        {preview.recipients && <p className="break-words">Recipients: {preview.recipients.join(", ")}</p>}
        {preview.missingAccounts > 0 && <p className="text-amber-700">{preview.missingAccounts} members have no matching account and cannot be notified.</p>}
        <p className="whitespace-pre-wrap">{preview.text}</p>
      </div>}
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      {receipt && <p role="status" className="text-xs text-green-700">Website message recorded for {receipt.recipientCount} unique members. {receipt.telegramCount} Telegram deliveries queued. This does not change orders or batch statuses.</p>}
      <div className="flex flex-wrap gap-2">
        {!locked && <button type="button" className={`${button} border`} disabled={busy || !selected.length || !message.trim() || invalidTargets} onClick={() => run(false)}>{busy ? "Please wait…" : "Preview recipients & message"}</button>}
        {preview && <button type="button" className={button} style={{ background: "#1B3A7A", color: "white" }}
          disabled={busy || !preview.recipientCount} onClick={() => run(true)}>{busy ? "Sending…" : locked ? "Retry same send" : `Confirm & send to ${preview.recipientCount} members`}</button>}
      </div>
      <div className="space-y-2 text-xs">
        <p className="font-semibold">Recent batch messages</p>
        {history.isError && <p role="alert">Message history could not load. <button type="button" className="underline" onClick={() => history.refetch()}>Retry</button></p>}
        {history.isLoading && <p>Loading message history…</p>}
        {history.data?.length === 0 && <p>No batch messages sent yet.</p>}
        {history.data?.map(h => <div key={h.requestKey} className="rounded-lg border p-2 space-y-1">
          <p>{new Date(h.createdAt).toLocaleString("en-GB")} · {h.recipientCount} website notifications</p>
          <p>{h.references.join(", ")}</p>
          {h.targetUsernames && <p className="break-words">Selected members: {h.targetUsernames.join(", ")}</p>}
          <p className="whitespace-pre-wrap">{h.message}</p>
          <p>Telegram: {h.delivery.delivered ?? 0} delivered · {(h.delivery.pending ?? 0) + (h.delivery.sending ?? 0)} queued/sending · {h.delivery.skipped ?? 0} unavailable/disabled · {h.delivery.retry ?? 0} retrying · {h.delivery.delivery_uncertain ?? 0} uncertain (check Telegram before resending)</p>
        </div>)}
      </div>
    </>}
  </section>;
}
