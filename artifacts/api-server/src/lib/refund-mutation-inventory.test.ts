import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  REFUND_MUTATION_INVENTORY,
  REFUND_LOCKED_ASSERT_MANIFEST,
  REFUND_MULTI_ORDER_INVENTORY,
  REFUND_RAW_MUTATION_INVENTORY,
  REFUND_ORDER_INSERT_INVENTORY,
} from "./refund-mutation-inventory";

describe("refund-sensitive order mutation inventory", () => {
  it("keeps ACTIVE_REFUND_STATUSES owned by the shared mutation guard", () => {
    const guard = readFileSync("src/lib/refund-mutation-guard.ts", "utf8");
    const processor = readFileSync("src/lib/group-buy-refund.ts", "utf8");
    expect((guard.match(/export const ACTIVE_REFUND_STATUSES/g) ?? []).length).toBe(1);
    expect((processor.match(/(?:const|export const) ACTIVE_REFUND_STATUSES/g) ?? []).length).toBe(0);
    expect(processor).toMatch(/import \{ ACTIVE_REFUND_STATUSES \} from "\.\/refund-mutation-guard"/);
  });

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
      expect(["locked_assert", "returning_throw", "processor_exempt", "new_order"]).toContain(expected.enforcementMode);

      if (expected.classification === "processor_exemption") continue;
      for (const site of [...orderSites, ...lineSites]) {
        const start = site.index ?? 0;
        const next = source.slice(start + site[0].length).search(/\.(?:update|delete)\((?:ordersTable|orderLineItemsTable)\)/);
        const segment = source.slice(start, next < 0 ? source.length : start + site[0].length + next);
        expect(segment, `${relativePath}:${start}`).toContain("refundMutableOrderWhere");
      }
    }

    const discovered: Record<string, { orders: number; orderInserts: number; lineItems: number; inserts: number }> = {};
    const visit = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) visit(path);
        else if (path.endsWith(".ts") && !path.endsWith(".test.ts") && !path.endsWith("refund-mutation-inventory.ts")) {
          const source = readFileSync(path, "utf8");
          discovered[path] = {
            orders: [...source.matchAll(/\.(?:update|delete)\(ordersTable\)/g)].length,
            orderInserts: [...source.matchAll(/\.insert\(ordersTable\)/g)].length,
            lineItems: [...source.matchAll(/\.(?:update|delete)\(orderLineItemsTable\)/g)].length,
            inserts: [...source.matchAll(/\.insert\(orderLineItemsTable\)/g)].length,
          };
        }
      }
    };
    visit("src");
    for (const [path, counts] of Object.entries(discovered)) {
      const expected = REFUND_MUTATION_INVENTORY[path as keyof typeof REFUND_MUTATION_INVENTORY];
      if (counts.orders === 0 && counts.orderInserts === 0 && counts.lineItems === 0 && counts.inserts === 0) continue;
      expect(expected, `${path} is missing from REFUND_MUTATION_INVENTORY`).toBeDefined();
      expect({ orders: expected!.orders, orderInserts: expected!.orderInserts, lineItems: expected!.lineItems, inserts: expected!.inserts }, path)
        .toEqual(counts);
    }
  });

  it("classifies every multi-order writer as transactional all-or-nothing", () => {
    for (const entry of REFUND_MULTI_ORDER_INVENTORY) {
      const source = readFileSync(entry.source, "utf8");
      if (entry.mode === "withRefundMutationGuard") {
        expect(source, entry.handler).toContain("withRefundMutationGuard");
      } else {
        expect(source, entry.handler).toContain("assertNoActiveRefunds");
      }
    }
  });

  it("independently discovers and classifies every raw order mutation", () => {
    const expected = new Map<string, number>();
    for (const entry of REFUND_RAW_MUTATION_INVENTORY) {
      expected.set(`${entry.source}:${entry.operation}`, (expected.get(`${entry.source}:${entry.operation}`) ?? 0) + 1);
    }
    const actual = new Map<string, number>();
    const files: string[] = [];
    const visit = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) visit(path);
        else if (path.endsWith(".ts") && !path.endsWith(".test.ts") && !path.endsWith("refund-mutation-inventory.ts")) files.push(path);
      }
    };
    visit("src");
    for (const source of files) {
      const text = readFileSync(source, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      for (const operation of ["UPDATE orders", "DELETE FROM orders", "UPDATE order_line_items", "DELETE FROM order_line_items"]) {
        const count = [...text.matchAll(new RegExp(`\\b${operation}\\b`, "gi"))].length;
        if (count > 0) actual.set(`${source}:${operation}`, count);
      }
    }
    expect(actual).toEqual(expected);
  });

  it("does not permit a guarded mutation without RETURNING outside the locked-assert manifest", () => {
    const manifest = new Set<string>(REFUND_LOCKED_ASSERT_MANIFEST);
    for (const [relativePath, expected] of Object.entries(REFUND_MUTATION_INVENTORY)) {
      const source = readFileSync(relativePath, "utf8");
      const starts = [
        ...source.matchAll(/\.(?:update|delete)\((?:ordersTable|orderLineItemsTable)\)/g),
      ];
      for (const site of starts) {
        if (relativePath.endsWith("src/lib/group-buy-refund.ts")) continue;
        const remainder = source.slice(site.index!);
        const end = remainder.indexOf(";");
        const segment = remainder.slice(0, end < 0 ? remainder.length : end);
        if (segment.includes(".returning(")) continue;
        expect(manifest.has(relativePath), `${relativePath}:${site.index}`).toBe(true);
        expect(expected.enforcementMode, `${relativePath}:${site.index}`).toBe("locked_assert");
        expect(segment, `${relativePath}:${site.index}`).toContain("refundMutableOrderWhere");
      }
    }
  });

  it("keeps every order/order-line insert source explicitly classified", () => {
    for (const entry of REFUND_ORDER_INSERT_INVENTORY) {
      const source = readFileSync(entry.source, "utf8");
      expect(source).toMatch(/\.insert\((?:ordersTable|orderLineItemsTable)\)/);
      expect(["new_order_or_guarded_parent", "existing_order_guarded"]).toContain(entry.classification);
    }
  });
});