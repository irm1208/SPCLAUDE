/**
 * Read-only retention inventory. Never uploads, stamps receipts, or deletes.
 * Run: pnpm exec tsx --env-file=../../.env scripts/preview-db-backup-retention.ts
 */
import { backupCaptureTime, hasVerifiedBackupReceipt, inBackupFolder } from "../src/lib/google-drive-backup-policy";
import { createDriveRetentionStore } from "../src/lib/google-drive-backup-retention-store";
import { planBackupRetention } from "../src/lib/google-drive-backup-retention";

async function main() {
  const store = await createDriveRetentionStore();
  const files = await store.list();
  const sqlFiles = files.filter(f => inBackupFolder(f, store.folderId) && f.name.endsWith(".SQL") &&
    backupCaptureTime(f.name) !== null && f.md5Checksum && Number(f.size) > 0);
  sqlFiles.sort((a, b) => backupCaptureTime(b.name)! - backupCaptureTime(a.name)!);
  const anchor = sqlFiles.find(hasVerifiedBackupReceipt) ?? sqlFiles[0];
  if (!anchor) throw new Error("No single-file SQL backup available for a prospective inventory");
  const plan = await planBackupRetention(store, anchor);
  const generations = plan.generations.map(g => {
    const members = [...g.parts, ...g.segments, g.root];
    return { backup: g.root.name, files: members.length, bytes: members.reduce((sum, f) => sum + Number(f.size), 0) };
  });
  console.log(JSON.stringify({
    mode: "READ_ONLY", requiresNewVerifiedUploadBeforeDeletion: true,
    prospectiveAnchor: anchor.name, anchorHasReceipt: hasVerifiedBackupReceipt(anchor),
    inventoryFiles: files.length, retentionHours: 72,
    cutoffUtc: new Date(plan.cutoff).toISOString(), legacySafetyBlocked: plan.skippedLegacy,
    expiredGenerations: generations.length,
    candidateFiles: generations.reduce((sum, g) => sum + g.files, 0),
    candidateBytes: generations.reduce((sum, g) => sum + g.bytes, 0),
    generations,
  }, null, 2));
}
main().catch(error => {
  const message = error instanceof Error && /^(Backup folder|Incomplete backup|Repeated backup|Verified backup|No single|Invalid backup|Drive backup retention)/.test(error.message)
    ? error.message : "Drive inventory transport or parsing error";
  console.error(`Read-only retention inventory failed: ${message}; no backups changed`);
  process.exitCode = 1;
});
