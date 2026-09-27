import assert from "node:assert/strict";
import test from "node:test";

test("an idle database connection error does not crash the API process", async () => {
  process.env.DATABASE_URL ||= "postgresql://localhost/test";
  const { pool } = await import("./index.ts");
  const messages: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => { messages.push(args.map(String).join(" ")); };
  try {
    assert.doesNotThrow(() => pool.emit("error", new Error("Connection terminated unexpectedly")));
    assert.ok(messages.some(message => message.includes("Connection terminated unexpectedly")));
  } finally {
    console.error = originalError;
  }
});