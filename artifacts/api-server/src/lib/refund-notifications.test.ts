import { describe, expect, it } from "vitest";
import {
  groupBuyRefundNotificationsTable,
  groupBuyRefundTransitionOutboxTable,
} from "@workspace/db";
import { REGISTRY_MAP } from "./telegram-registry";
import { renderTemplate } from "./telegram";
import {
  buildRefundNotificationVars,
  REFUND_NOTIFICATION_EVENT_KEYS,
  transitionKeyFor,
  auditRefundTransition,
  drainRefundAudits,
  drainRefundNotifications,
  enqueueRefundNotification,
  shouldSendRefundCustomerNotification,
  startRefundNotificationDrain,
} from "./refund-notifications";

class PersistedFakeDb {
  notifications: any[] = [];
  audits: any[] = [];
  auditMarkers: any[] = [];
  failAuditInsert = false;
  now = Date.now();
  deliveryToken: string | null = null;
  updateAttempts = 0;
  private selected = new Set<string>();

  transaction<T>(fn: (tx: this) => Promise<T>): Promise<T> {
    return fn(this);
  }

  insert(table: unknown) {
    const state = this;
    return {
      values(value: any) {
        const operation: any = {
          onConflictDoNothing() {
            return {
              async returning() {
                if (table === groupBuyRefundNotificationsTable) {
                  const duplicate = state.notifications.find((row) =>
                    row.refundId === value.refundId
                    && row.status === value.status
                    && row.accountId === value.accountId
                    && row.transitionKey === value.transitionKey);
                  if (duplicate) return [];
                  const marker = { claimToken: null, claimedAt: null, sentAt: null, ...value };
                  state.notifications.push(marker);
                  return [marker];
                }
                const duplicate = state.auditMarkers.find((row) =>
                  row.refundId === value.refundId
                  && row.attemptId === value.attemptId
                  && row.transition === value.transition);
                if (duplicate) return [];
                state.auditMarkers.push(value);
                return [value];
              },
            };
          },
          async returning() {
            if ("type" in value && state.failAuditInsert) {
              state.failAuditInsert = false;
              throw new Error("audit unavailable");
            }
            state.audits.push(value);
            return [value];
          },
        };
        operation.then = (
          resolve: (value: any[]) => unknown,
          reject: (error: unknown) => unknown,
        ) => operation.returning().then(resolve, reject);
        return operation;
      },
    };
  }

  select() {
    const state = this;
    const query: any = {
      table: null as unknown,
      locking: false,
      limit() { return query; },
      from(table: unknown) { query.table = table; return query; },
      where() { return query; },
      orderBy() { return query; },
      for() { query.locking = true; return Promise.resolve(query.rows()); },
      then(resolve: (value: any[]) => unknown) { return Promise.resolve(query.rows()).then(resolve); },
      rows() {
        if (query.table === groupBuyRefundNotificationsTable) {
          const row = state.notifications.find((candidate) =>
            !state.selected.has(candidate.id)
            && !candidate.sentAt
            && (!candidate.claimedAt || state.now - new Date(candidate.claimedAt).getTime() > 5 * 60 * 1000)
          );
          if (row && query.locking) state.selected.add(row.id);
          return row ? [row] : [];
        }
        return state.auditMarkers.filter((row) => !row.deliveredAt).slice(0, 1);
      },
    };
    return query;
  }

  update(table: unknown) {
    const state = this;
    return {
      set(values: any) {
        return {
          where: (_predicate: unknown) => {
            let applied = false;
            const apply = async () => {
              state.updateAttempts += 1;
              if (applied) return [];
              applied = true;
              const rows = table === groupBuyRefundNotificationsTable ? state.notifications : state.auditMarkers;
              const row = rows.find((candidate) => !candidate.sentAt || table !== groupBuyRefundNotificationsTable);
              if (!row) return [];
              if (
                table === groupBuyRefundNotificationsTable
                && (values.sentAt || values.claimedAt === null)
                && state.deliveryToken !== null
                && row.claimToken !== state.deliveryToken
              ) return [];
              Object.assign(row, values);
              if (table === groupBuyRefundNotificationsTable && values.claimedAt && values.claimToken) {
                state.selected.delete(row.id);
              }
              return [row];
            };
            return {
              returning: apply,
              then(resolve: (value: any[]) => unknown) { return apply().then(resolve); },
            };
          },
        };
      },
    };
  }
}

