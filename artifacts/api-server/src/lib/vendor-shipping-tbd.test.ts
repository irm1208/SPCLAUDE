import { describe, expect, it } from "vitest";

async function loadResolver() {
  return import("./vendor-shipping-tbd").catch(() => null);
}

describe("vendor shipping TBD state", () => {
  it("snapshots blank group-buy shipping as TBD, but not zero or a positive amount", async () => {
    const resolver = await loadResolver();
    expect(resolver, "vendor-shipping-tbd resolver should exist").not.toBeNull();
    if (!resolver) return;

    const base = {
      groupBuyId: "gb-1",
      orderType: "group_buy",
      directShippingRequested: false,
      isAddition: false,
    };

    expect(resolver.resolveNewOrderVendorShippingIsTbd({
      ...base,
      configuredAmount: null,
    })).toBe(true);
    expect(resolver.resolveNewOrderVendorShippingIsTbd({
      ...base,
      configuredAmount: "0.00",
    })).toBe(false);
    expect(resolver.resolveNewOrderVendorShippingIsTbd({
      ...base,
      configuredAmount: "5.00",
    })).toBe(false);
  });

  it("uses current group-buy settings only for legacy rows without a snapshot", async () => {
    const resolver = await loadResolver();
    expect(resolver, "vendor-shipping-tbd resolver should exist").not.toBeNull();
    if (!resolver) return;

    const legacy = {
      savedState: null,
      vendorShipping: "0.00",
      groupBuyId: "gb-1",
      orderType: "group_buy",
      directShippingRequested: false,
      isAddition: false,
    };

    expect(resolver.resolveOrderVendorShippingIsTbd({
      ...legacy,
      configuredAmount: null,
    })).toBe(true);
    expect(resolver.resolveOrderVendorShippingIsTbd({
      ...legacy,
      configuredAmount: "0.00",
    })).toBe(false);
    expect(resolver.resolveOrderVendorShippingIsTbd({
      ...legacy,
      configuredAmount: "5.00",
    })).toBe(true);
    expect(resolver.resolveOrderVendorShippingIsTbd({
      ...legacy,
      savedState: false,
      configuredAmount: null,
    })).toBe(false);
    expect(resolver.resolveOrderVendorShippingIsTbd({
      ...legacy,
      savedState: true,
      configuredAmount: "0.00",
    })).toBe(true);
  });

  it("never treats non-group-buy, wholesale, direct-shipping, or add-on orders as TBD", async () => {
    const resolver = await loadResolver();
    expect(resolver, "vendor-shipping-tbd resolver should exist").not.toBeNull();
    if (!resolver) return;

    const base = {
      configuredAmount: null,
      vendorShipping: 0,
      savedState: null,
      directShippingRequested: false,
      isAddition: false,
    };

    expect(resolver.resolveNewOrderVendorShippingIsTbd({
      ...base,
      groupBuyId: null,
      orderType: null,
    })).toBe(false);
    expect(resolver.resolveNewOrderVendorShippingIsTbd({
      ...base,
      groupBuyId: "gb-1",
      orderType: "wholesale",
    })).toBe(false);
    expect(resolver.resolveNewOrderVendorShippingIsTbd({
      ...base,
      groupBuyId: "gb-1",
      orderType: "group_buy",
      directShippingRequested: true,
    })).toBe(false);
    expect(resolver.resolveNewOrderVendorShippingIsTbd({
      ...base,
      groupBuyId: "gb-1",
      orderType: "group_buy",
      isAddition: true,
    })).toBe(false);
  });
});