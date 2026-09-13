import { afterEach, describe, expect, it, vi } from "vitest";

const fakeDb = vi.hoisted(() => ({
  db: {
    select: () => ({ from: () => ({ where: async () => [] }) }),
    insert: () => ({ values: () => ({ onConflictDoUpdate: async () => undefined }) }),
  },
  siteConfigTable: { key: "key", value: "value" },
}));

vi.mock("@workspace/db", () => fakeDb);

import {
  listSchedulers,
  registerScheduler,
  runSchedulerNow,
  stopAllSchedulers,
} from "./scheduler-registry";

describe("scheduler registry refund integration contract", () => {
  afterEach(() => {
    stopAllSchedulers();
    vi.useRealTimers();
  });

  it("exposes a registered drain's manual run and backlog status", async () => {
    vi.useFakeTimers();
    let runs = 0;
    registerScheduler({
      name: "refund-notifications-test",
      label: "Refund notifications",
      description: "test",
      defaultIntervalMs: 60_000,
      minIntervalMs: 5_000,
      maxIntervalMs: 86_400_000,
      initialDelayMs: 86_400_000,
      run: async () => { runs += 1; },
      backlogCount: async () => 3,
    });

    await expect(runSchedulerNow("refund-notifications-test")).resolves.toEqual({ ok: true });
    const status = listSchedulers().find(item => item.name === "refund-notifications-test");
    expect(runs).toBe(1);
    expect(status).toMatchObject({
      name: "refund-notifications-test",
      running: false,
      lastError: null,
      backlogCount: 3,
    });
  });

  it("reports a failed manual drain and cancels delayed startup", async () => {
    vi.useFakeTimers();
    let runs = 0;
    registerScheduler({
      name: "refund-notifications-failure-test",
      label: "Refund notifications",
      description: "test",
      defaultIntervalMs: 60_000,
      minIntervalMs: 5_000,
      maxIntervalMs: 86_400_000,
      initialDelayMs: 1_000,
      run: async () => {
        runs += 1;
        throw new Error("audit channel unavailable");
      },
    });
    await expect(runSchedulerNow("refund-notifications-failure-test")).resolves.toMatchObject({
      ok: false,
      error: "audit channel unavailable",
    });
    stopAllSchedulers();
    vi.advanceTimersByTime(1_000);
    expect(runs).toBe(1);
  });

  it("publishes failed channel status and backlog after a scheduled failure", async () => {
    vi.useFakeTimers();
    let channelError = "audit unavailable";
    registerScheduler({
      name: "refund-channel-failure-test",
      label: "Refund notifications",
      description: "test",
      defaultIntervalMs: 60_000,
      minIntervalMs: 5_000,
      maxIntervalMs: 86_400_000,
      initialDelayMs: 86_400_000,
      run: async () => { throw new Error(channelError); },
      backlogCount: async () => ({ total: 4, audit: 2, notification: 2 }),
      channelStatus: () => ({
        audit: { lastError: channelError },
        notification: { lastError: null },
      }),
    });
    const result = await runSchedulerNow("refund-channel-failure-test");
    const status = listSchedulers().find(item => item.name === "refund-channel-failure-test");
    expect(result).toMatchObject({ ok: false, error: channelError });
    expect(status).toMatchObject({
      lastError: channelError,
      backlogCount: { total: 4, audit: 2, notification: 2 },
      channelStatus: { audit: { lastError: channelError }, notification: { lastError: null } },
    });
    channelError = "notification unavailable";
    const second = await runSchedulerNow("refund-channel-failure-test");
    expect(second).toMatchObject({ ok: false, error: channelError });
    expect(listSchedulers().find(item => item.name === "refund-channel-failure-test")).toMatchObject({
      channelStatus: { audit: { lastError: channelError } },
    });
  });

  it("rejects manual execution after the scheduler is stopped", async () => {
    vi.useFakeTimers();
    let runs = 0;
    registerScheduler({
      name: "refund-stopped-test",
      label: "Refund notifications",
      description: "test",
      defaultIntervalMs: 60_000,
      minIntervalMs: 5_000,
      maxIntervalMs: 86_400_000,
      initialDelayMs: 86_400_000,
      run: async () => { runs += 1; },
    });
    stopAllSchedulers();
    await expect(runSchedulerNow("refund-stopped-test")).resolves.toEqual({
      ok: false,
      error: "Scheduler stopped",
    });
    expect(runs).toBe(0);
  });
});