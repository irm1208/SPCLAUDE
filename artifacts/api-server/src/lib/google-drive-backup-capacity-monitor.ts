import { pool } from "@workspace/db";
import { createDriveRetentionStore, getDriveBackupStorageQuota } from "./google-drive-backup-retention-store";
import { assessBackupCapacity, deliverCapacityNotice, unknownBackupCapacity, type CapacityNoticeState } from "./google-drive-backup-capacity";
import { sendAdminMessage } from "./telegram";

const STATE_KEY = "databaseBackupDriveCapacityNotice";
// The legacy archive can contain tens of thousands of multipart objects even
// inside the rolling window. Four day inventories run concurrently, bounded.
const CHECK_BUDGET_MS = 90_000;

function readState(value: unknown): CapacityNoticeState | null {
  if (typeof value !== "string") return null;
  try {
    const state = JSON.parse(value) as CapacityNoticeState;
    if (!["healthy", "low", "upload_blocked", "unknown"].includes(state.status) ||
        typeof state.noticeId !== "string" || !state.noticeId ||
        typeof state.adminDelivered !== "boolean" || typeof state.telegramDelivered !== "boolean") return null;
    return state;
  } catch { return null; }
}

/**
 * Called inside the backup advisory lock (including recovery), never at startup.
 * Monitoring is read-only in Drive and cannot prevent a backup attempt.
 */
export async function checkDriveBackupCapacity(): Promise<void> {
  try {
    const options = { deadline: Date.now() + CHECK_BUDGET_MS, requestTimeoutMs: 15_000 };
    let assessment = unknownBackupCapacity();
    try {
      const quota = await getDriveBackupStorageQuota(options);
      const store = await createDriveRetentionStore(undefined, undefined, { ...options, capacityInventory: true });
      assessment = assessBackupCapacity(await store.list(), store.folderId, quota);
    } catch {
      // Do not leak provider bodies, object names, IDs, tokens or upload URLs.
    }
    const result = await pool.query<{ value: string | null }>("SELECT value FROM site_config WHERE key = $1", [STATE_KEY]);
    await deliverCapacityNotice(assessment, readState(result.rows[0]?.value), {
      save: async state => {
        await pool.query(
          "INSERT INTO site_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()",
          [STATE_KEY, JSON.stringify(state)],
        );
      },
      admin: async (notice, noticeId) => {
        // Same episode identity survives a crash after insert but before delivery
        // acknowledgement. The shared backup lock serializes this existence check.
        await pool.query(
          `INSERT INTO admin_alerts (type, priority, title, message, related_entity_id)
           SELECT 'system', $1, $2, $3, $4
           WHERE NOT EXISTS (SELECT 1 FROM admin_alerts WHERE related_entity_id = $4)`,
          [notice.status === "healthy" ? "low" : "high", notice.title, notice.message, `backup-capacity:${noticeId}`],
        );
      },
      telegram: sendAdminMessage,
    });
  } catch {
    console.warn("[db-backup] Capacity monitoring could not persist or deliver its state; will retry");
  }
}
