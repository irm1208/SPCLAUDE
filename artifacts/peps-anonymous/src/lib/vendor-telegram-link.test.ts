import { describe, expect, it } from "vitest";
import { vendorTelegramLinks } from "./vendor-telegram-link";

describe("vendor Telegram connection links", () => {
  it("includes the connection payload for personal and group Telegram linking", () => {
    expect(vendorTelegramLinks("pepanonbot", "a".repeat(24))).toEqual({
      personal: `https://t.me/pepanonbot?start=${"a".repeat(24)}`,
      group: `https://t.me/pepanonbot?startgroup=${"a".repeat(24)}`,
    });
  });
  it("rejects missing bot details, external URLs and invalid connection payloads", () => {
    for (const name of [null, "", "https://other.example", "bot?start=other", "../other"]) {
      expect(() => vendorTelegramLinks(name, "a".repeat(24))).toThrow();
    }
    for (const token of ["", "a&admin=true", "a".repeat(65)]) {
      expect(() => vendorTelegramLinks("pepanonbot", token)).toThrow();
    }
  });
});
