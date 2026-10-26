import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VialSellerRevenue } from "./VialSellerRevenue";

describe("seller revenue display", () => {
  it("labels each currency and keeps legacy unknowns separate", () => {
    const html = renderToStaticMarkup(<VialSellerRevenue totals={[
      { currency: "GBP", total: 12.5 }, { currency: "EUR", total: 20 },
      { currency: "USD", total: 3 }, { currency: null, total: 9 },
    ]} />);
    expect(html).toContain("£12.50");
    expect(html).toContain("GBP");
    expect(html).toContain("€20.00");
    expect(html).toContain("EUR");
    expect(html).toContain("$3.00");
    expect(html).toContain("USD");
    expect(html).toContain("9.00 (currency not recorded)");
    expect(html).toContain("Legacy");
    expect(html).not.toContain("$44.50");
  });
  it("shows zero amounts, including legacy unknowns, without treating them as no sales", () => {
    const html = renderToStaticMarkup(<VialSellerRevenue totals={[
      { currency: "USD", total: 0 }, { currency: null, total: 0 },
    ]} />);
    expect(html).toContain("$0.00");
    expect(html).toContain("0.00 (currency not recorded)");
    expect(html).not.toContain("No confirmed sales");
  });
  it("uses a currency-neutral empty state", () => {
    const html = renderToStaticMarkup(<VialSellerRevenue totals={[]} />);
    expect(html).toContain("No confirmed sales");
    expect(html).not.toContain("$");
    expect(html).not.toContain("£");
  });
});
