import { randomUUID } from "node:crypto";
import { asc, eq, sql } from "drizzle-orm";
import { vendorWalletsTable } from "@workspace/db";
import { auditVendor } from "./vendor-portal-service";
import { VendorPortalError } from "./vendor-portal-model";
import { vendorWalletsInput } from "./vendor-wallet-input";

type Executor = any;
export async function getVendorWallets(database: Executor, vendorId: string) {
  return database
    .select()
    .from(vendorWalletsTable)
    .where(eq(vendorWalletsTable.vendorId, vendorId))
    .orderBy(asc(vendorWalletsTable.createdAt), asc(vendorWalletsTable.id));
}
export async function saveVendorWallets(
  tx: Executor,
  vendorId: string,
  actor: string,
  body: unknown,
) {
  const input = vendorWalletsInput(body);
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${`vendor-payments:${vendorId}`}))`,
  );
  const existing: any[] = await tx
    .select()
    .from(vendorWalletsTable)
    .where(eq(vendorWalletsTable.vendorId, vendorId))
    .for("update");
  const owned = new Map(existing.map((wallet) => [wallet.id, wallet]));
  if (input.some((wallet) => wallet.id && !owned.has(wallet.id)))
    throw new VendorPortalError(
      "A wallet changed or does not belong to your vendor. Refresh and try again.",
      409,
    );
  const now = new Date();
  const rows = input.map((wallet) => ({
    ...wallet,
    id: wallet.id ?? randomUUID(),
    vendorId,
    createdAt: wallet.id ? owned.get(wallet.id).createdAt : now,
    updatedAt: now,
  }));
  // Payment receipts retain their original destination snapshot independently.
  await tx
    .delete(vendorWalletsTable)
    .where(eq(vendorWalletsTable.vendorId, vendorId));
  await tx.insert(vendorWalletsTable).values(rows);
  const snapshot = (wallet: any) => ({
    id: wallet.id,
    currency: wallet.currency,
    network: wallet.network,
    address: wallet.address,
    label: wallet.label,
  });
  await auditVendor(tx, actor, "wallets_updated", null, {
    vendorId,
    walletCount: rows.length,
    before: existing.map(snapshot),
    after: rows.map(snapshot),
  });
  return rows;
}
