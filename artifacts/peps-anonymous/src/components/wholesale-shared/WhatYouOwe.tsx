import { CreditCard, CheckCircle2 } from "lucide-react";
import type { WholesaleShareDetail, WholesaleShareMember } from "@/hooks/use-wholesale-shares";

const money = (n: number) => `$${n.toFixed(2)}`;

interface WhatYouOweProps {
  share: WholesaleShareDetail;
  me: WholesaleShareMember;
  onPayOrder: () => void;
}

// One platform order payment for the current member. Once locked, every value comes
// from the materialised order snapshot; recipients already arrive with a $0 fee.
export function WhatYouOwe({ share, me, onPayOrder }: WhatYouOweProps) {
  const itemAndShipping = me.subtotal + me.tip + (me.shippingShare ?? 0);
  const organiserDue = me.orderOrganiserFee ?? me.organiserFee;
  const total = me.orderGrandTotal ?? itemAndShipping + organiserDue;

  const orderPaid = me.paymentStatus === "confirmed" || me.paymentStatus === "test_confirmed";
  const outstandingBalance = me.amountDue > 0 && me.balancePaymentStatus !== "confirmed";
  const canPay = (!orderPaid || outstandingBalance) && !!me.orderId && share.status !== "cancelled";

  const card = { background: "var(--t-surface)", border: "1px solid var(--t-border)" } as const;

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: "#8A9AAA" }}>What You Owe</p>
      <div className="rounded-2xl p-4 space-y-3" style={card}>
        <div className="flex items-end justify-between">
          <span className="text-sm" style={{ color: "var(--t-muted)" }}>Your total</span>
          <span className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>{money(total)}</span>
        </div>

        <div className="rounded-lg divide-y" style={{ border: "1px solid var(--t-border)", borderColor: "var(--t-border)" }}>
          {/* One materialised order payment, with fee shown as an itemised line. */}
          <div className="px-3 py-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Your order</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>
                  {money(me.subtotal)} items{me.tip > 0 ? ` · ${money(me.tip)} tip` : ""}{me.shippingShare != null ? ` · ${money(me.shippingShare)} shipping` : ""}
                  {organiserDue > 0 ? ` · ${money(organiserDue)} organiser fee` : ""}
                  {me.orderCode ? ` · order #${me.orderCode}` : ""}
                </p>
              </div>
              <span className="text-sm font-bold shrink-0" style={{ color: "var(--t-text)" }}>{money(total)}</span>
            </div>
            {organiserDue > 0 && <div className="flex justify-between text-xs" style={{ color: "var(--t-muted)" }}><span>Organiser fee</span><span>{money(organiserDue)}</span></div>}
            {outstandingBalance && <div className="flex justify-between text-xs font-semibold" style={{ color: "#b45309" }}><span>Outstanding balance</span><span>{money(me.amountDue)}</span></div>}
            {orderPaid ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 h-7 rounded-lg" style={{ background: "rgba(34,197,94,0.12)", color: "#15803d" }}>
                <CheckCircle2 className="w-3 h-3" /> Paid
              </span>
            ) : null}
            {canPay ? (
              <button
                onClick={onPayOrder}
                className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-sm font-bold text-white"
                style={{ background: "var(--t-blue)" }}
              >
                <CreditCard className="w-4 h-4" /> {outstandingBalance ? "Pay balance" : "Pay now"}
              </button>
            ) : !orderPaid ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 h-7 rounded-lg" style={{ background: "rgba(234,179,8,0.12)", color: "#a16207" }}>
                Awaiting order
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
