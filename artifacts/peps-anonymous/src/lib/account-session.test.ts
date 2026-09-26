import assert from "node:assert/strict";
import { test } from "node:test";
import {
  readAccountSessionResponse,
  shouldRefreshAccountSession,
} from "./account-session.ts";

const restrictedAccount = {
  telegramUsername: "",
  verificationRequired: true,
};

test("only an explicit unauthorized response means the account is signed out", async () => {
  assert.equal(
    await readAccountSessionResponse(new Response(null, { status: 401 }), restrictedAccount),
    null,
  );
  await assert.rejects(
    readAccountSessionResponse(new Response(null, { status: 503 }), restrictedAccount),
    /503/,
  );
});

test("preserves the verification-required account response", async () => {
  const response = new Response(JSON.stringify({ error: "verification_required" }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
  assert.deepEqual(await readAccountSessionResponse(response, restrictedAccount), restrictedAccount);
});

test("refreshes no more than once per activity interval", () => {
  assert.equal(shouldRefreshAccountSession(0, 600_000), true);
  assert.equal(shouldRefreshAccountSession(600_000, 600_001), false);
  assert.equal(shouldRefreshAccountSession(600_000, 900_000), true);
});