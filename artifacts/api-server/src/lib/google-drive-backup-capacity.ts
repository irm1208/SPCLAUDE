import { randomUUID } from "node:crypto";
import type { DriveBackupFile } from "./google-drive-backup";
import { BACKUP_HOUR_MS, BACKUP_RETENTION_MS, backupCaptureTime, hasVerifiedBackupReceipt, inBackupFolder } from "./google-drive-backup-policy";

export type CapacityStatus = "healthy" | "low" | "upload_blocked" | "unknown";
export interface CapacityAssessment {
  status: CapacityStatus;
  title: string;
  message: string;
  sampleBytes?: bigint;
  requiredFreeBytes?: bigint;
  freeBytes?: bigint;
}

export function unknownBackupCapacity(): CapacityAssessment {
  return {
    status: "unknown",
    title: "Google Drive backup capacity cannot be checked",
    message: "Drive quota or verified SQL size data is unavailable. Capacity for 72 hourly backups plus the next verified upload cannot be confirmed. Check the Drive connection, storage quota and verified backups. Backups and the 72-hour retention policy are unchanged.",
  };
}

function bytes(value: unknown): bigint | null {
  return typeof value === "string" && /^\d+$/.test(value) ? BigInt(value) : null;
}
function gb(value: bigint): string {
  // Round up to hundredths of decimal GB without losing integer precision.
  const hundredths = (value + 9_999_999n) / 10_000_000n;
  return `${hundredths / 100n}.${String(hundredths % 100n).padStart(2, "0")} GB`;
}

/** Read-only projection. Never assumes that expired/unverified files will be deleted. */
export function assessBackupCapacity(
  files: DriveBackupFile[], folderId: string, quota: unknown, now = Date.now(),
): CapacityAssessment {
  const raw = quota as { limit?: unknown; usage?: unknown } | null;
  const limit = bytes(raw?.limit), usage = bytes(raw?.usage);
  // A missing limit can mean unlimited storage, not a measurable capacity guarantee.
  if (limit === null || usage === null) return unknownBackupCapacity();
  const verified = files.filter(file => inBackupFolder(file, folderId) && hasVerifiedBackupReceipt(file) &&
    backupCaptureTime(file.name)! <= now);
  if (!verified.length) return unknownBackupCapacity();
  const recent = verified.filter(file => backupCaptureTime(file.name)! >= now - BACKUP_RETENTION_MS);
  const latest = [...verified].sort((a, b) => backupCaptureTime(b.name)! - backupCaptureTime(a.name)!)[0]!;
  const samples = recent.length ? recent : [latest];
  const sampleBytes = samples.reduce((max, file) => BigInt(file.size!) > max ? BigInt(file.size!) : max, 0n);
  const copies = BigInt(BACKUP_RETENTION_MS / BACKUP_HOUR_MS);
  const hours = new Set(recent.map(file => Math.floor(backupCaptureTime(file.name)! / BACKUP_HOUR_MS)));
  const retainedBytes = recent.reduce((sum, file) => sum + BigInt(file.size!), 0n);
  const footprintDeficit = copies * sampleBytes - retainedBytes;
  const missingHours = (copies > BigInt(hours.size) ? copies - BigInt(hours.size) : 0n) * sampleBytes;
  const requiredFreeBytes = (footprintDeficit > missingHours ? footprintDeficit : missingHours) + sampleBytes;
  const freeBytes = limit > usage ? limit - usage : 0n;
  const status = freeBytes < sampleBytes ? "upload_blocked" : freeBytes < requiredFreeBytes ? "low" : "healthy";
  const title = status === "healthy" ? "Google Drive backup capacity restored"
    : status === "upload_blocked" ? "Google Drive may not fit the next backup" : "Google Drive backup space is low";
  const message = `${status === "healthy" ? "Capacity is sufficient again." : "More Drive storage is needed."} ` +
    `Free: ${gb(freeBytes)}. Required free space for 72 hourly backups plus one verified upload: ${gb(requiredFreeBytes)}. ` +
    `Measured SQL size (largest recent verified copy): ${gb(sampleBytes)}. ` +
    `${status === "healthy" ? "" : "Increase available Drive storage or review unrelated storage usage. "}` +
    "No extra backups were removed; the 72-hour retention policy is unchanged.";
  return { status, title, message, sampleBytes, requiredFreeBytes, freeBytes };
}

export interface CapacityNoticeState {
  status: CapacityStatus;
  noticeId: string;
  adminDelivered: boolean;
  telegramDelivered: boolean;
}
export interface CapacityNoticeDependencies {
  save: (state: CapacityNoticeState) => Promise<void>;
  admin: (assessment: CapacityAssessment, noticeId: string) => Promise<void>;
  telegram: (message: string) => Promise<boolean>;
}

/** Caller holds the shared backup advisory lock; state survives process restarts. */
export async function deliverCapacityNotice(
  assessment: CapacityAssessment, previous: CapacityNoticeState | null, deps: CapacityNoticeDependencies,
): Promise<void> {
  const state: CapacityNoticeState = previous?.status === assessment.status ? { ...previous } : {
    status: assessment.status, noticeId: randomUUID(),
    adminDelivered: !previous && assessment.status === "healthy",
    telegramDelivered: !previous && assessment.status === "healthy",
  };
  // Persist episode identity BEFORE delivery. Failed channels remain pending.
  await deps.save(state);
  if (!state.adminDelivered) {
    try {
      await deps.admin(assessment, state.noticeId);
      state.adminDelivered = true;
      await deps.save(state);
    } catch { /* Retry only this channel on the next capacity check. */ }
  }
  if (!state.telegramDelivered) {
    try {
      if (await deps.telegram(`${assessment.title}\n${assessment.message}`)) {
        state.telegramDelivered = true;
        await deps.save(state);
      }
    } catch { /* An unavailable Telegram channel must not suppress Admin alerts. */ }
  }
}
