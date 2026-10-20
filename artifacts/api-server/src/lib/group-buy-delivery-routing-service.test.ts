import { beforeEach, expect, it, vi } from "vitest";
const { where } = vi.hoisted(() => ({ where: vi.fn() }));
vi.mock("@workspace/db", async () => ({
  ...(await import("@workspace/db/schema")),
  db: { select: () => ({ from: () => ({ where }) }) },
}));
import { resolveGroupOrderRoute } from "./group-buy-delivery-routing-service";
const group = {
  directShippingEnabled: true, directShippingMinKits: "30",
  shippingOptions: JSON.stringify([{ id: "eu-postage-DE-pickup", country: "DE", reshipperUsername: "fazi28" }]),
};
const assignments = [{ reshipperUsername: "fazi28", country: "AT", countries: ["AT", "DE", "IT"], enabled: true }];
const request = { gbId: "group", methodId: "eu-postage-DE-pickup", direct: false, country: "Germany", username: "member", items: [{ quantity: 1 }] };
beforeEach(() => { where.mockReset(); });
it("routes Germany EU postage to its multi-country reshipper, never direct", async () => {
  where.mockResolvedValueOnce([group]).mockResolvedValueOnce(assignments);
  await expect(resolveGroupOrderRoute(request)).resolves.toEqual({ reshipperUsername: "fazi28", routingType: "reshipper", fixedReshipper: true });
});
it("keeps nonmatching or ambiguous ordinary postage unrouted instead of direct", async () => {
  where.mockResolvedValueOnce([group]).mockResolvedValueOnce([]);
  await expect(resolveGroupOrderRoute({ ...request, methodId: "ordinary" })).resolves.toMatchObject({ routingType: "unrouted", reshipperUsername: null });
});
it("does not let a stale or forged direct flag route an ordinary shipping option directly", async () => {
  where.mockResolvedValueOnce([group]);
  await expect(resolveGroupOrderRoute({ ...request, direct: true })).rejects.toThrow(/dedicated Direct Shipping/);
});
it("allows explicit direct shipping from 30 kits, and clears the reshipper", async () => {
  where.mockResolvedValueOnce([group]);
  await expect(resolveGroupOrderRoute({ ...request, methodId: "__direct_shipping", direct: true, items: [{ quantity: 30 }] })).resolves.toMatchObject({ routingType: "direct", reshipperUsername: null });
});
it("rejects a direct order below 30 and disabled direct shipping", async () => {
  where.mockResolvedValueOnce([group]);
  await expect(resolveGroupOrderRoute({ ...request, methodId: "__direct_shipping", direct: true, items: [{ quantity: 29.5 }] })).rejects.toThrow(/30 kits/);
  where.mockResolvedValueOnce([{ ...group, directShippingEnabled: false }]);
  await expect(resolveGroupOrderRoute({ ...request, methodId: "__direct_shipping", direct: true, items: [{ quantity: 30 }] })).rejects.toThrow(/enabled/);
});
it("preserves an existing direct order's quantity floor without weakening new-order eligibility", async () => {
  where.mockResolvedValueOnce([group]);
  await expect(resolveGroupOrderRoute({ ...request, methodId: "__direct_shipping", direct: true, legacyDirectKits: 1 })).resolves.toMatchObject({ routingType: "direct" });
});

it.each([
  ["US", "US", "us-reshipper"],
  ["United States", "US", "us-reshipper"],
  ["UK", "GB", "uk-reshipper"],
  ["GB", "UK", "uk-reshipper"],
  ["United Kingdom", "GB", "uk-reshipper"],
])("routes ordinary %s postage to the assigned reshipper even at 30 kits", async (country, assignedCountry, username) => {
  where.mockResolvedValueOnce([{ ...group, shippingOptions: JSON.stringify([{ id: "country-postage", country: assignedCountry }]) }])
    .mockResolvedValueOnce([{ reshipperUsername: username, country: assignedCountry, countries: null, enabled: true }]);
  await expect(resolveGroupOrderRoute({ ...request, methodId: "country-postage", country, items: [{ quantity: 30 }] }))
    .resolves.toEqual({ reshipperUsername: username, routingType: "reshipper", fixedReshipper: false });
});

it("lets Admin assign separate UK couriers to specific UK reshippers instead of guessing", async () => {
  where.mockResolvedValueOnce([{ ...group, shippingOptions: JSON.stringify([
    { id: "royal-mail", country: "UK", reshipperUsername: "uk-a" },
    { id: "inpost", country: "GB", reshipperUsername: "uk-b" },
  ]) }]).mockResolvedValueOnce([
    { reshipperUsername: "uk-a", country: "GB", enabled: true },
    { reshipperUsername: "uk-b", country: "UK", enabled: true },
  ]);
  await expect(resolveGroupOrderRoute({ ...request, methodId: "inpost", country: "United Kingdom" }))
    .resolves.toEqual({ reshipperUsername: "uk-b", routingType: "reshipper", fixedReshipper: true });
});

it.each(["US", "UK", "GB"])("requires explicit eligible Direct Shipping for %s members", async country => {
  where.mockResolvedValueOnce([group]);
  await expect(resolveGroupOrderRoute({ ...request, country, direct: true, methodId: "__direct_shipping", items: [{ quantity: 29.5 }] }))
    .rejects.toThrow(/30 kits/);
  where.mockResolvedValueOnce([group]);
  await expect(resolveGroupOrderRoute({ ...request, country, direct: true, methodId: "__direct_shipping", items: [{ quantity: 30 }] }))
    .resolves.toMatchObject({ routingType: "direct", reshipperUsername: null });
});
