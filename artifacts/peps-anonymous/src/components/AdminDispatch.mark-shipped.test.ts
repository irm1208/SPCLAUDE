import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

test("pending Mark Shipped sends selected orders through the configured authenticated dispatch route", async () => {
  const source = readFileSync(new URL("./AdminDispatch.tsx", import.meta.url), "utf8");
  const body = source.split("const handleMarkPendingShipped = async () => {")[1]
    .split("\n  const handleMarkUnfulfillableShipped")[0]
    .replace(/;\s*$/, "");
  const calls: Array<{ path: string; options: RequestInit }> = [];
  let message: { ok: boolean; text: string } | null = null;
  const handler = runInNewContext(`(async () => {${body})`, {
    selectedGb: "L5NG6",
    apiUrl: (path: string) => path,
    fetch: async () => { throw new Error("Must use authenticated dispatch fetch"); },
    ovPendingSelected: new Set(["order-selected"]),
    ovPending: [{ id: "order-selected" }, { id: "order-other" }],
    cfg: {
      base: "/organiser/dispatch",
      dfetch: async (path: string, options: RequestInit) => {
        calls.push({ path, options });
        return { ok: true, json: async () => ({ marked: 1 }) };
      },
    },
    setMarkingPending: () => {},
    setMarkPendingMsg: (value: typeof message) => { message = value; },
    setOverviewOrders: () => {},
    setOvPendingSelected: () => {},
    Set,
  });
  await handler();
  assert.equal(calls.length, 1, JSON.stringify(message));
  assert.equal(calls[0].path, "/organiser/dispatch/L5NG6/mark-orders-shipped");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body as string), { orderIds: ["order-selected"] });
  assert.equal((message as unknown as { ok: boolean }).ok, true);
});