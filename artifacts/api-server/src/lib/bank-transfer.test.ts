import { describe, it, expect } from "vitest";
import { parseBankTransfer, hasBankTransfer } from "@workspace/api-zod/bank-transfer";

const uk = { enabled: true, accountHolder: "Example Ltd", sortCode: "12-34-56", accountNumber: "00123456", bankName: "Example Bank" };
const international = { enabled: true, accountHolder: "Example Ltd", accountNumber: "DE89 3704 0044 0532 0130 00", swiftBic: "COBADEFFXXX", clearingCode: "", bankName: "Example Bank", bankAddress: "1 Bank Street, Berlin, Germany" };
describe("group-buy bank transfer settings", () => {
  it("saves UK and international accounts separately without losing leading zeroes", () => {
    const value = parseBankTransfer({ uk, international });
    expect(value.uk?.accountNumber).toBe("00123456");
    expect(value.international?.swiftBic).toBe("COBADEFFXXX");
    expect(hasBankTransfer(value)).toBe(true);
  });
  it("rejects enabled incomplete accounts and invalid UK/SWIFT formats", () => {
    for (const value of [
      { uk: { ...uk, accountHolder: "" } },
      { uk: { ...uk, accountNumber: "123" } },
      { uk: { ...uk, sortCode: "invalid" } },
      { international: { ...international, swiftBic: "bad" } },
      { international: { ...international, bankAddress: "" } },
    ]) expect(() => parseBankTransfer(value)).toThrow();
  });
  it("allows disabled drafts and clearing codes to be optional", () => {
    expect(hasBankTransfer(parseBankTransfer({ uk: { enabled: false } }))).toBe(false);
    expect(parseBankTransfer({ international }).international?.clearingCode).toBe("");
    expect(parseBankTransfer(null)).toBeNull();
    expect(hasBankTransfer({ uk: { enabled: true } })).toBe(false);
  });
  it("rejects malformed input instead of coercing it", () => {
    for (const input of ["bank", [], { uk: true }, { uk: { ...uk, enabled: "yes" } }, { uk: { ...uk, accountNumber: 12345678 } }])
      expect(() => parseBankTransfer(input)).toThrow();
  });
});
