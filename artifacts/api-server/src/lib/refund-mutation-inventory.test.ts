import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { REFUND_MUTATION_INVENTORY } from "./refund-mutation-inventory";

describe("refund-sensitive order mutation inventory", () => {
  it("classifies every known order and line-item update/delete site", () => {
    for (const [relativePath, expected] of Object.entries(REFUND_MUTATION_INVENTORY)) {
      const source = readFileSync(relativePath, "utf8");
      const orderSites = [...source.matchAll(/\.(?:update|delete)\(ordersTable\)/g)];
      const orderInserts = [...source.matchAll(/\.insert\(ordersTable\)/g)];
      const lineSites = [...source.matchAll(/\.(?:update|delete)\(orderLineItemsTable\)/g)];
      const inserts = [...source.matchAll(/\.insert\(orderLineItemsTable\)/g)];

      expect(orderSites, relativePath).toHaveLength(expected.orders);
      expect(orderInserts, relativePath).toHaveLength(expected.orderInserts);
      expect(lineSites, relativePath).toHaveLength(expected.lineItems);
      expect(inserts, relativePath).toHaveLength(expected.inserts);
      expect(["guarded", "processor_exemption", "unrelated"]).toContain(expected.classification);

      if (expected.classification === "processor_exemption") continue;
      for (const site of [...orderSites, ...lineSites]) {
        const start = site.index ?? 0;
        const next = source.slice(start + site[0].length).search(/\.(?:update|delete)\((?:ordersTable|orderLineItemsTable)\)/);
        const segment = source.slice(start, next < 0 ? source.length : start + site[0].length + next);
        expect(segment, `${relativePath}:${start}`).toContain("refundMutableOrderWhere");
      }
    }
  });
});