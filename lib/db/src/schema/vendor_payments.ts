import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { vendorSubmissionsTable } from "./vendor_portal";
export type VendorWalletSnapshot = {
  id?: string;
  currency: string;
  network: string;
  address: string;
  label?: string | null;
};
export type VendorPaymentOrder = {
  submissionId: string;
  reference: string;
  amountUsd: string;
};
export const vendorWalletsTable = pgTable(
  "vendor_wallets",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id").notNull(),
    currency: text("currency").notNull(),
    network: text("network").notNull(),
    address: text("address").notNull(),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("vendor_wallets_vendor_idx").on(t.vendorId)],
);
export const vendorPaymentsTable = pgTable(
  "vendor_payments",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id").notNull(),
    walletId: text("wallet_id").notNull(),
    walletSnapshot: jsonb("wallet_snapshot")
      .$type<VendorWalletSnapshot>()
      .notNull(),
    txid: text("txid").notNull(),
    currency: text("currency").notNull(),
    network: text("network").notNull(),
    cryptoAmount: text("crypto_amount").notNull(),
    usdAmount: text("usd_amount").notNull(),
    orders: jsonb("orders").$type<VendorPaymentOrder[]>().notNull(),
    note: text("note"),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    recordedBy: text("recorded_by").notNull(),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: text("voided_by"),
    voidReason: text("void_reason"),
  },
  (t) => [
    index("vendor_payments_vendor_idx").on(t.vendorId),
    uniqueIndex("vendor_payments_active_chain_txid_unique")
      .on(
        sql`(CASE WHEN ${t.network} IN ('Ethereum', 'ERC-20') THEN 'Ethereum' ELSE ${t.network} END)`,
        t.txid,
      )
      .where(sql`${t.voidedAt} IS NULL`),
  ],
);
export const vendorPaymentAllocationsTable = pgTable(
  "vendor_payment_allocations",
  {
    submissionId: text("submission_id")
      .primaryKey()
      .references(() => vendorSubmissionsTable.id, { onDelete: "restrict" }),
    paymentId: text("payment_id")
      .notNull()
      .references(() => vendorPaymentsTable.id, { onDelete: "restrict" }),
    amountUsd: text("amount_usd").notNull(),
  },
  (t) => [index("vendor_payment_allocations_payment_idx").on(t.paymentId)],
);
