import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, MessageSquare, Plus, Send } from "lucide-react";

/* Admin side of vendor conversations: list, thread view, reply, open/close, start new. */
interface Thread { id: string; vendorId: string; vendorName?: string; submissionId: string | null; reference: string | null; subject: string; status: "open" | "closed"; openedBy: string; vendorUnread: number; adminUnread: number; lastMessageAt: string; lastMessagePreview: string | null }
interface Message { id: string; authorRole: "vendor" | "admin"; authorName: string; body: string; via: string; createdAt: string; image: { name: string; url: string } | null }
const card = { background: "var(--t-surface)", border: "1px solid var(--t-border)" };
const input = "w-full rounded-xl px-3 py-2 text-sm";
const btn = "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed";
async function err(r: Response, f: string) { const b = await r.json().catch(() => null); return `${b && typeof b.error === "string" ? b.error : f} (${r.status})`; }
const when = (v: string) => new Date(v).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function VendorThreadsAdmin({ secret, vendors }: { secret: string; vendors: { id: string; name: string }[] }) {
  const headers = useCallback((json = false): HeadersInit => ({ "x-admin-secret": secret, ...(json ? { "content-type": "application/json" } : {}) }), [secret]);
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [status, setStatus] = useState<"open" | "closed" | "all">("open");
  const [vendorFilter, setVendorFilter] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [imgUrls, setImgUrls] = useState<Record<string, string>>({});
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams(); if (status !== "all") params.set("status", status); if (vendorFilter) params.set("vendorId", vendorFilter);
    try {
      const r = await fetch(`/api/admin/vendor-threads?${params}`, { credentials: "include", headers: headers() });
      if (!r.ok) throw new Error(await err(r, "Could not load vendor messages"));
      setThreads((await r.json()).threads ?? []);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Load failed" }); }
  }, [headers, status, vendorFilter]);
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);

  const open = useCallback(async (id: string) => {
    setActive(id); setComposing(false); setMessages(null);
    try {
      const r = await fetch(`/api/admin/vendor-threads/${encodeURIComponent(id)}`, { credentials: "include", headers: headers() });
      if (!r.ok) throw new Error(await err(r, "Could not load the conversation"));
      const b = await r.json(); setMessages(b.messages ?? []);
      const urls: Record<string, string> = {};
      await Promise.all((b.messages ?? []).filter((m: Message) => m.image).map(async (m: Message) => {
        const ir = await fetch(m.image!.url, { credentials: "include", headers: headers() }).catch(() => null);
        if (ir?.ok) urls[m.id] = URL.createObjectURL(await ir.blob());
      }));
      setImgUrls(urls);
      setThreads(ts => ts?.map(t => t.id === id ? { ...t, adminUnread: 0 } : t) ?? ts);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Load failed" }); }
  }, [headers]);
  useEffect(() => () => { Object.values(imgUrls).forEach(u => URL.revokeObjectURL(u)); }, [imgUrls]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages?.length]);

  const thread = threads?.find(t => t.id === active) ?? null;
  const reply = async (e: FormEvent) => {
    e.preventDefault(); if (!thread || !body.trim()) return;
    setBusy("reply"); setMsg(null);
    try {
      const r = await fetch(`/api/admin/vendor-threads/${encodeURIComponent(thread.id)}/messages`, { method: "POST", credentials: "include", headers: headers(true), body: JSON.stringify({ body: body.trim() }) });
      if (!r.ok) throw new Error(await err(r, "Could not send"));
      const b = await r.json(); setBody("");
      setMsg({ ok: true, text: b.telegramDelivered ? `Sent and delivered to ${b.telegramDelivered} Telegram chat(s).` : "Sent. The vendor will see it in the portal (no Telegram chat connected)." });
      await open(thread.id); await load();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not send" }); } finally { setBusy(null); }
  };
  const setThreadStatus = async (next: "open" | "closed") => {
    if (!thread) return;
    setBusy("status");
    try {
      const r = await fetch(`/api/admin/vendor-threads/${encodeURIComponent(thread.id)}/status`, { method: "PUT", credentials: "include", headers: headers(true), body: JSON.stringify({ status: next }) });
      if (!r.ok) throw new Error(await err(r, "Could not update"));
      await load();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not update" }); } finally { setBusy(null); }
  };

  const unreadTotal = threads?.reduce((a, t) => a + t.adminUnread, 0) ?? 0;
  return (
    <section className="rounded-2xl p-4 space-y-3" style={card} data-testid="section-vendor-threads">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--t-text)" }}><MessageSquare className="w-4 h-4" style={{ color: "var(--t-blue)" }} />Vendor messages
          {unreadTotal > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: "#1D4ED8", background: "rgba(45,107,204,0.12)" }} data-testid="text-thread-unread">{unreadTotal} unread</span>}</h3>
        <div className="ml-auto flex items-center gap-2">
          <select aria-label="Status" value={status} onChange={e => setStatus(e.target.value as typeof status)} className="rounded-lg px-2 py-1.5 text-xs" style={card}><option value="open">Open</option><option value="closed">Closed</option><option value="all">All</option></select>
          <select aria-label="Vendor" value={vendorFilter} onChange={e => setVendorFilter(e.target.value)} className="rounded-lg px-2 py-1.5 text-xs" style={card}><option value="">All vendors</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
          <button onClick={() => { setComposing(true); setActive(null); }} className={btn + " !py-1.5 text-xs"} style={{ background: "#1B3A7A" }} data-testid="button-new-vendor-thread"><Plus className="w-3.5 h-3.5" />Message a vendor</button>
        </div>
      </div>
      {msg && <div role={msg.ok ? "status" : "alert"} data-testid="text-thread-result" className="rounded-xl p-2.5 text-sm flex gap-2 items-center" style={{ background: msg.ok ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.08)", color: msg.ok ? "#15803D" : "#B91C1C" }}>{msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{msg.text}</div>}
      <div className="grid md:grid-cols-[300px_minmax(0,1fr)] gap-3 items-start">
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--t-border)" }}>
          {threads === null ? <div className="h-20 animate-pulse" style={{ background: "var(--t-surface2)" }} />
            : threads.length === 0 ? <p className="p-3 text-sm" style={{ color: "var(--t-muted)" }}>No conversations here.</p>
            : <ul className="divide-y max-h-[480px] overflow-y-auto" style={{ borderColor: "var(--t-border)" }}>{threads.map(t => (
              <li key={t.id}><button onClick={() => open(t.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--t-blue-05)]" style={{ background: t.id === active ? "var(--t-blue-06)" : undefined }} data-testid={`row-vendor-thread-${t.id}`}>
                <div className="flex items-center gap-2"><span className={`truncate ${t.adminUnread ? "font-bold" : "font-medium"}`} style={{ color: "var(--t-text)" }}>{t.subject}</span>{t.adminUnread > 0 && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#2D6BCC" }} />}<span className="ml-auto text-[11px] shrink-0" style={{ color: "var(--t-subtle)" }}>{when(t.lastMessageAt)}</span></div>
                <div className="text-xs truncate" style={{ color: "var(--t-muted)" }}>{t.vendorName}{t.reference ? ` · #${t.reference}` : ""}{t.status === "closed" ? " · closed" : ""} · {t.lastMessagePreview}</div>
              </button></li>))}</ul>}
        </div>
        <div>
          {composing ? <NewThreadForm headers={headers} vendors={vendors} onCancel={() => setComposing(false)} onCreated={async id => { setComposing(false); await load(); await open(id); }} />
            : thread ? (
              <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: "1px solid var(--t-border)", minHeight: 360 }} data-testid={`pane-vendor-thread-${thread.id}`}>
                <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm" style={{ borderBottom: "1px solid var(--t-border)" }}>
                  <span className="font-bold" style={{ color: "var(--t-text)" }}>{thread.subject}</span>
                  <span className="text-xs" style={{ color: "var(--t-muted)" }}>{thread.vendorName}{thread.reference ? ` · #${thread.reference}` : ""}</span>
                  <button disabled={busy === "status"} onClick={() => setThreadStatus(thread.status === "open" ? "closed" : "open")} className="ml-auto text-xs font-bold px-2 py-1 rounded-lg disabled:opacity-50" style={{ border: "1px solid var(--t-border)" }} data-testid="button-toggle-thread-status">{thread.status === "open" ? "Close" : "Reopen"}</button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[420px]" style={{ background: "var(--t-surface2)" }}>
                  {messages === null ? <div className="h-10 animate-pulse rounded-lg" style={{ background: "var(--t-surface)" }} /> : messages.map(m => {
                    const mine = m.authorRole === "admin";
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line break-words" style={mine ? { background: "#1B3A7A", color: "#fff" } : { background: "var(--t-surface)", color: "var(--t-text)", border: "1px solid var(--t-border)" }}>
                          <p className="text-[11px] font-semibold mb-0.5" style={{ opacity: 0.8 }}>{mine ? m.authorName : `${thread.vendorName ?? "Vendor"} · ${m.authorName}`}</p>
                          {m.image && (imgUrls[m.id] ? <img src={imgUrls[m.id]} alt={m.image.name} className="max-h-48 rounded-lg mb-1" /> : <span className="text-xs italic">📷 {m.image.name}</span>)}
                          {m.body}
                          <p className="text-[10px] mt-1 text-right" style={{ opacity: 0.6 }}>{m.via === "telegram" ? "via Telegram · " : ""}{when(m.createdAt)}</p>
                        </div>
                      </div>);
                  })}
                  <div ref={bottom} />
                </div>
                <form onSubmit={reply} className="p-2 flex items-end gap-2" style={{ borderTop: "1px solid var(--t-border)" }}>
                  <textarea value={body} onChange={e => setBody(e.target.value)} rows={2} maxLength={4000} placeholder={thread.status === "closed" ? "Reopen the conversation to reply" : "Reply to the vendor… (also sent to their Telegram)"} disabled={busy === "reply" || thread.status === "closed"} className={`${input} flex-1`} style={card} data-testid="input-admin-reply" />
                  <button type="submit" disabled={busy === "reply" || thread.status === "closed" || !body.trim()} className={btn} style={{ background: "#1B3A7A" }} aria-label="Send" data-testid="button-admin-reply">{busy === "reply" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
                </form>
              </div>
            ) : <p className="text-sm p-4 rounded-xl" style={{ ...card, color: "var(--t-muted)" }}>Pick a conversation, or message a vendor. Replies are mirrored to the vendor's Telegram chat when one is connected, and their Telegram replies land back here.</p>}
        </div>
      </div>
    </section>
  );
}

