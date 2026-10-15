import { useEffect, useRef } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { useCustomerGroupBuyUpdates } from "@/hooks/use-group-buy-progress";
import { GBU_ANCHOR, GB_STAGE_LABEL, formatUpdateDate } from "@/lib/group-buy-updates";
import { GroupBuyProgressTracker } from "./GroupBuyProgressTracker";

/** Member-only: whole-group progress + organiser notes. Not individual parcel tracking. */
export function CustomerGroupBuyUpdates({ gbId, enabled }: { gbId: string; enabled: boolean }) {
  const q = useCustomerGroupBuyUpdates(enabled ? gbId : null);
  const scrolled = useRef(false);
  const disclosure = useRef<HTMLDetailsElement>(null);
  const ready = !!q.data || q.isError;
  // Content loads async, so the browser's own hash jump may miss; scroll once when ready.
  useEffect(() => {
    if (!ready || scrolled.current || window.location.hash !== `#${GBU_ANCHOR}`) return;
    scrolled.current = true;
    if (disclosure.current) disclosure.current.open = true;
    document.getElementById(GBU_ANCHOR)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [ready]);
  if (!enabled) return null;
  if (q.isError && !q.data) {
    return (
      <div id={GBU_ANCHOR} role="alert" data-testid="gb-updates-error" className="scroll-mt-24 rounded-xl px-4 py-3 text-sm flex items-center gap-3" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", color: "var(--t-muted)" }}>
        <span className="flex-1">Group buy progress could not be loaded. Your order is unaffected.</span>
        <button type="button" data-testid="button-retry-gb-updates" onClick={() => q.refetch()} className="h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5" style={{ border: "1px solid var(--t-border)", color: "var(--t-text)" }}>
          <RefreshCw className={`w-3.5 h-3.5 ${q.isFetching ? "animate-spin" : ""}`} /> Retry
        </button>
      </div>
    );
  }
  const d = q.data;
  return (
    <details ref={disclosure} id={GBU_ANCHOR} data-testid="gb-customer-updates" aria-labelledby="gb-progress-heading" className="group scroll-mt-24 rounded-2xl px-4 sm:px-5 py-2" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
      <summary data-testid="toggle-gb-progress" className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg [&::-webkit-details-marker]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2D6BCC]">
        <h2 id="gb-progress-heading" className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8A9AAA" }}>Group buy progress</h2>
        {d?.stage && <span className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>{GB_STAGE_LABEL[d.stage]}</span>}
        <span className="ml-auto text-[11px] group-open:hidden" style={{ color: "var(--t-muted)" }}>View</span>
        <span className="ml-auto hidden text-[11px] group-open:inline" style={{ color: "var(--t-muted)" }}>Hide</span>
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" style={{ color: "var(--t-muted)" }} aria-hidden="true" />
      </summary>
      <div className="space-y-4 pt-2 pb-3">
        <p className="text-[12px]" style={{ color: "var(--t-muted)" }}>
          Set by the organiser for the whole group. Your own payment and order status are shown separately.
        </p>
      <GroupBuyProgressTracker stage={d?.stage} stageUpdatedAt={d?.stageUpdatedAt} />
      {d && d.updates.length > 0 && (
        <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
          <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#8A9AAA" }}>Organiser updates</h3>
          {d.updates.map(u => (
            <article key={u.id} data-testid={`card-gb-update-${u.id}`} className="rounded-xl p-3.5 space-y-2" style={{ background: "var(--t-surface2, rgba(27,58,122,0.04))", borderLeft: `3px solid ${u.kind === "status" ? "#E9A020" : "#2D6BCC"}` }}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <h4 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>
                  {u.title || (u.kind === "status" && u.stage ? `Stage changed to ${GB_STAGE_LABEL[u.stage]}` : "Update")}
                </h4>
                <time dateTime={u.createdAt} className="text-[11px]" style={{ color: "var(--t-muted)" }}>{formatUpdateDate(u.createdAt)}</time>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed" style={{ color: "var(--t-text)" }}>{u.note}</p>
              {u.imageUrl && (
                <ImageLightbox src={u.imageUrl} alt={u.title || "Update image"} wrapperClassName="block rounded-lg overflow-hidden" wrapperStyle={{ background: "var(--t-surface)" }} thumbnailClassName="w-full max-h-72 object-contain" />
              )}
            </article>
          ))}
        </div>
      )}
      </div>
    </details>
  );
}

export default CustomerGroupBuyUpdates;
