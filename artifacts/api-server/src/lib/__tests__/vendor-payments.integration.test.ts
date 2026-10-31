import { randomUUID } from "node:crypto";
import { describe, it, expect, vi } from "vitest";
import { eq } from "drizzle-orm";
vi.mock("../vendor-portal-service", () => ({
  auditVendor: vi.fn(async () => {}),
  loadVendorSource: vi.fn(async () => ({
    fingerprint: "fixture",
    vendorIds: ["fixture-vendor"],
  })),
  isVendorSubmissionStale: vi.fn(async () => false),
}));
describe.skipIf(process.env.VENDOR_PORTAL_DB_TESTS !== "1")(
  "vendor payment ledger / rollback PostgreSQL",
  () => {
    it("records exact totals once, preserves snapshots, rejects cross-vendor orders, voids allocations without changing source orders", async () => {
      const store = await import("@workspace/db");
      const { ensureVendorPaymentSchema } =
        await import("../vendor-payment-schema");
      const {
        recordVendorPayment,
        voidVendorPayment,
        assertVendorSubmissionUnpaid,
      } = await import("../vendor-payments");
      const rollback = new Error("rollback fixture");
      await store.db
        .transaction(async (tx: any) => {
          await ensureVendorPaymentSchema(tx);
          const walletId = randomUUID(),
            one = randomUUID(),
            two = randomUUID(),
            foreign = randomUUID();
          const snapshot = {
            items: [],
            shipping: {
              name: "Fixture",
              address: "Fixture",
              country: "UK",
              phone: "1",
              email: "",
            },
            currency: "USD" as const,
            productCost: "0.10",
            shippingCost: "0.00",
            totalCost: "0.10",
          };
          await tx
            .insert(store.vendorWalletsTable)
            .values({
              id: walletId,
              vendorId: "fixture-vendor",
              currency: "USDC",
              network: "ERC-20",
              address: "0x1111111111111111111111111111111111111111",
            });
          await tx
            .insert(store.vendorSubmissionsTable)
            .values(
              [one, two, foreign].map((id, index) => ({
                id,
                sourceKey: `fixture:${id}`,
                vendorId: index === 2 ? "foreign" : "fixture-vendor",
                reference: id,
                orderIds: [],
                snapshot: {
                  ...snapshot,
                  totalCost: index === 1 ? "0.20" : "0.10",
                },
                sourceFingerprint: "fixture",
                submittedBy: "fixture",
              })),
            );
          const body = {
            vendorId: "fixture-vendor",
            walletId,
            walletSnapshot: {
              currency: "USDC",
              network: "ERC-20",
              address: "0x1111111111111111111111111111111111111111",
            },
            submissionIds: [one, two],
            txid: `0x${randomUUID().replaceAll("-", "").padEnd(64, "a")}`,
            cryptoAmount: "0.3",
          };
          const database = { transaction: (run: any) => run(tx) };
          await expect(
            recordVendorPayment(
              { ...body, submissionIds: [foreign] },
              "fixture",
              database,
            ),
          ).rejects.toThrow("belong");
          await expect(
            recordVendorPayment(
              {
                ...body,
                walletSnapshot: {
                  ...body.walletSnapshot,
                  address: "0x2222222222222222222222222222222222222222",
                },
              },
              "fixture",
              database,
            ),
          ).rejects.toThrow("wallet changed");
          const { loadVendorSource } = await import("../vendor-portal-service");
          vi.mocked(loadVendorSource).mockResolvedValueOnce({
            fingerprint: "changed",
            vendorIds: ["fixture-vendor"],
          } as any);
          await expect(
            recordVendorPayment(body, "fixture", database),
          ).rejects.toThrow("Order changed");
          vi.mocked(loadVendorSource).mockRejectedValueOnce(
            Object.assign(new Error("refund"), {
              name: "RefundMutationBlockedError",
            }),
          );
          await expect(
            recordVendorPayment(body, "fixture", database),
          ).rejects.toThrow("active refund");
          const payment = await recordVendorPayment(body, "fixture", database);
          expect(payment.usdAmount).toBe("0.30");
          // The database independently rejects the alias, even if a writer bypasses the service.
          await expect(
            tx.transaction(async (savepoint: any) => {
              await savepoint
                .insert(store.vendorPaymentsTable)
                .values({
                  ...payment,
                  id: randomUUID(),
                  vendorId: "foreign",
                  network: "Ethereum",
                  currency: "ETH",
                });
            }),
          ).rejects.toThrow();
          // A single Ethereum transaction cannot pay a second vendor under the native-asset network label.
          await expect(
            recordVendorPayment(
              {
                ...body,
                vendorId: "foreign",
                submissionIds: [foreign],
                walletSnapshot: {
                  ...body.walletSnapshot,
                  currency: "ETH",
                  network: "Ethereum",
                },
              },
              "fixture",
              database,
            ),
          ).rejects.toThrow("already recorded with different payment details");
          expect(
            (await recordVendorPayment(body, "fixture", database)).id,
          ).toBe(payment.id);
          await expect(
            recordVendorPayment(
              { ...body, cryptoAmount: "0.4" },
              "fixture",
              database,
            ),
          ).rejects.toThrow("different");
          await expect(
            recordVendorPayment(
              { ...body, txid: `0x${"b".repeat(64)}` },
              "fixture",
              database,
            ),
          ).rejects.toThrow("Void");
          await expect(assertVendorSubmissionUnpaid(tx, one)).rejects.toThrow(
            "Void",
          );
          await tx
            .update(store.vendorWalletsTable)
            .set({ address: "0x2222222222222222222222222222222222222222" })
            .where(eq(store.vendorWalletsTable.id, walletId));
          expect(
            (
              await tx
                .select()
                .from(store.vendorPaymentsTable)
                .where(eq(store.vendorPaymentsTable.id, payment.id))
            )[0].walletSnapshot.address,
          ).toBe(body.walletSnapshot.address);
          const voided = await voidVendorPayment(
            payment.id,
            "Fixture correction",
            "fixture",
            database,
          );
          expect(voided.orders).toHaveLength(2);
          expect(voided.voidedBy).toBe("fixture");
          await assertVendorSubmissionUnpaid(tx, one);
          expect(
            await tx
              .select()
              .from(store.vendorPaymentAllocationsTable)
              .where(
                eq(store.vendorPaymentAllocationsTable.paymentId, payment.id),
              ),
          ).toEqual([]);
          const submissions = await tx
            .select()
            .from(store.vendorSubmissionsTable)
            .where(eq(store.vendorSubmissionsTable.id, one));
          expect(submissions[0].status).toBe("Submitted");
          expect(submissions[0].snapshot).toEqual(snapshot);
          throw rollback;
        })
        .catch((error) => {
          if (error !== rollback) throw error;
        });
    }, 30000);
  },
);
