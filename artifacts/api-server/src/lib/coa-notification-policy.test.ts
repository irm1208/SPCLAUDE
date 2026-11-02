import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  account: { telegramChatId: "synthetic-never-contact", telegramNotifications: { status: false, payment: false } },
  insert: vi.fn(),
  proxy: vi.fn(),
  template: { eventKey: "coa_paid", name: "COA receipt", subject: "Receipt {{order_code}}",
    bodyHtml: "<p>{{message}}</p>", primaryColor: "#1B3A7A", logoUrl: null, footerText: null, fromName: "Salt & Peps", isActive: true },
}));
vi.mock("@workspace/db", async () => ({
  ...await vi.importActual("@workspace/db/schema"),
  db: {
    select: () => ({
      from: (table: any) => ({
        where: async () => table.eventKey ? [state.template] : [state.account],
      }),
    }),
    insert: state.insert,
  },
}));
vi.mock("@replit/connectors-sdk", () => ({
  ReplitConnectors: class { proxy = state.proxy; },
}));
import { notifyUserFull } from "./telegram";
import { sendTemplatedEmail } from "./email";

describe("COA delivery policies using real notification helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.template.isActive = true;
  });
  it.each(["status", "payment"] as const)("honours disabled %s preferences without duplicating a queued website entry", async pref => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Real sends forbidden"));
    try {
      expect(await notifyUserFull("synthetic", pref, "Synthetic COA update", undefined,
        { websiteAlreadyRecorded: true, eventKey: "coa_paid" })).toMatchObject({ ok: false, skipped: true });
      expect(state.insert).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally { fetchSpy.mockRestore(); }
  });
  it("honours disabled email templates without contacting the provider", async () => {
    state.template.isActive = false;
    expect(await sendTemplatedEmail("coa_paid", "synthetic@example.invalid", {})).toEqual({
      ok: false, error: "Email template unavailable",
    });
    expect(state.proxy).not.toHaveBeenCalled();
  });
  it("passes the stable idempotency key through the template helper to Resend", async () => {
    state.proxy.mockResolvedValue({ ok: true, json: async () => ({ id: "synthetic" }) });
    expect(await sendTemplatedEmail("coa_paid", "synthetic@example.invalid", { order_code: "TEST", message: "Test receipt" },
      { idempotencyKey: "coa:synthetic:paid" })).toMatchObject({ ok: true });
    expect(state.proxy).toHaveBeenCalledWith("resend", "/emails",
      expect.objectContaining({ headers: expect.objectContaining({ "Idempotency-Key": "coa:synthetic:paid" }) }));
  });
});
