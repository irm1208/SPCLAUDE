import React from "react";
import { formatVialMoney } from "../lib/vial-money";

export interface VialRevenueTotal {
  /** Null means the historical pricing currency was never recorded. */
  currency: string | null;
  total: number;
}

/** Never combines denominations or substitutes a USD payment lock for prices. */
export function VialSellerRevenue({ totals }: { totals: VialRevenueTotal[] }) {
  if (!totals.length) return <span className="text-muted-foreground">No confirmed sales</span>;
  return (
    <span className="inline-flex flex-col gap-0.5">
      {totals.map(({ currency, total }) => (
        <span key={currency ?? "unknown"}>
          {currency ? `${formatVialMoney(total, currency)} ${["GBP", "EUR", "USD"].includes(currency) ? currency : ""}`.trim()
            : `Legacy: ${formatVialMoney(total, null)}`}
        </span>
      ))}
    </span>
  );
}