describe("refund notification contract", () => {
  it("only sends successful completed refund notifications to customers", () => {
    expect(shouldSendRefundCustomerNotification("completed")).toBe(true);
    expect(shouldSendRefundCustomerNotification("requested")).toBe(false);
    expect(shouldSendRefundCustomerNotification("verifying")).toBe(false);
    expect(shouldSendRefundCustomerNotification("verification_failed")).toBe(false);
  });

  it("has one customer event for each lifecycle status", () => {
    expect(REFUND_NOTIFICATION_EVENT_KEYS).toEqual({
      requested: "group_buy_refund_requested",
      verifying: "group_buy_refund_verifying",
      verification_failed: "group_buy_refund_failed",
      completed: "group_buy_refund_completed",
    });
    expect(groupBuyRefundNotificationsTable).toBeDefined();
    expect(groupBuyRefundNotificationsTable.claimToken).toBeDefined();
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
      txid_line: "\nRefund TXID (first): <code>0xabc</code>",
      txid2_line: "",
      explorer_link: '\n<a href="https://etherscan.io/tx/0xabc">View refund transaction</a>',
    });
    expect(JSON.stringify(vars)).not.toMatch(/private|processor|secret|password/i);
  });

  it("includes an optional second TXID without emitting an absent blank variable", () => {
    expect(buildRefundNotificationVars({ txid: "0x111", txid2: "0x222", status: "completed" }))
      .toMatchObject({ txid: "0x111", txid2: "0x222" });
    expect(buildRefundNotificationVars({ txid: "0x111", status: "completed" })).not.toHaveProperty("txid2");
  });

  it("renders the real completed-refund registry template with labelled TXIDs and no absent noise", () => {
    const event = REGISTRY_MAP.get("group_buy_refund_completed");
    expect(event).toBeDefined();
    const withSecond = renderTemplate(event!.defaultTemplate, buildRefundNotificationVars({
      orderCode: "GB-42",
      amountUsd: "10.00",
      status: "completed",
      explorerUrl: "https://etherscan.io/tx/0xabc",
      txid: "0xabc",
      txid2: "0xdef",
    }));
    expect(withSecond).toContain("Refund TXID (first): <code>0xabc</code>");
    expect(withSecond).toContain("Refund TXID (second): <code>0xdef</code>");
    expect(withSecond).toContain('<a href="https://etherscan.io/tx/0xabc">View refund transaction</a>');

    const withoutSecond = renderTemplate(event!.defaultTemplate, buildRefundNotificationVars({
      orderCode: "GB-42",
      amountUsd: "10.00",
      status: "completed",
      explorerUrl: "https://etherscan.io/tx/0xabc",
      txid: "0xabc",
    }));
    expect(withoutSecond).toContain("Refund TXID (first): <code>0xabc</code>");
    expect(withoutSecond).not.toContain("Refund TXID (second)");
    expect(withoutSecond).not.toContain("undefined");
    expect(withoutSecond).toContain('<a href="https://etherscan.io/tx/0xabc">View refund transaction</a>');
  });

  it("persists one marker per transition and retries failed delivery", async () => {
    const db = new PersistedFakeDb();
    const input = {
      refundId: "refund-1",
      accountId: "Buyer",
      status: "verification_failed" as const,
      attemptId: "attempt-1",
      orderCode: "GB-1",
      amountUsd: "5.00",
    };
    expect((await enqueueRefundNotification(db, input)).inserted).toBe(true);
    expect((await enqueueRefundNotification(db, input)).inserted).toBe(false);
    let fail = true;
    let firstClaimToken: string | null | undefined;
    const sender = async (marker: { claimToken?: string | null }) => {
      firstClaimToken = marker.claimToken;
      if (fail) {
        fail = false;
        throw new Error("temporary");
      }
      return { ok: true };
    };
    expect(await drainRefundNotifications(db, {
      limit: 1,
      sender,
      tokenFactory: () => "token-1",
    })).toBe(0);
    expect(db.notifications[0].sentAt).toBeNull();
    expect(db.notifications[0].claimToken).toBeNull();
    expect(firstClaimToken).toBe("token-1");
    expect(await drainRefundNotifications(db, {
      limit: 1,
      sender,
      tokenFactory: () => "token-2",
    })).toBe(1);
    expect(db.notifications[0].sentAt).toBeDefined();
  });

  it("keeps audit markers pending across an audit outage and delivers once later", async () => {
    const db = new PersistedFakeDb();
    await auditRefundTransition(db, {
      refundId: "refund-1",
      attemptId: "attempt-1",
      orderId: "order-1",
      groupBuyId: "group-1",
      accountId: "buyer",
      method: "credit",
      processorUsername: "admin",
      processorRole: "admin",
      source: "admin",
      transition: "requested_to_completed",
      resultCode: "completed",
      action: "group_buy_refund_completed",
    });
    db.failAuditInsert = true;
    expect(await drainRefundAudits(db, { limit: 1 })).toBe(0);
    expect(db.auditMarkers[0].deliveredAt).toBeNull();
    expect(await drainRefundAudits(db)).toBe(1);
    expect(await drainRefundAudits(db)).toBe(0);
    expect(db.audits).toHaveLength(1);
    expect(db.audits[0].metadata).toMatchObject({
      refundId: "refund-1",
      orderId: "order-1",
      groupBuyId: "group-1",
      method: "credit",
      processorUsername: "admin",
      processorRole: "admin",
      source: "admin",
      transition: "requested_to_completed",
      resultCode: "completed",
    });
    expect(JSON.stringify(db.audits[0].metadata)).not.toMatch(
      /destinationWallet|private|secret|password|proof|raw.?body/i,
    );
  });

  it("does not duplicate a concurrently claimed marker", async () => {
    const db = new PersistedFakeDb();
    await enqueueRefundNotification(db, {
      refundId: "refund-1",
      accountId: "buyer",
      status: "requested",
      amountUsd: "1.00",
    });
    let sends = 0;
    const sender = async () => {
      sends += 1;
      await Promise.resolve();
      return { ok: true };
    };
    await Promise.all([
      drainRefundNotifications(db, { limit: 1, sender }),
      drainRefundNotifications(db, { limit: 1, sender }),
    ]);
    expect(sends).toBe(1);
  });

  it("terminally acknowledges a preference-disabled delivery without retrying", async () => {
    const db = new PersistedFakeDb();
    await enqueueRefundNotification(db, {
      refundId: "refund-disabled",
      accountId: "buyer",
      status: "requested",
      amountUsd: "1.00",
    });
    let sends = 0;
    const sender = async () => {
      sends += 1;
      return { ok: false, skipped: true };
    };
    expect(await drainRefundNotifications(db, { limit: 1, sender })).toBe(1);
    expect(db.notifications[0].lastError).toBe("skipped");
    expect(await drainRefundNotifications(db, { limit: 1, sender })).toBe(0);
    expect(sends).toBe(1);
  });

  it("fences a late success from an expired-lease worker", async () => {
    const db = new PersistedFakeDb();
    await enqueueRefundNotification(db, {
      refundId: "lease-success",
      accountId: "buyer",
      status: "requested",
      amountUsd: "1.00",
    });
    let releaseA!: () => void;
    const aBlocked = new Promise<void>((resolve) => { releaseA = resolve; });
    let aEntered!: () => void;
    const aStarted = new Promise<void>((resolve) => { aEntered = resolve; });
    let releaseB!: () => void;
    const bBlocked = new Promise<void>((resolve) => { releaseB = resolve; });
    let bEntered!: () => void;
    const bStarted = new Promise<void>((resolve) => { bEntered = resolve; });
    const aDrain = drainRefundNotifications(db, {
      limit: 1,
      tokenFactory: () => "token-1",
      sender: async (marker) => {
        db.deliveryToken = marker.claimToken ?? null;
        aEntered();
        await aBlocked;
        db.deliveryToken = "token-1";
        return { ok: true };
      },
    });
    await aStarted;
    db.now += 5 * 60 * 1000 + 1;
    db.notifications[0].claimedAt = new Date(db.now - 5 * 60 * 1000 - 1);
    const bResult = drainRefundNotifications(db, {
      limit: 1,
      tokenFactory: () => "token-2",
      sender: async (marker) => {
        db.deliveryToken = marker.claimToken ?? null;
        bEntered();
        await bBlocked;
        db.deliveryToken = "token-2";
        return { ok: true };
      },
    });
    await bStarted;
    releaseA();
    expect(await aDrain).toBe(0);
    expect(db.notifications[0].sentAt).toBeNull();
    expect(db.notifications[0].claimToken).toBe("token-2");
    releaseB();
    expect(await bResult).toBe(1);
    expect(db.notifications[0].sentAt).toBeDefined();
    expect(db.notifications[0].claimToken).toBeNull();
    expect(db.notifications[0].claimedAt).toBeNull();
  });

  it("retries after a provider-accepted crash window because Telegram has no idempotency key", async () => {
    const db = new PersistedFakeDb();
    await enqueueRefundNotification(db, {
      refundId: "crash-window",
      accountId: "buyer",
      status: "requested",
      amountUsd: "1.00",
    });
    let transportCalls = 0;
    const sender = async () => {
      transportCalls += 1;
      if (transportCalls === 1) throw new Error("crashed after provider acceptance");
      return { ok: true };
    };
    expect(await drainRefundNotifications(db, { limit: 1, sender })).toBe(0);
    expect(db.notifications[0].sentAt).toBeNull();
    expect(db.notifications[0].lastError).toContain("crashed");
    expect(await drainRefundNotifications(db, { limit: 1, sender })).toBe(1);
    expect(transportCalls).toBe(2);
    expect(db.notifications[0].sentAt).toBeDefined();
  });

  it("fences a late failure from an expired-lease worker", async () => {
    const db = new PersistedFakeDb();
    await enqueueRefundNotification(db, {
      refundId: "lease-failure",
      accountId: "buyer",
      status: "requested",
      amountUsd: "1.00",
    });
    let releaseA!: () => void;
    const aBlocked = new Promise<void>((resolve) => { releaseA = resolve; });
    let aEntered!: () => void;
    const aStarted = new Promise<void>((resolve) => { aEntered = resolve; });
    let releaseB!: () => void;
    const bBlocked = new Promise<void>((resolve) => { releaseB = resolve; });
    let bEntered!: () => void;
    const bStarted = new Promise<void>((resolve) => { bEntered = resolve; });
    const aDrain = drainRefundNotifications(db, {
      limit: 1,
      tokenFactory: () => "token-1",
      sender: async (marker) => {
        db.deliveryToken = marker.claimToken ?? null;
        aEntered();
        await aBlocked;
        db.deliveryToken = "token-1";
        throw new Error("late worker failure");
      },
    });
    await aStarted;
    db.now += 5 * 60 * 1000 + 1;
    db.notifications[0].claimedAt = new Date(db.now - 5 * 60 * 1000 - 1);
    db["selected"].clear();
    const bDrain = drainRefundNotifications(db, {
      limit: 1,
      tokenFactory: () => "token-2",
      sender: async (marker) => {
        db.deliveryToken = marker.claimToken ?? null;
        bEntered();
        await bBlocked;
        db.deliveryToken = "token-2";
        return { ok: true };
      },
    });
    await bStarted;
    releaseA();
    expect(await aDrain).toBe(0);
    expect(db.notifications[0].sentAt).toBeNull();
    expect(db.notifications[0].claimToken).toBe("token-2");
    releaseB();
    expect(await bDrain).toBe(1);
    expect(db.notifications[0].sentAt).toBeDefined();
    expect(db.notifications[0].claimToken).toBeNull();
    expect(db.notifications[0].claimedAt).toBeNull();
  });

  it("runs both scheduled drains without overlap and isolates failures", async () => {
    const callbacks: Array<() => void> = [];
    const cleared: unknown[] = [];
    let auditCalls = 0;
    let notificationCalls = 0;
    let releaseFirst!: () => void;
    const firstRun = new Promise<void>((resolve) => { releaseFirst = resolve; });
    let first = true;
    const stop = startRefundNotificationDrain({}, 5_000, {
      setIntervalFn: (callback: () => void) => {
        callbacks.push(callback);
        return callbacks.length as unknown as ReturnType<typeof setInterval>;
      },
      clearIntervalFn: (timer: unknown) => { cleared.push(timer); },
      drainAudits: async () => {
        auditCalls += 1;
        if (first) {
          first = false;
          await firstRun;
          throw new Error("audit outage");
        }
        return 0;
      },
      drainNotifications: async () => {
        notificationCalls += 1;
        if (notificationCalls === 2) throw new Error("notification outage");
        return 0;
      },
    });
    await Promise.resolve();
    callbacks[0]?.();
    callbacks[0]?.();
    expect(auditCalls).toBe(1);
    releaseFirst();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    callbacks[0]?.();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(auditCalls).toBe(2);
    expect(notificationCalls).toBe(2);
    callbacks[0]?.();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(auditCalls).toBe(3);
    expect(notificationCalls).toBe(3);
    callbacks[0]?.();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(auditCalls).toBe(4);
    expect(notificationCalls).toBe(4);
    stop();
    expect(cleared).toHaveLength(1);
  });
});