import { describe, expect, it } from "vitest";
import { groupBuyRefundNotificationsTable } from "@workspace/db";
import { REGISTRY_MAP } from "./telegram-registry";
import {
  buildRefundNotificationVars,
  REFUND_NOTIFICATION_EVENT_KEYS,
  transitionKeyFor,
} from "./refund-notifications";

describe("refund notification contract", () => {
  it("has one customer event for each lifecycle status", () => {
    expect(REFUND_NOTIFICATION_EVENT_KEYS).toEqual({
      requested: "group_buy_refund_requested",
      verifying: "group_buy_refund_verifying",
      verification_failed: "group_buy_refund_failed",
      completed: "group_buy_refund_completed",
    });
    expect(groupBuyRefundNotificationsTable).toBeDefined();
    for (const eventKey of Object.values(REFUND_NOTIFICATION_EVENT_KEYS)) {
      expect(REGISTRY_MAP.get(eventKey)?.placeholders).toEqual(
        expect.arrayContaining(["order_code", "amount_usd", "status"]),
      );
      expect(REGISTRY_MAP.get(eventKey)?.placeholders).not.toEqual(
        expect.arrayContaining(["wallet", "private_key", "processor", "request_body"]),
      );
    }
  });

  it("uses an attempt identity for repeated verification failures", () => {
    expect(transitionKeyFor("requested")).toBe("initial");
    expect(transitionKeyFor("verifying", "attempt-1")).toBe("attempt:attempt-1");
    expect(transitionKeyFor("verification_failed", "attempt-1")).toBe("attempt:attempt-1");
    expect(transitionKeyFor("verification_failed", "attempt-2")).toBe("attempt:attempt-2");
  });

  it("allows only safe customer variables", () => {
    const vars = buildRefundNotificationVars({
      orderCode: "GB-42",
      amountUsd: "10.00",
      status: "completed",
      explorerUrl: "https://etherscan.io/tx/0xabc",
      txid: "0xabc",
      destinationWallet: "0xprivate-material-must-not-leak",
      processorUsername: "processor",
      requestBody: { password: "secret" },
    });
    expect(vars).toEqual({
      order_code: "GB-42",
      amount_usd: "10.00",
      status: "completed",
      explorer_url: "https://etherscan.io/tx/0xabc",
      txid: "0xabc",
    });
    expect(JSON.stringify(vars)).not.toMatch(/private|processor|secret|password/i);
  });
});