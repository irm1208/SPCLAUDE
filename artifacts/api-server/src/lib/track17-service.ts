import { db, siteConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createTrack17Client } from "./track17-client";

export async function getTrack17Key(): Promise<string | null> {
  try {
    const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "track17ApiKey"));
    return row?.value || process.env.TRACK17_API_KEY || null;
  } catch {
    return process.env.TRACK17_API_KEY || null;
  }
}

export const track17Client = createTrack17Client({ getApiKey: getTrack17Key });