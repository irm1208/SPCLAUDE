import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const accountSource = readFileSync(new URL("../account.ts", import.meta.url), "utf8");
const orderSource = readFileSync(new URL("../orders.ts", import.meta.url), "utf8");
const adminSource = readFileSync(new URL("../admin.ts", import.meta.url), "utf8");
const wholesaleSource = readFileSync(
  new URL("../../lib/wholesale-access-auto-verify.ts", import.meta.url),
  "utf8",
);
const startupSource = readFileSync(new URL("../../index.ts", import.meta.url), "utf8");
const accountSchemaSource = readFileSync(
  new URL("../../../../../lib/db/src/schema/accounts.ts", import.meta.url),
  "utf8",
);
const orderSchemaSource = readFileSync(
  new URL("../../../../../lib/db/src/schema/orders.ts", import.meta.url),
  "utf8",
);

type FakeState = { accountCents: bigint; orderCreditsCents: bigint; ledgerRows: number };

class FakeCreditDb {
  state: FakeState = { accountCents: 100n, orderCreditsCents: 0n, ledgerRows: 0 };
  private tail = Promise.resolve();

  async transaction<T>(work: (state: FakeState) => Promise<T>): Promise<T> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>(resolve => { release = resolve; });
    await previous;
    const snapshot = { ...this.state };
    try {
      return await work(this.state);
    } catch (error) {
      this.state = snapshot;
      throw error;
    } finally {
      release();
    }
  }
}

async function spend(db: FakeCreditDb, requestedCents: bigint, fail = false): Promise<bigint> {
  return db.transaction(async state => {
    const deducted = state.accountCents < requestedCents ? state.accountCents : requestedCents;
    state.accountCents -= deducted;
    state.orderCreditsCents += deducted;
    if (fail) throw new Error("ledger insert failed");
    state.ledgerRows++;
    return deducted;
  });
}

// Focused adapter/source tests stay separate from DB-backed integration
// coverage, which is sequenced for Task 10.
describe("credit transaction atomicity (Task 2 adapter coverage)", () => {
  it("serializes concurrent fake spends without overspending", async () => {
    const db = new FakeCreditDb();
    const deducted = await Promise.all([spend(db, 75n), spend(db, 75n)]);
    expect(deducted).toEqual([75n, 25n]);
    expect(db.state).toEqual({ accountCents: 0n, orderCreditsCents: 100n, ledgerRows: 2 });
  });

  it("rolls back account, order, and ledger together", async () => {
    const db = new FakeCreditDb();
    await expect(spend(db, 35n, true)).rejects.toThrow("ledger insert failed");
    expect(db.state).toEqual({ accountCents: 100n, orderCreditsCents: 0n, ledgerRows: 0 });
  });

  it("keeps production credit paths transactional and locked", () => {
    expect(accountSource).toContain("const runCreditSpend = async () => db.transaction(async tx =>");
    expect(accountSource).toContain(".where(or(eq(accountsTable.telegramUsername, tg), eq(accountsTable.telegramUsername, altTg)))");
    expect(accountSource).toContain(".where(eq(ordersTable.id, orderId))\n      .for(\"update\");");
    expect(accountSource).toContain("operationKey");
    expect(orderSource).toContain("await db.transaction(async tx =>");
    expect(orderSource).toContain(".where(eq(accountsTable.telegramUsername, sessionUsernameForCredits))\n        .for(\"update\")");
    expect(orderSource).toContain(".where(eq(ordersTable.id, orderId))\n        .for(\"update\")");
    expect(orderSource).not.toContain("Non-fatal — order was created, credits just weren't applied");
    const additionBranch = orderSource.slice(orderSource.indexOf("if (additionParent) {"));
    expect(additionBranch.indexOf("lockedAccount")).toBeLessThan(additionBranch.indexOf("lockedParent"));
    expect(wholesaleSource).toContain("await db.transaction(async tx =>");
    expect(wholesaleSource).toContain(".for(\"update\")");
    expect(adminSource).toContain("const outcome = await db.transaction(async tx =>");
    expect(adminSource).toContain("isNull(ordersTable.refundStatus)");
    const refundBranch = adminSource.slice(
      adminSource.indexOf("const outcome = await db.transaction", adminSource.indexOf('router.post("/admin/orders/:id/refund-to-credits"')),
    );
    expect(refundBranch.indexOf("accountsTable")).toBeLessThan(refundBranch.indexOf("ordersTable.id"));
    expect(startupSource).toContain("normal Replit schema migration");
    expect(startupSource).not.toMatch(/ALTER\s+TYPE/i);
    expect(accountSchemaSource).toContain("planned schema migration");
    expect(orderSchemaSource).toContain("pending the normal published schema migration");
  });
});