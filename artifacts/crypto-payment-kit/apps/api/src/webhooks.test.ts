import { describe, expect, it } from "vitest";
import { deliverWebhook, validateWebhookUrl } from "./webhooks.js";

describe("webhook delivery", () => {
  it("posts exact signed bytes and returns a bounded redacted excerpt", async () => {
    const result = await deliverWebhook(new URL("https://hooks.example.test/a"), Buffer.from('{"id":"evt"}'), "material", async (_url, init) => {
      expect(init.headers).toHaveProperty("x-webhook-signature");
      return new Response("token=should-not-appear", { status: 500 });
    }, { lookup: async () => [{ address: "203.0.113.10", family: 4 }] });
    expect(result).toMatchObject({ ok: false, responseStatus: 500, responseExcerpt: "[redacted]" });
  });

  it("rejects private, loopback, link-local and DNS-rebound destinations", async () => {
    for (const address of ["127.0.0.1", "10.0.0.1", "169.254.1.1", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1"]) {
      await expect(validateWebhookUrl("https://hooks.example.test/a", { lookup: async () => [{ address, family: address.includes(":") ? 6 : 4 }] })).rejects.toThrow(/publicly routable/);
    }
    let calls = 0;
    const lookup = async () => [{ address: ++calls === 1 ? "203.0.113.10" : "127.0.0.1", family: 4 }];
    await expect(validateWebhookUrl("https://hooks.example.test/a", { lookup })).resolves.toBeInstanceOf(URL);
    await expect(deliverWebhook(new URL("https://hooks.example.test/a"), Buffer.from("{}"), "material", async () => new Response("", { status: 200 }), { lookup })).resolves.toMatchObject({ ok: false, responseStatus: 0 });
  });

  it("allows HTTP and local addresses only when development explicitly opts in", async () => {
    await expect(validateWebhookUrl("http://127.0.0.1:9000/hook", { allowLocal: true })).resolves.toBeInstanceOf(URL);
    await expect(validateWebhookUrl("http://127.0.0.1:9000/hook")).rejects.toThrow(/HTTPS/);
  });
});