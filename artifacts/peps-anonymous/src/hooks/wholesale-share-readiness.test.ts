import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { QueryClient } from "@tanstack/react-query";
import { applyWholesaleShareResponse, type WholesaleShareDetail } from "./use-wholesale-shares";

test("saved items immediately replace stale readiness and cannot be overwritten by an older poll", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = ["wholesale-share", "synthetic"];
  const oldShare = { members: [{ kits: 0, canConfirm: false, isConfirmed: false }] } as WholesaleShareDetail;
  const savedShare = { members: [{ kits: 2, canConfirm: true, isConfirmed: false }] } as WholesaleShareDetail;
  client.setQueryData(key, { ok: true, share: oldShare });
  let finishPoll!: (value: unknown) => void;
  const poll = client.fetchQuery({ queryKey: key, queryFn: () => new Promise(resolve => { finishPoll = resolve; }) }).catch(() => {});
  await applyWholesaleShareResponse(client, "synthetic", savedShare);
  assert.deepEqual(client.getQueryData(key), { ok: true, share: savedShare });
  finishPoll({ ok: true, share: oldShare });
  await poll;
  assert.deepEqual(client.getQueryData(key), { ok: true, share: savedShare });
  client.clear();
});

test("confirmed readiness is immediately shown from the confirmation response", async () => {
  const client = new QueryClient();
  const saved = { members: [{ kits: 2, canConfirm: true, isConfirmed: true }] } as WholesaleShareDetail;
  await applyWholesaleShareResponse(client, "synthetic", saved);
  assert.deepEqual(client.getQueryData(["wholesale-share", "synthetic"]), { ok: true, share: saved });
  client.clear();
});

test("confirmation is visible outside collapsed details in both setup and normal views", () => {
  const source = readFileSync(new URL("../pages/WholesaleShared.tsx", import.meta.url), "utf8");
  const fullView = source.slice(source.indexOf("const fullView ="));
  assert.match(fullView, /\{confirmationAction\}/);
  const details = source.slice(source.indexOf('title="Group & order details"'), source.indexOf("const sectionMyItems ="));
  assert.doesNotMatch(details, /\{confirmationAction\}/);
  assert.match(source, /disabled=\{!myMember\.canConfirm \|\| itemsDirty \|\| busy !== null\}/);
  assert.match(source, /const updated = await setWholesaleShareItems/);
  assert.match(source, /await applyWholesaleShareResponse\(queryClient, id, updated\);\s*setItemsDirty\(false\)/);
  assert.match(source, /const updated = await confirmWholesaleShare/);
});
