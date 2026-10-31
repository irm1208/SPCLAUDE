import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  db,
  vendorWalletsTable,
  vendorPaymentsTable,
  vendorPaymentAllocationsTable,
  vendorSubmissionsTable,
} from "@workspace/db";
import { VendorPortalError } from "./vendor-portal-model";
import {
  auditVendor,
  loadVendorSource,
  isVendorSubmissionStale,
} from "./vendor-portal-service";
import { centsToUsdString, usdToCents } from "./refund-money";
import {
  normalizeVendorCryptoAmount,
  normalizeVendorTxid,
  vendorPaymentChain,
} from "./vendor-wallet-input";
export function paymentOrderTotal(
  rows: Array<{ snapshot: { totalCost: string } }>,
) {
  try {
    const cents = rows.reduce(
      (sum, row) => sum + usdToCents(row.snapshot.totalCost),
      0n,
    );
    if (cents <= 0n) throw Error();
    return centsToUsdString(cents);
  } catch {
    throw new VendorPortalError(
      "Selected orders have an invalid USD total.",
      409,
    );
  }
}
export function paymentInput(body: any) {
  if (
    !body ||
    typeof body.vendorId !== "string" ||
    !body.vendorId.trim() ||
    typeof body.walletId !== "string" ||
    !body.walletId ||
    !Array.isArray(body.submissionIds) ||
    !body.submissionIds.length ||
    body.submissionIds.length > 200 ||
    body.submissionIds.some((id: any) => typeof id !== "string" || !id) ||
    new Set(body.submissionIds).size !== body.submissionIds.length
  )
    throw new VendorPortalError("Choose a vendor, wallet and distinct orders.");
  const snapshot = body.walletSnapshot;
  if (
    !snapshot ||
    ["currency", "network", "address"].some(
      (key) => typeof snapshot[key] !== "string" || !snapshot[key],
    )
  )
    throw new VendorPortalError(
      "Confirm the current wallet address and network.",
    );
  if (
    body.note !== undefined &&
    (typeof body.note !== "string" || body.note.length > 2000)
  )
    throw new VendorPortalError("Note must be 2000 characters or fewer.");
  const paidAt = body.paidAt === undefined ? null : new Date(body.paidAt);
  if (
    paidAt &&
    (typeof body.paidAt !== "string" ||
      !/^\d{4}-\d\d-\d\dT/.test(body.paidAt) ||
      !Number.isFinite(paidAt.getTime()))
  )
    throw new VendorPortalError("Enter a valid payment date.");
  return {
    vendorId: body.vendorId,
    walletId: body.walletId,
    walletSnapshot: {
      currency: snapshot.currency,
      network: snapshot.network,
      address: snapshot.address,
    },
    submissionIds: [...body.submissionIds].sort() as string[],
    txid: normalizeVendorTxid(body.txid, snapshot.currency, snapshot.network),
    cryptoAmount: normalizeVendorCryptoAmount(
      body.cryptoAmount,
      snapshot.currency,
      snapshot.network,
    ),
    paidAt,
    note: body.note?.trim() || null,
  };
}
export async function assertVendorSubmissionUnpaid(
  tx: any,
  submissionId: string,
) {
  const [paid] = await tx
    .select()
    .from(vendorPaymentAllocationsTable)
    .where(eq(vendorPaymentAllocationsTable.submissionId, submissionId));
  if (paid)
    throw new VendorPortalError(
      "Void the vendor payment before recalling this paid shipment.",
      409,
    );
}
export async function listVendorPayments(tx: any, vendorId: string) {
  return tx
    .select()
    .from(vendorPaymentsTable)
    .where(eq(vendorPaymentsTable.vendorId, vendorId))
    .orderBy(desc(vendorPaymentsTable.recordedAt));
}
export async function vendorPaymentDashboard(tx: any, vendorId: string) {
  const wallets = await tx
    .select()
    .from(vendorWalletsTable)
    .where(eq(vendorWalletsTable.vendorId, vendorId))
    .orderBy(asc(vendorWalletsTable.createdAt));
  const rows = await tx
    .select()
    .from(vendorSubmissionsTable)
    .where(eq(vendorSubmissionsTable.vendorId, vendorId))
    .orderBy(desc(vendorSubmissionsTable.submittedAt));
  const allocations = rows.length
    ? await tx
        .select()
        .from(vendorPaymentAllocationsTable)
        .where(
          inArray(
            vendorPaymentAllocationsTable.submissionId,
            rows.map((r: any) => r.id),
          ),
        )
    : [];
  const orders = [];
  for (const row of rows)
    orders.push({
      id: row.id,
      reference: row.reference,
      status: row.status,
      stale: await isVendorSubmissionStale(tx, row),
      totalCost: row.snapshot.totalCost,
      currency: "USD",
      paymentId:
        allocations.find((a: any) => a.submissionId === row.id)?.paymentId ??
        null,
    });
  return {
    vendorId,
    wallets,
    orders,
    payments: await listVendorPayments(tx, vendorId),
  };
}
function samePayment(existing: any, input: ReturnType<typeof paymentInput>) {
  return (
    existing.vendorId === input.vendorId &&
    existing.walletId === input.walletId &&
    existing.cryptoAmount === input.cryptoAmount &&
    existing.currency === input.walletSnapshot.currency &&
    existing.network === input.walletSnapshot.network &&
    existing.walletSnapshot.address === input.walletSnapshot.address &&
    existing.note === input.note &&
    (!input.paidAt || existing.paidAt.getTime() === input.paidAt.getTime()) &&
    JSON.stringify(existing.orders.map((o: any) => o.submissionId).sort()) ===
      JSON.stringify(input.submissionIds)
  );
}
export async function recordVendorPayment(
  body: any,
  actor: string,
  database: any = db,
) {
  const input = paymentInput(body);
  const chain = vendorPaymentChain(
    input.walletSnapshot.currency,
    input.walletSnapshot.network,
  );
  try {
    return await database.transaction(async (tx: any) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`vendor-payments:${input.vendorId}`}))`,
      );
      // A separate network/transaction lock makes duplicate TXIDs deterministic across vendors.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`vendor-payment-tx:${chain}:${input.txid}`}))`,
      );
      const [existing] = await tx
        .select()
        .from(vendorPaymentsTable)
        .where(
          and(
            sql`(CASE WHEN ${vendorPaymentsTable.network} IN ('Ethereum', 'ERC-20') THEN 'Ethereum' ELSE ${vendorPaymentsTable.network} END) = ${chain}`,
            eq(vendorPaymentsTable.txid, input.txid),
            isNull(vendorPaymentsTable.voidedAt),
          ),
        );
      if (existing) {
        if (samePayment(existing, input)) return existing;
        throw new VendorPortalError(
          "That transaction is already recorded with different payment details.",
          409,
        );
      }
      const [wallet] = await tx
        .select()
        .from(vendorWalletsTable)
        .where(
          and(
            eq(vendorWalletsTable.id, input.walletId),
            eq(vendorWalletsTable.vendorId, input.vendorId),
          ),
        );
      if (!wallet)
        throw new VendorPortalError("Wallet not found for this vendor.", 409);
      if (
        ["currency", "network", "address"].some(
          (k) =>
            wallet[k] !==
            input.walletSnapshot[k as keyof typeof input.walletSnapshot],
        )
      )
        throw new VendorPortalError(
          "The wallet changed. Review its address and network before recording payment.",
          409,
        );
      const initial = await tx
        .select()
        .from(vendorSubmissionsTable)
        .where(inArray(vendorSubmissionsTable.id, input.submissionIds))
        .orderBy(asc(vendorSubmissionsTable.sourceKey));
      if (
        initial.length !== input.submissionIds.length ||
        initial.some((r: any) => r.vendorId !== input.vendorId)
      )
        throw new VendorPortalError(
          "Selected orders must all belong to this vendor.",
          409,
        );
      // Parent/member orders must be locked before submission rows, matching fulfillment mutations.
      const sources = new Map<string, any>();
      for (const row of initial)
        if (!sources.has(row.sourceKey))
          sources.set(
            row.sourceKey,
            await loadVendorSource(tx, row.sourceKey, true),
          );
      const rows = await tx
        .select()
        .from(vendorSubmissionsTable)
        .where(inArray(vendorSubmissionsTable.id, input.submissionIds))
        .orderBy(asc(vendorSubmissionsTable.id))
        .for("update");
      if (rows.length !== initial.length)
        throw new VendorPortalError(
          "Selected orders changed. Refresh and retry.",
          409,
        );
      for (const row of rows) {
        const source = sources.get(row.sourceKey);
        if (
          row.vendorId !== input.vendorId ||
          !source ||
          source.fingerprint !== row.sourceFingerprint ||
          source.vendorIds.length !== 1 ||
          source.vendorIds[0] !== input.vendorId
        )
          throw new VendorPortalError(
            "Order changed after submission. Review its vendor assignment before paying.",
            409,
          );
        await assertVendorSubmissionUnpaid(tx, row.id);
      }
      const usdAmount = paymentOrderTotal(rows);
      const orders = rows.map((r: any) => ({
        submissionId: r.id,
        reference: r.reference,
        amountUsd: centsToUsdString(usdToCents(r.snapshot.totalCost)),
      }));
      const [payment] = await tx
        .insert(vendorPaymentsTable)
        .values({
          id: randomUUID(),
          vendorId: input.vendorId,
          walletId: wallet.id,
          walletSnapshot: {
            id: wallet.id,
            currency: wallet.currency,
            network: wallet.network,
            address: wallet.address,
            label: wallet.label,
          },
          txid: input.txid,
          currency: wallet.currency,
          network: wallet.network,
          cryptoAmount: input.cryptoAmount,
          usdAmount,
          orders,
          note: input.note,
          paidAt: input.paidAt ?? new Date(),
          recordedBy: actor,
        })
        .returning();
      await tx
        .insert(vendorPaymentAllocationsTable)
        .values(
          orders.map((o: any) => ({
            submissionId: o.submissionId,
            paymentId: payment.id,
            amountUsd: o.amountUsd,
          })),
        );
      await auditVendor(tx, actor, "payment_recorded", null, {
        paymentId: payment.id,
        vendorId: input.vendorId,
        submissionIds: input.submissionIds,
        txid: input.txid,
        usdAmount: payment.usdAmount,
      });
      return payment;
    });
  } catch (error) {
    if ((error as any)?.name === "RefundMutationBlockedError")
      throw new VendorPortalError(
        "An order has an active refund. Review it before paying.",
        409,
      );
    if (
      (error as any)?.code === "23505" ||
      (error as any)?.cause?.code === "23505"
    )
      throw new VendorPortalError(
        "This transaction or an order was already paid. Refresh and retry.",
        409,
      );
    throw error;
  }
}
export async function voidVendorPayment(
  id: string,
  reason: unknown,
  actor: string,
  database: any = db,
) {
  if (typeof reason !== "string" || !reason.trim() || reason.length > 2000)
    throw new VendorPortalError(
      "Enter a reason for voiding this payment (2000 characters or fewer).",
    );
  return database.transaction(async (tx: any) => {
    const [initial] = await tx
      .select()
      .from(vendorPaymentsTable)
      .where(eq(vendorPaymentsTable.id, id));
    if (!initial) throw new VendorPortalError("Payment not found.", 404);
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`vendor-payments:${initial.vendorId}`}))`,
    );
    const [payment] = await tx
      .select()
      .from(vendorPaymentsTable)
      .where(eq(vendorPaymentsTable.id, id))
      .for("update");
    if (payment.voidedAt) return payment;
    await tx
      .delete(vendorPaymentAllocationsTable)
      .where(eq(vendorPaymentAllocationsTable.paymentId, id));
    const [receipt] = await tx
      .update(vendorPaymentsTable)
      .set({ voidedAt: new Date(), voidedBy: actor, voidReason: reason.trim() })
      .where(eq(vendorPaymentsTable.id, id))
      .returning();
    await auditVendor(tx, actor, "payment_voided", null, {
      paymentId: id,
      vendorId: payment.vendorId,
      reason: reason.trim(),
    });
    return receipt;
  });
}
