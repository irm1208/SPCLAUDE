import type { ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";

export default function OrdersFilterSurface({
  open,
  mobile,
  onOpenChange,
  children,
}: {
  open: boolean;
  mobile: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  if (mobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
        <DrawerContent className="organiser-v2 orders-filter-sheet">
          <DrawerTitle className="sr-only">Filter orders</DrawerTitle>
          <DrawerDescription className="sr-only">
            Refine the order queue and apply the selected filters.
          </DrawerDescription>
          <div className="approved-order-desk">
            <div className="orders-filter-studio">{children}</div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  if (!open) return null;

  return (
    <div
      id="orders-filter-studio"
      className="orders-filter-studio"
      role="region"
      aria-label="Filter orders"
    >
      {children}
    </div>
  );
}
