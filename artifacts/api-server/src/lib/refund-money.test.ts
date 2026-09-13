import { describe, expect, it } from "vitest";
import {
  addMoney,
  centsToUsdString,
  subtractMoneyClamped,
  subtractMoney,
  usdToCents,
  usdToSixDecimalBaseUnits,
} from "./refund-money";

describe("refund fixed-point money", () => {
  it("converts decimal USD to exact six-decimal base units", () => {
    expect(usdToSixDecimalBaseUnits("123.45")).toBe("123450000");
    expect(usdToSixDecimalBaseUnits("0.01")).toBe("10000");
    expect(usdToSixDecimalBaseUnits("10")).toBe("10000000");
  });

  it("rejects invalid USD precision, notation, sign, and non-positive amounts", () => {
    expect(() => usdToSixDecimalBaseUnits("1.001")).toThrow("amount_usd_precision");
    expect(() => usdToSixDecimalBaseUnits("0.00")).toThrow("amount_usd_positive");
    expect(() => usdToSixDecimalBaseUnits("1e2")).toThrow("amount_usd_format");
    expect(() => usdToCents("-1")).toThrow("amount_usd_format");
    expect(() => usdToCents("Infinity")).toThrow("amount_usd_format");
    expect(() => usdToCents("01.00")).toThrow("amount_usd_format");
  });

  it("keeps account credits at exact cents", () => {
    expect(addMoney("12.10", "0.35")).toBe("12.45");
    expect(subtractMoney("12.45", "0.35")).toBe("12.10");
    expect(centsToUsdString(12345n)).toBe("123.45");
    expect(() => subtractMoney("0.34", "0.35")).toThrow("money_negative");
  });

  it("caps a fractional deduction without concatenating decimal strings", () => {
    const available = usdToCents("0.35");
    const requested = usdToCents("0.80");
    const orderRemaining = usdToCents("0.40");
    const deducted = [available, requested, orderRemaining]
      .reduce((minimum, value) => value < minimum ? value : minimum);
    expect(centsToUsdString(deducted)).toBe("0.35");
    expect(addMoney("12.10", "0.35")).not.toBe("12.100.35");
  });

  it("subtracts fractional credits and test payments with a zero floor", () => {
    expect(subtractMoneyClamped("30.99", "0.35", "0.10")).toBe("30.54");
    expect(subtractMoneyClamped("0.10", "0.35")).toBe("0.00");
  });
});