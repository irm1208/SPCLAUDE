import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function OrderItemsSummary({ collapsed, quantity, productCount, children }: {
  collapsed: boolean;
  quantity: number;
  productCount: number;
  children: ReactNode;
}) {
  if (!collapsed) return <>{children}</>;
  return (
    <div className="mt-6 border-t border-white/20 pt-5">
    <details className="group rounded-xl border border-[#5B8DEF]/35 bg-[#20344B] shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-3 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5B8DEF] [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <span className="block text-sm font-bold">Your order ({quantity} {quantity === 1 ? "kit" : "kits"})</span>
          <span className="block text-xs text-white/60">{productCount} {productCount === 1 ? "product" : "products"} · Expand to edit or remove items</span>
        </div>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-white/10 px-3 py-3">{children}</div>
    </details>
    </div>
  );
}
