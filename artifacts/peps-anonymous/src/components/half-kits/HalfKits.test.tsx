import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HalfKitManagerView } from "./HalfKitManager";
import { HalfKitOfferCard, ClaimConfirmation } from "../../pages/GroupBuyHalfKits";

const group = { id: "g1", name: "Autumn GB", currency: "GBP", allowCredits: true };
const data = {
  group,
  candidates: [
    { productId: "p1", productName: "Reta 10mg", totalQuantity: 4.5, defaultPrice: 20, remainingHalf: true, offer: null },
    { productId: "p2", productName: "Tirz 20mg", totalQuantity: 2.5, defaultPrice: 60, remainingHalf: true, offer: { id: "o2", productId: "p2", price: 28, deliveryCharge: 1, vendorShippingCharge: 0, published: true, version: 2 } },
  ],
  claims: [
    { id: "c1", orderId: "x", orderCode: "GB-77", username: "kiwi", productName: "Tirz 20mg", price: 28, deliveryCharge: 1, vendorShippingCharge: 0, creditsUsed: 3, status: "unpaid" as const, createdAt: "2026-10-01T10:00:00Z", canRelease: true },
    { id: "c2", orderId: "y", orderCode: "GB-78", username: "ash", productName: "Reta 10mg", price: 20, deliveryCharge: 0, vendorShippingCharge: 0, creditsUsed: 0, status: "paid" as const, createdAt: "2026-10-01T10:00:00Z", canRelease: false },
  ],
};
const noop = () => {};

describe("half-kit manager view", () => {
  it.each(["organiser", "admin"] as const)("shows only unfilled half kits for %s", scope => {
    const mixed = {
      ...data,
      candidates: [
        ...data.candidates,
        { productId: "zero", productName: "Zero orders product", totalQuantity: 0, defaultPrice: 10, remainingHalf: false, offer: null },
        { productId: "whole", productName: "Whole kits product", totalQuantity: 5, defaultPrice: 10, remainingHalf: false, offer: null },
      ],
    };
    const html = renderToStaticMarkup(createElement(HalfKitManagerView, { scope, data: mixed, onSave: async () => {}, onRelease: async () => {}, onBulkPublish: async () => ({ succeeded: [], failed: [] }) }));
    expect(html).toContain('data-testid="row-candidate-p1"');
    expect(html).toContain('data-testid="row-candidate-p2"');
    expect(html).not.toContain("Zero orders product");
    expect(html).not.toContain("Whole kits product");
    expect(html).not.toContain("no unfilled half");
  });

  it("shows the empty state when products exist but none have an unfilled half", () => {
    const wholeOnly = { ...data, candidates: data.candidates.map(c => ({ ...c, remainingHalf: false, totalQuantity: 4 })) };
    const html = renderToStaticMarkup(createElement(HalfKitManagerView, { scope: "organiser", data: wholeOnly, onSave: async () => {}, onRelease: async () => {}, onBulkPublish: async () => ({ succeeded: [], failed: [] }) }));
    expect(html).toContain('data-testid="text-no-candidates"');
    expect(html).not.toContain('data-testid="row-candidate-');
    expect(html).not.toContain('data-testid="button-publish-selected"');
    expect(html).toContain("GB-77");
  });

  it("renders candidates with default half price and publish state", () => {
    const html = renderToStaticMarkup(createElement(HalfKitManagerView, { scope: "organiser", data, onSave: async () => {}, onRelease: async () => {}, onBulkPublish: async () => ({ succeeded: [], failed: [] }) }));
    expect(html).toContain("Reta 10mg");
    expect(html).toContain('value="20.00"');
    expect(html).toContain("Published");
    expect(html).toContain("GB-77");
    expect(html).toContain('data-testid="button-release-claim-c1"');
    expect(html).not.toContain('data-testid="button-release-claim-c2"');
  });
});

describe("currency safety", () => {
  const usd = {
    ...data,
    group: { ...group, currency: "USD" },
    candidates: [{ productId: "p3", productName: "BPC 5mg", totalQuantity: 1.5, defaultPrice: 15, remainingHalf: true, offer: { id: "o3", productId: "p3", price: 11, deliveryCharge: 0, vendorShippingCharge: 0, published: false, version: 1, currency: "GBP" } }],
    claims: [{ ...data.claims[0], currency: "GBP" }, { ...data.claims[1], id: "c3", currency: undefined as unknown as string }],
  };
  const html = renderToStaticMarkup(createElement(HalfKitManagerView, { scope: "admin", data: usd, onSave: async () => {}, onRelease: async () => {}, onBulkPublish: async () => ({ succeeded: [], failed: [] }) }));
  it("shows claims in their own currency, falling back to group currency", () => {
    expect(html).toContain("GBP 28.00");
    expect(html).toContain("USD 20.00");
  });
  it("warns on offers priced in an old currency and excludes them from bulk publish", () => {
    expect(html).toContain('data-testid="warning-currency-p3"');
    expect(html).toMatch(/review the price/i);
    expect(html).toContain('value="15.00"');
    expect(html).toMatch(/<input[^>]*disabled=""[^>]*data-testid="checkbox-candidate-p3"/);
  });
});

