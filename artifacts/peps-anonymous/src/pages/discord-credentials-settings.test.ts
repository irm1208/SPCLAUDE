import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const portal = readFileSync(new URL("./CustomerPortal.tsx", import.meta.url), "utf8");
const secondary = readFileSync(new URL("./AccountOrders.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/DashboardShell.tsx", import.meta.url), "utf8");
test("dashboard account chrome resolves the Discord display name rather than the canonical identity", () => {
  assert.match(shell, /getAccountHandle\(account\)/);
  assert.doesNotMatch(shell, />@\{username\}<\/(?:span|p)>/);
});
test("Discord sign-in opens a global popup rather than an inline-only profile prompt", () => {
  assert.match(app, /<DiscordLoginSetupModal/);
});
test("profile settings include a separate linked Discord identity section", () => {
  assert.match(portal, /<LinkedDiscordIdentity/);
  assert.match(secondary, /<LinkedDiscordIdentity/);
});
test("main settings host the shared setup and a post-login skip action", () => {
  assert.match(portal, /<DiscordCredentialsSetup/);
  assert.match(portal, /get\("discord_setup"\) === "1"/);
  assert.match(portal, /!cameFromDiscordSetup && <DiscordCredentialsSetup/);
  assert.match(portal, /hidden=\{needsDiscordSetup\}/);
});
test("secondary profile uses the same setup without claiming identity is immutable", () => {
  assert.match(secondary, /<DiscordCredentialsSetup/);
  assert.match(secondary, /hidden=\{needsDiscordSetup\}/);
  assert.match(secondary, /Manage your site login in Account Settings/);
});