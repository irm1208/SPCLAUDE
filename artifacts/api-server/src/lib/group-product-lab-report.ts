import { db, labTestsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type Result = { ok: true; id: number | null | undefined } | { ok: false; error: string };
export async function validateGroupProductLabReport(value: unknown, database: Pick<typeof db, "select"> = db): Promise<Result> {
  if (value === undefined || value === null) return { ok: true, id: value };
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0 || value > 2147483647) {
    return { ok: false, error: "Choose a valid lab report or Automatic matching." };
  }
  const [report] = await database.select({ id: labTestsTable.id }).from(labTestsTable).where(eq(labTestsTable.id, value)).limit(1);
  return report ? { ok: true, id: value } : { ok: false, error: "This lab report no longer exists. Please choose another report." };
}
