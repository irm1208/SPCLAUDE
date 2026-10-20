import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ReshipperCollectionsCard } from "./ReshipperCollectionsCard";

it("shows the two collected totals, currency, eligible order count and collection scope", () => {
  const html = renderToStaticMarkup(<ReshipperCollectionsCard
    currency="USD" reshipperUsername="@Alice" orders={[
      { reshipperUsername: "Alice", status: "Completed", paymentStatus: "confirmed", adminFee: "10", deliveryPrice: "23", amountDue: "0" },
      { reshipperUsername: "Alice", status: "Submitted", paymentStatus: "test_confirmed", adminFee: "99", deliveryPrice: "99", amountDue: "0" },
    ]}
  />);
  expect(html).toContain("Admin fees collected");
  expect(html).toContain("Member postage collected");
  expect(html).toContain("USD 10.00");
  expect(html).toContain("USD 23.00");
  expect(html).toContain("1 fully paid order");
  expect(html).toContain("Vendor shipping excluded");
  expect(html).not.toContain("USD 99");
});

it("shows an explicit error instead of a misleading zero total", () => {
  const html = renderToStaticMarkup(<ReshipperCollectionsCard currency="GBP" reshipperUsername="Alice" orders={[
    { reshipperUsername: "Alice", status: "Submitted", paymentStatus: "confirmed", adminFee: "?", deliveryPrice: "3", amountDue: "0" },
  ]} />);
  expect(html).toContain('role="alert"');
  expect(html).toContain("Totals unavailable");
  expect(html).not.toContain("GBP 0.00");
});
