import React from "react";
import { OrderBreakdown } from "./OrderBreakdown";
import { money, moneyOf, type LedgerOrder, type Wallet } from "./model";
import { inputCls, inputStyle, primaryBtn, primaryStyle, SectionLabel, subtle } from "../../reshipper-payouts/ui";

export type PaymentForm = { walletId: string; amount: string; txid: string; paidAt: string; note: string };
export type Draft = {
  vendorId: string;
  walletId: string;
  walletSnapshot: { currency: string; network: string; address: string };
  submissionIds: string[];
  orderSnapshots: { submissionId: string; reviewToken: string }[];
  txid: string;
  cryptoAmount: string;
  paidAt?: string;
  note?: string;
};

export function RecordPaymentPanel({ wallets, form, onForm, chosen, total, draft, busy, ready, dateError, tokenProblem, onReview, onConfirm, onEdit }: {
  wallets: Wallet[]; form: PaymentForm; onForm: (patch: Partial<PaymentForm>) => void;
  chosen: LedgerOrder[]; total: bigint; draft: Draft | null; busy: boolean; ready: boolean; dateError: boolean; tokenProblem: number;
  onReview: () => void; onConfirm: () => void; onEdit: () => void;
}) {
  return <section aria-label="Record external transfer" className="space-y-3 rounded-2xl border p-4" style={{ borderColor: "var(--t-blue-25)", background: "color-mix(in srgb, var(--t-blue) 3%, var(--t-surface))" }}>
    <SectionLabel>Record a transfer already sent</SectionLabel>
    <fieldset disabled={busy || !!draft} className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs sm:col-span-2" style={subtle}>Destination wallet (vendor saved)
        <select className={inputCls} style={inputStyle} data-testid="payment-wallet" value={form.walletId} onChange={(e) => onForm({ walletId: e.target.value })}>
          <option value="">Select wallet</option>
          {wallets.map((w) => <option key={w.id} value={w.id}>{w.label ? `${w.label} · ` : ""}{w.currency} / {w.network} · {w.address}</option>)}
        </select>
      </label>
      <label className="text-xs" style={subtle}>Actual crypto amount sent
        <input data-testid="payment-amount" className={inputCls} style={inputStyle} inputMode="decimal" value={form.amount} onChange={(e) => onForm({ amount: e.target.value })} />
      </label>
      <label className="text-xs" style={subtle}>Transaction ID (TXID)
        <input data-testid="payment-txid" className={inputCls + " font-mono"} style={inputStyle} value={form.txid} onChange={(e) => onForm({ txid: e.target.value })} />
      </label>
      <label className="text-xs" style={subtle}>Payment date (optional, local time)
        <input data-testid="payment-date" type="datetime-local" className={inputCls} style={inputStyle} value={form.paidAt} onChange={(e) => onForm({ paidAt: e.target.value })} />
        {dateError && <span role="alert" className="block mt-1 text-red-600">Enter a valid payment date.</span>}
      </label>
      <label className="text-xs" style={subtle}>Note (optional)
        <input data-testid="payment-note" className={inputCls} style={inputStyle} value={form.note} onChange={(e) => onForm({ note: e.target.value })} />
      </label>
      {tokenProblem > 0 && <p role="alert" className="sm:col-span-2 rounded-xl border-l-4 p-3 text-xs" style={{ borderColor: "#E9A020", background: "color-mix(in srgb, #E9A020 8%, var(--t-surface))", color: "var(--t-text)" }} data-testid="payment-token-warning">
        {tokenProblem} chosen {tokenProblem === 1 ? "order is" : "orders are"} missing a valid cost-snapshot token. Refresh payments & wallets, then reselect before reviewing.
      </p>}
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <button type="button" data-testid="payment-review" disabled={!ready} className={primaryBtn} style={primaryStyle} onClick={onReview}>Review payment record</button>
        <span className="text-xs" style={subtle}>{chosen.length} {chosen.length === 1 ? "order" : "orders"} · {money(total)} USD supplier cost</span>
      </div>
    </fieldset>
    {draft && <div className="space-y-3 rounded-xl border p-3 text-sm" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }} data-testid="payment-draft">
      <p className="font-bold">Confirm receipt for {draft.submissionIds.length} {draft.submissionIds.length === 1 ? "order" : "orders"} · {money(total)} USD supplier cost</p>
      <ul className="max-h-[28rem] overflow-y-auto divide-y text-xs tabular-nums rounded-lg border" style={{ borderColor: "var(--t-border)" }}>
        {chosen.map((o) => <li key={o.id} className="p-2" style={{ borderColor: "var(--t-border)" }}>
          <details data-testid={`payment-draft-item-${o.id}`}>
            <summary className="flex cursor-pointer justify-between gap-2" data-testid={`payment-draft-expand-${o.id}`}>
              <span className="font-mono break-all">{o.reference}{o.sourceType === "shared" ? " (shared)" : ""}</span><span className="font-semibold">{moneyOf(o.totalCost)}</span>
            </summary>
            <div className="mt-2"><OrderBreakdown src={o} testId={`payment-draft-detail-${o.id}`} /></div>
          </details>
        </li>)}
      </ul>
      <p>{draft.cryptoAmount} {draft.walletSnapshot.currency} / {draft.walletSnapshot.network}</p>
      <p className="break-all text-xs">Address: <span className="font-mono">{draft.walletSnapshot.address}</span></p>
      <p className="break-all text-xs">TXID: <span className="font-mono">{draft.txid}</span></p>
      {draft.paidAt && <p className="text-xs">Paid: {new Date(draft.paidAt).toLocaleString()}</p>}
      {draft.note && <p className="text-xs">{draft.note}</p>}
      <p className="text-[11px]" style={subtle}>This records funds you already sent. It does not send money, verify the blockchain, mark customer payments received or mark orders shipped.</p>
      <div className="flex gap-2">
        <button type="button" data-testid="payment-confirm" disabled={busy} className={primaryBtn} style={primaryStyle} onClick={onConfirm}>{busy ? "Recording" : "Confirm record"}</button>
        <button type="button" data-testid="payment-edit" disabled={busy} className="rounded-xl border px-4 text-sm" style={{ borderColor: "var(--t-border)" }} onClick={onEdit}>Edit</button>
      </div>
    </div>}
  </section>;
}
