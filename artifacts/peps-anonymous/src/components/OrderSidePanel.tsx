import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ShoppingCart } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type OrderPanelProps = {
  items: { id: string; productName: string; quantity: number; lineTotal: number }[];
  total: number;
  formatPrice: (amount: number) => string;
  hidePrices: boolean;
  hideTotal: boolean;
  shippingPending: boolean;
};

export function OrderPanelContents({ items, total, formatPrice, hidePrices, hideTotal, shippingPending }: OrderPanelProps) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        {items.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--t-muted)" }}>No products added yet. Add products from the catalogue to build your order.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--t-border)" }}>
            {items.map(item => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">{item.productName}</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--t-muted)" }}>{item.quantity} {item.quantity === 1 ? "kit" : "kits"}</p>
                </div>
                {!hidePrices && <span className="shrink-0 text-sm tabular-nums">{formatPrice(item.lineTotal)}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {!hidePrices && !hideTotal && (
        <div className="border-t pt-4" style={{ borderColor: "var(--t-border)" }}>
          <div className="flex items-center justify-between gap-3 font-bold">
            <span>Estimated total</span>
            <span className="text-xl tabular-nums" aria-live="polite" aria-atomic="true">{formatPrice(total)}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--t-muted)" }}>
            {shippingPending && <>Shipping has not been quoted and is not included. </>}
            Includes known delivery and fees. Final shipping, credits and discounts are confirmed on Review Order.
          </p>
        </div>
      )}
    </>
  );
}

export function OrderSidePanel(props: OrderPanelProps) {
  const [open, setOpen] = useState(false);
  const editOnClose = useRef(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {typeof document !== "undefined" && createPortal(<SheetTrigger asChild>
        <button type="button" aria-label="Open your order" title="Your order"
          className="fixed right-0 top-1/2 z-[54] flex h-12 w-11 -translate-y-1/2 items-center justify-center rounded-l-2xl text-white shadow-xl transition-[filter] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B8DEF]"
          style={{ background: "var(--t-blue, #2D6BCC)" }}>
          <ShoppingCart aria-hidden="true" className="h-4 w-4" />
        </button>
      </SheetTrigger>, document.body)}
      <SheetContent side="right" overlayClassName="z-[70]" className="z-[80] flex w-[92vw] max-w-[420px] flex-col sm:max-w-[420px]"
        onCloseAutoFocus={event => {
          if (!editOnClose.current) return;
          editOnClose.current = false;
          event.preventDefault();
          const section = document.getElementById("selected-order-items");
          const details = section?.querySelector("details");
          if (details) details.open = true;
          section?.focus({ preventScroll: true });
          section?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        style={{ background: "var(--t-surface)", color: "var(--t-text)", borderColor: "var(--t-border)" }}>
        <SheetHeader>
          <SheetTitle style={{ color: "var(--t-text)" }}>Your order</SheetTitle>
          <SheetDescription style={{ color: "var(--t-muted)" }}>Your selected products and current quantities.</SheetDescription>
        </SheetHeader>
        <OrderPanelContents {...props} />
        <button type="button" className="mt-4 w-full rounded-xl bg-[#1B3A7A] px-4 py-3 text-sm font-bold text-white"
          onClick={() => {
            editOnClose.current = true;
            setOpen(false);
          }}>
          Edit selected items
        </button>
      </SheetContent>
    </Sheet>
  );
}
