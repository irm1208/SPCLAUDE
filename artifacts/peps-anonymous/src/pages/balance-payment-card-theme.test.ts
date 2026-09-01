import test from "node:test";
import assert from "node:assert/strict";

let getBalancePaymentCardTheme:
  | ((dark: boolean) => {
      card: string;
      border: string;
      heading: string;
      selected: string;
      cta: string;
      shellPadding: string;
      panelPadding: string;
      methodPadding: string;
    })
  | undefined;
let BALANCE_PAYMENT_METHOD_COPY:
  | { anonpay: { label: string; detail: string } }
  | undefined;

try {
  ({ getBalancePaymentCardTheme, BALANCE_PAYMENT_METHOD_COPY } = await import("./balance-payment-card-theme.ts"));
} catch {
  // The red run intentionally happens before the implementation exists.
}

test("light balance card uses the approved website-blue treatment", () => {
  assert.equal(typeof getBalancePaymentCardTheme, "function");
  const theme = getBalancePaymentCardTheme!(false);
  assert.equal(theme.card, "#ffffff");
  assert.equal(theme.heading, "#1b3164");
  assert.equal(theme.selected, "#eef5ff");
  assert.match(theme.cta, /#1b3a7a.*#2d6bcc/);
  assert.equal(theme.shellPadding, "p-3 sm:p-4");
  assert.equal(theme.panelPadding, "p-3 sm:p-4");
  assert.equal(theme.methodPadding, "p-2 sm:p-2.5");
});

test("dark balance card uses the approved navy and cobalt treatment", () => {
  assert.equal(typeof getBalancePaymentCardTheme, "function");
  const theme = getBalancePaymentCardTheme!(true);
  assert.equal(theme.card, "#101f34");
  assert.equal(theme.border, "#29415f");
  assert.equal(theme.heading, "#edf5ff");
  assert.equal(theme.selected, "#173967");
});

test("the private payment option is presented as AnonPay", () => {
  assert.deepEqual(BALANCE_PAYMENT_METHOD_COPY?.anonpay, {
    label: "AnonPay",
    detail: "Pay through Trocador AnonPay",
  });
});