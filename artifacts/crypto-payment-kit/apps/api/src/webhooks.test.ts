import { describe, expect, it } from "vitest";
import { deliverWebhook } from "./webhooks.js";

describe("webhook delivery", () => {
  it("posts exact signed bytes and returns a bounded redacted excerpt", async () => {
    const result = await deliverWebhook(new URL("https://hooks.example.test/a"), Buffer.from('{"id":"evt"}'), "material", async (_url, init) => {
      expect(init.headers).toHaveProperty("x-webhook-signature");
      return new Response("token=should-not-appear", { status: 500 });
    });
    expect(result).toMatchObject({ ok: false, responseStatus: 500, responseExcerpt: "[redacted]" });
  });
});