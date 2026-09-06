import { describe, expect, it } from "vitest";
import { deliverWebhook, isPublicGlobalUnicast, validateWebhookUrl } from "./webhooks.js";

describe("webhook delivery", () => {
  it("posts exact signed bytes and returns a bounded redacted excerpt", async () => {
    const result = await deliverWebhook(new URL("https://hooks.example.test/a"), Buffer.from('{"id":"evt"}'), "material", async (_url, init) => {
      expect(init.headers).toHaveProperty("x-webhook-signature");
      return new Response("token=should-not-appear", { status: 500 });
    }, { lookup: async () => [{ address: "8.8.8.8", family: 4 }] });
    expect(result).toMatchObject({ ok: false, responseStatus: 500, responseExcerpt: "[redacted]" });
  });

  it("rejects private, loopback, link-local and DNS-rebound destinations", async () => {
    for (const address of ["127.0.0.1", "10.0.0.1", "169.254.1.1", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1"]) {
      await expect(validateWebhookUrl("https://hooks.example.test/a", { lookup: async () => [{ address, family: address.includes(":") ? 6 : 4 }] })).rejects.toThrow(/publicly routable/);
    }
    let calls = 0;
    const lookup = async () => [{ address: ++calls === 1 ? "8.8.8.8" : "127.0.0.1", family: 4 }];
    await expect(validateWebhookUrl("https://hooks.example.test/a", { lookup })).resolves.toBeInstanceOf(URL);
    await expect(deliverWebhook(new URL("https://hooks.example.test/a"), Buffer.from("{}"), "material", async () => new Response("", { status: 200 }), { lookup })).resolves.toMatchObject({ ok: false, responseStatus: 0 });
  });

  it("allows HTTP and local addresses only when development explicitly opts in", async () => {
    await expect(validateWebhookUrl("http://127.0.0.1:9000/hook", { allowLocal: true })).resolves.toBeInstanceOf(URL);
    await expect(validateWebhookUrl("http://127.0.0.1:9000/hook")).rejects.toThrow(/HTTPS/);
  });

  it.each([
    "0.0.0.0", "100.64.0.1", "192.0.0.1", "192.0.2.1", "192.88.99.1",
    "198.18.0.1", "198.51.100.1", "203.0.113.1", "240.0.0.1",
    "::ffff:192.0.2.1", "::ffff:c000:0201", "::ffff:8.8.8.8", "64:ff9b:1::1", "100::1",
    "2001::1", "2001:2::1", "2001:10::1", "2001:20::1", "2001:db8::1",
    "2002::1", "3fff::1", "fc00::1", "fe80::1", "ff00::1",
  ])("rejects non-global address %s", (address) => {
    expect(isPublicGlobalUnicast(address)).toBe(false);
  });

  it.each(["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111", "2001:4860:4860::8888"])(
    "accepts public global-unicast address %s",
    (address) => {
      expect(isPublicGlobalUnicast(address)).toBe(true);
    },
  );
});