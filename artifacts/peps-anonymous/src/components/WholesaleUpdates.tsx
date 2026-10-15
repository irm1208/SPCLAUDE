import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Megaphone, RefreshCw } from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { useAccount } from "@/hooks/use-account";
import { formatUpdateDate, parseUpdatesResponse, publishedOnly, readError, WU_POLL_MS, type WholesaleUpdate } from "@/lib/wholesale-updates";

export function WholesaleUpdates() {
  const { account } = useAccount();
  if (!account?.telegramUsername) return null;
  return <WholesaleUpdatesFeed key={account.telegramUsername} />;
}

function WholesaleUpdatesFeed() {
  const [updates, setUpdates] = useState<WholesaleUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<Set<string>>(new Set());
  const [readErrorMessage, setReadErrorMessage] = useState<string | null>(null);
  const readReceipts = useRef(new Map<string, string>());
  const ctrlRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setLoading(true);
    try {
      const r = await fetch("/api/wholesale/updates", { credentials: "include", signal: ctrl.signal });
      if (!r.ok) throw new Error(await readError(r));
      const list = parseUpdatesResponse(await r.json());
      if (ctrl.signal.aborted) return;
      setUpdates(publishedOnly(list).filter(update => readReceipts.current.get(update.id) !== update.updatedAt));
      setError(null);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Could not load updates");
    } finally {
      if (ctrlRef.current === ctrl) setLoading(false);
    }
  }, []);

  const markRead = async (update: WholesaleUpdate) => {
    setReading(previous => new Set(previous).add(update.id));
    setReadErrorMessage(null);
    try {
      const response = await fetch(`/api/wholesale/updates/${encodeURIComponent(update.id)}/read`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updatedAt: update.updatedAt }),
      });
      if (!response.ok) throw new Error(await readError(response));
      readReceipts.current.set(update.id, update.updatedAt);
      setUpdates(previous => previous.filter(item => item.id !== update.id || item.updatedAt !== update.updatedAt));
    } catch (error) {
      setReadErrorMessage(error instanceof Error ? error.message : "Could not mark this update as read. Please try again.");
    } finally {
      setReading(previous => { const next = new Set(previous); next.delete(update.id); return next; });
    }
  };

  useEffect(() => {
    load();
    const onFocus = () => load();
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    const t = window.setInterval(load, WU_POLL_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(t);
      ctrlRef.current?.abort();
    };
  }, [load]);

  if (error && updates.length === 0) {
    return (
      <div data-testid="wholesale-updates-error" role="alert" className="rounded-xl px-4 py-3 text-sm flex items-center gap-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>
        <span className="flex-1">Price and change updates could not be loaded. Your order is unaffected.</span>
        <button data-testid="button-retry-wholesale-updates" onClick={load} disabled={loading} className="h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50" style={{ border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Retry
        </button>
      </div>
    );
  }
  if (updates.length === 0) return null;

  return (
    <section data-testid="wholesale-updates" aria-label="Wholesale updates" className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5" style={{ color: "#8A9AAA" }}>
          <Megaphone className="w-3.5 h-3.5" /> Wholesale updates
        </p>
        {error && (
          <button data-testid="button-retry-wholesale-updates" onClick={load} disabled={loading} className="text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50" style={{ color: "var(--t-blue)" }}>
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh failed, retry
          </button>
        )}
      </div>
      {readErrorMessage && <p role="alert" className="text-sm" style={{ color: "var(--t-red, #dc2626)" }}>{readErrorMessage}</p>}
      <div className="space-y-2 max-h-[420px] overflow-y-auto">
        {updates.map(u => (
          <article key={u.id} data-testid={`card-wholesale-update-${u.id}`} className="rounded-xl p-4 space-y-2" style={{ background: "#1C2B3D", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.08)", borderLeft: "3px solid #2D6BCC" }}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              {u.title && <h3 className="text-sm font-bold" style={{ color: "#FFFFFF" }}>{u.title}</h3>}
              <time dateTime={u.createdAt} className="text-[11px]" style={{ color: "rgba(255,255,255,0.75)" }}>{formatUpdateDate(u.createdAt)}</time>
            </div>
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed" style={{ color: "#FFFFFF" }}>{u.note}</p>
            {u.imageUrl && (
              <ImageLightbox src={u.imageUrl} alt={u.title || "Update image"} wrapperClassName="block rounded-lg overflow-hidden" wrapperStyle={{ background: "#162231" }} thumbnailClassName="w-full max-h-72 object-contain" />
            )}
            <div className="flex justify-end pt-1">
              <button type="button" onClick={() => markRead(u)} disabled={reading.has(u.id)}
                data-testid={`button-read-wholesale-update-${u.id}`}
                className="min-h-10 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                style={{ background: "#2D6BCC", color: "#FFFFFF" }}>
                <Check className="w-3.5 h-3.5" /> {reading.has(u.id) ? "Saving…" : "Mark as read"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default WholesaleUpdates;
