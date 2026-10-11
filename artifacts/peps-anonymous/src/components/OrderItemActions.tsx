import type { ReactNode } from "react";

/** Keep help text out of the quantity/price row so narrow cards cannot clip controls. */
export function OrderItemActions({ children, hints }: { children: ReactNode; hints?: ReactNode }) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex min-w-0 flex-wrap items-center gap-3">{children}</div>
      {hints && <div className="min-w-0 space-y-1 break-words">{hints}</div>}
    </div>
  );
}
