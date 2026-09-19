import assert from "node:assert/strict";
import test from "node:test";
import { buildSageDiscussRequestBody } from "./sage-discuss-request.ts";

test("preserves the selected blood-test session in Sage requests", () => {
  const body = buildSageDiscussRequestBody({
    message: "Explain my latest bloodwork",
    sessionId: "session-voy-2026-09-18",
    history: [{ role: "user", content: "What should I watch?" }],
  });

  assert.deepEqual(body, {
    message: "Explain my latest bloodwork",
    sessionId: "session-voy-2026-09-18",
    history: [{ role: "user", content: "What should I watch?" }],
  });
});