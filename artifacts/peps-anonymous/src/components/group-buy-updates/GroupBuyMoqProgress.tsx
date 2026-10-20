import { formatMoqKits, type GroupBuyMoq } from "../../lib/group-buy-moq";

export function GroupBuyMoqProgress({ moq, dark = false, compact = false, staff = false }: {
  moq?: GroupBuyMoq | null; dark?: boolean; compact?: boolean; staff?: boolean;
}) {
  if (!moq?.enabled || !moq.targetKits || (!staff && !moq.showToMembers)) return null;
  const ordered = formatMoqKits(moq.orderedKits);
  const target = formatMoqKits(moq.targetKits);
  const percent = Math.min(100, moq.orderedKits / moq.targetKits * 100);
  return (
    <div data-testid="gb-moq-progress" className={compact ? "mt-2 space-y-1.5" : "rounded-xl border p-3.5 space-y-2"}
      style={compact ? undefined : {
        background: dark ? "rgba(255,255,255,0.04)" : "var(--t-surface)",
        borderColor: dark ? "rgba(255,255,255,0.15)" : "var(--t-border)",
      }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[11px] font-semibold" style={{ color: dark ? "rgba(255,255,255,0.75)" : "var(--t-muted)" }}>
          {compact ? "MOQ" : "Group-buy minimum order quantity"}
        </span>
        <span className="text-xs font-bold" style={{ color: dark ? "#FFFFFF" : "var(--t-text)" }}>
          {ordered} / {target} kits ordered
        </span>
      </div>
      <div role="progressbar" aria-label="Group-buy MOQ" aria-valuemin={0}
        aria-valuemax={moq.targetKits} aria-valuenow={Math.min(moq.targetKits, moq.orderedKits)}
        aria-valuetext={`${ordered} of ${target} kits ordered`}
        className="h-1.5 overflow-hidden rounded-full"
        style={{ background: dark ? "rgba(255,255,255,0.15)" : "var(--t-border)" }}>
        <div className="h-full rounded-full transition-[width]" style={{ width: `${percent}%`, background: moq.met ? "#22c55e" : "#2D6BCC" }} />
      </div>
      <p className="text-[11px]" style={{ color: dark ? (moq.met ? "#86efac" : "rgba(255,255,255,0.65)") : "var(--t-muted)" }}>
        {moq.met ? "MOQ reached" : `${formatMoqKits(moq.remainingKits ?? 0)} kits to reach MOQ`}
      </p>
    </div>
  );
}
