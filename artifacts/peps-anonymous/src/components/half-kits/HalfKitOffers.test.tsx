import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HalfKitOffers } from "../../pages/GroupBuyHalfKits";
import type { MemberOffersResponse } from "../../lib/half-kit-api";

const group = { id: "g1", name: "Autumn GB", currency: "GBP", allowCredits: true };
const offer = { id: "h1", productId: "p1", productName: "Ara-290 16mg", price: 30, deliveryCharge: 1, vendorShippingCharge: 2, version: 1 };
const order = { id: "o1", code: "12345", paymentStatus: "confirmed", amountDue: 0 };
function render(data: MemberOffersResponse, enabled = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  client.setQueryData(["member-half-kits", "g1"], data);
  return renderToStaticMarkup(
    <QueryClientProvider client={client}><HalfKitOffers gbId="g1" embedded enabled={enabled} /></QueryClientProvider>,
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
    expect(html).toContain("Add to my order");
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain("Back to my group buys");
    expect(html).toContain("linear-gradient(135deg, #1C2B3D, #1D3047)");
    expect(html).toContain("background:#162231");
    expect(html).toContain("text-[#E9A020]");
  });
  it("disappears when there are no offers, including after the last half is claimed", () => {
    expect(render({ group, offers: [], orders: [order], creditsBalance: 0 })).toBe("");
  });
  it("requires an existing eligible order without hiding available products", () => {
    const html = render({ group, offers: [offer], orders: [], creditsBalance: 0 });
    expect(html).toContain("Ara-290 16mg");
    expect(html).toContain("not-yet-dispatched order");
    expect(html).toContain('disabled=""');
  });
  it("does not show cached offers when inline access is disabled", () => {
    expect(render({ group, offers: [offer], orders: [order], creditsBalance: 0 }, false)).toBe("");
  });
});
