import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarOff, Check, CheckCircle2, Copy, Loader2, MessageSquareWarning, Save, Send, Settings as SettingsIcon, Trash2, Truck } from "lucide-react";
import { vendorFetch } from "@/lib/vendor-auth-client";
import { Badge, Banner, Btn, Card, Field, field, fieldCls, muted, subtle } from "@/components/vendor-ui";

/* ---------------------------------------------------------------------------
 * Vendor extras: problem reports on orders, and Settings (holiday mode, defaults).
 * Data hooks are self-contained so the portal page only wires them in.
 * ------------------------------------------------------------------------- */

export interface VendorIssue {
  id: string; submissionId: string; vendorId: string; type: string; label: string; note: string | null;
  reportedBy: string; createdAt: string; resolvedAt: string | null; resolvedBy: string | null; resolution: string | null; open: boolean; reference?: string;
}
export interface VendorSettings {
  vendorId: string; closedFrom: string | null; closedUntil: string | null; closedNote: string | null;
  handlingDays: number | null; defaultCarrier: string | null; closedNow: boolean; updatedAt: string | null; updatedBy: string | null;
}
export const CARRIER_OPTIONS = ["Royal Mail", "DPD", "DHL", "UPS", "FedEx", "Evri", "USPS", "EMS", "China Post"];

async function errorOf(r: Response, fallback: string) {
  const b = await r.json().catch(() => null);
  return (b && typeof b.error === "string" ? b.error : fallback) + ` (${r.status})`;
}
const when = (v: string | null) => { if (!v) return ""; const d = new Date(v); return isNaN(d.getTime()) ? "" : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); };
const day = (v: string | null) => { if (!v) return ""; const d = new Date(v); return isNaN(d.getTime()) ? "" : d.toLocaleDateString([], { dateStyle: "long" }); };

/* ---------------------------------------------------------------------------
 * Data hooks
 * ------------------------------------------------------------------------- */
export function useVendorIssues(enabled: boolean) {
  const [issues, setIssues] = useState<VendorIssue[]>([]);
  const [types, setTypes] = useState<Record<string, string>>({});
  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const r = await vendorFetch("/api/vendor/issues");
      if (!r.ok) return;
      const b = await r.json();
      setIssues(Array.isArray(b?.issues) ? b.issues : []);
      if (b?.types && typeof b.types === "object") setTypes(b.types);
    } catch { /* keep the last known list */ }
  }, [enabled]);
  useEffect(() => { void refresh(); if (!enabled) return; const t = setInterval(refresh, 60_000); return () => clearInterval(t); }, [enabled, refresh]);
  const byOrder = useMemo(() => {
    const map: Record<string, VendorIssue> = {};
    for (const i of issues) if (!map[i.submissionId] || (i.open && !map[i.submissionId].open)) map[i.submissionId] = i;
    return map;
  }, [issues]);
  const openIds = useMemo(() => new Set(issues.filter(i => i.open).map(i => i.submissionId)), [issues]);
  return { issues, types, byOrder, openIds, refresh };
}

export function useVendorSettings(enabled: boolean) {
  const [data, setData] = useState<VendorSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const r = await vendorFetch("/api/vendor/settings");
      if (!r.ok) throw new Error(await errorOf(r, "Could not load settings"));
      setData((await r.json()).settings ?? null); setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load settings"); }
  }, [enabled]);
  useEffect(() => { void refresh(); }, [refresh]);
  const save = useCallback(async (body: Record<string, unknown>) => {
    const r = await vendorFetch("/api/vendor/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(await errorOf(r, "Could not save settings"));
    const next = (await r.json()).settings as VendorSettings; setData(next); return next;
  }, []);
  return { data, error, refresh, save };
}

/* ---------------------------------------------------------------------------
 * Problem reports
 * ------------------------------------------------------------------------- */
export function IssueBadge({ issue }: { issue?: VendorIssue }) {
  if (!issue?.open) return null;
  return <Badge tone="critical" testId="badge-issue">Problem reported</Badge>;
}

