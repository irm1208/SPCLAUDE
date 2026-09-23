import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const repairUrl = new URL("./order-11688-invoice-damage-repair.ts", import.meta.url);

describe("order 11688 invoice damage repair", () => {
  it("has a guarded one-time repair implementation", () => {
    expect(existsSync(repairUrl)).toBe(true);
    const source = readFileSync(repairUrl, "utf8");
    expect(source).toContain("pg_advisory_xact_lock");
    expect(source).toContain('process.env.NODE_ENV !== "production"');
    expect(source).toContain("order_11688_invoice_damage_repaired");
    expect(source).toContain("Black Ops 7 Diamond Account");
    expect(source).toContain("Retatrutide 60mg");
    expect(source).toContain("GHK-CU 50mg");
    expect(source).toContain("Tirzepatide 100mg");
    expect(source).toContain("KPV 10mg");
  });

  it("preserves the customized invoice document", () => {
    expect(existsSync(repairUrl)).toBe(true);
    const source = readFileSync(repairUrl, "utf8");
    expect(source).not.toContain("orderInvoicesTable");
    expect(source).not.toMatch(/\border_invoices\b/);
  });

  it("runs before application readiness", () => {
    const indexSource = readFileSync(new URL("../index.ts", import.meta.url), "utf8");
    const repair = indexSource.indexOf(".then(() => repairOrder11688InvoiceDamage())");
    const readiness = indexSource.indexOf("markApplicationReady()");
    expect(repair).toBeGreaterThan(0);
    expect(readiness).toBeGreaterThan(repair);
  });
});