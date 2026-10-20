import { useState } from "react";
import type { PayoutFetcher } from "../../lib/reshipper-payouts";
import { ReshipperPayouts } from "./ReshipperPayouts";

/** Admin's existing payout ledger, scoped to the group buy already open. */
export function GroupBuyReshipperPayouts({ gbId, reshippers, fetcher }: {
  gbId: string;
  reshippers: string[];
  fetcher: PayoutFetcher;
}) {
  const usernames = [...new Set(reshippers)];
  const [picked, setPicked] = useState("");
  const username = usernames.includes(picked) ? picked : usernames[0];

  return <section aria-label="Group-buy reshipper payouts" className="space-y-3">
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold">Fees owed & payouts</h3>
      <p className="text-xs text-muted-foreground">
        Review fees, record payments to a reshipper and view payout history for this group buy.
        This uses the same records as the reshipper profile.
      </p>
      {username ? <label className="block text-xs font-semibold space-y-1">
        <span>Reshipper</span>
        <select aria-label="Payout reshipper" value={username} onChange={event => setPicked(event.target.value)}
          className="block w-full rounded-lg border border-input bg-background p-2 text-sm">
          {usernames.map(name => <option key={name} value={name}>@{name.replace(/^@/, "")}</option>)}
        </select>
      </label> : <p className="text-sm text-muted-foreground">Assign a reshipper to manage payouts here.</p>}
    </div>
    {username && <ReshipperPayouts key={`${gbId}:${username}`} mode="admin" gbId={gbId} username={username} fetcher={fetcher} />}
  </section>;
}
