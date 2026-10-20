import { expect, it } from "vitest";
import { reshipperShippingCountries, visibleReshipperShippingOptions } from "./reshipper-shipping-options";

const options = [
  { id: "us", label: "US Shipping", country: "US", price: 12 },
  { id: "uk", label: "Royal Mail", country: "UK", price: 3, requiresQrCode: true },
  { id: "it", label: "Italy — Home delivery", country: "IT", price: 15, kitPrices: { upTo5: 15, upTo25: 20 } },
  { id: "global", label: "Available everywhere", price: 5 },
];
it("uses actual coverage countries, with the legacy assignment country as fallback", () => {
  expect(reshipperShippingCountries([{ country: "AT", countries: ["Italy", "DE"] }, { country: "UK" }])).toEqual(["IT", "DE", "GB"]);
  expect(reshipperShippingCountries([{ country: "United Kingdom", countries: [] }])).toEqual(["GB"]);
  expect(reshipperShippingCountries([{ country: "EU" }])).toContain("IT");
  expect(reshipperShippingCountries([{ country: "EU" }])).not.toContain("GB");
  expect(reshipperShippingCountries([{ country: "unknown" }])).toEqual([]);
});
it("shows only applicable couriers and keeps original indexes and metadata for safe editing", () => {
  const visible = visibleReshipperShippingOptions(options, ["United Kingdom"]);
  expect(visible.map(row => row.option.id)).toEqual(["uk", "global"]);
  expect(visible[0].index).toBe(1);
  expect(visible[0].option.requiresQrCode).toBe(true);
  const saved = options.map((option, index) => index === visible[0].index ? { ...option, price: 4 } : option);
  expect(saved[0]).toBe(options[0]);
  expect(saved[2]).toBe(options[2]);
  expect(saved[2].kitPrices).toEqual({ upTo5: 15, upTo25: 20 });
  expect(options).toHaveLength(4);
  expect(visibleReshipperShippingOptions(options, ["IT", "DE"]).map(row => row.option.id)).toEqual(["it", "global"]);
  expect(visibleReshipperShippingOptions(options, []).map(row => row.option.id)).toEqual(["global"]);
});

it("gives the US reshipper editable US postage and read-only global options", () => {
  const countries = reshipperShippingCountries([{ country: "United States" }]);
  const visible = visibleReshipperShippingOptions(options, countries);
  expect(visible.map(row => [row.option.id, row.editable])).toEqual([["us", true], ["global", false]]);
  expect(visible[0].option.price).toBe(12);
  expect(visibleReshipperShippingOptions(options, ["UK"]).find(row => row.option.id === "uk")?.editable).toBe(true);
});
