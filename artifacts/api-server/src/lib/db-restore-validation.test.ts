import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { startDisposablePostgres, type DisposablePostgres } from "./disposable-postgres";
import { validateRestoredDatabase } from "./db-restore-validation";

const CORE_TABLES = ["accounts", "orders", "order_line_items", "products", "audit_logs"] as const;

let postgres: DisposablePostgres;

async function createFixture(options: {
  omit?: (typeof CORE_TABLES)[number];
  rows?: boolean;
} = {}): Promise<void> {
  const definitions: Record<(typeof CORE_TABLES)[number], string> = {
    accounts: "CREATE TABLE accounts (telegram_username text PRIMARY KEY)",
    products: "CREATE TABLE products (id text PRIMARY KEY)",
    orders: `CREATE TABLE orders (id text PRIMARY KEY, telegram_username text NOT NULL
      ${options.omit === "accounts" ? "" : "REFERENCES accounts(telegram_username)"})`,
    order_line_items: `CREATE TABLE order_line_items (
      id text PRIMARY KEY,
      order_id text NOT NULL ${options.omit === "orders" ? "" : "REFERENCES orders(id)"},
      product_id text NOT NULL ${options.omit === "products" ? "" : "REFERENCES products(id)"}
    )`,
    audit_logs: "CREATE TABLE audit_logs (id serial PRIMARY KEY, action text NOT NULL)",
  };

  for (const table of ["accounts", "products", "orders", "order_line_items", "audit_logs"] as const) {
    if (table !== options.omit) await postgres.executePsql(definitions[table]);
  }
  if (options.rows === false || options.omit) return;

  await postgres.executePsql(`
    INSERT INTO accounts VALUES ('fixture-account');
    INSERT INTO products VALUES ('fixture-product');
    INSERT INTO orders VALUES ('fixture-order', 'fixture-account');
    INSERT INTO order_line_items VALUES ('fixture-line', 'fixture-order', 'fixture-product');
    INSERT INTO audit_logs(action) VALUES ('fixture-action');
  `);
}

beforeAll(async () => {
  postgres = await startDisposablePostgres({ timeoutMs: 30_000 });
}, 45_000);