export function OrderIssuePanel({ orderId, issue, types, locked, onChanged }: {
  orderId: string; issue?: VendorIssue; types: Record<string, string>; locked?: boolean; onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typeList = Object.entries(types);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!type) { setError("Choose what the problem is."); return; }
    if (type === "other" && !note.trim()) { setError("Describe the problem so Peps Anonymous can help."); return; }
    setBusy(true); setError(null);
    try {
      const r = await vendorFetch(`/api/vendor/orders/${encodeURIComponent(orderId)}/issues`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, note: note.trim() || undefined }) });
      if (!r.ok) throw new Error(await errorOf(r, "Could not send the report"));
      setOpen(false); setType(""); setNote("");
      await onChanged();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send the report"); }
    finally { setBusy(false); }
  };

  if (issue?.open) return (
    <Card title={<><MessageSquareWarning className="w-4 h-4" style={{ color: "#8E1F0B" }} />Problem reported</>} actions={<Badge tone="critical">Waiting for Peps Anonymous</Badge>} testId="panel-issue-open">
      <p className="text-[13px] font-medium" style={{ color: "var(--t-text)" }}>{issue.label}</p>
      {issue.note && <p className="text-[13px] mt-1 whitespace-pre-line" style={muted}>{issue.note}</p>}
      <p className="text-xs mt-2" style={subtle}>Reported {when(issue.createdAt)}. Peps Anonymous has been alerted; the answer will appear here. You can keep packing anything that is not affected.</p>
    </Card>
  );

  return (
    <Card title={<><MessageSquareWarning className="w-4 h-4" style={subtle} />Problem with this order?</>}
      actions={!open && !locked ? <Btn onClick={() => setOpen(true)} data-testid="button-report-problem">Report a problem</Btn> : undefined} testId="panel-issue">
      {issue && !issue.open && (
        <div className="rounded-lg p-3 mb-3 text-[13px]" style={{ background: "var(--t-surface2)" }} data-testid="text-issue-resolution">
          <p className="font-medium flex items-center gap-1.5" style={{ color: "var(--t-text)" }}><CheckCircle2 className="w-4 h-4" style={{ color: "#0C5132" }} />Resolved {when(issue.resolvedAt)} · {issue.label}</p>
          <p className="mt-1 whitespace-pre-line" style={muted}>{issue.resolution || "Peps Anonymous marked this as resolved."}</p>
        </div>)}
      {!open ? <p className="text-[13px]" style={muted}>{locked ? "This order is on hold; Peps Anonymous is already reviewing it." : "Out of stock, address wrong, cannot ship there? Tell Peps Anonymous here instead of guessing. They are alerted immediately."}</p> : (
        <form onSubmit={submit} className="space-y-3" data-testid="form-report-problem">
          {error && <Banner tone="critical" role="alert">{error}</Banner>}
          <Field label="What is the problem?">
            <select value={type} onChange={e => setType(e.target.value)} className={fieldCls} style={field} disabled={busy} data-testid="select-issue-type">
              <option value="">Choose…</option>{typeList.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></Field>
          <Field label={type === "other" ? "Details" : "Details (optional)"} hint="Which products, quantities or address lines are affected, and what you suggest.">
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={1000} className={`${fieldCls} h-auto py-2`} style={field} disabled={busy} data-testid="input-issue-note" />
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <Btn onClick={() => { setOpen(false); setError(null); }} disabled={busy}>Cancel</Btn>
            <Btn type="submit" variant="critical" disabled={busy} data-testid="button-submit-problem">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}Send to Peps Anonymous</Btn>
          </div>
        </form>)}
    </Card>
  );
}

/* ---------------------------------------------------------------------------
 * Holiday mode banner (Home) and Settings page
 * ------------------------------------------------------------------------- */
