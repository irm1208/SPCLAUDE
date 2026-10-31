import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import { db, vendorWalletsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ensureVendorPaymentSchema } from "../vendor-payment-schema";
import { saveVendorWallets, getVendorWallets } from "../vendor-wallets";

describe.skipIf(process.env.VENDOR_PORTAL_DB_TESTS !== "1")(
  "vendor wallet ownership / rollback PostgreSQL",
  () => {
    it("saves multiple wallets only for their vendor, rejects foreign IDs and cannot remove the final wallet", async () => {
      const rollback = new Error("rollback wallet fixture");
      await db
        .transaction(async (tx) => {
          await ensureVendorPaymentSchema(tx);
          const vendorId = `wallet-fixture-${randomUUID()}`,
            other = `other-${randomUUID()}`;
          const raw = {
            wallets: [
              {
                currency: "USDT",
                network: "ERC-20",
                address: "0x" + "1".repeat(40),
              },
              {
                currency: "USDC",
                network: "Solana",
                address: "11111111111111111111111111111111",
              },
            ],
          };
          const saved = await saveVendorWallets(
            tx,
            vendorId,
            "fixture-vendor",
            raw,
          );
          expect(saved).toHaveLength(2);
          expect(await getVendorWallets(tx, vendorId)).toHaveLength(2);
          const foreignId = randomUUID();
          await tx
            .insert(vendorWalletsTable)
            .values({
              id: foreignId,
              vendorId: other,
              currency: "USDT",
              network: "ERC-20",
              address: "0x" + "2".repeat(40),
            });
          await expect(
            saveVendorWallets(tx, vendorId, "fixture-vendor", {
              wallets: [{ ...raw.wallets[0], id: foreignId }],
            }),
          ).rejects.toThrow(/does not belong/);
          expect(await getVendorWallets(tx, vendorId)).toHaveLength(2);
          await expect(
            saveVendorWallets(tx, vendorId, "fixture-vendor", { wallets: [] }),
          ).rejects.toThrow(/at least one/);
          const updated = await saveVendorWallets(
            tx,
            vendorId,
            "fixture-vendor",
            {
              wallets: [
                { ...raw.wallets[0], id: saved[0].id, label: "Primary" },
              ],
            },
          );
          expect(updated).toHaveLength(1);
          expect(updated[0].id).toBe(saved[0].id);
          expect(updated[0].label).toBe("Primary");
          expect(
            await tx
              .select()
              .from(vendorWalletsTable)
              .where(eq(vendorWalletsTable.vendorId, other)),
          ).toHaveLength(1);
          throw rollback;
        })
        .catch((error) => {
          if (error !== rollback) throw error;
        });
    }, 30000);
  },
);
