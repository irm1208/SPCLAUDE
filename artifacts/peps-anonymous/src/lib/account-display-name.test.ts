import { describe, expect, it } from "vitest";
import { accountDisplayName } from "./account-display-name";

describe("accountDisplayName", () => {
  const names = { "discord:1528489165962871026": "thelucky0407" };
  it("shows the linked Discord username without changing the stored identity", () => {
    expect(accountDisplayName("discord:1528489165962871026", names)).toBe("thelucky0407");
    expect(accountDisplayName("@discord:1528489165962871026", names)).toBe("thelucky0407");
    expect(Object.keys(names)).toEqual(["discord:1528489165962871026"]);
  });
  it("preserves Telegram handles even when a Discord account is linked", () => {
    expect(accountDisplayName("telegram_member", { telegram_member: "discord_member" })).toBe("telegram_member");
    expect(accountDisplayName("@telegram_member", names)).toBe("@telegram_member");
  });
  it("never shows an unresolved synthetic Discord ID", () => {
    expect(accountDisplayName("discord:123", {})).toBe("Discord member");
    expect(accountDisplayName(null, names)).toBe("—");
  });
});
