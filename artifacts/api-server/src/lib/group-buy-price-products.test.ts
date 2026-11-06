import { expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("@workspace/db", async () => ({
  ...await import("@workspace/db/schema"),
  db: {},
}));

const { organiserRevisionList } = await import("./group-buy-order-revisions");

it("includes group-specific uploads as well as current-owner products, within the authorised group only", async () => {
  let productFilter: ReturnType<PgDialect["sqlToQuery"]> | undefined;
  const database = {
    select: () => ({
      from(table: any) {
        const name = getTableName(table);
        const rows = name === "group_buys"
          ? [{ id: "group", organiserId: "current-owner" }]
          : [];
        const query = {
          innerJoin: () => query,
          where(condition: any) {
            if (name === "group_buy_products") productFilter = new PgDialect().sqlToQuery(condition);
            return query;
          },
          orderBy: () => query,
          then(resolve: (value: any[]) => unknown) { return Promise.resolve(rows).then(resolve); },
        };
        return query;
      },
    }),
    transaction: vi.fn(),
  };
  await organiserRevisionList("group", { username: "current-owner" }, database as any);
  expect(productFilter?.sql).toBe(
    '("group_buy_products"."group_buy_id" = $1 and ("products"."organiser_id" = $2 or "products"."source_group_buy_id" = $3))',
  );
  expect(productFilter?.params).toEqual(["group", "current-owner", "group"]);
  expect(database.transaction).not.toHaveBeenCalled();
});
