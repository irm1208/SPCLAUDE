import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";

export type LogType = "error" | "login" | "order" | "change" | "seller" | "payment";
export type LogLevel = "info" | "warn" | "error";

export async function writeLog(
  type: LogType,
  level: LogLevel,
  action: string,
  message: string,
  metadata?: Record<string, unknown>,
  ip?: string,
): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({ type, level, action, message, metadata: metadata ?? null, ip: ip ?? null });
  } catch {
    console.error("[audit-log] Failed to write log:", { type, action, message });
  }
}
