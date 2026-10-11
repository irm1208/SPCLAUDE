import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function OrderItemsSummary({ collapsed, quantity, productCount, total, children }: {
  collapsed: boolean;
  quantity: number;
  productCount: number;
  total?: ReactNode;
  children: ReactNode;
}) {
  if (!collapsed) return <>{children}</>;
  return (
    <div id="selected-order-items" tabIndex={-1} className="mt-6 border-t border-white/20 pt-5" style={{ scrollMarginTop: 96 }}>
    <details className="group rounded-xl border border-[#5B8DEF]/35 bg-[#20344B] shadow-sm">
      <summary className="flex flex-wrap cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-3 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5B8DEF] [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1 basis-32">
          <span className="block text-sm font-bold">Your order ({quantity} {quantity === 1 ? "kit" : "kits"})</span>
          <span className="block text-xs text-white/60">{productCount} {productCount === 1 ? "product" : "products"} · Expand to edit or remove items</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {total != null && (
            <div className="text-right">
              <span className="block text-[10px] text-white/65">Estimated total</span>
              <span className="block text-base font-bold tabular-nums" aria-live="polite">{total}</span>
            </div>
          )}
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="min-w-0 border-t border-white/10 px-3 py-3">{children}</div>
    </details>
    </div>
  );
}
