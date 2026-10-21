import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { labTestPurityThresholdSql } from "./lab-test-quality";
import { readFileSync } from "node:fs";

describe("lab-test metrics purity threshold", () => {
  it("uses the requested default and keeps HGH's threshold", () => {
    const query = new PgDialect().sqlToQuery(labTestPurityThresholdSql(sql`peptide_name`));
    expect(query.sql).toContain("then 95 else 98 end");
    expect(query.sql).toContain("regexp_replace");
    expect(query.sql).toContain("(iu|mg|mcg|µg|μg)");
    expect(query.params).toEqual(["hgh", "humangrowthhormone", "growthhormone", "somatropin"]);
    expect(query.params).not.toContain("hghfrag176191");
  });
  it("applies the same threshold to both server metric buckets", () => {
    const source = readFileSync(new URL("../routes/lab-tests.ts", import.meta.url), "utf8");
    expect(source).toMatch(/goodPurity:.*labTestPurityThresholdSql/);
    expect(source).toMatch(/lowPurity:.*labTestPurityThresholdSql/);
  });
});
