import { afterEach, describe, expect, it } from "vitest";
import { formatEvent, normalizePrefs, prefEnabled, portalOrderUrl, orderSummaryLine, vendorWebhookSecret, esc } from "./vendor-telegram";

const row = { id: "sub-1", reference: "8000123", snapshot: { currency: "USD", totalCost: "127.50", shipping: { country: "United Kingdom", name: "Hidden Person" }, items: [{ productName: "HGH <10iu>", quantity: 2 }, { productName: "BPC-157", quantity: 3 }] } };
const originalPublicUrl = process.env.PUBLIC_URL;
afterEach(() => { if (originalPublicUrl === undefined) delete process.env.PUBLIC_URL; else process.env.PUBLIC_URL = originalPublicUrl; });

describe("vendor telegram formatting", () => {
  it("summarises an order without exposing the recipient's name and escapes HTML", () => {
    const line = orderSummaryLine(row);
    expect(line).toBe("#8000123 · 5 units · United Kingdom · USD 127.50");
    const text = formatEvent("new_order", row);
    expect(text).toContain("New shipment assigned");
    expect(text).toContain("HGH &lt;10iu&gt; × 2");
    expect(text).not.toContain("Hidden Person");
    expect(formatEvent("overdue", row)).toContain("48h+");
    expect(formatEvent("hold", row)).toContain("Do not pack");
    expect(formatEvent("issue_resolved", row, { label: "Out of stock", note: "Ship & refund" })).toContain("Ship &amp; refund");
    expect(esc("<b>&</b>")).toBe("&lt;b&gt;&amp;&lt;/b&gt;");
  });
  it("only builds portal deep links when a public URL is configured", () => {
    delete process.env.PUBLIC_URL;
    expect(portalOrderUrl("sub-1")).toBeNull();
    process.env.PUBLIC_URL = "https://peps.example/";
    expect(portalOrderUrl("sub 1")).toBe("https://peps.example/vendor?order=sub%201");
  });
  it("keeps only boolean preferences and treats missing ones as enabled", () => {
    expect(normalizePrefs({ newOrders: false, holds: "no", overdue: true, bogus: false })).toEqual({ newOrders: false, overdue: true });
    expect(prefEnabled({ newOrders: false }, "new_order")).toBe(false);
    expect(prefEnabled({ newOrders: false }, "hold")).toBe(true);
    expect(prefEnabled(null, "overdue")).toBe(true);
    expect(prefEnabled({ issues: false }, "test")).toBe(true);
  });
  it("derives a stable webhook secret from the token without revealing it", () => {
    const secret = vendorWebhookSecret("123:ABC");
    expect(secret).toMatch(/^[a-f0-9]{48}$/);
    expect(secret).toBe(vendorWebhookSecret("123:ABC"));
    expect(secret).not.toBe(vendorWebhookSecret("123:ABD"));
  });
});
