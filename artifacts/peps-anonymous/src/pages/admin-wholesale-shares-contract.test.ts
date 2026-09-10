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