import { useState } from "react";
import { ChevronDown, CreditCard, CheckCircle2 } from "lucide-react";
import type { WholesaleShareDetail, WholesaleShareMember } from "@/hooks/use-wholesale-shares";

const money = (n: number) => `$${n.toFixed(2)}`;

interface WhatYouOweProps {
  share: WholesaleShareDetail;
  me: WholesaleShareMember;
  onPayOrder: () => void;
}

// One combined money card for the current member: their vendor order (paid via the
// order page) plus any peer-to-peer organiser fee (paid directly to the organiser).
// Uses only server-resolved amounts — never re-derives a
// fee. Recipients are already exempt server-side (their fee amounts arrive as 0).
export function WhatYouOwe({ share, me, onPayOrder }: WhatYouOweProps) {
  const [expanded, setExpanded] = useState<"organiser" | null>(null);

  const orderDue = me.subtotal + me.tip + (me.shippingShare ?? 0);
  const organiserDue = me.organiserFee;
  const total = orderDue + organiserDue;

  const orderPaid = me.paymentStatus === "confirmed";
  const canPay = !orderPaid && !!me.orderId && share.status !== "cancelled";

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
          {/* Vendor order — paid through the order page */}
          <div className="px-3 py-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Your items &amp; shipping</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--t-muted)" }}>
                  {money(me.subtotal)} items{me.tip > 0 ? ` · ${money(me.tip)} tip` : ""}{me.shippingShare != null ? ` · ${money(me.shippingShare)} shipping` : ""}
                  {me.orderCode ? ` · order #${me.orderCode}` : ""}
                </p>
              </div>
              <span className="text-sm font-bold shrink-0" style={{ color: "var(--t-text)" }}>{money(orderDue)}</span>
            </div>
            {orderPaid ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 h-7 rounded-lg" style={{ background: "rgba(34,197,94,0.12)", color: "#15803d" }}>
                <CheckCircle2 className="w-3 h-3" /> Paid
              </span>
            ) : canPay ? (
              <button
                onClick={onPayOrder}
                className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-sm font-bold text-white"
                style={{ background: "var(--t-blue)" }}
              >
                <CreditCard className="w-4 h-4" /> Pay now
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 h-7 rounded-lg" style={{ background: "rgba(234,179,8,0.12)", color: "#a16207" }}>
                Awaiting order
              </span>
            )}
          </div>

          {/* Organiser fee — peer-to-peer, paid directly to the organiser */}
          {organiserDue > 0 && (
            <div className="px-3 py-2.5 space-y-2">
              <button type="button" onClick={() => setExpanded(e => (e === "organiser" ? null : "organiser"))} className="w-full flex items-center justify-between gap-3 text-left">
                <span className="text-sm font-medium" style={{ color: "var(--t-text)" }}>Organiser fee</span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{money(organiserDue)}</span>
                  {me.organiserFeePaid
                    ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#15803d" }}>Paid</span>
                    : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(234,179,8,0.12)", color: "#a16207" }}>Unpaid</span>}
                  <ChevronDown className="w-4 h-4 transition-transform" style={{ color: "var(--t-muted)", transform: expanded === "organiser" ? "rotate(180deg)" : "none" }} />
                </span>
              </button>
              {expanded === "organiser" && (
                <div className="rounded-lg p-3 text-sm" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--t-text)" }}>
                    Pay @{share.fees.organiserUsername.replace(/^@/, "")} directly — not part of your order.
                  </p>
                  {share.fees.organiserPaymentInfo
                    ? <p className="whitespace-pre-line text-xs" style={{ color: "var(--t-muted)" }}>{share.fees.organiserPaymentInfo}</p>
                    : <p className="text-xs" style={{ color: "var(--t-muted)" }}>Payment details not provided yet — ask the organiser.</p>}
                </div>
              )}
            </div>
          )}

        </div>

        {organiserDue > 0 && (
          <p className="text-[11px]" style={{ color: "var(--t-muted)" }}>
            Your order is paid through the order page. The organiser fee is settled directly with the organiser above.
          </p>
        )}
      </div>
    </section>
  );
}
