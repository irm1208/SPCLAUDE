import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildUpdateFormData, parseUpdatesResponse, publishedOnly, validateDraft, validateImage } from "../lib/wholesale-updates.ts";

const feed = readFileSync(new URL("./WholesaleUpdates.tsx", import.meta.url), "utf8");
const admin = readFileSync(new URL("./AdminWholesaleUpdates.tsx", import.meta.url), "utf8");
const order = readFileSync(new URL("../pages/WholesaleOrder.tsx", import.meta.url), "utf8");
const adminPage = readFileSync(new URL("../pages/Admin.tsx", import.meta.url), "utf8");
const u = (id: string, published: boolean, createdAt: string) => ({ id, title: null, note: "n", published, createdAt, updatedAt: createdAt, imageUrl: null });

test("published feed is newest first and drops drafts", () => {
  const out = publishedOnly([u("a", true, "2024-01-01"), u("b", false, "2024-03-01"), u("c", true, "2024-02-01")]);
  assert.deepEqual(out.map(x => x.id), ["c", "a"]);
});
test("malformed response throws rather than looking empty", () => {
  assert.throws(() => parseUpdatesResponse({}));
  assert.deepEqual(parseUpdatesResponse({ updates: [] }), []);
});
test("validation limits", () => {
  assert.ok(validateDraft("x".repeat(121), "note"));
  assert.ok(validateDraft("", "  "));
  assert.ok(validateDraft("", "x".repeat(5001)));
  assert.equal(validateDraft("t", "ok"), null);
  assert.ok(validateImage({ type: "image/svg+xml", size: 10 }));
  assert.ok(validateImage({ type: "image/png", size: 5 * 1024 * 1024 + 1 }));
  assert.equal(validateImage({ type: "image/webp", size: 100 }), null);
});
test("form data keeps existing image unless replaced or removed", () => {
  const keep = buildUpdateFormData({ title: "t", note: "n", published: true });
  assert.equal(keep.get("published"), "true");
  assert.equal(keep.get("removeImage"), null);
  assert.equal(keep.get("image"), null);
  assert.equal(buildUpdateFormData({ title: "", note: "n", published: false, removeImage: true }).get("removeImage"), "true");
});
test("feed renders nothing when empty, retries on error, polls with cleanup", () => {
  assert.match(feed, /if \(updates\.length === 0\) return null/);
  assert.match(feed, /button-retry-wholesale-updates/);
  assert.match(feed, /clearInterval/);
  assert.match(feed, /abort\(\)/);
  assert.match(feed, /object-contain/);
});
test("admin never puts secret in URLs or sets multipart content type", () => {
  assert.doesNotMatch(admin, /Content-Type/);
  assert.doesNotMatch(admin, /[?&](admin_?)?secret=/i);
  assert.match(admin, /createObjectURL/);
  assert.match(admin, /revokeObjectURL/);
  assert.match(admin, /"x-admin-secret": secret/);
  assert.match(admin, /confirm-delete-update-/);
});
test("integration is minimal", () => {
  assert.match(order, /\{pageMessage\}<\/p>[\s\S]{0,80}<WholesaleUpdates \/>/);
  assert.match(adminPage, /<AdminWholesaleUpdates secret=\{secret\} \/>/);
});
test("admin image and list freshness guards", () => {
  assert.match(admin, /if \(ctrl\.signal\.aborted\) return;\s*objectUrl = URL\.createObjectURL/);
  assert.match(admin, /setSrc\(null\);\s*setFailed\(false\);\s*if \(!url\) return;/);
  assert.match(admin, /if \(pendingMutations\.current > 0\) return;/);
  assert.match(admin, /gen !== generation\.current/);
  assert.match(admin, /e\.key === "Escape"/);
  assert.match(admin, /button-close-update-image/);
});
