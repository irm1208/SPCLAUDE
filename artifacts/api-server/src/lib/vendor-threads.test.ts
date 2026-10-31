import { describe, expect, it } from "vitest";
import { threadInput, messageInput, preview, formatThreadMessage, publicThread } from "./vendor-threads";
import { VendorPortalError } from "./vendor-portal-model";

const status = (fn: () => unknown) => { try { fn(); return 200; } catch (e) { return (e as VendorPortalError).status; } };

describe("vendor thread validation", () => {
  it("trims a new conversation and accepts a photo-only first message", () => {
    expect(threadInput({ subject: "  Stock question ", body: " Do you have more HGH? ", submissionId: " sub-1 " })).toEqual({ subject: "Stock question", body: "Do you have more HGH?", submissionId: "sub-1" });
    expect(threadInput({ subject: "Label photo", body: "" }, true)).toEqual({ subject: "Label photo", body: "", submissionId: null });
  });
  it("rejects empty or oversized input", () => {
    expect(status(() => threadInput({ subject: "A", body: "hi" }))).toBe(400);
    expect(status(() => threadInput({ subject: "Subject", body: "" }))).toBe(400);
    expect(status(() => threadInput({ subject: "Subject", body: "x".repeat(4001) }))).toBe(400);
    expect(status(() => messageInput({ body: "   " }))).toBe(400);
    expect(messageInput({ body: " ok " })).toEqual({ body: "ok" });
    expect(messageInput({}, true)).toEqual({ body: "" });
  });
  it("builds previews and Telegram mirrors without leaking HTML", () => {
    expect(preview("line one\n\nline   two")).toBe("line one line two");
    expect(preview("", { path: "p", name: "n" })).toBe("📷 Photo");
    const text = formatThreadMessage({ subject: "Address <check>", reference: "8000123" }, { authorName: "admin", body: "Use flat 3 & ring twice", imagePath: null });
    expect(text).toContain("Address &lt;check&gt;"); expect(text).toContain("#8000123"); expect(text).toContain("flat 3 &amp; ring twice"); expect(text).toContain("Reply to this message");
    expect(publicThread({ id: "t", vendorId: "v", subject: "s", status: "open", openedBy: "vendor", vendorUnread: "2", adminUnread: null, lastMessageAt: "x", createdAt: "y" })).toMatchObject({ vendorUnread: 2, adminUnread: 0, reference: null });
  });
});
