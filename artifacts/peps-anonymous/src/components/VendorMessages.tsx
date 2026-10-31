import { vendorTranslate as vt, useVendorLanguage, getVendorLanguage } from "@/lib/vendor-language";
import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Loader2, MessageSquare, Plus, Send, X } from "lucide-react";
import { vendorFetch } from "@/lib/vendor-auth-client";
import { Badge, Banner, Btn, Field, cardStyle, field, fieldCls, muted, subtle } from "@/components/vendor-ui";

/* ---------------------------------------------------------------------------
 * Vendor <-> Peps Anonymous conversations: inbox list + Telegram-style thread.
 * ------------------------------------------------------------------------- */
export interface VendorThread {
  id: string; submissionId: string | null; reference: string | null; subject: string; status: "open" | "closed"; openedBy: "vendor" | "admin";
  vendorUnread: number; adminUnread: number; lastMessageAt: string; lastMessagePreview: string | null; createdAt: string;
}
export interface VendorThreadMessage {
  id: string; threadId: string; authorRole: "vendor" | "admin"; authorName: string; body: string; via: string; createdAt: string;
  image: { name: string; url: string } | null;
}
export interface MessageDraft { submissionId?: string | null; reference?: string | null; subject?: string }

async function errorOf(r: Response, fallback: string) {
  const b = await r.json().catch(() => null);
  return (b && typeof b.error === "string" ? b.error : fallback) + ` (${r.status})`;
}
const when = (v: string) => { const d = new Date(v); if (isNaN(d.getTime())) return ""; const sameDay = d.toDateString() === new Date().toDateString(); return sameDay ? d.toLocaleTimeString(getVendorLanguage() === "zh" ? "zh-CN" : "en-GB", { hour: "numeric", minute: "2-digit" }) : d.toLocaleString(getVendorLanguage() === "zh" ? "zh-CN" : "en-GB", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); };

export function useVendorThreads(enabled: boolean) {
  const [threads, setThreads] = useState<VendorThread[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const r = await vendorFetch("/api/vendor/threads");
      if (!r.ok) throw new Error(await errorOf(r, vt("Could not load messages")));
      const b = await r.json();
      setThreads(Array.isArray(b?.threads) ? b.threads : []); setUnread(Number(b?.unread ?? 0)); setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : vt("Could not load messages")); }
  }, [enabled]);
  useEffect(() => { void refresh(); if (!enabled) return; const t = setInterval(refresh, 20_000); return () => clearInterval(t); }, [enabled, refresh]);
  return { threads, unread, error, refresh };
}

export function VendorMessagesView({ threads, error, refresh, initialThreadId, draft, onDraftConsumed, header }: {
  threads: VendorThread[] | null; error: string | null; refresh: () => Promise<void>; initialThreadId?: string | null; draft?: MessageDraft | null; onDraftConsumed?: () => void; header?: ReactNode;
}) {
  useVendorLanguage();
  const [activeId, setActiveId] = useState<string | null>(initialThreadId ?? null);
  const [composing, setComposing] = useState<MessageDraft | null>(draft ?? null);
  useEffect(() => { if (initialThreadId) { setActiveId(initialThreadId); setComposing(null); } }, [initialThreadId]);
  useEffect(() => { if (draft) { setComposing(draft); setActiveId(null); } }, [draft]);
  const active = threads?.find(t => t.id === activeId) ?? null;

  return (
    <div className="max-w-[1120px] mx-auto">
      {header}
      {error && <div className="mb-4"><Banner tone="critical" role="alert">{vt(error)}</Banner></div>}
      <div className="grid md:grid-cols-[320px_minmax(0,1fr)] gap-4 items-start">
        <div className={`${activeId || composing ? "hidden md:block" : ""}`} style={cardStyle} data-testid="list-threads">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <h2 className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{vt("Conversations")}</h2>
            <Btn variant="primary" className="!h-7 !px-2.5" onClick={() => { setComposing({}); setActiveId(null); }} data-testid="button-new-thread"><Plus className="w-3.5 h-3.5" />{vt("New")}</Btn>
          </div>
          {threads === null ? <div className="p-3 space-y-2">{[0, 1, 2].map(i => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "var(--t-surface2)" }} />)}</div>
            : threads.length === 0 ? <p className="px-4 pb-5 text-[13px]" style={muted}>{vt("No conversations yet. Ask Peps Anonymous anything about an order, stock or payments.")}</p>
            : <ul style={{ borderTop: "1px solid var(--t-border)" }}>{threads.map(t => (
              <li key={t.id}>
                <button onClick={() => { setActiveId(t.id); setComposing(null); }} className="w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-[var(--t-surface2)]"
                  style={{ borderBottom: "1px solid var(--t-border)", background: t.id === activeId ? "var(--t-surface2)" : undefined }} data-testid={`row-thread-${t.id}`}>
                  <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: t.vendorUnread ? "#2D6BCC" : "transparent" }} aria-label={t.vendorUnread ? vt("Unread") : undefined} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={`text-[13px] truncate ${t.vendorUnread ? "font-semibold" : "font-medium"}`} style={{ color: "var(--t-text)" }}>{t.subject}</span>
                      <span className="ml-auto text-[11px] shrink-0" style={subtle}>{when(t.lastMessageAt)}</span>
                    </span>
                    <span className="flex items-center gap-2 mt-0.5">
                      {t.reference && <Badge tone="neutral">#{t.reference}</Badge>}
                      {t.status === "closed" && <Badge tone="neutral">{vt("Closed")}</Badge>}
                      <span className="text-xs truncate" style={muted}>{t.lastMessagePreview}</span>
                    </span>
                  </span>
                </button>
              </li>))}</ul>}
        </div>
        <div className={`${!activeId && !composing ? "hidden md:block" : ""}`}>
          {composing ? <NewThreadForm draft={composing} onCancel={() => { setComposing(null); onDraftConsumed?.(); }} onCreated={async id => { setComposing(null); onDraftConsumed?.(); await refresh(); setActiveId(id); }} />
            : active ? <ThreadPane thread={active} onBack={() => setActiveId(null)} onChanged={refresh} />
            : <div className="p-10 text-center" style={cardStyle}><MessageSquare className="w-6 h-6 mx-auto mb-2" style={subtle} /><p className="text-[13px] font-medium" style={{ color: "var(--t-text)" }}>{vt("Pick a conversation")}</p><p className="text-[13px]" style={muted}>{vt("Replies from Peps Anonymous also reach your connected Telegram chat.")}</p></div>}
        </div>
      </div>
    </div>
  );
}

