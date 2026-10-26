import { formatMoqKits, type GroupBuyMoq } from "../../lib/group-buy-moq";

function ProgressRow({ name, count, target, paid, dark }: {
  name: string; count: number; target: number; paid: boolean; dark: boolean;
}) {
  const met = count >= target;
  const ordered = formatMoqKits(count);
  const goal = formatMoqKits(target);
  return <div className="space-y-1.5">
    <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs">
      <span style={{ color: dark ? "rgba(255,255,255,0.75)" : "var(--t-muted)" }}>
        {paid ? "Paid orders" : "Active orders"}
      </span>
      <span className="font-bold" style={{ color: dark ? "#FFFFFF" : "var(--t-text)" }}>
        {ordered} / {goal} kits {paid ? "paid" : "ordered"}
      </span>
    </div>
    <div role="progressbar" aria-label={`${name} MOQ — ${paid ? "paid" : "active"}`} aria-valuemin={0}
      aria-valuemax={target} aria-valuenow={Math.min(target, count)}
      aria-valuetext={`${ordered} of ${goal} kits ${paid ? "paid" : "ordered"}`}
      className="h-1.5 overflow-hidden rounded-full"
      style={{ background: dark ? "rgba(255,255,255,0.15)" : "var(--t-border)" }}>
      <div className="h-full rounded-full transition-[width]" style={{
        width: `${Math.min(100, count / target * 100)}%`, background: met ? "#22c55e" : "#2D6BCC",
      }} />
    </div>
    <p className="text-[11px]" style={{ color: dark ? (met ? "#86efac" : "rgba(255,255,255,0.65)") : "var(--t-muted)" }}>
      {met ? "MOQ reached" : `Filling — ${formatMoqKits(Math.max(0, target - count))} kits to reach MOQ`}
    </p>
  </div>;
}

export function GroupBuyMoqProgress({ moq, dark = false, compact = false, staff = false }: {
  moq?: GroupBuyMoq | null; dark?: boolean; compact?: boolean; staff?: boolean;
}) {
  if (!moq?.enabled || (!staff && !moq.showToMembers)) return null;
  const products = (moq.products ?? []).filter(p => p.targetKits !== null);
  if (!moq.targetKits && !products.length) return null;
  const mode = moq.countMode ?? "active";
  const rows = (name: string, target: number, active: number, paid: number) => <>
    {mode !== "paid" && <ProgressRow name={name} target={target} count={active} paid={false} dark={dark} />}
    {mode !== "active" && <ProgressRow name={name} target={target} count={paid} paid dark={dark} />}
  </>;
  return (
    <div data-testid="gb-moq-progress" className={compact ? "mt-2 space-y-2" : "rounded-xl border p-3.5 space-y-3"}
      style={compact ? undefined : {
        background: dark ? "rgba(255,255,255,0.04)" : "var(--t-surface)",
        borderColor: dark ? "rgba(255,255,255,0.15)" : "var(--t-border)",
      }}>
      {moq.targetKits && <div className="space-y-2">
        <p className="text-[11px] font-semibold" style={{ color: dark ? "rgba(255,255,255,0.75)" : "var(--t-muted)" }}>
          {compact ? "MOQ" : "Group-buy minimum order quantity"}
        </p>
        {rows("Group-buy", moq.targetKits, moq.orderedKits, moq.paidKits ?? 0)}
      </div>}
      {products.length > 0 && <div className="space-y-3">
        <div className="text-[11px] font-semibold space-y-1" style={{ color: dark ? "#FFFFFF" : "var(--t-text)" }}>
          {mode !== "paid" && <p>{products.filter(p => p.orderedKits >= p.targetKits!).length} of {products.length} product MOQs reached — active orders</p>}
          {mode !== "active" && <p>{products.filter(p => p.paidKits >= p.targetKits!).length} of {products.length} product MOQs reached — paid orders</p>}
        </div>
        {products.map(p => <div key={p.productId} className="space-y-2 border-t pt-2"
          style={{ borderColor: dark ? "rgba(255,255,255,0.15)" : "var(--t-border)" }}>
          <p className="text-xs font-bold break-words" style={{ color: dark ? "#FFFFFF" : "var(--t-text)" }}>{p.name}</p>
          {rows(p.name, p.targetKits!, p.orderedKits, p.paidKits)}
        </div>)}
      </div>}
    </div>
  );
}
