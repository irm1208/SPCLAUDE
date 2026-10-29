import { createHash } from "node:crypto";
import { db, siteConfigTable } from "@workspace/db";
import { like } from "drizzle-orm";
import type { Fs3CostMatch } from "@workspace/api-zod/fs3-costs";

const prefix = "fs3-cost-match:";
export function fs3MatchKey(vendorId: string | null, productName: string) {
  return prefix + createHash("sha256").update(JSON.stringify([vendorId, productName.trim().toLowerCase()])).digest("hex");
}
// Previously explicitly approved by the owner. Seed only legacy scope, never
// apply these approvals to a different supplier. Tombstones prevent resurrection.
const approved = [
  ["Na Semax 10mg", "Na Semax"], ["Na Selank 10mg", "Na Selank"], ["NA KPV 30mg", "KPV 30mg"],
];
export async function loadFs3CostMatches(tx: any = db): Promise<Fs3CostMatch[]> {
  await tx.insert(siteConfigTable).values(approved.map(([productName, costName]) => ({
    key: fs3MatchKey(null, productName),
    value: JSON.stringify({
      vendorId: null, productName, costName, reviewedBy: "Owner (prior approval)",
      reviewedAt: "2026-10-29T00:00:00.000Z",
      reviewNote: "Previously owner-approved FS3 equivalence", active: true,
    } satisfies Fs3CostMatch),
  }))).onConflictDoNothing();
  const rows = await tx.select().from(siteConfigTable).where(like(siteConfigTable.key, `${prefix}%`));
  return rows.map((r: { value: string }) => JSON.parse(r.value) as Fs3CostMatch);
}
