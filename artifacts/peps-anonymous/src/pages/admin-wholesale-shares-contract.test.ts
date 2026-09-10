import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(new URL("./Admin.tsx", import.meta.url), "utf8");

test("admin shared orders expose force-lock and organiser wallet controls", () => {
  assert.match(source, /\/admin\/wholesale-shares\/\$\{row\.id\}\/force-lock/);
  assert.match(source, /Force lock/);
  assert.match(source, /unconfirmed members/i);
  assert.match(source, /organiser-wallets/);
  assert.match(source, /Organiser payment wallets/);
  assert.match(source, /leadCryptoOptions/);
});

test("admin mutations distinguish transport failure from refresh failure", () => {
  assert.match(source, /throw new Error\(`Failed to refresh shared order/);
  assert.match(source, /Could not confirm force lock/);
  assert.match(source, /Force lock succeeded, but refreshing/);
  assert.match(source, /Could not save organiser wallets/);
  assert.match(source, /Could not refresh organiser wallets after saving/);
  assert.match(source, /outcome is unknown/);
  assert.match(source, /succeeded, but refreshing/);
});

test("remaining admin mutations distinguish unknown outcomes from refresh failures", () => {
  assert.match(source, /Could not confirm member removal; the outcome is unknown/);
  assert.match(source, /Members were removed, but refreshing/);
  assert.match(source, /Could not confirm organiser payment; the outcome is unknown/);
  assert.match(source, /Organiser payment was confirmed, but refreshing/);
  assert.match(source, /Could not confirm adjustment; the outcome is unknown/);
  assert.match(source, /Adjustment succeeded, but refreshing/);
});