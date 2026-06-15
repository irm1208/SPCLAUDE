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

async function tick(state: RuntimeState): Promise<void> {
  if (state.running || !state.enabled) {
    schedule(state);
    return;
  }
  state.running = true;
  const start = Date.now();
  try {
    await state.desc.run();
    state.lastError = null;
  } catch (err: any) {
    state.lastError = err?.message ? String(err.message) : String(err);
    console.error(`[scheduler:${state.desc.name}] Error:`, err);
  } finally {
    state.lastRunAt = Date.now();
    state.lastDurationMs = state.lastRunAt - start;
    state.running = false;
    schedule(state);
  }
}

function schedule(state: RuntimeState): void {
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
  };
  registry.set(desc.name, state);

  // Load overrides + start scheduling after the initial delay.
  setTimeout(async () => {
    await loadOverrides(state);
    if (state.enabled) {
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
  if (state.running) return { ok: false, error: "Already running" };
  state.running = true;
  const start = Date.now();
  try {
    await state.desc.run();
    state.lastError = null;
  } catch (err: unknown) {
    state.lastError = err instanceof Error ? err.message : String(err);
    console.error(`[scheduler:${name}] Manual run failed:`, err);
  } finally {
    state.lastRunAt = Date.now();
    state.lastDurationMs = state.lastRunAt - start;
    state.running = false;
  }
  return { ok: true };
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