beforeEach(async () => {
  await postgres.executePsql("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
});

afterAll(async () => {
  await postgres?.stopAndRemove();
}, 45_000);

describe("validateRestoredDatabase", () => {
  test.each(CORE_TABLES)("reports missing core table %s without querying the absent relation", async (missingTable) => {
    await createFixture({ omit: missingTable });

    const result = await validateRestoredDatabase(postgres);

    expect(result.checks.find(({ name }) => name === "core_tables")).toEqual({
      name: "core_tables",
      passed: false,
      detail: `Missing core tables: ${missingTable}`,
    });
  });

  test("detects rows that violate a foreign key", async () => {
    await createFixture();
    await postgres.executePsql(`
      ALTER TABLE order_line_items DROP CONSTRAINT order_line_items_product_id_fkey;
      UPDATE order_line_items SET product_id = 'private-orphan-value';
      ALTER TABLE order_line_items ADD CONSTRAINT order_line_items_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES products(id) NOT VALID;
    `);

    const result = await validateRestoredDatabase(postgres);

    expect(result.checks.find(({ name }) => name === "foreign_keys")).toMatchObject({
      passed: false,
      detail: "1 foreign key constraint has violating rows",
    });
    expect(JSON.stringify(result)).not.toContain("private-orphan-value");
  });

  test("detects a partial-null child row that violates a composite MATCH FULL foreign key", async () => {
    await createFixture();
    await postgres.executePsql(`
      CREATE TABLE composite_parents (part_a integer NOT NULL, part_b integer NOT NULL, PRIMARY KEY (part_a, part_b));
      CREATE TABLE composite_children (part_a integer, part_b integer);
      INSERT INTO composite_parents VALUES (1, 2);
      INSERT INTO composite_children VALUES (1, NULL);
      ALTER TABLE composite_children ADD CONSTRAINT composite_children_parent_fk
        FOREIGN KEY (part_a, part_b) REFERENCES composite_parents(part_a, part_b)
        MATCH FULL NOT VALID;
    `);

    const result = await validateRestoredDatabase(postgres);

    expect(result.checks.find(({ name }) => name === "foreign_keys")).toEqual({
      name: "foreign_keys",
      passed: false,
      detail: "1 foreign key constraint has violating rows",
    });
  });

  test("detects NOT VALID constraints even when their rows are valid", async () => {
    await createFixture();
    await postgres.executePsql(`
      ALTER TABLE orders ADD CONSTRAINT restored_order_account_fk
        FOREIGN KEY (telegram_username) REFERENCES accounts(telegram_username) NOT VALID
    `);

    const result = await validateRestoredDatabase(postgres);

    expect(result.checks.find(({ name }) => name === "validated_constraints")).toEqual({
      name: "validated_constraints",
      passed: false,
      detail: "1 constraint is marked NOT VALID",
    });
  });

  test("detects owned sequences behind the maximum stored ID", async () => {
    await createFixture();
    await postgres.executePsql("INSERT INTO audit_logs(id, action) VALUES (10, 'later'); SELECT setval('audit_logs_id_seq', 2, true)");

    const result = await validateRestoredDatabase(postgres);

    expect(result.checks.find(({ name }) => name === "owned_sequences")).toEqual({
      name: "owned_sequences",
      passed: false,
      detail: "1 owned sequence is behind its stored IDs",
    });
  });

  test("detects an ascending sequence whose uncalled last value would collide on nextval", async () => {
    await createFixture();
    await postgres.executePsql("INSERT INTO audit_logs(id, action) VALUES (10, 'existing'); SELECT setval('audit_logs_id_seq', 10, false)");

    const result = await validateRestoredDatabase(postgres);

    expect(result.checks.find(({ name }) => name === "owned_sequences")).toEqual({
      name: "owned_sequences",
      passed: false,
      detail: "1 owned sequence is behind its stored IDs",
    });
  });

  test("detects a descending sequence whose next emitted value collides with stored IDs", async () => {
    await createFixture();
    await postgres.executePsql(`
      CREATE TABLE descending_records (id integer PRIMARY KEY);
      CREATE SEQUENCE descending_records_id_seq START WITH 10 INCREMENT BY -1 MINVALUE 1 MAXVALUE 10;
      ALTER SEQUENCE descending_records_id_seq OWNED BY descending_records.id;
      INSERT INTO descending_records VALUES (10), (9);
      SELECT setval('descending_records_id_seq', 10, true);
    `);

    const result = await validateRestoredDatabase(postgres);

    expect(result.checks.find(({ name }) => name === "owned_sequences")).toEqual({
      name: "owned_sequences",
      passed: false,
      detail: "1 owned sequence is behind its stored IDs",
    });
  });

  test("rejects an implausible restore where all core tables are empty", async () => {
    await createFixture({ rows: false });

    const result = await validateRestoredDatabase(postgres);

    expect(result.tableCount).toBe(5);
    expect(result.aggregateRowCount).toBe(0);
    expect(result.checks.find(({ name }) => name === "plausible_row_count")).toEqual({
      name: "plausible_row_count",
      passed: false,
      detail: "Core tables contain no rows",
    });
  });

  test("returns sanitized counts and passing checks for a valid restored database", async () => {
    await createFixture();

    const result = await validateRestoredDatabase(postgres);

    expect(result).toEqual({
      tableCount: 5,
      aggregateRowCount: 5,
      checks: [
        { name: "core_tables", passed: true },
        { name: "read_only_transaction", passed: true },
        { name: "foreign_keys", passed: true },
        { name: "validated_constraints", passed: true },
        { name: "owned_sequences", passed: true },
        { name: "plausible_row_count", passed: true },
      ],
    });
  });
});