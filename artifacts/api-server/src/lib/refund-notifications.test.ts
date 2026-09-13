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
} from "./refund-notifications";

class PersistedFakeDb {
  notifications: any[] = [];
  audits: any[] = [];
  auditMarkers: any[] = [];
  failAuditInsert = false;
  private claimed = new Set<string>();

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
                  state.notifications.push(value);
                  return [value];
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
      limit() { return query; },
      from(table: unknown) { query.table = table; return query; },
      where() { return query; },
      orderBy() { return query; },
      for() { return Promise.resolve(query.rows()); },
      then(resolve: (value: any[]) => unknown) { return Promise.resolve(query.rows()).then(resolve); },
      rows() {
        if (query.table === groupBuyRefundNotificationsTable) {
          return state.notifications.filter((row) => !row.sentAt && !state.claimed.has(row.id)).slice(0, 1);
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
              if (applied) return [];
              applied = true;
              const rows = table === groupBuyRefundNotificationsTable ? state.notifications : state.auditMarkers;
              const row = rows.find((candidate) => !candidate.sentAt || table !== groupBuyRefundNotificationsTable);
              if (!row) return [];
              if (table === groupBuyRefundNotificationsTable && values.claimedAt && state.claimed.has(row.id)) return [];
              Object.assign(row, values);
              if (table === groupBuyRefundNotificationsTable && values.claimToken) {
                state.claimed.add(row.id);
              }
              if (table === groupBuyRefundNotificationsTable && values.claimedAt) state.claimed.add(row.id);
              if (table === groupBuyRefundNotificationsTable && values.claimedAt === null) state.claimed.delete(row.id);
              if (table === groupBuyRefundNotificationsTable && values.claimToken === null) state.claimed.delete(row.id);
              if (table === groupBuyRefundNotificationsTable && values.sentAt) state.claimed.delete(row.id);
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
    expect(db.notifications[0].sentAt).toBeUndefined();
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
});