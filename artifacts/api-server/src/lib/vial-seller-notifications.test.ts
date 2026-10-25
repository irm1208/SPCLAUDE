import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  send: vi.fn(), log: vi.fn().mockResolvedValue(undefined), alert: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./telegram", () => ({ sendTelegramMessage: mocks.send }));
vi.mock("./audit-log", () => ({ writeLog: mocks.log }));
vi.mock("./create-alert", () => ({ createAlert: mocks.alert }));
import { notifyVialSellers, validateSellerTelegramChatId } from "./vial-seller-notifications";

const order = {
  code: "LV-TEST", currency: "GBP", total: 16,
  notes: "<please & thanks>",
  items: [{ productId: "p", productName: "KLOW <80mg>", quantity: 1, lineTotal: 16 }],
};
describe("seller order alerts", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.send.mockResolvedValue(true); });
  it("sends the placed-order alert immediately in the pricing currency with escaped HTML", async () => {
    await notifyVialSellers([{ id: "v", name: "Store", telegramChatId: "123", notifyVendor: true }], order);
    expect(mocks.send).toHaveBeenCalledWith("123", expect.stringContaining("£16.00"), "HTML");
    const text = mocks.send.mock.calls[0][1];
    expect(text).toContain("KLOW &lt;80mg&gt;");
    expect(text).toContain("&lt;please &amp; thanks&gt;");
    expect(text).not.toContain("$16.00");
  });
  it("audits false delivery results and alerts Admin, without throwing away the order", async () => {
    mocks.send.mockResolvedValue(false);
    await expect(notifyVialSellers([{ id: "v", name: "Store", telegramChatId: "123" }], order)).resolves.toBeUndefined();
    expect(mocks.log).toHaveBeenCalledWith("seller", "warn", "vial_seller_notification_failed",
      expect.any(String), expect.objectContaining({ vendorId: "v", orderCode: "LV-TEST" }));
    expect(mocks.alert).toHaveBeenCalled();
  });
  it("missing linkage is visible and does not prevent another seller from being notified", async () => {
    await notifyVialSellers([
      { id: "missing", name: "Unlinked" },
      { id: "linked", name: "Linked", telegramChatId: "123" },
    ], order);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.log).toHaveBeenCalledWith("seller", "warn", "vial_seller_notification_failed",
      expect.any(String), expect.objectContaining({ reason: "telegram_not_linked" }));
  });
  it("respects explicit seller opt-out", async () => {
    await notifyVialSellers([{ id: "v", name: "Store", telegramChatId: "123", notifyVendor: false }], order);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.alert).not.toHaveBeenCalled();
  });
  it("isolates thrown delivery failures", async () => {
    mocks.send.mockRejectedValueOnce(new Error("network"));
    await notifyVialSellers([{ id: "a", name: "A", telegramChatId: "123" }, { id: "b", name: "B", telegramChatId: "456" }], order);
    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.alert).toHaveBeenCalledTimes(1);
  });
  it("accepts private numeric Telegram IDs, not handles or group destinations", () => {
    expect(validateSellerTelegramChatId(" 123456 ")).toBe("123456");
    expect(validateSellerTelegramChatId("")).toBeNull();
    expect(() => validateSellerTelegramChatId("@seller")).toThrow();
    expect(() => validateSellerTelegramChatId("-100123")).toThrow();
    expect(() => validateSellerTelegramChatId({})).toThrow();
  });
});
