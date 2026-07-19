// ─── Sample data for the v2 organiser redesign ──────────────────────────────
// Representative data so we can iterate on layout/flow before wiring the live API.

export type GbStatus = "draft" | "active" | "closed" | "archived";

export interface SampleGB {
  id: string;
  name: string;
  status: GbStatus;
  currency: string;
  closeDate: string | null;
  members: number;
  maxMembers: number;
  activeOrders: number;
  revenue: number;
  pendingPayments: number;
  pendingLabs: number;
  openTickets: number;
}

export const SAMPLE_GBS: SampleGB[] = [
  {
    id: "gb_winter25",
    name: "Winter Peptide Run 2025",
    status: "active",
    currency: "GBP",
    closeDate: "2026-07-18T18:00:00Z", // 7 days from now
    members: 42,
    maxMembers: 60,
    activeOrders: 38,
    revenue: 8420,
    pendingPayments: 5,
    pendingLabs: 2,
    openTickets: 3,
  },
  {
    id: "gb_bulk_bpc",
    name: "BPC-157 Bulk Buy",
    status: "draft",
    currency: "GBP",
    closeDate: null,
    members: 0,
    maxMembers: 40,
    activeOrders: 0,
    revenue: 0,
    pendingPayments: 0,
    pendingLabs: 0,
    openTickets: 0,
  },
  {
    id: "gb_autumn",
    name: "Autumn Group Order",
    status: "closed",
    currency: "EUR",
    closeDate: "2026-06-15T18:00:00Z",
    members: 55,
    maxMembers: 55,
    activeOrders: 55,
    revenue: 12300,
    pendingPayments: 0,
    pendingLabs: 0,
    openTickets: 1,
  },
];

// Currency formatter matching the app's conventions.
export function fmtMoney(amount: number, currency: string): string {
  const symbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : currency === "USD" ? "$" : "";
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
