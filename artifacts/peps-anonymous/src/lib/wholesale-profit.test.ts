import { expect, it } from "vitest";
import { wholesaleProfit } from "./wholesale-profit";

it("calculates profit and margin on selling price, not markup on supplier cost", () => {
  expect(wholesaleProfit("46", "60")?.profit).toBe(14);
  expect(wholesaleProfit("46", "60")?.margin).toBeCloseTo(23.3333);
  expect(wholesaleProfit("134.40", "160")).toEqual({ profit: 25.6, margin: 16 });
  expect(wholesaleProfit("45", "45")).toEqual({ profit: 0, margin: 0 });
  expect(wholesaleProfit("60", "50")).toEqual({ profit: -10, margin: -20 });
});
it("does not invent margins from blank, invalid, negative or zero selling prices", () => {
  for (const pair of [["", "60"], ["46", ""], ["x", "60"], ["-1", "60"], ["5", "Infinity"]]) {
    expect(wholesaleProfit(...pair as [string, string])).toBeNull();
  }
  expect(wholesaleProfit("0", "60")).toEqual({ profit: 60, margin: 100 });
  expect(wholesaleProfit("5", "0")).toEqual({ profit: -5, margin: null });
});
