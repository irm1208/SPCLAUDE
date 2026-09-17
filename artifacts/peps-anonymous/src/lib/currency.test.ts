import assert from "node:assert/strict";
import test from "node:test";
import { currSym } from "./currency";

test("stablecoin group-buy currencies use a dollar symbol", () => {
  assert.equal(currSym("USDT"), "$");
  assert.equal(currSym("USDC"), "$");
  assert.equal(currSym("USD"), "$");
});