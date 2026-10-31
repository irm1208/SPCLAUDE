import { describe, expect, it } from "vitest";
import { notificationText } from "./VendorNotifications";

const note = (kind: string, title: string, body: string | null = null) => ({ kind, title, body });

describe("system notification localization", () => {
  it("translates shipment and overdue templates while preserving references", () => {
    expect(notificationText(note("new_order", "New shipment #RM-中文-123", "Assigned to you. Open it to start packing."), "title", "zh")).toBe("新发货任务 #RM-中文-123");
    expect(notificationText(note("new_order", "New shipment #123", "Assigned to you. Open it to start packing."), "body", "zh")).toBe("已分配给您。打开订单即可开始打包。");
    expect(notificationText(note("overdue", "#ABC123 has waited 48h without tracking"), "title", "zh")).toBe("#ABC123 已等待 48 小时，尚无物流信息");
    expect(notificationText(note("overdue_critical", "#ABC123 is 96h+ overdue"), "title", "zh")).toBe("#ABC123 已逾期 96 小时以上");
  });

  it("localizes known security and settings events without changing names or dates", () => {
    expect(notificationText(note("security", "Passkey added: Pat's phone"), "title", "zh")).toBe("已添加通行密钥：Pat's phone");
    expect(notificationText(note("security_reset", "Two-step verification reset for vendor.name"), "title", "zh")).toBe("vendor.name 的两步验证已重置");
    expect(notificationText(note("settings", "Peps Anonymous paused your new orders until 2026-12-01"), "title", "zh")).toContain("2026-12-01");
  });

  it("preserves arbitrary announcements, admin notes and English selections", () => {
    const announcement = note("announcement", "New shipment #123", "Add tracking or report a problem.");
    expect(notificationText(announcement, "title", "zh")).toBe(announcement.title);
    expect(notificationText(announcement, "body", "zh")).toBe(announcement.body);
    const resolution = note("issue_resolved", "Problem report answered · #123", "Royal Mail will collect from 12 Main Street.");
    expect(notificationText(resolution, "title", "zh")).toBe("问题报告已回复 · #123");
    expect(notificationText(resolution, "body", "zh")).toBe(resolution.body);
    expect(notificationText(note("settings", "Peps Anonymous reopened your order routing", "Annual stocktake"), "body", "zh")).toBe("Annual stocktake");
    expect(notificationText(note("hold", "Order #123 put on hold"), "title", "en")).toBe("Order #123 put on hold");
  });
});
