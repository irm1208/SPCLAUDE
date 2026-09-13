import { describe, expect, it } from "vitest";
import {
  groupBuyRefundNotificationsTable,
  groupBuyRefundTransitionOutboxTable,
} from "@workspace/db";
import { REGISTRY_MAP } from "./telegram-registry";
import {
  buildRefundNotificationVars,
  REFUND_NOTIFICATION_EVENT_KEYS,
  transitionKeyFor,
  auditRefundTransition,
  drainRefundAudits,
  drainRefundNotifications,
  enqueueRefundNotification,
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
    });
    expect(JSON.stringify(vars)).not.toMatch(/private|processor|secret|password/i);
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
    const aDrain = drainRefundNotifications(db, {
      limit: 1,
      tokenFactory: () => "token-1",
      sender: async (marker) => {
        db.deliveryToken = marker.claimToken ?? null;
        aEntered();
        await aBlocked;
        return { ok: true };
      },
    });
    await aStarted;
    db.now += 5 * 60 * 1000 + 1;
    db.notifications[0].claimedAt = new Date(db.now - 5 * 60 * 1000 - 1);
    const bResult = await drainRefundNotifications(db, {
      limit: 1,
      tokenFactory: () => "token-2",
      sender: async (marker) => {
        db.deliveryToken = marker.claimToken ?? null;
        return { ok: true };
      },
    });
    expect(bResult).toBe(1);
    releaseA();
    await aDrain;
    expect(db.notifications[0].sentAt).toBeDefined();
    expect(db.notifications[0].claimToken).toBeNull();
    expect(db.notifications[0].claimedAt).toBeNull();
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
    const aDrain = drainRefundNotifications(db, {
      limit: 1,
      tokenFactory: () => "token-1",
      sender: async (marker) => {
        db.deliveryToken = marker.claimToken ?? null;
        aEntered();
        await aBlocked;
        throw new Error("late worker failure");
      },
    });
    await aStarted;
    db.now += 5 * 60 * 1000 + 1;
    db.notifications[0].claimedAt = new Date(db.now - 5 * 60 * 1000 - 1);
    db["selected"].clear();
    expect(await drainRefundNotifications(db, {
      limit: 1,
      tokenFactory: () => "token-2",
      sender: async (marker) => {
        db.deliveryToken = marker.claimToken ?? null;
        return { ok: true };
      },
    })).toBe(1);
    releaseA();
    await aDrain;
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
        return 0;
      },
    });
    await Promise.resolve();
    callbacks[0]?.();
    callbacks[0]?.();
    expect(auditCalls).toBe(1);
    releaseFirst();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    callbacks[0]?.();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(auditCalls).toBe(2);
    expect(notificationCalls).toBe(1);
    stop();
    expect(cleared).toHaveLength(1);
  });
});