function NewThreadForm({ headers, vendors, onCancel, onCreated }: { headers: (json?: boolean) => HeadersInit; vendors: { id: string; name: string }[]; onCancel: () => void; onCreated: (id: string) => Promise<void> }) {
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!vendorId || subject.trim().length < 2 || !body.trim()) { setError("Choose a vendor, a subject and write a message."); return; }
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/admin/vendor-threads", { method: "POST", credentials: "include", headers: headers(true), body: JSON.stringify({ vendorId, subject: subject.trim(), body: body.trim() }) });
      if (!r.ok) throw new Error(await err(r, "Could not send"));
      await onCreated((await r.json()).thread.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send"); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="rounded-xl p-3 space-y-2" style={{ border: "1px solid var(--t-border)" }} data-testid="form-admin-new-thread">
      {error && <p role="alert" className="text-sm" style={{ color: "#B91C1C" }}>{error}</p>}
      <select aria-label="Vendor" value={vendorId} onChange={e => setVendorId(e.target.value)} className={input} style={card} data-testid="select-thread-vendor">{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
      <input aria-label="Subject" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} maxLength={140} className={input} style={card} data-testid="input-admin-thread-subject" />
      <textarea aria-label="Message" placeholder="Message" rows={4} value={body} onChange={e => setBody(e.target.value)} maxLength={4000} className={input} style={card} data-testid="input-admin-thread-body" />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-sm font-bold px-3 py-2 rounded-xl" style={{ border: "1px solid var(--t-border)" }}>Cancel</button>
        <button type="submit" disabled={busy} className={btn} style={{ background: "#1B3A7A" }} data-testid="button-admin-send-thread">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Send</button>
      </div>
    </form>
  );
}
