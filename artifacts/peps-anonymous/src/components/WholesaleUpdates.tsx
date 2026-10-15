import { useCallback, useEffect, useRef, useState } from "react";
import { Megaphone, RefreshCw } from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { formatUpdateDate, parseUpdatesResponse, publishedOnly, readError, WU_POLL_MS, type WholesaleUpdate } from "@/lib/wholesale-updates";

export function WholesaleUpdates() {
  const [updates, setUpdates] = useState<WholesaleUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
      setUpdates(publishedOnly(list));
      setError(null);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Could not load updates");
    } finally {
      if (ctrlRef.current === ctrl) setLoading(false);
    }
  }, []);

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
      <div className="space-y-2 max-h-[420px] overflow-y-auto">
        {updates.map(u => (
          <article key={u.id} data-testid={`card-wholesale-update-${u.id}`} className="rounded-xl p-4 space-y-2" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", borderLeft: "3px solid var(--t-blue)" }}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              {u.title && <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{u.title}</h3>}
              <time dateTime={u.createdAt} className="text-[11px]" style={{ color: "var(--t-muted)" }}>{formatUpdateDate(u.createdAt)}</time>
            </div>
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed" style={{ color: "var(--t-text)" }}>{u.note}</p>
            {u.imageUrl && (
              <ImageLightbox src={u.imageUrl} alt={u.title || "Update image"} wrapperClassName="block rounded-lg overflow-hidden" wrapperStyle={{ background: "var(--t-surface2)" }} thumbnailClassName="w-full max-h-72 object-contain" />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default WholesaleUpdates;
