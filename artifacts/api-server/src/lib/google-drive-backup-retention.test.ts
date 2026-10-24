import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import type { DriveBackupFile } from "./google-drive-backup";
import { backupCaptureTime, hasVerifiedBackupReceipt, hasBackupInCurrentHour, verificationProperties } from "./google-drive-backup-policy";
import { planBackupRetention, executeBackupRetention, type RetentionStore } from "./google-drive-backup-retention";

const now = Date.parse("2026-10-24T13:30:00Z");
const folder = "backups";
const name = (date: string) => `S&PBACKUP-${date.replace("T", "_").replaceAll(":", "-").replace("Z", "")}.SQL`;
function file(id: string, date: string): DriveBackupFile {
  return { id, name: name(date), size: "100", md5Checksum: "a".repeat(32), parents: [folder], trashed: false };
}
const anchor = file("new", "2026-10-24T13:10:00Z");
anchor.appProperties = verificationProperties(anchor, now);
function fixture(extra: DriveBackupFile[] = []) {
  const files = new Map([anchor, ...extra].map(f => [f.id, structuredClone(f)]));
  const content = new Map<string, Buffer>();
  const store: RetentionStore = {
    folderId: folder,
    list: vi.fn(async () => [...files.values()].map(f => structuredClone(f))),
    get: vi.fn(async id => structuredClone(files.get(id) ?? null)),
    read: vi.fn(async f => content.get(f.id)!),
    remove: vi.fn(async id => { files.delete(id); }),
    markDeleting: vi.fn(async id => { files.get(id)!.appProperties = { spRetentionDeleting: "1" }; }),
  };
  return { store, files, content };
}
function legacy(ctx: ReturnType<typeof fixture>, id: string, date = "2026-10-20T00:00:00Z", segmented = false) {
  const sqlName = name(date);
  const part = { index: 1, name: `${sqlName}.part-000001.gz`, fileId: `${id}-part`, sqlSize: 3, sqlSha256: "b".repeat(64), compressedSize: 23, compressedMd5: "c".repeat(32) };
  ctx.files.set(part.fileId, { id: part.fileId, name: part.name, size: "23", md5Checksum: part.compressedMd5, parents: [folder] });
  const common = { format: "salt-peps-sql-parts", sqlFileName: sqlName, originalSize: 3, originalSha256: "b".repeat(64) };
  let root: object = { version: 1, ...common, parts: [part] };
  if (segmented) {
    const segment = Buffer.from(JSON.stringify({ version: 1, format: "salt-peps-sql-manifest-segment", sqlFileName: sqlName, index: 1, parts: [part] }));
    const seg = { id: `${id}-segment`, name: `${sqlName}.manifest-segment-000001.json`, size: String(segment.length), md5Checksum: createHash("md5").update(segment).digest("hex"), parents: [folder] };
    ctx.files.set(seg.id, seg); ctx.content.set(seg.id, segment);
    root = { version: 2, ...common, segments: [{ index: 1, name: seg.name, fileId: seg.id, size: segment.length, sha256: createHash("sha256").update(segment).digest("hex"), firstPartIndex: 1, partCount: 1 }] };
  }
  const bytes = Buffer.from(JSON.stringify(root));
  const meta = { id, name: `${sqlName}.manifest.json`, size: String(bytes.length), md5Checksum: createHash("md5").update(bytes).digest("hex"), parents: [folder] };
  ctx.files.set(id, meta); ctx.content.set(id, bytes);
  return { meta, part };
}

