import { expect, it } from "vitest";
import { mergeReshipperPostage } from "./reshipper-postage-scope";

const us = { id: "us", country: "US", label: "US Shipping", price: 12, requiresAddress: true };
const uk = { id: "uk", country: "GB", label: "UK label", price: 3, requiresQrCode: true };
const italy = { id: "it", country: "IT", label: "Italy home", price: 15, kitPrices: { upTo5: 15, upTo25: 20 } };
const global = { id: "global", label: "Global", price: 5 };
const base = [us, uk, italy, global];

it("lets a US-assigned reshipper update US prices and delivery requirements", () => {
  const changed = { ...us, price: 16, requiresAddress: false, requiresQrCode: true };
  expect(mergeReshipperPostage(base, [changed, uk, italy, global], base, [{ country: "United States" }]))
    .toEqual([changed, uk, italy, global]);
});
it("preserves a concurrent change to another country's postage", () => {
  const freshItaly = { ...italy, price: 19, kitPrices: { upTo5: 19, upTo25: 24 } };
  expect(mergeReshipperPostage([us, uk, freshItaly, global], [{ ...us, price: 14 }, uk, italy, global], base, [{ countries: ["US"] }]))
    .toEqual([{ ...us, price: 14 }, uk, freshItaly, global]);
});
it("rejects changing, removing or creating another country's options or global options", () => {
  for (const proposed of [
    [us, { ...uk, price: 0 }, italy, global], [us, italy, global],
    [us, uk, italy, { ...global, price: 0 }], [...base, { id: "other", country: "DE", label: "Germany", price: 8 }],
    [{ ...us, country: "GB" }, uk, italy, global],
  ]) expect(() => mergeReshipperPostage(base, proposed, base, [{ country: "US" }])).toThrow(/assigned countries/);
});
it("rejects a stale save for the same country instead of overwriting newer prices", () => {
  expect(() => mergeReshipperPostage([{ ...us, price: 18 }, uk, italy, global], [{ ...us, price: 14 }, uk, italy, global], base, [{ country: "US" }]))
    .toThrow(/changed.*reload/i);
});
it("supports all assignments, UK aliases, EU coverage and editing kit bands", () => {
  const changed = { ...italy, price: 17, kitPrices: { upTo5: 17, upTo25: 22 } };
  expect(mergeReshipperPostage(base, [us, { ...uk, price: 4 }, changed, global], base, [{ country: "UK" }, { country: "EU" }]))
    .toEqual([us, { ...uk, price: 4 }, changed, global]);
});
it("allows adding and deleting only in-scope postage and requires a base snapshot", () => {
  const second = { id: "us2", label: "US Express", country: "US", price: 25 };
  expect(mergeReshipperPostage(base, [uk, italy, global, second], base, [{ country: "US" }]))
    .toEqual([uk, italy, global, second]);
  expect(() => mergeReshipperPostage(base, base, undefined, [{ country: "US" }])).toThrow(/reload/i);
  expect(() => mergeReshipperPostage(base, [{ ...us, price: 1 }, uk, italy, global], base, [])).toThrow(/assigned countries/);
});
