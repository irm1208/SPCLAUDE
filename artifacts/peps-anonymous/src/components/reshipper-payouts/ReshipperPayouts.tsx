import React, { useEffect, useState } from "react";
import { HandCoins } from "lucide-react";
import type { PayoutFetcher } from "../../lib/reshipper-payouts";
import { GroupPicker } from "./GroupPicker";
import { PayoutForm } from "./PayoutForm";
import { PayoutHistory } from "./PayoutHistory";
import { type Draft, PayoutOrdersTable } from "./PayoutOrdersTable";
import { PayoutTotals } from "./PayoutTotals";
import { ReviewPanel } from "./ReviewPanel";
import { WalletCollectionCheck } from "./WalletCollectionCheck";
import { PayoutWalletCard } from "./PayoutWalletCard";
import { usePayoutData } from "./usePayoutData";
import { card, ErrorNote, Skeleton, subtle } from "./ui";

export interface ReshipperPayoutsProps { mode: "admin" | "reshipper"; username?: string; gbId?: string; fetcher: PayoutFetcher }

export function ReshipperPayouts({ mode, username, gbId, fetcher }: ReshipperPayoutsProps) {
  const isAdmin = mode === "admin";
  const [picked, setPicked] = useState("");
  useEffect(() => { setPicked(""); }, [username]);
  const activeGb = gbId || picked;
  const base = !activeGb ? null : isAdmin
    ? (username ? `/api/admin/reshippers/${encodeURIComponent(username)}/gb/${encodeURIComponent(activeGb)}/payouts` : null)
    : `/api/reshipper/gb/${encodeURIComponent(activeGb)}/payouts`;
  const { data, error, loading, retry, write } = usePayoutData(base, fetcher);
  const [selection, setSelection] = useState<Record<string, Draft>>({});
  useEffect(() => { setSelection({}); }, [base]);
  useEffect(() => {
    if (!data) return;
    setSelection(s => { const ok = new Set(data.orders.filter(o => o.eligible).map(o => o.orderId)); const n: Record<string, Draft> = {}; for (const k in s) if (ok.has(k)) n[k] = s[k]; return n; });
  }, [data]);

  return <section aria-label="Reshipper payouts" className="rounded-2xl border p-4 sm:p-5 space-y-4" style={card}>
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-bold"><HandCoins className="w-4 h-4" style={{ color: "var(--t-blue)" }} />{isAdmin ? `Payouts to ${username ?? "reshipper"}` : "Your payouts"}</h2>
      {!isAdmin && <span className="text-xs" style={subtle}>Read only · recorded by Admin</span>}
      {base && <button type="button" className="text-xs underline" style={subtle} disabled={loading} onClick={retry}>Refresh payouts</button>}
    </header>
    {isAdmin && !username && <ErrorNote message="No reshipper selected." />}
    {isAdmin && username && !gbId && <GroupPicker username={username} fetcher={fetcher} value={picked} onChange={setPicked} />}
    {!activeGb && !isAdmin && <p className="text-sm" style={subtle}>Choose a group buy to see payouts.</p>}
    {base && loading && !data && <Skeleton />}
    {base && error && <ErrorNote message={error} onRetry={retry} />}
    {data && <>
      <PayoutTotals data={data} />
      <PayoutWalletCard key={`destination-${base}`} wallet={data.payoutWallet} canEdit={isAdmin} write={write} />
      {isAdmin && <p className="text-sm" style={subtle}>Select orders below, send one transfer to the reshipper, then record its TXID. Recording a payout does not send money.</p>}
      <PayoutOrdersTable orders={data.orders} canSelect={isAdmin} selection={selection} onSelectionChange={setSelection} />
      {isAdmin && <PayoutForm key={`form-${base}`} orders={data.orders} selection={selection} payoutWallet={data.payoutWallet} write={write} onRecorded={() => setSelection({})} />}
      <PayoutHistory payouts={data.payouts} canVoid={isAdmin} write={write} />
      {isAdmin && <details aria-label="Review & corrections" className="rounded-xl border p-4" style={{ borderColor: "var(--t-border)" }}>
        <summary className="cursor-pointer text-sm font-semibold">Review & corrections{data.needsReviewCount ? ` · ${data.needsReviewCount} orders need review` : ""}</summary>
        <div className="mt-4 space-y-4">
          <WalletCollectionCheck key={`wallets-${base}`} data={data} write={write} />
          <ReviewPanel key={`review-${base}`} orders={data.orders} write={write} />
        </div>
      </details>}
    </>}
  </section>;
}

export default ReshipperPayouts;
