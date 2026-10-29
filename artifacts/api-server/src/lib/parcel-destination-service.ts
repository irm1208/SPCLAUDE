import { db, gbReshippersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { parcelDestination } from "./member-gb-parcels";

export async function validateParcelDestination(gbId: string, value: unknown) {
  if (value === undefined) return undefined;
  const assignments = await db.select({ username: gbReshippersTable.reshipperUsername })
    .from(gbReshippersTable).where(eq(gbReshippersTable.gbId, gbId));
  // Disabled assignments remain valid historical destinations.
  return parcelDestination(value, assignments.map(row => row.username));
}
