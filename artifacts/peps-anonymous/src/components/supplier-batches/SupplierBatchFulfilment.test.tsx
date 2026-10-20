import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SupplierBatchFulfilment } from "./SupplierBatchFulfilment";
import { fulfilmentKey, fulfilmentUrl, type FulfilmentDetail } from "../../lib/supplier-fulfilment";

function render(scope: "admin" | "organiser" | "reshipper", tweak?: (d: FulfilmentDetail) => void) {
  const detail: FulfilmentDetail = {
    groupBuy: { id: "gb", name: "Synthetic group" }, canManage: scope !== "reshipper", recipients: ["synthetic-reshipper"], history: [],
    batch: { id: "batch", reference: "GB / 001", region: "EU", state: "ordered", kits: 2.5, orderCount: 1, shipmentCount: 1, untracked: 0, allocatedKits: 2.5, receivedKits: 0, damagedKits: 0, missingKits: 2.5, outstandingOrders: 1, exceptionCount: 0 },
    orders: [{
      id: "order", code: "SYNTHETIC-1", username: "synthetic-member", country: "IT", status: "Processing", route: "@synthetic-reshipper",
      reshipperUsername: "synthetic-reshipper", direct: false, ready: false, exceptions: [],
      items: [{ productId: "p", productName: "Synthetic product", quantity: 2.5, allocated: 2.5, received: 0, damaged: 0 }],
    }],
    shipments: [{
      id: "shipment", batchId: "batch", version: 0, label: "Supplier carton", recipientUsername: "synthetic-reshipper",
      directOrderId: null, carrier: 0, trackingNumber: "SYNTHETIC-TRACKING", trackingParams: {}, trackingStatus: "delivered",
      trackingEvents: [], lastChecked: null, contents: [{ orderId: "order", productId: "p", productName: "Synthetic product", code: "SYNTHETIC-1", username: "synthetic-member", quantity: 2.5 }],
      receipt: [], receiptChecked: false, notes: null, receiptNotes: null, cancelledAt: null, cancelReason: null,
      createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", canReceive: true,
    }],
  };
  tweak?.(detail);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(fulfilmentKey(scope, "gb", "batch"), detail);
  return renderToStaticMarkup(<QueryClientProvider client={client}><SupplierBatchFulfilment scope={scope} groupBuyId="gb" initialBatchId="batch" onViewOrders={() => {}} onDispatch={() => {}} /></QueryClientProvider>);
}
test("staff batch detail has package actions, order navigation and member dispatch", () => {
  const html = render("organiser");
  assert.match(html, /GB \/ 001/);
  assert.match(html, /New package/);
  assert.match(html, /View order SYNTHETIC-1/);
  assert.match(html, /Member dispatch/);
  assert.match(html, /Not ready/);
});
test("reshipper view has inspection but no supplier allocation or tracking editing", () => {
  const html = render("reshipper");
  assert.match(html, /Check contents/);
  assert.doesNotMatch(html, /New package/);
  assert.doesNotMatch(html, /Tracking &amp; notes/);
});
test("a delivered supplier carton does not present the member as dispatched or ready", () => {
  const html = render("admin");
  assert.match(html, /Not ready/);
  assert.match(html, /contents/i);
  assert.doesNotMatch(html, />Dispatched<\/span>/);
});
test("actual member dispatch is shown separately from batch receipt", () => {
  const html = render("admin", d => { d.orders[0].status = "Shipped"; });
  assert.match(html, />Dispatched<\/span>/);
});
test("API roots keep reshipper ownership routes distinct from staff routes", () => {
  assert.equal(fulfilmentUrl("reshipper", "gb"), "/api/reshipper/gb/gb/supplier-fulfilment");
  assert.equal(fulfilmentUrl("organiser", "gb"), "/api/organiser/group-buys/gb/supplier-fulfilment");
});
