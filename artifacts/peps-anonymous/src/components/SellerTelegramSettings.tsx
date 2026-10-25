import { useState } from "react";
import { T } from "@/lib/theme";

export function SellerTelegramSettings({ chatId, enabled, savedChatId, headers, onChatId, onEnabled }: {
  chatId: string;
  enabled: boolean;
  savedChatId?: string | null;
  headers: Record<string, string>;
  onChatId: (value: string) => void;
  onEnabled: (value: boolean) => void;
}) {
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const test = async () => {
    setTesting(true); setMessage(""); setFailed(false);
    try {
      const response = await fetch("/api/vial/seller/telegram/test", { method: "POST", headers });
      const data = await response.json();
      setFailed(!response.ok);
      setMessage(response.ok ? "Test message sent. Check Telegram." : data.error || "Test failed.");
    } catch { setFailed(true); setMessage("Could not send the test. Please try again."); }
    finally { setTesting(false); }
  };
  return (
    <section className="rounded-xl border p-4 space-y-3" style={{ borderColor: T.border }}>
      <h3 className="text-sm font-bold" style={{ color: T.text }}>Telegram order alerts</h3>
      <p className="text-xs leading-relaxed" style={{ color: T.muted }}>
        Get notified as soon as a buyer places an order, before payment.
        Open <a className="underline" href="https://t.me/SaltPepsBot" target="_blank" rel="noreferrer">@SaltPepsBot</a> and
        press Start first. Use your numeric Telegram user ID (you can find it with @userinfobot), not your @username.
      </p>
      <label className="block text-sm" style={{ color: T.text }}>
        Your private Telegram chat ID
        <input value={chatId} onChange={e => { onChatId(e.target.value); setMessage(""); }}
          inputMode="numeric" placeholder="e.g. 123456789"
          className="mt-1 w-full rounded-lg border px-3 py-2"
          style={{ background: T.surface, borderColor: T.border, color: T.text }} />
      </label>
      <label className="flex items-center gap-2 text-sm" style={{ color: T.text }}>
        <input type="checkbox" checked={enabled} onChange={e => onEnabled(e.target.checked)} />
        Notify me about new orders and confirmed payments
      </label>
      {!chatId.trim() && <p role="status" className="text-xs text-amber-600">Telegram is not linked. You will not receive order alerts.</p>}
      {!enabled && <p className="text-xs text-amber-600">Order alerts are switched off.</p>}
      <p className="text-xs" style={{ color: T.muted }}>Save your profile below before testing a new chat ID.</p>
      <button type="button" onClick={test} disabled={testing || !savedChatId || chatId.trim() !== savedChatId}
        className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"
        style={{ borderColor: T.border, color: T.text }}>
        {testing ? "Sending test…" : "Send test notification"}
      </button>
      {message && <p role="status" className={`text-xs ${failed ? "text-red-600" : "text-emerald-600"}`}>{message}</p>}
    </section>
  );
}
