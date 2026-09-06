import { describe, expect, it } from "vitest";
import { verifyTurnstile } from "./turnstile";

describe("verifyTurnstile", () => {
  it("fails closed for a missing token or production secret", async () => {
    await expect(verifyTurnstile({ token: "" }, { secretKey: "test-secret" })).resolves.toEqual({ ok: false });
    await expect(verifyTurnstile({ token: "token" }, { secretKey: "", production: true })).resolves.toEqual({ ok: false });
  });

  it("posts its secret, response token, and optional remote IP to siteverify", async () => {
    const fetchFn = async (url: string, init?: RequestInit) => {
      expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe("secret=secret&response=token&remoteip=127.0.0.1");
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };

    await expect(verifyTurnstile(
      { token: "token", remoteIp: "127.0.0.1" },
      { secretKey: "secret", fetchFn },
    )).resolves.toEqual({ ok: true });
  });

  it("rejects unsuccessful and malformed siteverify responses", async () => {
    const badResponse = async () => new Response(JSON.stringify({ success: false }), { status: 200 });
    const malformedResponse = async () => new Response("not-json", { status: 200 });

    await expect(verifyTurnstile({ token: "token" }, { secretKey: "secret", fetchFn: badResponse })).resolves.toEqual({ ok: false });
    await expect(verifyTurnstile({ token: "token" }, { secretKey: "secret", fetchFn: malformedResponse })).resolves.toEqual({ ok: false });
  });
});