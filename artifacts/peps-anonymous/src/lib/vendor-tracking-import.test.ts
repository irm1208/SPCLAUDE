import assert from "node:assert/strict";
import test from "node:test";
import { vendorOrdersCsv } from "./vendor-orders-csv.ts";
import { previewVendorTrackingImport, applyVendorTrackingImport } from "./vendor-tracking-import.ts";
const order = {
  id: "own-1", reference: "12614", status: "Submitted", stale: false, submittedAt: "2026-10-31T14:17:41Z",
  shipping: { name: 'Test "Recipient"', address: "17 Road, Birmingham, b73 6rg", country: "United Kingdom", phone: "+441234567890", email: "" },
  items: [{ productName: "First, product", quantity: 1, unitCost: "20.00", lineTotal: "20.00" }, { productName: "Other product", quantity: 2, unitCost: "10.00", lineTotal: "20.00" }],
  currency: "USD", productCost: "40.00", shippingCost: "10.00", totalCost: "50.00", carrier: null as string | null, trackingNumber: null as string | null,
};
test("round trips the same exported CSV including quotes and multiline cells", () => {
  const csv = vendorOrdersCsv([{ ...order, carrier: "Royal Mail", trackingNumber: "AB123456789GB" }]);
  const result = previewVendorTrackingImport(csv, [order]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.updates, [{ id: "own-1", reference: "12614", carrier: "Royal Mail", trackingNumber: "AB123456789GB" }]);
  assert.ok(csv.includes('"Paid"'));
});
test("skips blank and unchanged tracking without making updates", () => {
  const empty = previewVendorTrackingImport(vendorOrdersCsv([order]), [order]);
  assert.equal(empty.skipped, 1); assert.equal(empty.updates.length, 0);
  const shipped = { ...order, status: "Shipped", carrier: "DHL", trackingNumber: "TRACK123" };
  const same = previewVendorTrackingImport(vendorOrdersCsv([shipped]), [shipped]);
  assert.equal(same.skipped, 1); assert.equal(same.updates.length, 0);
});
test("rejects unknown, ambiguous, stale and duplicate order references", () => {
  const csv = 'Order reference,Carrier,Tracking number\r\n12614,DHL,TRACK123\r\n';
  assert.match(previewVendorTrackingImport(csv, []).errors.join(), /not found/);
  assert.match(previewVendorTrackingImport(csv, [order, { ...order, id: "own-2" }]).errors.join(), /ambiguous/);
  assert.match(previewVendorTrackingImport(csv, [{ ...order, stale: true }]).errors.join(), /on hold/);
  assert.match(previewVendorTrackingImport(csv + '12614,DHL,TRACK456\r\n', [order]).errors.join(), /duplicate/i);
});
test("requires the tracking headers, valid carrier and valid tracking", () => {
  assert.match(previewVendorTrackingImport('Order reference,Status\n12614,Paid', [order]).errors.join(), /Carrier.*Tracking number/);
  assert.match(previewVendorTrackingImport('Order reference,Carrier,Tracking number\n12614,,TRACK123', [order]).errors.join(), /carrier/i);
  assert.match(previewVendorTrackingImport('Order reference,Carrier,Tracking number\n12614,DHL,!!', [order]).errors.join(), /tracking number/i);
});
test("rejects malformed quoted CSV and duplicate headers", () => {
  assert.match(previewVendorTrackingImport('Order reference,Carrier,Tracking number\n12614,"DHL,TRACK123', [order]).errors.join(), /CSV/);
  assert.match(previewVendorTrackingImport('Order reference,Carrier,Tracking number,Carrier\n12614,DHL,TRACK123,DHL', [order]).errors.join(), /duplicate/i);
});
test("imports reordered columns and ignores edits to prices, payment status and address", () => {
  const result = previewVendorTrackingImport('Tracking number,Address,Carrier,Order reference,Status,Order total cost\nTRACK123,Changed,DHL,12614,Refunded,0', [order]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.updates, [{ id: "own-1", reference: "12614", carrier: "DHL", trackingNumber: "TRACK123" }]);
});
test("reports partial failures and continues to the next order", async () => {
  const rows = [{ id: "own-1", reference: "12614", carrier: "DHL", trackingNumber: "TRACK123" }, { id: "own-2", reference: "12615", carrier: "DHL", trackingNumber: "TRACK456" }];
  const calls: string[] = [];
  const result = await applyVendorTrackingImport(rows, async row => { calls.push(row.id); if (row.id === "own-1") throw new Error("Order changed"); });
  assert.deepEqual(calls, ["own-1", "own-2"]);
  assert.equal(result.saved, 1);
  assert.deepEqual(result.failed, [{ ...rows[0], error: "Order changed" }]);
});

test("unchanged held or completed shipments do not block other tracking updates", () => {
  for (const state of [{ status: "Shipped", stale: true }, { status: "Completed", stale: false }]) {
    const old = { ...order, ...state, carrier: "DHL", trackingNumber: "TRACK123" };
    const next = { ...order, id: "own-2", reference: "12615" };
    const csv = vendorOrdersCsv([old, { ...next, carrier: "DHL", trackingNumber: "TRACK456" }]);
    const preview = previewVendorTrackingImport(csv, [old, next]);
    assert.deepEqual(preview.errors, []);
    assert.equal(preview.skipped, 1);
    assert.equal(preview.updates.length, 1);
    assert.equal(preview.updates[0].id, "own-2");
    const edited = vendorOrdersCsv([{ ...old, trackingNumber: "CHANGED123" }]);
    assert.match(previewVendorTrackingImport(edited, [old]).errors.join(), /on hold or completed/);
  }
});
