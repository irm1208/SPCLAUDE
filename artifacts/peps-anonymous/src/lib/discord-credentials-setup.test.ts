import assert from "node:assert/strict";
import test from "node:test";
import { getDiscordSetupStep, submitDiscordSetup } from "./discord-credentials-setup";

test("only incomplete, known Discord-linked account states need setup", () => {
  const base = { telegramUsername: "discord:42", discordLinked: true };
  assert.equal(getDiscordSetupStep({ ...base, hasPassword: false }), "password");
  assert.equal(getDiscordSetupStep({ ...base, hasPassword: true }), "username");
  assert.equal(getDiscordSetupStep({ ...base, telegramUsername: "chosen", hasPassword: false }), "password");
  assert.equal(getDiscordSetupStep({ ...base, telegramUsername: "chosen", hasPassword: true }), "complete");
  assert.equal(getDiscordSetupStep({ ...base, discordLinked: false, hasPassword: false }), "complete");
  assert.equal(getDiscordSetupStep(base), "complete");
  assert.equal(getDiscordSetupStep({ ...base, discordLinked: "yes" as unknown as boolean, hasPassword: false }), "complete");
  assert.equal(getDiscordSetupStep(null), "complete");
});

test("first-password submission does not send a current password", async () => {
  const calls: Array<{ url: string; body: unknown }> = [];
  const fakeFetch = async (url: string, options: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(options.body)) });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  await submitDiscordSetup("password", { password: "SafePassword9!" }, fakeFetch);
  assert.deepEqual(calls, [{
    url: "/api/account/set-password", body: { password: "SafePassword9!" },
  }]);
});

test("a rejected username can be retried without repeating password creation", async () => {
  const paths: string[] = [];
  let attempts = 0;
  const fakeFetch = async (url: string) => {
    paths.push(url);
    attempts += 1;
    return new Response(JSON.stringify(attempts === 1
      ? { error: "That username is already taken" }
      : { ok: true, newUsername: "available_name" }), {
      status: attempts === 1 ? 409 : 200,
    });
  };
  const fields = { newUsername: "taken_name", currentPassword: "SafePassword9!" };
  await assert.rejects(submitDiscordSetup("username", fields, fakeFetch), /already taken/);
  await submitDiscordSetup("username", { ...fields, newUsername: "available_name" }, fakeFetch);
  assert.deepEqual(paths, ["/api/account/change-username", "/api/account/change-username"]);
});