export function ClosedBanner({ settings, onOpenSettings }: { settings: VendorSettings | null; onOpenSettings: () => void }) {
  if (!settings?.closedUntil) return null;
  const now = Date.now(), from = settings.closedFrom ? new Date(settings.closedFrom).getTime() : now, until = new Date(settings.closedUntil).getTime();
  if (until <= now) return null;
  const upcoming = from > now;
  return (
    <div className="mb-4">
      <Banner tone={upcoming ? "info" : "warning"} testId="banner-closed">
        <span className="font-semibold">{upcoming ? `Holiday mode starts ${day(settings.closedFrom)}` : `Holiday mode is on until ${day(settings.closedUntil)}`}.</span>{" "}
        {upcoming ? "New paid orders will be held from then until you reopen." : "New paid orders are being held for you and will arrive when you reopen."}{" "}
        <button type="button" onClick={onOpenSettings} className="font-semibold underline" data-testid="link-closed-settings">Change in Settings</button>
      </Banner>
    </div>
  );
}

const toInputDate = (v: string | null) => { if (!v) return ""; const d = new Date(v); return isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const startOfDay = (v: string) => (v ? new Date(`${v}T00:00:00`).toISOString() : null);
const endOfDay = (v: string) => (v ? new Date(`${v}T23:59:59`).toISOString() : null);

export function VendorSettingsView({ vendorName, settings, onSave, loadError, header }: {
  vendorName: string; settings: VendorSettings | null; onSave: (body: Record<string, unknown>) => Promise<VendorSettings>; loadError: string | null; header?: ReactNode;
}) {
  const [closed, setClosed] = useState(false);
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [note, setNote] = useState("");
  const [handling, setHandling] = useState("");
  const [carrier, setCarrier] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (!settings) return;
    const active = !!settings.closedUntil && new Date(settings.closedUntil).getTime() > Date.now();
    setClosed(active); setFrom(active ? toInputDate(settings.closedFrom) : ""); setUntil(active ? toInputDate(settings.closedUntil) : "");
    setNote(settings.closedNote ?? ""); setHandling(settings.handlingDays == null ? "" : String(settings.handlingDays)); setCarrier(settings.defaultCarrier ?? "");
  }, [settings]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (closed && !until) { setMsg({ ok: false, text: "Choose the date you reopen." }); return; }
    setBusy(true); setMsg(null);
    try {
      await onSave({
        closedFrom: closed ? startOfDay(from) : null, closedUntil: closed ? endOfDay(until) : null, closedNote: closed ? note : null,
        handlingDays: handling === "" ? null : Number(handling), defaultCarrier: carrier || null,
      });
      setMsg({ ok: true, text: "Settings saved." });
    } catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not save settings" }); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-[880px] mx-auto">
      {header}
      {loadError && <div className="mb-4"><Banner tone="critical" role="alert">{loadError}</Banner></div>}
      {msg && <div className="mb-4"><Banner tone={msg.ok ? "success" : "critical"} role={msg.ok ? "status" : "alert"} testId="text-settings-result" onDismiss={() => setMsg(null)}>{msg.text}</Banner></div>}
      <form onSubmit={save} className="space-y-4" data-testid="form-vendor-settings">
        <Card title={<><CalendarOff className="w-4 h-4" style={subtle} />Holiday mode</>}
          actions={settings?.closedNow ? <Badge tone="warning">Closed now</Badge> : closed && until ? <Badge tone="info">Scheduled</Badge> : <Badge tone="success" progress="complete">Accepting orders</Badge>}>
          <p className="text-[13px] mb-3" style={muted}>While you are closed, paid orders assigned to {vendorName} are held by Peps Anonymous and delivered to your queue when you reopen. Orders already in your queue are unaffected.</p>
          <label className="flex items-center gap-2 text-[13px] font-medium" style={{ color: "var(--t-text)" }}>
            <input type="checkbox" checked={closed} onChange={e => setClosed(e.target.checked)} className="w-4 h-4 accent-[#1A1A1A]" disabled={busy} data-testid="checkbox-closed" />Pause new orders
          </label>
          {closed && (
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <Field label="Closed from" hint="Leave empty to close immediately."><input type="date" value={from} onChange={e => setFrom(e.target.value)} className={fieldCls} style={field} disabled={busy} data-testid="input-closed-from" /></Field>
              <Field label="Reopening on"><input type="date" value={until} min={from || toInputDate(new Date().toISOString())} onChange={e => setUntil(e.target.value)} className={fieldCls} style={field} disabled={busy} required data-testid="input-closed-until" /></Field>
              <Field label="Note for Peps Anonymous (optional)" className="sm:col-span-2"><input value={note} onChange={e => setNote(e.target.value)} maxLength={200} className={fieldCls} style={field} disabled={busy} placeholder="e.g. Annual stocktake, back on the 8th" data-testid="input-closed-note" /></Field>
            </div>)}
        </Card>

        <Card title={<><Truck className="w-4 h-4" style={subtle} />Fulfilment defaults</>}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Handling time (days)" hint="How long you usually take from receiving an order to handing it to the carrier. Shown to Peps Anonymous when planning."><input type="number" min={0} max={30} step={1} value={handling} onChange={e => setHandling(e.target.value)} className={fieldCls} style={field} disabled={busy} data-testid="input-handling-days" /></Field>
            <Field label="Default carrier" hint="Pre-selected when you add tracking.">
              <select value={carrier} onChange={e => setCarrier(e.target.value)} className={fieldCls} style={field} disabled={busy} data-testid="select-default-carrier">
                <option value="">No default</option>{CARRIER_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select></Field>
          </div>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs" style={subtle}>{settings?.updatedAt ? `Last saved ${when(settings.updatedAt)} by ${settings.updatedBy}` : "Not saved yet"}</p>
          <Btn type="submit" variant="primary" disabled={busy || !settings} data-testid="button-save-settings">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save</Btn>
        </div>
      </form>
      <div className="mt-6"><TelegramCard /></div>
    </div>
  );
}
export const SettingsNavIcon = SettingsIcon;

