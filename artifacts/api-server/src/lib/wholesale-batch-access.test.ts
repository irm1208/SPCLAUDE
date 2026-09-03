import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  hasWholesaleBatchAccess,
  selectPreferredBatchCodes,
  withAuthorizedBatchCode,
} from "./wholesale-batch-access";

const productsRouteSource = readFileSync(
  new URL("../routes/products.ts", import.meta.url),
  "utf8",
);

const paidWholesale = {
  orderType: "wholesale",
  status: "Submitted",
  paymentStatus: "confirmed",
  deletedAt: null,
};

describe("hasWholesaleBatchAccess", () => {
  it("requires more than five qualifying wholesale orders", () => {
    expect(hasWholesaleBatchAccess(Array(5).fill(paidWholesale))).toBe(false);
    expect(hasWholesaleBatchAccess(Array(6).fill(paidWholesale))).toBe(true);
  });

  it("counts confirmed, test-confirmed, and completed wholesale orders only", () => {
    const qualifying = [
      paidWholesale,
      { ...paidWholesale, orderType: "wholesale_shared" },
      { ...paidWholesale, paymentStatus: "test_confirmed" },
      { ...paidWholesale, paymentStatus: "pending_confirmation", status: "Completed" },
    ];
    const excluded = [
      { ...paidWholesale, paymentStatus: "unpaid" },
      { ...paidWholesale, paymentStatus: "failed" },
      { ...paidWholesale, status: "Cancelled" },
      { ...paidWholesale, deletedAt: new Date() },
      { ...paidWholesale, orderType: "shop" },
      { ...paidWholesale, orderType: null },
    ];

    expect(hasWholesaleBatchAccess([...qualifying, ...qualifying])).toBe(true);
    expect(hasWholesaleBatchAccess([...qualifying, ...excluded])).toBe(false);
  });
});

describe("selectPreferredBatchCodes", () => {
  it("selects the newest MMDD batch before considering stock", () => {
    const selected = selectPreferredBatchCodes([
      { productId: "p1", code: "BP10-0827", stock: 214 },
      { productId: "p1", code: "BP10-0901", stock: 100 },
      { productId: "p2", code: "CAG10-0802", stock: 267 },
    ], new Date("2026-09-03T12:00:00Z"));

    expect(selected.get("p1")).toBe("BP10-0901");
    expect(selected.get("p2")).toBe("CAG10-0802");
  });

  it("treats far-future MMDD suffixes as last year's batches", () => {
    const selected = selectPreferredBatchCodes([
      { productId: "p1", code: "ZE20-1230", stock: 500 },
      { productId: "p1", code: "ZE20-0902", stock: 398 },
    ], new Date("2026-09-03T12:00:00Z"));

    expect(selected.get("p1")).toBe("ZE20-0902");
  });

  it("uses stock then lexical ordering when batch dates are equal", () => {
    const selected = selectPreferredBatchCodes([
      { productId: "p1", code: "Z-0823", stock: 9 },
      { productId: "p1", code: "A-0823", stock: 10 },
      { productId: "p2", code: "unparseable", stock: 10 },
      { productId: "p2", code: "BP10-0101", stock: 10 },
    ], new Date("2026-09-03T12:00:00Z"));

    expect(selected.get("p1")).toBe("A-0823");
    expect(selected.get("p2")).toBe("BP10-0101");
  });

  it("ignores non-positive candidates", () => {
    expect(selectPreferredBatchCodes([
      { productId: "p1", code: "BP10-0823", stock: 0 },
      { productId: "p1", code: "BP10-0824", stock: -2 },
    ]).has("p1")).toBe(false);
  });
});

describe("withAuthorizedBatchCode", () => {
  it("omits the field for ineligible accounts", () => {
    expect(withAuthorizedBatchCode(
      { id: "p1", name: "BPC" },
      false,
      new Map([["p1", "BP10-0823"]]),
    )).toEqual({ id: "p1", name: "BPC" });
  });

  it("omits the field when an eligible product has no selected code", () => {
    expect(withAuthorizedBatchCode(
      { id: "p1", name: "BPC" },
      true,
      new Map(),
    )).toEqual({ id: "p1", name: "BPC" });
  });

  it("adds exactly one selected code for eligible accounts", () => {
    expect(withAuthorizedBatchCode(
      { id: "p1", name: "BPC" },
      true,
      new Map([["p1", "BP10-0823"]]),
    )).toEqual({ id: "p1", name: "BPC", batchCode: "BP10-0823" });
  });

  it("adds only each matching product's selected code", () => {
    const selected = new Map([
      ["p1", "BP10-0823"],
      ["p2", "CAG10-0802"],
    ]);

    expect([
      withAuthorizedBatchCode({ id: "p1", name: "BPC" }, true, selected),
      withAuthorizedBatchCode({ id: "p2", name: "CAG" }, true, selected),
      withAuthorizedBatchCode({ id: "p3", name: "No mapping" }, true, selected),
    ]).toEqual([
      { id: "p1", name: "BPC", batchCode: "BP10-0823" },
      { id: "p2", name: "CAG", batchCode: "CAG10-0802" },
      { id: "p3", name: "No mapping" },
    ]);
  });
});

describe("wholesale catalogue route contract", () => {
  it("uses wholesale authentication and only conditionally serializes selected batches", () => {
    expect(productsRouteSource).toContain('router.get("/wholesale/products", requireWholesale, wholesaleProductsHandler)');
    expect(productsRouteSource).toContain("wholesale.telegramUsername.replace(/^@/, \"\").toLowerCase()");
    expect(productsRouteSource).toContain("ordersTable.orderType");
    expect(productsRouteSource).toContain("ordersTable.status");
    expect(productsRouteSource).toContain("ordersTable.paymentStatus");
    expect(productsRouteSource).toContain("ordersTable.deletedAt");
    expect(productsRouteSource).toContain("hasWholesaleBatchAccess(orderRows)");
    expect(productsRouteSource).toContain("if (eligible && products.length > 0)");
    expect(productsRouteSource).toContain("gt(qiyunleMappingsTable.batchStock, 0)");
    expect(productsRouteSource).toContain("withAuthorizedBatchCode(");
  });
});