function NewThreadForm({ draft, onCancel, onCreated }: { draft: MessageDraft; onCancel: () => void; onCreated: (id: string) => Promise<void> }) {
  useVendorLanguage();
  const [subject, setSubject] = useState(draft.subject ?? (draft.reference ? (getVendorLanguage() === "zh" ? `订单 #${draft.reference}` : `Order #${draft.reference}`) : ""));
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (subject.trim().length < 2) { setError(vt("Give the conversation a subject.")); return; }
    if (!body.trim() && !file) { setError(vt("Write a message.")); return; }
    setBusy(true); setError(null);
    try {
      const r = await vendorFetch("/api/vendor/threads", { method: "POST", ...payload({ subject: subject.trim(), body: body.trim(), submissionId: draft.submissionId ?? undefined }, file) });
      if (!r.ok) throw new Error(await errorOf(r, vt("Could not send")));
      await onCreated((await r.json()).thread.id);
    } catch (err) { setError(err instanceof Error ? err.message : vt("Could not send")); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="p-4 space-y-3" style={cardStyle} data-testid="form-new-thread">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onCancel} className="md:hidden p-1 -ml-1" aria-label={vt("Back")}><ArrowLeft className="w-4 h-4" /></button>
        <h2 className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{vt("New message to Peps Anonymous")}</h2>
        {draft.reference && <Badge tone="neutral">{vt("About #")}{draft.reference}</Badge>}
      </div>
      {error && <Banner tone="critical" role="alert">{vt(error)}</Banner>}
      <Field label={vt("Subject")}><input value={subject} onChange={e => setSubject(e.target.value)} maxLength={140} className={fieldCls} style={field} disabled={busy} data-testid="input-thread-subject" /></Field>
      <Field label={vt("Message")}><textarea value={body} onChange={e => setBody(e.target.value)} rows={5} maxLength={4000} className={`${fieldCls} h-auto py-2`} style={field} disabled={busy} data-testid="input-thread-body" /></Field>
      <Composer file={file} setFile={setFile} busy={busy} />
      <div className="flex justify-end gap-2">
        <Btn onClick={onCancel} disabled={busy}>{vt("Cancel")}</Btn>
        <Btn type="submit" variant="primary" disabled={busy} data-testid="button-send-thread">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{vt("Send")}</Btn>
      </div>
    </form>
  );
}

function payload(fields: Record<string, string | undefined>, file: File | null): Pick<RequestInit, "headers" | "body"> {
  if (!file) return { headers: { "content-type": "application/json" }, body: JSON.stringify(fields) };
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) form.append(k, v);
  form.append("image", file);
  return { body: form };
}

function Composer({ file, setFile, busy }: { file: File | null; setFile: (f: File | null) => void; busy: boolean }) {
  useVendorLanguage();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2 text-xs" style={muted}>
      <input ref={ref} type="file" accept="image/*" className="sr-only" onChange={e => setFile(e.target.files?.[0] ?? null)} disabled={busy} data-testid="input-thread-image" />
      <Btn variant="plain" onClick={() => ref.current?.click()} disabled={busy}><ImagePlus className="w-4 h-4" />{file ? vt("Change photo") : vt("Attach photo")}</Btn>
      {file && <span className="inline-flex items-center gap-1 truncate max-w-[200px]">{file.name}<button type="button" onClick={() => setFile(null)} aria-label={vt("Remove photo")}><X className="w-3.5 h-3.5" /></button></span>}
    </div>
  );
}

