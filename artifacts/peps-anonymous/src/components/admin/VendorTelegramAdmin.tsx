import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Send, AlertTriangle } from "lucide-react";

/* Admin: vendor Telegram bot status and linked chats. */
interface Chat { id: string; chatId: string; chatType: string | null; title: string | null; linkedBy: string; vendorId: string; vendorName: string; prefs: Record<string, boolean>; createdAt: string }
interface Status { configured: boolean; botUsername: string | null; webhookUrl: string | null; chats: Chat[] }
const card = { background: "var(--t-surface)", border: "1px solid var(--t-border)" };
async function err(r: Response, f: string) { const b = await r.json().catch(() => null); return `${b && typeof b.error === "string" ? b.error : f} (${r.status})`; }

export default function VendorTelegramAdmin({ secret, vendors }: { secret: string; vendors: { id: string; name: string }[] }) {
  const headers = useCallback((json = false): HeadersInit => ({ "x-admin-secret": secret, ...(json ? { "content-type": "application/json" } : {}) }), [secret]);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/vendor-telegram", { credentials: "include", headers: headers() });
      if (!r.ok) throw new Error(await err(r, "Could not load vendor bot status"));
      setStatus(await r.json());
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Load failed" }); }
  }, [headers]);
  useEffect(() => { load(); }, [load]);

  const test = async (vendorId: string) => {
    setBusy(vendorId); setMsg(null);
    try {
      const r = await fetch(`/api/admin/vendor-telegram/test/${encodeURIComponent(vendorId)}`, { method: "POST", credentials: "include", headers: headers() });
      if (!r.ok) throw new Error(await err(r, "Test failed"));
      const b = await r.json();
      setMsg({ ok: b.delivered > 0, text: b.delivered > 0 ? `Test message delivered to ${b.delivered} chat(s).` : "No linked chats received the test message." });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Test failed" }); } finally { setBusy(null); }
  };
  const unlink = async (chat: Chat) => {
    if (!window.confirm(`Disconnect "${chat.title ?? chat.chatId}" from ${chat.vendorName}?`)) return;
    setBusy(chat.id); setMsg(null);
    try {
      const r = await fetch(`/api/admin/vendor-telegram/chats/${encodeURIComponent(chat.chatId)}`, { method: "DELETE", credentials: "include", headers: headers() });
      if (!r.ok) throw new Error(await err(r, "Could not disconnect"));
      await load(); setMsg({ ok: true, text: "Chat disconnected." });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not disconnect" }); } finally { setBusy(null); }
  };

  return (
    <section className="rounded-2xl p-4 space-y-3" style={card} data-testid="section-vendor-telegram">
      <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--t-text)" }}><Send className="w-4 h-4" style={{ color: "var(--t-blue)" }} />Vendor Telegram bot</h3>
      {!status ? <div className="h-10 rounded-xl animate-pulse" style={{ background: "var(--t-surface2)" }} /> : !status.configured ? (
        <p className="text-sm" style={{ color: "var(--t-muted)" }} data-testid="text-bot-unconfigured">Not configured. Create a second bot with BotFather and set <code>VENDOR_TELEGRAM_BOT_TOKEN</code> (or the <code>vendorTelegramBotToken</code> site config key). The webhook registers itself at startup when <code>PUBLIC_URL</code> is set.</p>
      ) : (
        <>
          <p className="text-sm" style={{ color: "var(--t-muted)" }} data-testid="text-bot-status">
            Bot <strong>@{status.botUsername ?? "unknown"}</strong> · webhook {status.webhookUrl ? <span style={{ color: "#15803D" }}>registered</span> : <span style={{ color: "#B45309" }}>not registered (set PUBLIC_URL and restart)</span>}. Vendors connect chats from Settings → Telegram notifications in their portal.
          </p>
          {msg && <div role={msg.ok ? "status" : "alert"} data-testid="text-telegram-admin-result" className="rounded-xl p-2.5 text-sm flex gap-2 items-center" style={{ background: msg.ok ? "rgba(22,163,74,0.1)" : "rgba(239,68,68,0.08)", color: msg.ok ? "#15803D" : "#B91C1C" }}>{msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{msg.text}</div>}
          <ul className="divide-y text-sm" style={{ borderColor: "var(--t-border)" }}>{vendors.map(v => {
            const chats = status.chats.filter(c => c.vendorId === v.id);
            return (
              <li key={v.id} className="py-2" data-testid={`row-telegram-vendor-${v.id}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold" style={{ color: "var(--t-text)" }}>{v.name}</span>
                  <span className="text-xs" style={{ color: chats.length ? "#15803D" : "var(--t-subtle)" }}>{chats.length ? `${chats.length} chat${chats.length === 1 ? "" : "s"} connected` : "no chat connected"}</span>
                  {chats.length > 0 && <button disabled={busy === v.id} onClick={() => test(v.id)} className="ml-auto text-xs font-bold px-2 py-1 rounded-lg disabled:opacity-50" style={{ border: "1px solid var(--t-border)" }} data-testid={`button-test-${v.id}`}>{busy === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : "Send test"}</button>}
                </div>
                {chats.map(c => (
                  <div key={c.id} className="flex flex-wrap items-center gap-2 text-xs mt-1 pl-3" style={{ color: "var(--t-muted)" }}>
                    <span>{c.title ?? `Chat ${c.chatId}`} · {c.chatType ?? "chat"} · linked by @{c.linkedBy} · {new Date(c.createdAt).toLocaleDateString()}</span>
                    <button disabled={busy === c.id} onClick={() => unlink(c)} className="font-bold underline disabled:opacity-50" style={{ color: "#DC2626" }} data-testid={`button-unlink-${c.id}`}>Disconnect</button>
                  </div>))}
              </li>);
          })}</ul>
        </>)}
    </section>
  );
}
