import { describe, expect, it } from "vitest";
import { parseWholesaleUpdateInput, wholesaleUpdateDto, type WholesaleUpdate } from "./wholesale-updates";

describe("wholesale update validation and visibility", () => {
  it("accepts plain notes and explicit publication state", () => {
    expect(parseWholesaleUpdateInput({ title: " Prices ", note: " New prices\nfrom Monday ", published: "true" }))
      .toEqual({ title: "Prices", note: "New prices\nfrom Monday", published: true, removeImage: false });
  });
  it("rejects empty notes, oversized messages and ambiguous toggles", () => {
    for (const body of [
      { note: "", published: "true" }, { note: "x".repeat(5001), published: "true" },
      { title: "x".repeat(121), note: "update", published: "true" },
      { note: "update", published: "yes" }, { note: {}, published: "false" },
      { note: "update", published: "false", removeImage: "yes" },
    ]) expect(() => parseWholesaleUpdateInput(body)).toThrow();
  });
  it("allows image removal and a hidden draft", () => {
    expect(parseWholesaleUpdateInput({ note: "update", published: "false", removeImage: "true" }))
      .toMatchObject({ title: "", published: false, removeImage: true });
  });
  const record: WholesaleUpdate = {
    id: "example", title: "Price update", note: "<script>not HTML</script>", published: true,
    imageKey: "wholesale-updates/private.webp", createdAt: "2026-10-15T12:00:00Z", updatedAt: "2026-10-15T12:00:00Z",
  };
  it("does not expose storage keys and returns scoped image routes", () => {
    expect(wholesaleUpdateDto(record, false)).toEqual({
      id: "example", title: "Price update", note: record.note, published: true,
      createdAt: record.createdAt, updatedAt: record.updatedAt, imageUrl: "/api/wholesale/updates/example/image?v=2026-10-15T12%3A00%3A00Z",
    });
    expect(wholesaleUpdateDto(record, true).imageUrl).toBe("/api/admin/wholesale-updates/example/image?v=2026-10-15T12%3A00%3A00Z");
  });
  it("handles notes without an image", () => {
    expect(wholesaleUpdateDto({ ...record, imageKey: null }, false).imageUrl).toBeNull();
  });
});
