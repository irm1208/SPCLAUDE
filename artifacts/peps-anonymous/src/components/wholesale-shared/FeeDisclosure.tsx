import { Receipt, AlertCircle, Info, RefreshCw } from "lucide-react";
import type { CostLine, SharedOrderCosts } from "@/hooks/use-wholesale-shares";

// Server-authoritative fee disclosure for shared wholesale orders. This component
// NEVER calculates fees or totals: it only formats what the server sent. Missing
// values render as unavailable (never as free), and charges in different
// currencies or paid separately are never summed together.

export const ONWARD_NOT_SET_COPY = "Not set yet — ask the organiser";

const BASIS_LABEL: Record<CostLine["basis"], string> = {
  per_person: "per person",
  per_kit: "per kit",
  your_share: "your share",
  your_order: "your order",
};

const STAGE_LABEL: Record<SharedOrderCosts["stage"], string> = {
  invitation: "Before you join",
  estimate: "Current estimate",
  locked: "Locked amounts",
};

export function formatCostMoney(amount: number, currency: string): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}${currency.toUpperCase()} ${Math.abs(amount).toFixed(2)}`;
}

type Key = "organiser" | "perKit" | "vendorShipping" | "onwardShipping" | "adjustment";

const LABELS: Record<Key, string> = {
  organiser: "Organiser fee",
  perKit: "Per-kit fee",
  vendorShipping: "Vendor shipping",
  onwardShipping: "Onward shipping",
  adjustment: "Adjustment",
};

export interface CostLineView {
  value: string;
  detail: string | null;
  tone: "known" | "estimate" | "none" | "pending" | "unavailable";
}

/** Pure presentation of one server cost line. Exported for tests. */
export function describeCostLine(key: Key, line: CostLine): CostLineView {
  const code = line.currency;
  const basis = BASIS_LABEL[line.basis] ?? line.basis;
  if (line.status === "not_required") return { value: "No fee", detail: null, tone: "none" };
  if (line.status === "not_set") {
    return { value: key === "onwardShipping" ? ONWARD_NOT_SET_COPY : "Not set yet", detail: null, tone: "pending" };
  }
  if (line.status === "calculated_later") {
    if (key === "perKit" && line.rate != null && code) return {
      value: `${formatCostMoney(line.rate, code)} ${basis}`,
      detail: "Your fee amount depends on how many kits you order", tone: "known",
    };
    return { value: "Calculated when the order locks", detail: null, tone: "pending" };
  }
  const est = line.status === "estimate";
  const rateText = line.rate != null && code ? `${formatCostMoney(line.rate, code)} ${basis}` : null;
  if (line.amount == null || !code) {
    // A known rate alone is still disclosed; the total amount stays unavailable.
    if (rateText && key === "perKit") {
      return { value: `${est ? "Est. " : ""}${rateText}`, detail: "Your amount is shown once you add items", tone: est ? "estimate" : "known" };
    }
    return { value: "Unavailable", detail: null, tone: "unavailable" };
  }
  if (line.amount === 0 && line.status === "known") return { value: "No fee", detail: null, tone: "none" };
  const value = `${est ? "Est. " : ""}${formatCostMoney(line.amount, code)}`;
  // Per-kit: the rate and the server amount describe the SAME charge.
  const detail = key === "perKit" && rateText ? `${rateText}, ${BASIS_LABEL.your_order}` : basis;
  return { value, detail, tone: est ? "estimate" : "known" };
}

const TONE_COLOR: Record<CostLineView["tone"], string> = {
  known: "var(--t-text)",
  estimate: "#a16207",
  none: "#15803d",
  pending: "var(--t-muted)",
  unavailable: "#b45309",
};

function Row({ k, line }: { k: Key; line: CostLine }) {
  const v = describeCostLine(k, line);
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5" data-testid={`cost-line-${k}`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{LABELS[k]}</p>
        {(v.detail || line.note) && (
          <p className="text-[11px] mt-0.5" style={{ color: "var(--t-muted)" }}>
            {[v.detail, line.note].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <span className="text-sm font-bold text-right shrink-0 max-w-[55%]" style={{ color: TONE_COLOR[v.tone] }} data-testid={`cost-value-${k}`}>
        {v.value}
      </span>
    </div>
  );
}

interface FeeDisclosureProps {
  costs: SharedOrderCosts | null | undefined;
  /** Optional heading override. */
  title?: string;
  testId?: string;
  /** Shown when the member has unsaved basket edits: amounts reflect the SAVED basket. */
  unsavedChanges?: boolean;
  /** Retry loading when cost data is missing. */
  onRetry?: () => void;
}

export function FeeDisclosure({ costs, title = "What this order costs", testId = "fee-disclosure", unsavedChanges = false, onRetry }: FeeDisclosureProps) {
  const shell = { background: "var(--t-surface)", border: "1px solid var(--t-border)" } as const;

  if (!costs) {
    return (
      <section className="rounded-2xl p-4 space-y-1.5 text-left" style={shell} data-testid={testId}>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" style={{ color: "#b45309" }} />
          <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Costs unavailable</p>
        </div>
        <p className="text-xs" style={{ color: "var(--t-muted)" }} data-testid="text-costs-unavailable">
          We couldn't load the fees for this order. Nothing here means free — ask the organiser or try again before committing.
        </p>
        {onRetry && (
          <button type="button" onClick={onRetry} data-testid="button-retry-costs"
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold"
            style={{ color: "var(--t-blue)", border: "1px solid var(--t-border)" }}>
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        )}
      </section>
    );
  }

  const entries: [Key, CostLine][] = [
    ["organiser", costs.organiser],
    ["perKit", costs.perKit],
    ["vendorShipping", costs.vendorShipping],
    ["onwardShipping", costs.onwardShipping],
  ];
  if (costs.adjustment) entries.push(["adjustment", costs.adjustment]);
  const included = entries.filter(([, l]) => l.includedInOrder);
  const separate = entries.filter(([, l]) => !l.includedInOrder);
  const anyEstimate = entries.some(([, l]) => l.status === "estimate");
  const box = { border: "1px solid var(--t-border)" } as const;

  return (
    <section className="rounded-2xl p-4 space-y-3 text-left" style={shell} data-testid={testId}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4" style={{ color: "var(--t-blue)" }} />
          <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{title}</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: costs.stage === "locked" ? "rgba(34,197,94,0.12)" : "var(--t-blue-08)", color: costs.stage === "locked" ? "#15803d" : "var(--t-blue)" }}
          data-testid="status-cost-stage">
          {STAGE_LABEL[costs.stage]}
        </span>
      </div>

      {unsavedChanges && (
        <p className="text-[11px] font-semibold rounded-lg px-3 py-2" role="status" data-testid="text-costs-unsaved"
          style={{ background: "rgba(233,160,32,0.10)", color: "#a16207" }}>
          These amounts are for your saved items. Save item changes to refresh them.
        </p>
      )}

      {included.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest px-1" style={{ color: "#8A9AAA" }}>Included in your order payment</p>
          <div className="rounded-lg divide-y" style={box} data-testid="group-costs-included">
            {included.map(([k, l]) => <Row key={k} k={k} line={l} />)}
          </div>
        </div>
      )}

      {costs.orderTotal != null && (
        <div className="flex items-end justify-between px-1" data-testid="row-order-total">
          <span className="text-xs" style={{ color: "var(--t-muted)" }}>
            {costs.stage === "locked" ? "Order total" : "Estimated order total"} (items and included charges)
          </span>
          <span className="text-base font-bold" style={{ color: "var(--t-text)" }} data-testid="text-order-total">
            {formatCostMoney(costs.orderTotal, costs.currency)}
          </span>
        </div>
      )}

      {separate.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest px-1" style={{ color: "#8A9AAA" }}>Paid separately, not in the total</p>
          <div className="rounded-lg divide-y" style={box} data-testid="group-costs-separate">
            {separate.map(([k, l]) => <Row key={k} k={k} line={l} />)}
          </div>
        </div>
      )}

      <p className="flex items-start gap-1.5 text-[11px] leading-snug" style={{ color: "var(--t-muted)" }}>
        <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
        <span>
          {anyEstimate ? "Estimates can change until the organiser locks the order. " : ""}
          {entries.some(([, l]) => l.status === "not_set" || l.status === "calculated_later") ? "Your delivered cost is not final until all charges are known. " : ""}
          Separately paid charges are not added to your order total{separate.some(([, l]) => l.currency && l.currency !== costs.currency) ? " and may be in a different currency" : ""}.
        </span>
      </p>
    </section>
  );
}