describe("member half-kit page pieces", () => {
  const offer = { id: "o2", productId: "p2", productName: "Tirz 20mg", price: 28, deliveryCharge: 1, vendorShippingCharge: 0.5, version: 2 };
  it("shows price and extra shipping on an offer card", () => {
    const html = renderToStaticMarkup(createElement(HalfKitOfferCard, { offer, currency: "GBP", onClaim: noop, disabled: false }));
    expect(html).toContain("0.5 kit");
    expect(html).toContain("GBP 28.00");
    expect(html).toContain("GBP 0.50");
  });
  it("confirmation lists target order, credits and cash due", () => {
    const html = renderToStaticMarkup(createElement(ClaimConfirmation, { offer, group, order: { id: "ord", code: "GB-77", paymentStatus: "paid", amountDue: 0 }, creditsBalance: 5, useCredits: true }));
    expect(html).toContain("GB-77");
    expect(html).toContain("GBP 29.50");
    expect(html).toContain("GBP 5.00");
    expect(html).toContain("GBP 24.50");
    expect(html).toMatch(/no coupons/i);
  });
});

describe("member claim safety", () => {
  it("sends previewed expectedCredit and requires reconfirmation after a 409", () => {
    const src = readFileSync("src/pages/GroupBuyHalfKits.tsx", "utf8");
    expect(src).toContain("expectedCredit");
    expect(src).toContain("isPreviewConflict");
    expect(src).toMatch(/needsReconfirm/);
  });
});

describe("member page QA", () => {
  const src = readFileSync("src/pages/GroupBuyHalfKits.tsx", "utf8");
  it("renders the hero heading in explicit white", () => {
    expect(src).toMatch(/<h1 className="[^"]*text-white/);
  });
  it("offers a sign-in link when the API returns 401", () => {
    expect(src).toContain("isAuthRequired(q.error)");
    expect(src).toContain('data-testid="link-sign-in"');
  });
});

describe("entry points", () => {
  it("shares component-scoped kit-limit checks between the side panel and main review button", () => {
    const form = readFileSync("src/pages/OrderForm.tsx", "utf8");
    const pageReturn = form.indexOf("return (\n    <Chrome>");
    expect(pageReturn).toBeGreaterThan(0);
    for (const declaration of ["const gbFull =", "const totalNewKits =", "const kitLimitBlocked ="]) {
      expect(form.indexOf(declaration)).toBeGreaterThan(0);
      expect(form.indexOf(declaration)).toBeLessThan(pageReturn);
    }
    expect(form).toContain("reviewDisabled={isPreview || kitLimitBlocked}");
  });
  it("links to member half-kit offers directly from the order form", () => {
    const form = readFileSync("src/pages/OrderForm.tsx", "utf8");
    expect(form).toContain("<HalfKitOffers");
    expect(form).toContain("gbId={gbId}");
    expect(form).toContain("embedded");
    expect(form.indexOf("<HalfKitOffers")).toBeLessThan(form.indexOf(">Choose products</p>"));
  });
  it("includes half-kit links in both member card and table views, even without an existing order", () => {
    const portal = readFileSync("src/pages/CustomerPortal.tsx", "utf8");
    expect(portal).toContain('data-testid={`link-half-kits-table-${gb.id}`}');
    const cardLink = portal.slice(portal.indexOf('{/* Footer: CTA */}'), portal.indexOf('!gbLoading && gbView === "table"'));
    expect(cardLink).toContain('data-testid={`link-half-kits-${gb.id}`}');
    expect(cardLink).not.toContain("gbOrders.length > 0");
    expect(cardLink).toContain("halfKitAvailability?.counts[gb.id]");
    const tableLink = portal.slice(portal.indexOf('!gbLoading && gbView === "table"'), portal.indexOf("!gbLoading && archivedGbs.length"));
    expect(tableLink).toContain("halfKitAvailability?.counts[gb.id]");
  });
  it("routes the member page and links managers from summaries", () => {
    expect(readFileSync("src/App.tsx", "utf8")).toContain('"/group-buys/:id/half-kits"');
    expect(readFileSync("src/pages/GbOrganiser.tsx", "utf8")).toContain("<HalfKitManager");
    expect(readFileSync("src/pages/Admin.tsx", "utf8")).toContain("<HalfKitManager");
    expect(readFileSync("src/pages/AccountOrderDetail.tsx", "utf8")).toContain("/half-kits");
    expect(readFileSync("src/pages/AccountOrderDetail.tsx", "utf8")).toContain("halfKitAvailability?.counts[order.groupBuyId]");
    const portal = readFileSync("src/pages/CustomerPortal.tsx", "utf8");
    expect(portal).toContain("Fill remaining half kits");
    expect(portal.match(/href=\{`\/order\?gbId=\$\{encodeURIComponent\(gb\.id\)\}`\}/g)).toHaveLength(2);
    expect(portal).not.toContain("/group-buys/${encodeURIComponent(gb.id)}/half-kits");
    expect(readFileSync("src/pages/OrderForm.tsx", "utf8")).toContain("<HalfKitOffers key={gbId} gbId={gbId} embedded");
  });
});
