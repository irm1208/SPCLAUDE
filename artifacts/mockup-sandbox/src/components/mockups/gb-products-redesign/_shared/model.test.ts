import assert from "node:assert/strict";
import test from "node:test";

import {
  CATEGORIES,
  GROUP_BUY_NAME,
  SAMPLE_PRODUCTS,
  VENDORS,
  type ProductFilters,
  type ProductRecord,
} from "../data.ts";
import {
  applyBulkPatch,
  classifyImportRows,
  filterProducts,
  getProductStatus,
  resetProducts,
  type ProductPatch,
} from "./model.ts";

// @ts-expect-error Product identity is not a bulk-editable field.
const identityChangingPatch: ProductPatch = { id: "replacement" };
void identityChangingPatch;

const ALL_FILTERS: ProductFilters = {
  query: "",
  vendor: "all",
  category: "all",
  stock: "all",
};

function product(
  overrides: Partial<ProductRecord> & Pick<ProductRecord, "id" | "name">,
): ProductRecord {
  return {
    description: "A clear product description.",
    vendor: "QSC",
    category: "GLP-1",
    mgSize: "5 mg",
    price: 24,
    stock: 12,
    maxPerCustomer: null,
    halfKitEnabled: false,
    visible: true,
    lastEdited: "2025-11-01T09:00:00.000Z",
    ...overrides,
  };
}

test("catalogue constants expose the Winter group buy taxonomy", () => {
  assert.equal(GROUP_BUY_NAME, "Winter Peptide Run 2025");
  assert.deepEqual(VENDORS, [
    "QSC",
    "Amino Asylum",
    "Peptide Sciences",
    "Chilton",
    "Unassigned",
  ]);
  assert.deepEqual(CATEGORIES, [
    "GLP-1",
    "Healing",
    "Growth hormone",
    "Nootropics",
    "Other",
  ]);
});

test("SAMPLE_PRODUCTS contains exactly 120 stable, zero-padded rows", () => {
  const ids = SAMPLE_PRODUCTS.map(({ id }) => id);
  const expectedIds = Array.from(
    { length: 120 },
    (_, index) => `prod-${String(index + 1).padStart(3, "0")}`,
  );

  assert.equal(ids.length, 120);
  assert.equal(new Set(ids).size, 120);
  ids.forEach((id) => assert.match(id, /^prod-\d{3}$/));
  assert.deepEqual(ids.slice(0, 3), ["prod-001", "prod-002", "prod-003"]);
  assert.equal(ids.at(-1), "prod-120");
  assert.deepEqual(ids, expectedIds);
});

test("SAMPLE_PRODUCTS covers the catalogue's operational edge cases", () => {
  assert.ok(SAMPLE_PRODUCTS.some(({ stock }) => stock === null));
  assert.ok(SAMPLE_PRODUCTS.some(({ stock }) => stock === 0));
  assert.ok(SAMPLE_PRODUCTS.some(({ stock }) => stock === 4));
  assert.ok(SAMPLE_PRODUCTS.some(({ maxPerCustomer }) => maxPerCustomer !== null));
  assert.ok(SAMPLE_PRODUCTS.some(({ visible }) => !visible));
  assert.ok(SAMPLE_PRODUCTS.some(({ halfKitEnabled }) => halfKitEnabled));
});

test("filterProducts searches name, vendor, mg size, and category", () => {
  const products = [
    product({ id: "name", name: "BPC-157" }),
    product({ id: "vendor", name: "Vendor match", vendor: "Amino Asylum" }),
    product({ id: "size", name: "Size match", mgSize: "15 mg" }),
    product({ id: "category", name: "Category match", category: "Nootropics" }),
  ];

  const searches = [
    [" bpc ", "name"],
    ["AMINO ASYLUM", "vendor"],
    ["15 MG", "size"],
    ["nootropics", "category"],
  ] as const;

  for (const [query, expectedId] of searches) {
    const result = filterProducts(products, { ...ALL_FILTERS, query });
    assert.deepEqual(result.map(({ id }) => id), [expectedId]);
  }
});

test("filterProducts applies vendor and category filters", () => {
  const products = [
    product({ id: "match", name: "Match", vendor: "Chilton", category: "Healing" }),
    product({ id: "vendor-only", name: "Vendor only", vendor: "Chilton" }),
    product({ id: "category-only", name: "Category only", category: "Healing" }),
  ];

  const result = filterProducts(products, {
    ...ALL_FILTERS,
    vendor: "Chilton",
    category: "Healing",
  });

  assert.deepEqual(result.map(({ id }) => id), ["match"]);
});

test("filterProducts supports every stock mode", () => {
  const products = [
    product({ id: "unlimited", name: "Unlimited", stock: null }),
    product({ id: "out", name: "Out", stock: 0 }),
    product({ id: "low", name: "Low", stock: 4 }),
    product({ id: "stocked", name: "Stocked", stock: 12 }),
  ];

  const expected = {
    all: ["unlimited", "out", "low", "stocked"],
    available: ["unlimited", "low", "stocked"],
    low: ["low"],
    out: ["out"],
    unlimited: ["unlimited"],
  } satisfies Record<ProductFilters["stock"], string[]>;

  for (const stock of Object.keys(expected) as ProductFilters["stock"][]) {
    const result = filterProducts(products, { ...ALL_FILTERS, stock });
    assert.deepEqual(result.map(({ id }) => id), expected[stock]);
  }
});

