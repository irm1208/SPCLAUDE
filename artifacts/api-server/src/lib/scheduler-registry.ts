import { db, siteConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface SchedulerDescriptor {
  name: string;
  label: string;
  description: string;
  defaultIntervalMs: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  initialDelayMs: number;
  run: () => Promise<void>;
  backlogCount?: () => Promise<number | Record<string, unknown>>;
  channelStatus?: () => Record<string, unknown>;
}

export interface SchedulerStatus {
  name: string;
  label: string;
  description: string;
  defaultIntervalMs: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  intervalMs: number;
  enabled: boolean;
  running: boolean;
  lastRunAt: string | null;
  lastDurationMs: number | null;
  lastError: string | null;
  nextRunAt: string | null;
  backlogCount: number | Record<string, unknown> | null;
  channelStatus: Record<string, unknown> | null;
}

interface RuntimeState {
  desc: SchedulerDescriptor;
  intervalMs: number;
  enabled: boolean;
  running: boolean;
  lastRunAt: number | null;
  lastDurationMs: number | null;
  lastError: string | null;
  nextRunAt: number | null;
  timer: NodeJS.Timeout | null;
  initialTimer: NodeJS.Timeout | null;
  stopped: boolean;
  backlogCount: number | Record<string, unknown> | null;
  channelStatus: Record<string, unknown> | null;
}

const registry = new Map<string, RuntimeState>();

function intervalKey(name: string) { return `scheduler.${name}.intervalMs`; }
function enabledKey(name: string) { return `scheduler.${name}.enabled`; }

async function readConfig(key: string): Promise<string | null> {
  try {
    const [row] = await db.select({ value: siteConfigTable.value }).from(siteConfigTable).where(eq(siteConfigTable.key, key));
    return row?.value ?? null;
  } catch { return null; }
}

async function writeConfig(key: string, value: string) {
  await db.insert(siteConfigTable).values({ key, value }).onConflictDoUpdate({ target: siteConfigTable.key, set: { value } });
}

async function loadOverrides(state: RuntimeState): Promise<void> {
  const [rawInterval, rawEnabled] = await Promise.all([
    readConfig(intervalKey(state.desc.name)),
    readConfig(enabledKey(state.desc.name)),
  ]);
  if (rawInterval) {
    const n = parseInt(rawInterval, 10);
    if (!isNaN(n) && n >= state.desc.minIntervalMs && n <= state.desc.maxIntervalMs) {
      state.intervalMs = n;
    }
  }
  if (rawEnabled === "false") state.enabled = false;
}

async function refreshPublishedStatus(state: RuntimeState): Promise<void> {
  const failures: unknown[] = [];
  if (state.desc.backlogCount) {
    try {
      state.backlogCount = await state.desc.backlogCount();
    } catch (error) {
      failures.push(error);
    }
  }
  if (state.desc.channelStatus) {
    try {
      state.channelStatus = state.desc.channelStatus();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) {
    throw new AggregateError(failures, "Unable to refresh scheduler status");
  }
}

async function tick(state: RuntimeState): Promise<void> {
  if (state.stopped || state.running || !state.enabled) {
    schedule(state);
    return;
  }
  state.running = true;
  const start = Date.now();
  let runFailed = false;
  try {
    await state.desc.run();
    state.lastError = null;
  } catch (err: any) {
    runFailed = true;
    state.lastError = err?.message ? String(err.message) : String(err);
    console.error(`[scheduler:${state.desc.name}] Error:`, err);
  } finally {
    try {
      await refreshPublishedStatus(state);
      if (!runFailed) state.lastError = null;
    } catch (err: any) {
      if (!runFailed) state.lastError = err?.message ? String(err.message) : String(err);
    }
    state.lastRunAt = Date.now();
    state.lastDurationMs = state.lastRunAt - start;
    state.running = false;
    schedule(state);
  }
}

function schedule(state: RuntimeState): void {
  if (state.stopped) return;
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  if (!state.enabled) {
    state.nextRunAt = null;
    return;
  }
  state.nextRunAt = Date.now() + state.intervalMs;
  state.timer = setTimeout(() => { void tick(state); }, state.intervalMs);
}

export function registerScheduler(desc: SchedulerDescriptor): void {
  if (registry.has(desc.name)) {
    console.warn(`[scheduler-registry] '${desc.name}' already registered — replacing`);
    const existing = registry.get(desc.name)!;
    if (existing.timer) clearTimeout(existing.timer);
    if (existing.initialTimer) clearTimeout(existing.initialTimer);
    existing.stopped = true;
  }
  const state: RuntimeState = {
    desc,
    intervalMs: desc.defaultIntervalMs,
    enabled: true,
    running: false,
    lastRunAt: null,
    lastDurationMs: null,
    lastError: null,
    nextRunAt: null,
    timer: null,
    initialTimer: null,
    stopped: false,
    backlogCount: null,
    channelStatus: null,
  };
  registry.set(desc.name, state);

  // Load overrides + start scheduling after the initial delay.
  state.initialTimer = setTimeout(async () => {
    state.initialTimer = null;
    if (state.stopped) return;
    await loadOverrides(state);
    if (!state.stopped && state.enabled) {
      void tick(state);
    } else {
      console.log(`[scheduler:${desc.name}] Disabled via site_config — not running`);
    }
  }, desc.initialDelayMs);
}

export function listSchedulers(): SchedulerStatus[] {
  return [...registry.values()].map(s => ({
    name: s.desc.name,
    label: s.desc.label,
    description: s.desc.description,
    defaultIntervalMs: s.desc.defaultIntervalMs,
    minIntervalMs: s.desc.minIntervalMs,
    maxIntervalMs: s.desc.maxIntervalMs,
    intervalMs: s.intervalMs,
    enabled: s.enabled,
    running: s.running,
    lastRunAt: s.lastRunAt ? new Date(s.lastRunAt).toISOString() : null,
    lastDurationMs: s.lastDurationMs,
    lastError: s.lastError,
    nextRunAt: s.nextRunAt ? new Date(s.nextRunAt).toISOString() : null,
    backlogCount: s.backlogCount,
    channelStatus: s.channelStatus,
  }));
}

/**
 * Run the scheduler immediately, regardless of whether it's currently enabled.
 * The next interval still depends on `enabled`, so a one-off run on a disabled
 * scheduler will not also re-arm the timer.
 */
export async function runSchedulerNow(name: string): Promise<{ ok: boolean; error?: string }> {
  const state = registry.get(name);
  if (!state) return { ok: false, error: "Unknown scheduler" };
  if (state.stopped) return { ok: false, error: "Scheduler stopped" };
  if (state.running) return { ok: false, error: "Already running" };
  state.running = true;
  const start = Date.now();
  let failed = false;
  try {
    await state.desc.run();
    state.lastError = null;
  } catch (err: unknown) {
    failed = true;
    state.lastError = err instanceof Error ? err.message : String(err);
    console.error(`[scheduler:${name}] Manual run failed:`, err);
  } finally {
    try {
      await refreshPublishedStatus(state);
    } catch (err: unknown) {
      if (!failed) {
        failed = true;
        state.lastError = err instanceof Error ? err.message : String(err);
      }
    }
    state.lastRunAt = Date.now();
    state.lastDurationMs = state.lastRunAt - start;
    state.running = false;
  }
  return failed ? { ok: false, error: state.lastError ?? "Scheduler failed" } : { ok: true };
}

export async function setSchedulerInterval(name: string, intervalMs: number): Promise<{ ok: boolean; error?: string }> {
  const state = registry.get(name);
  if (!state) return { ok: false, error: "Unknown scheduler" };
  if (!Number.isFinite(intervalMs) || intervalMs < state.desc.minIntervalMs || intervalMs > state.desc.maxIntervalMs) {
    return { ok: false, error: `Interval must be between ${state.desc.minIntervalMs}ms and ${state.desc.maxIntervalMs}ms` };
  }
  state.intervalMs = Math.floor(intervalMs);
  await writeConfig(intervalKey(name), String(state.intervalMs));
  schedule(state);
  return { ok: true };
}

export async function setSchedulerEnabled(name: string, enabled: boolean): Promise<{ ok: boolean; error?: string }> {
  const state = registry.get(name);
  if (!state) return { ok: false, error: "Unknown scheduler" };
  state.enabled = enabled;
  await writeConfig(enabledKey(name), enabled ? "true" : "false");
  schedule(state);
  return { ok: true };
}

/** Stop every registry timer during process shutdown. */
export function stopAllSchedulers(): void {
  for (const state of registry.values()) {
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
    if (state.initialTimer) clearTimeout(state.initialTimer);
    state.initialTimer = null;
    state.stopped = true;
    state.nextRunAt = null;
    state.channelStatus = state.desc.channelStatus ? state.desc.channelStatus() : state.channelStatus;
  }
}
