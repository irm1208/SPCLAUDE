import { sql } from "drizzle-orm";
import { ordersTable } from "@workspace/db/schema";

/** Keep the flag and fulfilment status in one atomic UPDATE. */
export function qrPostedOrderUpdate(posted: boolean) {
  return {
    qrPosted: posted,
    // Evaluate the current status in the write itself so a concurrent completion
    // or cancellation cannot be overwritten by a stale read.
    ...(posted ? {
      status: sql`case when ${ordersTable.status} in (${"Submitted"}, ${"Processing"}) then ${"Shipped"} else ${ordersTable.status} end`,
    } : {}),
  };
}
