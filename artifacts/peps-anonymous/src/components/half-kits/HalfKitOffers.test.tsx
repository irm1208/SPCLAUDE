import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HalfKitOffers } from "../../pages/GroupBuyHalfKits";
import type { MemberOffersResponse } from "../../lib/half-kit-api";
import { readFileSync } from "node:fs";
import { Router } from "wouter";

const group = { id: "g1", name: "Autumn GB", currency: "GBP", allowCredits: true };
const offer = { id: "h1", productId: "p1", productName: "Ara-290 16mg", price: 30, deliveryCharge: 1, vendorShippingCharge: 2, version: 1 };
const order = { id: "o1", code: "12345", paymentStatus: "confirmed", amountDue: 0 };
function render(data: MemberOffersResponse, enabled = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  client.setQueryData(["member-half-kits", "g1"], data);
  return renderToStaticMarkup(
    <Router ssrPath="/"><QueryClientProvider client={client}><HalfKitOffers gbId="g1" embedded enabled={enabled} /></QueryClientProvider></Router>,
  );
}
describe("inline order-page half kits", () => {
  it("shows published offers, prices and extra shipping directly on the order page", () => {
    const html = render({ group, offers: [offer], orders: [order], creditsBalance: 0 });
    expect(html).toContain("section-order-half-kits");
    expect(html).toContain("Ara-290 16mg");
    expect(html).toContain("GBP 30.00");
    expect(html).toContain("Extra delivery");
    expect(html).toContain("Vendor shipping");
    expect(html).toContain('aria-label="Add Ara-290 16mg half kit to my order"');
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain("Back to my group buys");
    expect(html).toContain("order-form-half-kits");
    expect(html).toContain("border-bottom:");
    expect(html).not.toContain("box-shadow:");
    expect(html).toContain("background:#162231");
    expect(html).toContain("text-[#E9A020]");
    expect(html).toContain('data-testid="list-half-kit-offers"');
    expect(html).not.toContain("sm:grid-cols-2");
    expect(html).not.toMatch(/class="[^"]*(?:^|\s)bg-white(?:\s|")/);
  });
  it("starts collapsed and uses compact rows with a bounded scrolling list", () => {
    const html = render({ group, offers: [offer], orders: [order], creditsBalance: 0 });
    expect(html).toContain("<details");
    expect(html).not.toMatch(/<details[^>]*\sopen(?:=|\s|>)/);
    expect(html).toContain('data-testid="toggle-half-kit-offers"');
    expect(html).toContain("View");
    expect(html).toContain("max-h-64");
    expect(html).toContain('aria-label="Add Ara-290 16mg half kit to my order"');
    expect(html).toContain("grid-cols-[minmax(0,1fr)_auto_auto]");
  });
  it("shares the products container while retaining a distinct half-kit section", () => {
    const source = readFileSync("src/pages/OrderForm.tsx", "utf8");
    const container = source.indexOf('className="order-form-products rounded-3xl');
    const offers = source.indexOf("<HalfKitOffers");
    const catalogue = source.indexOf('className="order-form-products-heading');
    expect(container).toBeGreaterThan(-1);
    expect(offers).toBeGreaterThan(container);
    expect(offers).toBeLessThan(catalogue);
  });
  it("disappears when there are no offers, including after the last half is claimed", () => {
    expect(render({ group, offers: [], orders: [order], creditsBalance: 0 })).toBe("");
  });
  it("offers a new checkout when there is no eligible existing order", () => {
    const html = render({ group, offers: [offer], orders: [], creditsBalance: 0 });
    expect(html).toContain("Ara-290 16mg");
    expect(html).toContain("No existing order needed");
    expect(html).not.toContain('disabled=""');
  });
  it("does not show cached offers when inline access is disabled", () => {
    expect(render({ group, offers: [offer], orders: [order], creditsBalance: 0 }, false)).toBe("");
  });
});
