import { describe, expect, it } from "vitest";
import { KIND_PRIORITY, PRIORITY_RANK, isPriority, priorityFor, publicNotification } from "./vendor-notifications";

describe("vendor notification priorities", () => {
  it("ranks critical above high above normal above low", () => {
    expect(PRIORITY_RANK.critical).toBeLessThan(PRIORITY_RANK.high);
    expect(PRIORITY_RANK.high).toBeLessThan(PRIORITY_RANK.normal);
    expect(PRIORITY_RANK.normal).toBeLessThan(PRIORITY_RANK.low);
  });
  it("maps every event kind to a priority and lets producers escalate", () => {
    expect(priorityFor("hold")).toBe("critical");
    expect(priorityFor("new_order")).toBe("high");
    expect(priorityFor("message")).toBe("normal");
    expect(priorityFor("security")).toBe("low");
    expect(priorityFor("security_reset")).toBe("critical");
    expect(priorityFor("something_new")).toBe("normal");
    expect(priorityFor("message", "critical")).toBe("critical");
    expect(Object.values(KIND_PRIORITY).every(isPriority)).toBe(true);
    expect(isPriority("urgent")).toBe(false);
  });
  it("exposes a read flag without leaking internal columns", () => {
    const out = publicNotification({ id: "n1", vendorId: "v", priority: "high", kind: "new_order", title: "t", body: null, link: "?order=s1", submissionId: "s1", dedupeKey: "new_order:s1", readAt: null, createdAt: "2026-10-31T00:00:00Z" });
    expect(out).toMatchObject({ id: "n1", priority: "high", read: false, link: "?order=s1" });
    expect(out).not.toHaveProperty("dedupeKey"); expect(out).not.toHaveProperty("vendorId");
  });
});
