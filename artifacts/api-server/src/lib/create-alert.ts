import { db } from "@workspace/db";
import { adminAlertsTable } from "@workspace/db";

export type AlertType = "order" | "customer" | "seller" | "stock" | "system";
export type AlertPriority = "high" | "medium" | "low";

export async function createAlert(
  type: AlertType,
  priority: AlertPriority,
  title: string,
  message: string,
  options?: { linkUrl?: string; relatedEntityId?: string },
): Promise<void> {
  try {
    await db.insert(adminAlertsTable).values({
      type,
      priority,
      title,
      message,
      linkUrl: options?.linkUrl ?? null,
      relatedEntityId: options?.relatedEntityId ?? null,
    });
  } catch {
    console.error("[create-alert] Failed to create alert:", { type, title });
  }
}
