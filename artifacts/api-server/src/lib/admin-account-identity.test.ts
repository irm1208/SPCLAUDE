import { describe, expect, it } from "vitest";
import { matchesAccountType } from "./admin-account-identity";

describe("Admin account connection filters", () => {
  const accounts = [
    { telegramUsername: "discord:123456789012345678", discordId: "123456789012345678", telegramConnected: false },
    { telegramUsername: "custom_site_name", discordId: "223456789012345678", telegramConnected: true },
    { telegramUsername: "telegram_member", telegramConnected: true },
    { telegramUsername: "website_member", telegramConnected: false },
  ];
  it("includes all identities without changing account keys", () => {
    expect(accounts.filter(a => matchesAccountType(a, "all"))).toEqual(accounts);
  });
  it("includes Discord accounts with custom handles and legacy synthetic identifiers", () => {
    expect(accounts.filter(a => matchesAccountType(a, "discord"))).toEqual(accounts.slice(0, 2));
    expect(matchesAccountType({ telegramUsername: "@discord:323456789012345678" }, "discord")).toBe(true);
  });
  it("filters actual Telegram links rather than inferring them from a website handle", () => {
    expect(accounts.filter(a => matchesAccountType(a, "telegram"))).toEqual(accounts.slice(1, 3));
    expect(accounts.filter(a => matchesAccountType(a, "non_telegram"))).toEqual([accounts[0], accounts[3]]);
    expect(matchesAccountType({ telegramUsername: "ordinary_username" }, "non_telegram")).toBe(true);
  });
});
