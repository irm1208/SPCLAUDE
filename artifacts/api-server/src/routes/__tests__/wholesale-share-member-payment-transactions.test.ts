import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(new URL("../wholesale-shares.ts", import.meta.url), "utf8");
const pageSource = readFileSync(
  new URL("../../../../peps-anonymous/src/pages/WholesaleShared.tsx", import.meta.url),
  "utf8",
);

describe("shared wholesale organiser member payment transactions", () => {
  it("includes each member's test and remaining transaction details only for the organiser", () => {
    expect(routeSource).toContain("paymentTransactions: isCreatorViewer && order ? {");
    expect(routeSource).toContain("test: order.testPaymentTxHash ? {");
    expect(routeSource).toContain("remaining: order.paymentTxHash ? {");
  });

  it("uses stored received amounts and the established legacy remaining-payment fallback", () => {
    expect(routeSource).toContain("amount: order.paymentTestAmount != null ? Number(order.paymentTestAmount) : null,");
    expect(routeSource).toContain("amount: order.paymentUsdAmount != null");
    expect(routeSource).toContain("Number(order.grandTotal) - Number(order.paymentTestAmount)");
  });

  it("renders both received payment amounts and transaction IDs in the organiser roster", () => {
    const roster = pageSource.slice(
      pageSource.indexOf("const sectionMemberPaymentRoster"),
      pageSource.indexOf("const sectionMainTracking"),
    );

    expect(roster).toContain("Test payment transaction ID");
    expect(roster).toContain("Remaining payment transaction ID");
    expect(roster).toContain("Received");
    expect(roster).toContain("m.paymentTransactions");
  });
});