describe("backup capture and durable verification policy", () => {
  it("uses strict UTC capture timestamps, not modifiedTime", () => {
    expect(backupCaptureTime(anchor.name)).toBe(Date.parse("2026-10-24T13:10:00Z"));
    expect(backupCaptureTime("S&PBACKUP-2026-02-30_13-00-00.SQL")).toBeNull();
    expect(backupCaptureTime("other.SQL")).toBeNull();
  });
  it("deduplicates the hourly window using only matching verified receipts", () => {
    expect(hasBackupInCurrentHour([anchor], folder, now)).toBe(true);
    expect(hasBackupInCurrentHour([{ ...anchor, appProperties: {} }], folder, now)).toBe(false);
    expect(hasBackupInCurrentHour([{ ...anchor, size: "99" }], folder, now)).toBe(false);
    expect(hasBackupInCurrentHour([{ ...anchor, parents: ["foreign"] }], folder, now)).toBe(false);
    expect(hasBackupInCurrentHour([anchor], folder, now + 60 * 60 * 1000)).toBe(false);
    expect(hasVerifiedBackupReceipt({ ...anchor, trashed: true })).toBe(false);
  });
});
describe("three-day Drive retention", () => {
  it("keeps the exact 72-hour boundary and ignores metadata modification dates", async () => {
    const expired = { ...file("old", "2026-10-21T13:29:59Z"), modifiedTime: new Date(now).toISOString() };
    const { store } = fixture([expired, file("boundary", "2026-10-21T13:30:00Z"), file("recent", "2026-10-22T00:00:00Z")]);
    const plan = await planBackupRetention(store, anchor, now);
    expect(plan.generations.map(g => g.root.id)).toEqual(["old"]);
    expect(store.remove).not.toHaveBeenCalled();
  });
  it("always protects the triggering verified copy even when expired", async () => {
    const old = file("last", "2026-10-01T00:00:00Z"); old.appProperties = verificationProperties(old, now);
    const { store, files } = fixture([old]); files.delete(anchor.id);
    expect((await planBackupRetention(store, old, now)).generations).toEqual([]);
  });
  it("does not delete unrelated, foreign, partial, invalid, or ambiguous files", async () => {
    const old = file("old", "2026-10-01T00:00:00Z");
    const { store } = fixture([old, { ...old, id: "duplicate" }, { ...old, id: "foreign", name: name("2026-10-02T00:00:00Z"), parents: ["elsewhere"] }, { ...old, id: "partial", name: old.name + ".partial" }, { ...old, id: "notes", name: "notes.txt" }]);
    expect((await planBackupRetention(store, anchor, now)).generations).toEqual([]);
  });
  it.each([false, true])("deletes complete expired legacy generations (segmented=%s)", async segmented => {
    const ctx = fixture(); const { part } = legacy(ctx, "legacy", undefined, segmented);
    const result = await executeBackupRetention(ctx.store, anchor, now);
    expect(result.deletedFiles).toBe(segmented ? 3 : 2);
    expect(ctx.files.has(part.fileId)).toBe(false);
    expect(ctx.files.has("legacy")).toBe(false);
    expect(ctx.files.has(anchor.id)).toBe(true);
    expect(vi.mocked(ctx.store.remove).mock.calls.at(-1)?.[0]).toBe("legacy");
  });
  it("blocks legacy deletion if a retained manifest cannot reveal its references", async () => {
    const ctx = fixture(); legacy(ctx, "expired"); const broken = legacy(ctx, "recent", "2026-10-24T00:00:00Z");
    ctx.content.set(broken.meta.id, Buffer.from("{}"));
    expect((await planBackupRetention(ctx.store, anchor, now)).generations).toEqual([]);
  });
  it("preserves generations whose references point outside the backup folder", async () => {
    const ctx = fixture(); const { part } = legacy(ctx, "old"); ctx.files.get(part.fileId)!.parents = ["other"];
    expect((await planBackupRetention(ctx.store, anchor, now)).generations).toEqual([]);
  });
  it("does not allow a retained manifest to reference a candidate for deletion", async () => {
    const ctx = fixture(); const old = legacy(ctx, "old"); const recent = legacy(ctx, "recent", "2026-10-24T00:00:00Z");
    const value = JSON.parse(ctx.content.get(recent.meta.id)!.toString());
    value.parts[0].fileId = old.part.fileId;
    const bytes = Buffer.from(JSON.stringify(value)); ctx.content.set(recent.meta.id, bytes);
    ctx.files.get(recent.meta.id)!.md5Checksum = createHash("md5").update(bytes).digest("hex");
    ctx.files.get(recent.meta.id)!.size = String(bytes.length);
    expect((await planBackupRetention(ctx.store, anchor, now)).generations).toEqual([]);
  });
  it("refuses live cleanup without a verified upload receipt", async () => {
    const ctx = fixture([file("old", "2026-10-01T00:00:00Z")]); ctx.files.get(anchor.id)!.appProperties = {};
    await expect(executeBackupRetention(ctx.store, anchor, now)).rejects.toThrow(/verified/i);
    expect(ctx.store.remove).not.toHaveBeenCalled();
  });
  it("revalidates files before deleting and skips a moved object", async () => {
    const old = file("old", "2026-10-01T00:00:00Z"); const ctx = fixture([old]);
    ctx.store.get = vi.fn(async id => id === old.id ? { ...old, parents: ["other"] } : ctx.files.get(id)!);
    const result = await executeBackupRetention(ctx.store, anchor, now);
    expect(result.deletedFiles).toBe(0);
    expect(ctx.store.remove).not.toHaveBeenCalled();
  });
  it("can resume a partially deleted legacy generation without deleting its root early", async () => {
    const ctx = fixture(); const old = legacy(ctx, "old", undefined, true);
    ctx.store.remove = vi.fn(async id => { if (id === "old-segment") throw new Error("offline"); ctx.files.delete(id); });
    expect((await executeBackupRetention(ctx.store, anchor, now)).failures).toBe(1);
    expect(ctx.files.has("old")).toBe(true); expect(ctx.files.has(old.part.fileId)).toBe(false);
    ctx.store.remove = vi.fn(async id => { ctx.files.delete(id); });
    expect((await executeBackupRetention(ctx.store, anchor, now)).deletedFiles).toBe(2);
    expect(ctx.files.has("old")).toBe(false);
  });
  it("defers large cleanup safely so legacy history cannot delay the next hourly backup", async () => {
    const ctx = fixture(); legacy(ctx, "old", undefined, true);
    const result = await executeBackupRetention(ctx.store, anchor, now, { maxFiles: 1 });
    expect(result.deletedFiles).toBe(1); expect(result.deferred).toBe(true);
    expect(ctx.files.has("old")).toBe(true);
    expect((await executeBackupRetention(ctx.store, anchor, now)).deletedFiles).toBe(2);
  });
  it("cleans expired single-file backups before spending the budget on legacy parts", async () => {
    const ctx = fixture(); legacy(ctx, "legacy");
    ctx.files.set("single", file("single", "2026-10-20T00:00:00Z"));
    await executeBackupRetention(ctx.store, anchor, now, { maxFiles: 1 });
    expect(ctx.files.has("single")).toBe(false);
    expect(ctx.files.has("legacy-part")).toBe(true);
  });
  it.each([false, true])("protects the newest complete historical generation when recovering an older SQL (legacy=%s)", async isLegacy => {
    const recovered = file("recovered", "2026-10-01T00:00:00Z");
    recovered.appProperties = verificationProperties(recovered, now);
    const ctx = fixture([recovered]); ctx.files.delete(anchor.id);
    if (isLegacy) legacy(ctx, "newest", "2026-10-20T00:00:00Z", true);
    else ctx.files.set("newest", file("newest", "2026-10-20T00:00:00Z"));
    expect((await planBackupRetention(ctx.store, recovered, now)).generations).toEqual([]);
  });
});