function ThreadPane({ thread, onBack, onChanged }: { thread: VendorThread; onBack: () => void; onChanged: () => Promise<void> }) {
  useVendorLanguage();
  const [messages, setMessages] = useState<VendorThreadMessage[] | null>(null);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    const r = await vendorFetch(`/api/vendor/threads/${encodeURIComponent(thread.id)}`);
    if (!r.ok) { setError(await errorOf(r, vt("Could not load the conversation"))); return; }
    const b = await r.json(); setMessages(b.messages ?? []); setError(null);
  }, [thread.id]);
  useEffect(() => { setMessages(null); void load().then(onChanged); const t = setInterval(load, 15_000); return () => clearInterval(t); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages?.length]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim() && !file) return;
    setBusy(true); setError(null);
    try {
      const r = await vendorFetch(`/api/vendor/threads/${encodeURIComponent(thread.id)}/messages`, { method: "POST", ...payload({ body: body.trim() }, file) });
      if (!r.ok) throw new Error(await errorOf(r, vt("Could not send")));
      setBody(""); setFile(null); await load(); await onChanged();
    } catch (err) { setError(err instanceof Error ? err.message : vt("Could not send")); }
    finally { setBusy(false); }
  };

  return (
    <section className="flex flex-col" style={{ ...cardStyle, minHeight: 480 }} data-testid={`pane-thread-${thread.id}`}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--t-border)" }}>
        <button type="button" onClick={onBack} className="md:hidden p-1 -ml-1" aria-label={vt("Back to conversations")}><ArrowLeft className="w-4 h-4" /></button>
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold truncate" style={{ color: "var(--t-text)" }}>{thread.subject}</h2>
          <p className="text-xs" style={subtle}>{thread.reference ? (getVendorLanguage() === "zh" ? `订单 #${thread.reference} · ` : `Order #${thread.reference} · `) : ""}{thread.status === "closed" ? vt("Closed by Peps Anonymous · write to reopen") : vt("Open")}</p>
        </div>
        {thread.reference && <Badge tone="neutral" className="ml-auto">#{thread.reference}</Badge>}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: "var(--t-surface2)", maxHeight: 520 }}>
        {messages === null ? <div className="space-y-2">{[0, 1].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "var(--t-surface)" }} />)}</div>
          : messages.map(m => {
            const mine = m.authorRole === "vendor";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`} data-testid={`msg-${m.id}`}>
                <div className="max-w-[78%] rounded-2xl px-3.5 py-2 text-[13px] whitespace-pre-line break-words" style={mine ? { background: "var(--t-text)", color: "var(--t-surface)", borderBottomRightRadius: 6 } : { background: "var(--t-surface)", color: "var(--t-text)", border: "1px solid var(--t-border)", borderBottomLeftRadius: 6 }}>
                  {!mine && <p className="text-[11px] font-semibold mb-0.5" style={{ color: "var(--t-blue)" }}>Peps Anonymous</p>}
                  {m.image && <button type="button" onClick={() => setLightbox(m.image!.url)} className="block mb-1.5 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.1)" }}><img src={m.image.url} alt={m.image.name} className="max-h-56 w-auto" loading="lazy" /></button>}
                  {m.body}
                  <p className="text-[10px] mt-1 text-right" style={{ opacity: 0.6 }}>{mine && m.via === "telegram" ? vt("via Telegram · ") : ""}{when(m.createdAt)}</p>
                </div>
              </div>);
          })}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="p-3 space-y-2" style={{ borderTop: "1px solid var(--t-border)" }}>
        {error && <Banner tone="critical" role="alert" onDismiss={() => setError(null)}>{vt(error)}</Banner>}
        <div className="flex items-end gap-2">
          <textarea value={body} onChange={e => setBody(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(e); }} rows={2} maxLength={4000} placeholder={vt("Write a message…")} className={`${fieldCls} h-auto py-2 flex-1`} style={field} disabled={busy} data-testid="input-reply-body" />
          <Btn type="submit" variant="primary" className="h-9" disabled={busy || (!body.trim() && !file)} aria-label={vt("Send")} data-testid="button-send-reply">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</Btn>
        </div>
        <Composer file={file} setFile={setFile} busy={busy} />
      </form>
      {lightbox && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(5,12,28,0.85)" }} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt={getVendorLanguage() === "zh" ? "附件" : "Attachment"} className="max-w-full max-h-[85vh] rounded-xl shadow-2xl" />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label={vt("Close")}><X className="w-5 h-5" /></button>
        </div>)}
    </section>
  );
}
