import { test } from "node:test";
import assert from "node:assert/strict";
import { coaPhase, coaAdminQuery, missingCoaFields, canMemberEdit, canRelease, confirmNoteOk, fmtCoaFee } from "./coa-ui";
import type { CoaRequest } from "./coa-api";

const base: CoaRequest = {
  id: "r1", orderId: "o1", groupBuyId: "g1", orderCode: "A1", member: "m", groupName: "G", source: "public",
  status: "reserved", client: "", sample: "", manufacturer: "", batch: "", fee: 42.5, currency: "USD",
  expiresAt: null, payment: null, txHash: null, reference: null, verificationMessage: null, updatedAt: "",
};

test("phases distinguish unpaid/review/paid/processing/completed", () => {
  assert.equal(coaPhase("invited"), "unpaid");
  assert.equal(coaPhase("reserved"), "unpaid");
  assert.equal(coaPhase("review"), "review");
  assert.equal(coaPhase("paid"), "paid");
  assert.equal(coaPhase("processing"), "processing");
  assert.equal(coaPhase("completed"), "completed");
  assert.equal(coaPhase("expired"), "closed");
});

test("admin query omits blanks", () => {
  assert.equal(coaAdminQuery({}), "");
  assert.equal(coaAdminQuery({ groupBuyId: "g1", search: " ", status: "paid" }), "?groupBuyId=g1&status=paid");
});

test("required fields", () => {
  assert.deepEqual(missingCoaFields({ client: "a", sample: " ", manufacturer: "b", batch: "" }), ["sample", "batch"]);
});

test("edit/release rules", () => {
  assert.equal(canMemberEdit(null), true);
  assert.equal(canMemberEdit({ ...base, status: "review" }), false);
  assert.equal(canRelease(base), true);
  assert.equal(canRelease({ ...base, txHash: "0x1" }), false);
  assert.equal(canRelease({ ...base, status: "expired", reference: "ref" }), false);
  assert.equal(confirmNoteOk("ok"), false);
  assert.equal(confirmNoteOk("Bank receipt checked"), true);
  assert.match(fmtCoaFee(42.5, "USD"), /42\.50/);
});

import { canConfirm, canReReserve, canMemberPay, inviteCandidates, COA_STATUS_LABEL } from "./coa-ui";
const filled = { client: "c", sample: "s", manufacturer: "m", batch: "b" };

test("evidence locks member editing even while reserved", () => {
  assert.equal(canMemberEdit({ ...base, txHash: "0xabc" }), false);
  assert.equal(canMemberEdit({ ...base, reference: "bank-1" }), false);
  assert.equal(canMemberEdit(base), true);
});

test("re-reserve only for expired/withdrawn without evidence and eligible", () => {
  assert.equal(canReReserve({ ...base, status: "expired" }, true), true);
  assert.equal(canReReserve({ ...base, status: "withdrawn" }, true), true);
  assert.equal(canReReserve({ ...base, status: "expired" }, false), false);
  assert.equal(canReReserve({ ...base, status: "expired", txHash: "0x" }, true), false);
  assert.equal(canReReserve({ ...base, status: "reserved" }, true), false);
});

test("pay only after all details saved and no evidence", () => {
  assert.equal(canMemberPay({ ...base, status: "invited" }), false);
  assert.equal(canMemberPay({ ...base, ...filled, status: "invited" }), false);
  assert.equal(canMemberPay({ ...base, ...filled, status: "reserved" }), true);
  assert.equal(canMemberPay({ ...base, ...filled, txHash: "0x" }), false);
});

test("confirm always needs 5+ char note; invited without details hides confirm", () => {
  assert.equal(confirmNoteOk("abcd"), false);
  assert.equal(confirmNoteOk("abcde"), true);
  assert.equal(canConfirm({ ...base, status: "invited" }), false);
  assert.equal(canConfirm({ ...base, ...filled, status: "invited" }), true);
  assert.equal(canConfirm({ ...base, status: "review", txHash: "0x" }), true);
  assert.equal(canConfirm({ ...base, status: "completed" }), false);
});

test("invite candidates exclude live commitments from unfiltered list", () => {
  const orders = [{ id: "o1" }, { id: "o2" }, { id: "o3" }, { id: "o4" }];
  const reqs = [
    { ...base, orderId: "o1", status: "invited" as const },
    { ...base, orderId: "o2", status: "expired" as const },
    { ...base, orderId: "o3", status: "expired" as const, reference: "r" },
  ];
  assert.deepEqual(inviteCandidates(orders, reqs).map(o => o.id), ["o2", "o4"]);
});

test("copy", () => { assert.equal(COA_STATUS_LABEL.processing, "Processing"); });
