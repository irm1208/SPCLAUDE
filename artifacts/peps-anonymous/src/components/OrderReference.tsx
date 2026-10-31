import { orderReference, type OrderReferenceData } from "@/lib/order-reference";

export function OrderReference({ order }: { order: OrderReferenceData }) {
  const addition = order.isAddition || /^ADD-/i.test(order.code ?? "");
  return <span className="inline-flex min-w-0 max-w-full flex-col align-middle">
    <span className="truncate">#{orderReference(order)}</span>
    {addition && <span className="text-[10px] font-normal tracking-normal text-muted-foreground break-words">
      {order.additionParent ? `Addition to #${order.additionParent.reference}` : "Addition · original order unavailable"}
    </span>}
  </span>;
}
