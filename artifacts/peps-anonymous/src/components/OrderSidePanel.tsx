import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ShoppingCart, Minus, Plus, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { OrderPanelDelivery, type PanelDeliveryChoices } from "./OrderPanelDelivery";
import { OrderPanelExtras, type PanelOrderExtras } from "./OrderPanelExtras";

type OrderPanelProps = {
  items: {
    id: string;
    productName: string;
    quantity: number;
    lineTotal: number;
    unitPrice?: number;
    allowHalfKits?: boolean;
    maxQuantity?: number;
    increaseDisabled?: boolean;
  }[];
  total: number;
  formatPrice: (amount: number) => string;
  hidePrices: boolean;
  hideTotal: boolean;
  shippingPending: boolean;
  onQuantityChange?: (id: string, quantity: number) => void;
  onRemove?: (id: string) => void;
  editingDisabled?: boolean;
  watermark?: ReactNode;
  delivery?: PanelDeliveryChoices;
  extras?: PanelOrderExtras;
  /** Optional extra content (e.g. onward delivery estimate) rendered below extras. */
  slot?: ReactNode;
};

export function OrderPanelContents({ items, total, formatPrice, hidePrices, hideTotal, shippingPending, onQuantityChange, onRemove, editingDisabled, watermark, delivery, extras, slot }: OrderPanelProps) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {watermark}
      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        {items.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--t-muted)" }}>No products added yet. Add products from the catalogue to build your order.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--t-border)" }}>
            {items.map(item => (
              <li key={item.id} className="space-y-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold">{item.productName}</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--t-muted)" }}>{item.quantity} {item.quantity === 1 ? "kit" : "kits"}</p>
                  </div>
                  {!hidePrices && (
                    <div className="max-w-[45%] break-words text-right">
                      <span className="text-sm font-semibold tabular-nums">{formatPrice(item.lineTotal)}</span>
                      {!!item.unitPrice && <p className="mt-1 text-xs" style={{ color: "var(--t-muted)" }}>{formatPrice(item.unitPrice)} per kit</p>}
                    </div>
                  )}
                </div>
                {(onQuantityChange || onRemove) && (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {onQuantityChange && (
                      <div className="flex h-11 items-center overflow-hidden rounded-lg border" style={{ borderColor: "var(--t-border)" }}>
                        <button type="button" aria-label={`Decrease ${item.productName} quantity`}
                          disabled={editingDisabled || item.quantity <= (item.allowHalfKits ? 0.5 : 1)}
                          className="flex h-full w-10 items-center justify-center disabled:opacity-30"
                          onClick={() => onQuantityChange(item.id, Math.max(item.allowHalfKits ? 0.5 : 1, item.quantity - 1))}>
                          <Minus aria-hidden="true" className="h-4 w-4" />
                        </button>
                        <input type="number" aria-label={`${item.productName} quantity in kits`}
                          min={item.allowHalfKits ? 0.5 : 1} max={item.maxQuantity}
                          step={item.allowHalfKits ? 0.5 : 1} value={item.quantity}
                          disabled={editingDisabled}
                          onChange={event => {
                            const value = Number.parseFloat(event.target.value);
                            if (Number.isFinite(value) && value > 0) onQuantityChange(item.id, value);
                          }}
                          className="h-full w-14 min-w-0 bg-transparent text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#2D6BCC] disabled:opacity-50"
                        />
                        <button type="button" aria-label={`Increase ${item.productName} quantity`}
                          disabled={editingDisabled || item.increaseDisabled || (item.quantity < 1 ? 1 : item.quantity + 1) > (item.maxQuantity ?? Infinity)}
                          className="flex h-full w-10 items-center justify-center disabled:opacity-30"
                          onClick={() => onQuantityChange(item.id, item.quantity < 1 ? 1 : item.quantity + 1)}>
                          <Plus aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {onRemove && (
                      <button type="button" aria-label={`Remove ${item.productName} from order`}
                        disabled={editingDisabled}
                        className="flex h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium disabled:opacity-30"
                        style={{ color: "var(--t-muted)" }} onClick={() => onRemove(item.id)}>
                        <Trash2 aria-hidden="true" className="h-4 w-4" /> Remove
                      </button>
                    )}
                  </div>
                )}
                {onQuantityChange && (
                  <p className="text-xs" style={{ color: "var(--t-muted)" }}>
                    {item.allowHalfKits ? "Half kits allowed (e.g. 0.5)." : "Whole kits only."}
                    {item.maxQuantity != null && <> Max {item.maxQuantity} kits.</>}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {delivery && <OrderPanelDelivery {...delivery} disabled={editingDisabled} hidePrices={hidePrices} formatPrice={formatPrice} />}
        {extras && <OrderPanelExtras {...extras} disabled={editingDisabled} formatPrice={formatPrice} />}
        {slot}
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
    </div>
  );
}

export function OrderSidePanel(props: OrderPanelProps & { onReview: () => void; reviewDisabled?: boolean }) {
  const [open, setOpen] = useState(false);
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
        style={{ background: "var(--t-surface)", color: "var(--t-text)", borderColor: "var(--t-border)" }}>
        <SheetHeader>
          <SheetTitle style={{ color: "var(--t-text)" }}>Your order</SheetTitle>
          <SheetDescription style={{ color: "var(--t-muted)" }}>Edit products and choose delivery here. Your order total updates automatically.</SheetDescription>
        </SheetHeader>
        <OrderPanelContents {...props} />
        <button type="button" className="mt-4 w-full rounded-xl bg-[#1B3A7A] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={props.reviewDisabled}
          onClick={() => {
            setOpen(false);
            props.onReview();
          }}>
          Review order
        </button>
      </SheetContent>
    </Sheet>
  );
}
