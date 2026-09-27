export interface ImportAttempt<T> {
  status: number;
  data: T;
}

export interface ImportRetryOptions {
  maxDurationMs?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  shouldStop?: () => boolean;
  onRetry?: (nextAttempt: number, delayMs: number) => void;
  wait?: (delayMs: number) => Promise<void>;
}

const defaultWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function isTransientImportFailure(status: number, data: unknown): boolean {
  if (status === 502 || status === 503 || status === 504) return true;
  if (status !== 500) return false;

  // Application responses carry a structured error; an unstructured 500 is
  // commonly the reverse proxy while the app process is restarting.
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    if (typeof record.error === "string" || typeof record.message === "string") return false;
  }
  return true;
}

function isNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  return error instanceof Error && /network|fetch|connection|socket|timed?\s*out/i.test(error.message);
}

function isTransientAttemptError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const candidate = error as {
      response?: { status?: unknown };
      body?: unknown;
    };
    const status = candidate.response?.status;
    if (typeof status === "number" && isTransientImportFailure(status, candidate.body)) return true;
  }
  return isNetworkFailure(error);
}

export async function retryImportRequest<T>(
  attempt: () => Promise<ImportAttempt<T>>,
  options: ImportRetryOptions = {},
): Promise<ImportAttempt<T>> {
  const maxDurationMs = options.maxDurationMs ?? 120_000;
  const initialDelayMs = options.initialDelayMs ?? 1_000;
  const maxDelayMs = options.maxDelayMs ?? 10_000;
  const wait = options.wait ?? defaultWait;
  const startedAt = Date.now();
  let attempts = 0;

  while (true) {
    if (attempts > 0 && options.shouldStop?.()) throw new Error("Import stopped.");
    attempts++;
    let result: ImportAttempt<T> | undefined;
    try {
      result = await attempt();
    } catch (error) {
      if (!isTransientAttemptError(error)) throw error;
      if (Date.now() - startedAt >= maxDurationMs) {
        throw new Error("The import retry window expired after repeated network errors.");
      }
    }

    if (result) {
      if (!isTransientImportFailure(result.status, result.data)) return result;
      if (Date.now() - startedAt >= maxDurationMs) {
        throw new Error("The import retry window expired while the server was unavailable.");
      }
    }

    if (options.shouldStop?.()) throw new Error("Import stopped.");
    const delayMs = Math.min(initialDelayMs * 2 ** (attempts - 1), maxDelayMs);
    options.onRetry?.(attempts + 1, delayMs);
    const remainingMs = maxDurationMs - (Date.now() - startedAt);
    if (remainingMs <= 0) throw new Error("The import retry window expired.");
    const waitMs = Math.min(delayMs, remainingMs);
    if (options.wait) {
      await wait(waitMs);
    } else {
      let waitedMs = 0;
      while (waitedMs < waitMs && !options.shouldStop?.()) {
        const stepMs = Math.min(250, waitMs - waitedMs);
        await wait(stepMs);
        waitedMs += stepMs;
      }
    }
  }
}