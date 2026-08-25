import type { ReactNode } from "react";
import { Check, CheckCircle2, Clock, CreditCard, Crown, Loader2, MapPin, Trash2, Truck } from "lucide-react";
import type { WholesaleShareDetail, WholesaleShareMember } from "@/hooks/use-wholesale-shares";
import { PriceWatermark } from "@/components/PriceWatermark";

interface GroupTrackerProps {
  share: WholesaleShareDetail;
  onPayMember: (orderId: string) => void;
  // When true, show each member's per-product item breakdown inside their row.
  showItems?: boolean;
  // When provided (organiser, open order), shows a Remove button on each
  // removable member's row. `removingUsername` is the member currently being
  // removed — used to show a busy spinner and disable the button.
  onRemoveMember?: (username: string) => void;
  removingUsername?: string | null;
}

const money = (n: number) => `$${n.toFixed(2)}`;

// Mirrors the page's PayBadge: only a fully `confirmed` payment counts as paid.
function PayChip({ paymentStatus }: { paymentStatus: string | null }) {
  const paid = paymentStatus === "confirmed";
  const pending = paymentStatus === "pending_confirmation";
  const testOnly = paymentStatus === "test_confirmed";
  const color = paid ? "#22c55e" : (pending || testOnly) ? "#eab308" : "#ef4444";
  const bg = paid ? "rgba(34,197,94,0.12)" : (pending || testOnly) ? "rgba(234,179,8,0.12)" : "rgba(239,68,68,0.12)";
  const label = paid ? "Paid" : pending ? "Checking…" : testOnly ? "Test only" : "Unpaid";
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ color, background: bg }}>
      {paid ? <CheckCircle2 className="w-3 h-3" /> : (pending || testOnly) ? <Clock className="w-3 h-3" /> : null}
      {label}
    </span>
  );
}

function Chip({ ok, label, neutralLabel, icon }: { ok: boolean; label: string; neutralLabel: string; icon?: ReactNode }) {
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
      style={ok
        ? { color: "#15803d", background: "rgba(34,197,94,0.12)" }
        : { color: "var(--t-muted)", background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}
    >
      {ok ? <Check className="w-3 h-3" /> : icon}
      {ok ? label : neutralLabel}
    </span>
  );
}

function PaymentTransactionDetails({
  transactions,
}: {
  transactions: NonNullable<WholesaleShareMember["paymentTransactions"]>;
}) {
  const stages = [
    { label: "Test payment transaction ID", transaction: transactions.test, color: "#b45309" },
    { label: "Remaining payment transaction ID", transaction: transactions.remaining, color: "#15803d" },
  ];

  return (
    <div className="grid gap-2 pt-1 sm:grid-cols-2">
      {stages.map(({ label, transaction, color }) => (
        <div key={label} className="rounded-lg px-2.5 py-2" style={{ background: "var(--t-surface2)", border: "1px solid var(--t-border)" }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold" style={{ color }}>{label}</p>
            {transaction?.amount != null && (
              <span className="text-[10px] font-semibold shrink-0" style={{ color }}>
                Received {transaction.amount.toFixed(2)} {transaction.currency ?? "USD"}
              </span>
            )}
          </div>
          {transaction ? (
            <p className="mt-1 text-[10px] font-mono break-all select-all" style={{ color: "var(--t-text)" }}>
              {transaction.id}
            </p>
          ) : (
            <p className="mt-1 text-[10px]" style={{ color: "var(--t-muted)" }}>Not submitted</p>
          )}
        </div>
      ))}
    </div>
  );
}

// Per-member status list with progress chips so everyone can see where the group
// stands. Presentation-only — same data the page already shows, just clearer.
export function GroupTracker({ share, onPayMember, showItems = false, onRemoveMember, removingUsername }: GroupTrackerProps) {
  const isOpen = share.status === "open";
  const d = share.delivery;
  // Mirror the page's deliveryComplete check so the chip can't claim "Address set"
  // while the page still treats delivery as incomplete (missing name/phone/country).
  const addressSet = !!(d.username && d.address && d.country && d.name && d.phone);
  return (
    <div className="relative rounded-xl divide-y overflow-hidden" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", borderColor: "var(--t-border)" }}>
      <PriceWatermark username={share.currentUsername} />
      {share.members.map(m => (
        <div key={m.username} className="p-4 space-y-2" style={{ borderColor: "var(--t-border)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold truncate" style={{ color: "var(--t-text)" }}>@{m.username.replace(/^@/, "")}</span>
                {m.isCreator && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1" style={{ background: "var(--t-blue-08)", color: "var(--t-blue)" }}>
                    <Crown className="w-2.5 h-2.5" /> Organiser
                  </span>
                )}
                {m.isYou && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--t-surface2)", color: "var(--t-muted)" }}>You</span>}
                {m.isRecipient && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-1" style={{ background: "rgba(34,197,94,0.12)", color: "#15803d" }}>
                    <Truck className="w-2.5 h-2.5" /> Delivery
                  </span>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--t-muted)" }}>
                {m.kits > 0 ? `${m.kits} kit${m.kits === 1 ? "" : "s"} · ${money(m.subtotal)}` : "No items yet"}
                {m.tip > 0 && ` · tip ${money(m.tip)}`}
                {m.shippingShare != null && ` · ship ${money(m.shippingShare)}`}
                 {m.orderOrganiserFee != null && ` · organiser fee ${money(m.orderOrganiserFee)}`}
                 {m.orderGrandTotal != null && ` · total ${money(m.orderGrandTotal)}`}
                {m.orderCode && ` · order #${m.orderCode}`}
              </p>
            </div>
            {!isOpen && m.isYou && m.orderId && m.paymentStatus !== "confirmed" && share.status !== "cancelled" && (
              <button
                onClick={() => onPayMember(m.orderId!)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-bold text-white"
                style={{ background: "var(--t-blue)" }}
              >
                <CreditCard className="w-4 h-4" /> Pay
              </button>
            )}
            {isOpen && onRemoveMember && m.canRemove && (
              <button
                onClick={() => onRemoveMember(m.username)}
                disabled={removingUsername === m.username}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ background: "rgba(239,68,68,0.10)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.25)" }}
                aria-label={`Remove @${m.username.replace(/^@/, "")}`}
              >
                {removingUsername === m.username ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Remove
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Chip ok={m.kits > 0} label="Items added" neutralLabel="No items yet" />
            {isOpen && <Chip ok={m.isConfirmed} label="Ready to pay" neutralLabel="Awaiting confirmation" icon={<Clock className="w-3 h-3" />} />}
            {m.isRecipient && (
              <Chip ok={addressSet} label="Address set" neutralLabel="Address pending" icon={<MapPin className="w-3 h-3" />} />
            )}
            {!isOpen && <PayChip paymentStatus={m.paymentStatus} />}
          </div>
           {share.isCreator && m.paymentTransactions && (
             <PaymentTransactionDetails transactions={m.paymentTransactions} />
           )}
          {showItems && m.items.length > 0 && (
            <ul className="space-y-1 pt-2 mt-1 border-t" style={{ borderColor: "var(--t-border)" }}>
              {m.items.map((it, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-xs" style={{ color: "var(--t-muted)" }}>
                  <span className="min-w-0 truncate">{it.productName}</span>
                  <span className="shrink-0 tabular-nums">×{it.quantity} · {money(it.quantity * it.unitPrice)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
