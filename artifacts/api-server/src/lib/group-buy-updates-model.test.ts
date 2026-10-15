import { describe, expect, it } from "vitest";
import {
  GROUP_PROGRESS_STAGES, defaultGroupProgress, parseGroupUpdate, parseProgressInput, groupUpdateDto,
} from "./group-buy-updates-model";

describe("group-buy progress rules", () => {
  it("has the six approved ordering/shipping stages", () => {
    expect(GROUP_PROGRESS_STAGES.map(s => s.id)).toEqual(["open", "closed", "ordered", "in_transit", "with_reshipper", "dispatched"]);
  });
  it("derives only open or closed, never a later fulfilment stage", () => {
    expect(defaultGroupProgress({ status: "active", closeDate: null })).toBe("open");
    expect(defaultGroupProgress({ status: "closed", closeDate: null })).toBe("closed");
    expect(defaultGroupProgress({ status: "archived", closeDate: null })).toBe("closed");
    expect(defaultGroupProgress({ status: "active", closeDate: new Date("2020-01-01") })).toBe("closed");
  });
  it("requires a valid stage and a current version, including explicit null for the first change", () => {
    expect(parseProgressInput({ stage: "ordered", expectedUpdatedAt: null })).toEqual({ stage: "ordered", expectedUpdatedAt: null, sendTelegramAlert: false });
    for (const input of [{ stage: "paid", expectedUpdatedAt: null }, { stage: "ordered" }, { stage: "ordered", expectedUpdatedAt: 12 }]) {
      expect(() => parseProgressInput(input)).toThrow();
    }
  });
  it("uses explicit publication state and validates notes", () => {
    expect(parseGroupUpdate({ title: " News ", note: " Update ", published: "true" })).toMatchObject({ title: "News", note: "Update", published: true });
    expect(() => parseGroupUpdate({ note: "", published: "true" })).toThrow();
    expect(() => parseGroupUpdate({ note: "x".repeat(5001), published: "true" })).toThrow();
    expect(() => parseGroupUpdate({ note: "hello", published: "maybe" })).toThrow();
  });
  it("keeps image keys private and scopes image URLs to the group and viewing role", () => {
    const update = {
      id: "news", groupBuyId: "GB1", title: "", note: "Hello", published: true, kind: "note" as const,
      imageKey: "group-buy-updates/example.webp", createdAt: "2026-10-15T12:00:00Z", updatedAt: "2026-10-15T12:00:00Z",
    };
    const dto = groupUpdateDto(update, "organiser");
    expect(dto.imageUrl).toContain("/api/organiser/group-buys/GB1/updates/news/image?v=");
    expect(dto).not.toHaveProperty("imageKey");
    expect(groupUpdateDto(update, "member").imageUrl).toContain("/api/group-buys/GB1/updates/news/image?v=");
  });
});
