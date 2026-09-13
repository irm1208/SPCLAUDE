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
    stopAllSchedulers();
    await expect(runSchedulerNow("refund-notifications-failure-test")).resolves.toMatchObject({
      ok: false,
      error: "audit channel unavailable",
    });
    vi.advanceTimersByTime(1_000);
    expect(runs).toBe(1);
  });
});