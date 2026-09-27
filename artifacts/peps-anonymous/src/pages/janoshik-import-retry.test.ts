import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const loadRetry = async () => {
  const modulePath = "./janoshik-import-retry";
  return import(modulePath).catch(() => null);
};

test("retry loop retries transient statuses and network failures, but not application errors", async () => {
  const retry = await loadRetry();
  assert.ok(retry, "janoshik-import-retry helper should exist");
  if (!retry) return;

  for (const status of [502, 503, 504]) {
    assert.equal(retry.isTransientImportFailure(status, {}), true);
  }
  assert.equal(retry.isTransientImportFailure(500, "upstream unavailable"), true);
  assert.equal(retry.isTransientImportFailure(500, { error: "Validation failed" }), false);
  assert.equal(retry.isTransientImportFailure(400, {}), false);
  assert.equal(retry.isTransientImportFailure(401, {}), false);
  assert.equal(retry.isTransientImportFailure(403, {}), false);

  let attempts = 0;
  const retryNotices: number[] = [];
  const result = await retry.retryImportRequest(
    async () => {
      attempts++;
      if (attempts < 3) {
        if (attempts === 1) throw new TypeError("Failed to fetch");
        return { status: 503, data: { error: "Application is starting" } };
      }
      return { status: 200, data: { imported: true } };
    },
    {
      maxDurationMs: 1_000,
      initialDelayMs: 0,
      maxDelayMs: 0,
      wait: async () => {},
      onRetry: (attempt) => retryNotices.push(attempt),
    },
  );

  assert.deepEqual(result, { status: 200, data: { imported: true } });
  assert.equal(attempts, 3);
  assert.deepEqual(retryNotices, [2, 3]);
});

test("retry loop stops at the per-report deadline and honors stop requests", async () => {
  const retry = await loadRetry();
  assert.ok(retry, "janoshik-import-retry helper should exist");
  if (!retry) return;

  let attempts = 0;
  await assert.rejects(
    retry.retryImportRequest(
      async () => {
        attempts++;
        return { status: 503, data: {} };
      },
      {
        maxDurationMs: 0,
        initialDelayMs: 0,
        maxDelayMs: 0,
        wait: async () => {},
      },
    ),
    /retry window expired/i,
  );
  assert.equal(attempts, 1);

  attempts = 0;
  await assert.rejects(
    retry.retryImportRequest(
      async () => {
        attempts++;
        return { status: 502, data: {} };
      },
      {
        maxDurationMs: 1_000,
        initialDelayMs: 0,
        maxDelayMs: 0,
        wait: async () => {},
        shouldStop: () => true,
      },
    ),
    /stopped/i,
  );
  assert.equal(attempts, 1);
});

test("retry loop retries transient AdminApiError rejections but not auth or structured app errors", async () => {
  const retry = await loadRetry();
  assert.ok(retry, "janoshik-import-retry helper should exist");
  if (!retry) return;

  const apiError = (status: number, body: unknown) =>
    Object.assign(new Error(`HTTP ${status}`), { response: { status }, body });
  let attempts = 0;
  const recovered = await retry.retryImportRequest(
    async () => {
      attempts++;
      if (attempts === 1) throw apiError(503, { error: "Application is starting" });
      return { status: 200, data: { ready: true } };
    },
    { initialDelayMs: 0, maxDelayMs: 0, wait: async () => {} },
  );
  assert.equal(recovered.status, 200);
  assert.equal(attempts, 2);

  for (const status of [401, 403, 500]) {
    attempts = 0;
    await assert.rejects(
      retry.retryImportRequest(
        async () => {
          attempts++;
          throw apiError(status, status === 500 ? { error: "Invalid report" } : {});
        },
        { initialDelayMs: 0, maxDelayMs: 0, wait: async () => {} },
      ),
    );
    assert.equal(attempts, 1);
  }
});

test("single receiver retries captured reports and exposes its retry wait state", () => {
  const receiver = readFileSync(new URL("./JanoshikReceiver.tsx", import.meta.url), "utf8");
  const singleReceiver = receiver.split("// ── Bulk mode")[0];

  assert.match(singleReceiver, /retryImportRequest/);
  assert.match(singleReceiver, /setStatus\("retrying"\)/);
  assert.match(singleReceiver, /initializeAdminRequestAuth/);
  assert.match(singleReceiver, /Captured report images will be reused/);
});