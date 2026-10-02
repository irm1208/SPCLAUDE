import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const portal = readFileSync(new URL("./CustomerPortal.tsx", import.meta.url), "utf8");
const secondary = readFileSync(new URL("./AccountOrders.tsx", import.meta.url), "utf8");
test("main settings host the shared setup and a post-login skip action", () => {
  assert.match(portal, /<DiscordCredentialsSetup/);
  assert.match(portal, /get\("discord_setup"\) === "1"/);
  assert.match(portal, /onSkip=/);
  assert.match(portal, /hidden=\{needsDiscordSetup\}/);
});
test("secondary profile uses the same setup without claiming identity is immutable", () => {
  assert.match(secondary, /<DiscordCredentialsSetup/);
  assert.match(secondary, /hidden=\{needsDiscordSetup\}/);
  assert.match(secondary, /Manage your site login in Account Settings/);
});