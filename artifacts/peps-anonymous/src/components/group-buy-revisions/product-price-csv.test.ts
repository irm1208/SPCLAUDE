import { describe, expect, it } from "vitest";
import { parseProductPriceCsv, productPriceTemplate, validProposedPrice } from "./product-price-csv";

const products = [
  { id: "p1", name: 'Own, "special"', mgSize: "10 mg", price: "50" },
  { id: "p2", name: "Same", mgSize: "5mg", price: "20" },
  { id: "p3", name: "Same", mgSize: "10mg", price: "30" },
];
describe("product price proposal CSV", () => {
  it("roundtrips quoted templates without proposing blank prices", () => {
    const csv = productPriceTemplate(products);
    expect(csv).toContain('"Own, ""special"""');
    expect(parseProductPriceCsv(csv, products)).toEqual({ rows: [], errors: [] });
  });
  it("matches IDs and preserves exact two-decimal prices", () => {
    const parsed = parseProductPriceCsv('\uFEFFProduct ID,New price\r\np1,45.25\r\np2,0', products);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows.map(r => [r.productId, r.newPrice])).toEqual([["p1", "45.25"], ["p2", "0"]]);
  });
  it("can match exact product name and strength but never guesses a dose", () => {
    expect(parseProductPriceCsv("Product name,Strength,New price\nSame,10 mg,25", products).rows[0].productId).toBe("p3");
    expect(parseProductPriceCsv("Product name,New price\nSame,25", products).errors.join()).toContain("ambiguous");
  });
  it("rejects unknown/foreign IDs rather than falling back to names", () => {
    expect(parseProductPriceCsv("Product ID,Product name,New price\nforeign,Same,25", products).errors.join()).toContain("Row 2");
  });
  it("rejects duplicates atomically at the preview boundary", () => {
    const result = parseProductPriceCsv("Product ID,New price\np1,45\np1,40", products);
    expect(result.errors.join()).toContain("duplicate");
  });
  it.each(["-1", "NaN", "Infinity", "1e3", "1.234", "1,000", "1000001"])("rejects invalid price %s", price => {
    expect(validProposedPrice(price)).toBe(false);
    expect(parseProductPriceCsv(`Product ID,New price\np1,"${price}"`, products).errors.length).toBeGreaterThan(0);
  });
  it("requires explicit new-price headers and reports malformed quoting", () => {
    expect(parseProductPriceCsv("Product ID,Price\np1,40", products).errors.join()).toContain("New price");
    expect(parseProductPriceCsv('Product ID,New price\n"p1,40', products).errors.join()).toContain("quote");
  });
  it("supports TSV and ignores blank records, not bad records", () => {
    expect(parseProductPriceCsv("Product ID\tNew price\np1\t40\n\n", products).rows).toHaveLength(1);
    expect(parseProductPriceCsv("Product ID,New price\n,40", products).errors.join()).toContain("Row 2");
  });
});