test("filterProducts returns fresh records without mutating its input", () => {
  const products = [product({ id: "one", name: "One" })];
  const snapshot = structuredClone(products);

  const result = filterProducts(products, ALL_FILTERS);

  assert.deepEqual(products, snapshot);
  assert.notStrictEqual(result, products);
  assert.notStrictEqual(result[0], products[0]);
});

test("applyBulkPatch changes only selected rows and stays immutable", () => {
  const products = [
    product({ id: "one", name: "One" }),
    product({ id: "two", name: "Two" }),
    product({ id: "three", name: "Three" }),
  ];
  const snapshot = structuredClone(products);

  const result = applyBulkPatch(products, new Set(["one", "three"]), {
    visible: false,
    halfKitEnabled: true,
  });

  assert.deepEqual(products, snapshot);
  assert.deepEqual(
    result.map(({ id, visible, halfKitEnabled }) => ({ id, visible, halfKitEnabled })),
    [
      { id: "one", visible: false, halfKitEnabled: true },
      { id: "two", visible: true, halfKitEnabled: false },
      { id: "three", visible: false, halfKitEnabled: true },
    ],
  );
  assert.notStrictEqual(result, products);
  result.forEach((row, index) => assert.notStrictEqual(row, products[index]));
});

test("applyBulkPatch preserves identity when an unsafe caller supplies an id", () => {
  const products = [product({ id: "one", name: "One" })];
  const snapshot = structuredClone(products);
  const unsafePatch = { id: "replacement", visible: false } as unknown as ProductPatch;

  const result = applyBulkPatch(products, new Set(["one"]), unsafePatch);

  assert.equal(result[0].id, "one");
  assert.equal(result[0].visible, false);
  assert.deepEqual(products, snapshot);
});

test("resetProducts restores an independent fresh clone of the fixture", () => {
  const changed = applyBulkPatch(SAMPLE_PRODUCTS, new Set(["prod-001"]), {
    name: "Changed locally",
  });

  const firstReset = resetProducts(changed);
  const secondReset = resetProducts([]);

  assert.deepEqual(firstReset, SAMPLE_PRODUCTS);
  assert.deepEqual(secondReset, SAMPLE_PRODUCTS);
  assert.notStrictEqual(firstReset, SAMPLE_PRODUCTS);
  assert.notStrictEqual(firstReset[0], SAMPLE_PRODUCTS[0]);
  assert.notStrictEqual(secondReset, firstReset);
  assert.notStrictEqual(secondReset[0], firstReset[0]);
});

test("getProductStatus reflects visibility before stock level", () => {
  assert.equal(getProductStatus(product({ id: "out", name: "Out", stock: 0 })), "out-of-stock");
  assert.equal(getProductStatus(product({ id: "low", name: "Low", stock: 4 })), "low-stock");
  assert.equal(getProductStatus(product({ id: "live", name: "Live", stock: null })), "live");
  assert.equal(
    getProductStatus(product({ id: "hidden-out", name: "Hidden out", stock: 0, visible: false })),
    "paused",
  );
  assert.equal(
    getProductStatus(product({ id: "hidden-low", name: "Hidden low", stock: 4, visible: false })),
    "paused",
  );
});

test("classifyImportRows normalizes keys and identifies duplicate, price-changed, and new rows", () => {
  const existing = [
    product({
      id: "existing",
      name: "BPC-157",
      vendor: "Peptide Sciences",
      mgSize: "5 mg",
      price: 28.5,
    }),
  ];
  const incoming = [
    { name: " bpc-157 ", vendor: "PEPTIDE SCIENCES", mgSize: " 5 MG ", price: 28.5 },
    { name: "BPC-157", vendor: "Peptide Sciences", mgSize: "5 mg", price: 31 },
    { name: "BPC-157", vendor: "Peptide Sciences", mgSize: "10 mg", price: 44 },
  ];
  const existingSnapshot = structuredClone(existing);
  const incomingSnapshot = structuredClone(incoming);

  const result = classifyImportRows(existing, incoming);

  assert.deepEqual(
    result.map(({ status, existingPrice, included }) => ({ status, existingPrice, included })),
    [
      { status: "duplicate", existingPrice: 28.5, included: false },
      { status: "price-changed", existingPrice: 28.5, included: true },
      { status: "new", existingPrice: undefined, included: true },
    ],
  );
  assert.deepEqual(existing, existingSnapshot);
  assert.deepEqual(incoming, incomingSnapshot);
  result.forEach((row, index) => assert.notStrictEqual(row, incoming[index]));
});

test("classifyImportRows assigns unique stable IDs across row reordering", () => {
  const incoming = [
    { name: "BPC-157", vendor: "QSC", mgSize: "5 mg", price: 28.5 },
    { name: "BPC-157", vendor: "QSC", mgSize: "5 mg", price: 31 },
    { name: "TB-500", vendor: "Chilton", mgSize: "10 mg", price: 44 },
  ];
  const reordered = [incoming[2], incoming[0], incoming[1]];
  const signature = ({ name, vendor, mgSize, price }: (typeof incoming)[number]) =>
    JSON.stringify([name, vendor, mgSize, price]);

  const first = classifyImportRows([], incoming);
  const second = classifyImportRows([], reordered);
  const firstIds = new Map(first.map((row) => [signature(row), row.id]));
  const secondIds = new Map(second.map((row) => [signature(row), row.id]));

  assert.equal(new Set(first.map(({ id }) => id)).size, incoming.length);
  assert.equal(new Set(second.map(({ id }) => id)).size, reordered.length);
  assert.deepEqual(secondIds, firstIds);
});
