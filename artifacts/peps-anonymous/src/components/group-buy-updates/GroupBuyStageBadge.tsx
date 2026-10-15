import { ChevronRight } from "lucide-react";
import { useGroupBuyStage } from "@/hooks/use-group-buy-progress";
import { progressLinkHref } from "@/lib/group-buy-updates";
import { GroupBuyProgressCompact } from "./GroupBuyProgressTracker";

/**
 * Compact indicator, rendered as a keyboard-accessible link to the order page's
 * progress section (works for closed groups whose main CTA goes elsewhere).
 * Must not be placed inside another <a>/<button>.
 */
export function GroupBuyStageBadge({ gbId, lifecycle, dense }: { gbId: string; lifecycle?: string | null; dense?: boolean }) {
  const { stage, unavailable } = useGroupBuyStage(gbId, lifecycle);
  return (
    <a href={progressLinkHref(gbId)} data-testid={`link-gb-progress-${gbId}`}
      onClick={e => e.stopPropagation()}
      className="group block rounded-md -m-1 p-1 outline-none focus-visible:ring-2 focus-visible:ring-[#F5C25B]/70 hover:bg-white/5">
      {unavailable
        ? <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>Stage unavailable</p>
        : <GroupBuyProgressCompact gbId={gbId} stage={stage} dense={dense} />}
      <span className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-semibold underline-offset-2 group-hover:underline" style={{ color: "#9DBBF0" }}>
        View progress & updates <ChevronRight className="w-3 h-3" aria-hidden />
      </span>
    </a>
  );
}

export default GroupBuyStageBadge;
