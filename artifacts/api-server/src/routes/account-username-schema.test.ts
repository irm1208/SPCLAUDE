import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { groupBuyRefundsTable } from "@workspace/db/schema";

describe("account username foreign-key cascades", () => {
  it("lets completed refunds follow a Discord account's new username without permitting account deletion", () => {
    const ownership = getTableConfig(groupBuyRefundsTable).foreignKeys.find(
      key => key.reference().columns[0].name === "account_id",
    );
    expect(ownership).toMatchObject({ onUpdate: "cascade", onDelete: "restrict" });
  });

  it("keeps the active-refund guard before the account username update", () => {
    const source = readFileSync(new URL("./account.ts", import.meta.url), "utf8");
    const handler = source.slice(source.indexOf('router.post("/account/change-username"'));
    const guard = handler.indexOf("await assertNoActiveRefunds(");
    const rename = handler.indexOf("UPDATE accounts SET telegram_username");
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(rename).toBeGreaterThan(guard);
  });

  it("allows wholesale access-request owners to rename their account", () => {
    const source = readFileSync(
      new URL("../../../../lib/db/src/schema/wholesale_access_requests.ts", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(
      /accountUsername:\s*text\("account_username"\)\.notNull\(\)\.references\(\s*\(\) => accountsTable\.telegramUsername,\s*\{\s*onUpdate:\s*"cascade"\s*\}\s*,?\s*\)/,
    );
  });
});