/* ---------------------------------------------------------------------------
 * Telegram notifications card (Settings)
 * ------------------------------------------------------------------------- */
export interface VendorTelegramChat { id: string; chatId: string; chatType: string | null; title: string | null; linkedBy: string; prefs: Record<string, boolean>; createdAt: string }
const PREFS: Array<[key: string, label: string]> = [["newOrders", "New shipments"], ["holds", "Orders put on hold"], ["overdue", "48h overdue reminders"], ["issues", "Answers to problem reports"], ["messages", "Messages from Peps Anonymous"]];

export function TelegramCard() {
  const [state, setState] = useState<{ configured: boolean; botUsername: string | null; chats: VendorTelegramChat[] } | null>(null);
  const [link, setLink] = useState<{ token: string; url: string | null; groupCommand: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const r = await vendorFetch("/api/vendor/telegram");
      if (!r.ok) throw new Error(await errorOf(r, "Could not load Telegram settings"));
      setState(await r.json()); setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load Telegram settings"); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  // While a code is outstanding, poll so the card flips to "connected" as soon as the chat links.
  useEffect(() => {
    if (!link) return;
    const before = state?.chats.length ?? 0;
    const t = setInterval(async () => { await refresh(); }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);
  useEffect(() => { if (link && state && state.chats.some(c => new Date(c.createdAt).getTime() > Date.now() - 20 * 60_000 && new Date(c.createdAt).getTime() > new Date(link.expiresAt).getTime() - 15 * 60_000)) setLink(null); }, [state, link]);

  const connect = async () => {
    setBusy("link"); setError(null);
    try {
      const r = await vendorFetch("/api/vendor/telegram/link", { method: "POST" });
      if (!r.ok) throw new Error(await errorOf(r, "Could not create a link code"));
      setLink(await r.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create a link code"); }
    finally { setBusy(null); }
  };
  const setPref = async (chat: VendorTelegramChat, key: string, value: boolean) => {
    setBusy(chat.id);
    try {
      const r = await vendorFetch(`/api/vendor/telegram/chats/${encodeURIComponent(chat.id)}/prefs`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...chat.prefs, [key]: value }) });
      if (!r.ok) throw new Error(await errorOf(r, "Could not save preference"));
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save preference"); }
    finally { setBusy(null); }
  };
  const remove = async (chat: VendorTelegramChat) => {
    if (!window.confirm(`Disconnect ${chat.title ?? "this chat"} from vendor alerts?`)) return;
    setBusy(chat.id);
    try {
      const r = await vendorFetch(`/api/vendor/telegram/chats/${encodeURIComponent(chat.id)}`, { method: "DELETE" });
      if (!r.ok) throw new Error(await errorOf(r, "Could not disconnect"));
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not disconnect"); }
    finally { setBusy(null); }
  };
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* manual copy */ } };

  return (
    <Card title={<><Send className="w-4 h-4" style={subtle} />Telegram notifications</>}
      actions={state?.chats.length ? <Badge tone="success" progress="complete">{state.chats.length} chat{state.chats.length === 1 ? "" : "s"} connected</Badge> : state && !state.configured ? <Badge tone="neutral">Not available yet</Badge> : undefined} testId="card-telegram">
      {error && <div className="mb-3"><Banner tone="critical" role="alert" onDismiss={() => setError(null)}>{error}</Banner></div>}
      <p className="text-[13px] mb-3" style={muted}>Get a Telegram message the moment a shipment is assigned to you, when Peps Anonymous puts an order on hold, when something waits too long for tracking, and when a problem report is answered. Connect your own chat or a group for your packing team.</p>
      {state && !state.configured && <p className="text-[13px]" style={subtle}>Peps Anonymous has not switched on the vendor bot yet.</p>}
      {state?.chats.map(chat => (
        <div key={chat.id} className="rounded-lg p-3 mb-2" style={{ background: "var(--t-surface2)" }} data-testid={`row-telegram-chat-${chat.id}`}>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold truncate" style={{ color: "var(--t-text)" }}>{chat.title ?? `Chat ${chat.chatId}`}</span>
            <span className="text-xs" style={subtle}>{chat.chatType ?? "chat"} · linked by {chat.linkedBy}</span>
            <Btn variant="plain" className="ml-auto" onClick={() => remove(chat)} disabled={busy === chat.id} aria-label="Disconnect chat" data-testid={`button-unlink-${chat.id}`}><Trash2 className="w-4 h-4" /></Btn>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
            {PREFS.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-[13px]" style={muted}>
                <input type="checkbox" checked={chat.prefs[key] !== false} onChange={e => setPref(chat, key, e.target.checked)} disabled={busy === chat.id} className="w-4 h-4 accent-[#1A1A1A]" data-testid={`pref-${key}-${chat.id}`} />{label}
              </label>))}
          </div>
        </div>))}
      {state?.configured && !link && <Btn variant={state.chats.length ? "secondary" : "primary"} onClick={connect} disabled={busy === "link"} data-testid="button-connect-telegram">{busy === "link" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{state.chats.length ? "Connect another chat" : "Connect Telegram"}</Btn>}
      {link && (
        <div className="rounded-lg p-3 space-y-2" style={{ border: "1px dashed var(--t-border)" }} data-testid="panel-telegram-link">
          <p className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>Finish in Telegram <span className="font-normal" style={subtle}>· code expires in 15 minutes</span></p>
          <ol className="text-[13px] space-y-1 list-decimal pl-5" style={muted}>
            <li><strong>Personal chat:</strong> {link.url ? <a href={link.url} target="_blank" rel="noreferrer" className="font-semibold underline" style={{ color: "var(--t-blue)" }} data-testid="link-telegram-open">open the bot</a> : "open the bot"} and press Start.</li>
            <li><strong>Team group:</strong> add {state?.botUsername ? `@${state.botUsername}` : "the bot"} to the group, then send this message in it:</li>
          </ol>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg px-3 py-2 text-[13px] font-mono" style={{ background: "var(--t-surface2)", color: "var(--t-text)" }} data-testid="text-telegram-command">{link.groupCommand}</code>
            <Btn onClick={() => copy(link.groupCommand)} data-testid="button-copy-command">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? "Copied" : "Copy"}</Btn>
          </div>
          <p className="text-xs flex items-center gap-1.5" style={subtle}><Loader2 className="w-3.5 h-3.5 animate-spin" />Waiting for the chat to connect… this page updates automatically. <button type="button" className="underline" onClick={() => setLink(null)}>Cancel</button></p>
        </div>)}
    </Card>
  );
}
