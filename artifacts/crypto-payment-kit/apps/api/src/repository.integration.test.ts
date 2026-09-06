import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PaymentRepository } from "./repository.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
suite("PostgreSQL repository integration (requires isolated TEST_DATABASE_URL)", () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const repository = new PaymentRepository(pool);
  let merchantId = "";
  beforeAll(async () => {
    // TEST_DATABASE_URL is intentionally opt-in: this drops only the caller's isolated test schema.
    await pool.query(await readFile(resolve(import.meta.dirname, "../drizzle/0000_initial.sql"), "utf8"));
    await pool.query("TRUNCATE webhook_deliveries,webhook_events,verification_jobs,verification_attempts,payment_events,payment_transactions,quotes,payments,webhook_endpoints,api_keys,merchants CASCADE");
    merchantId = (await pool.query<{ id: string }>("INSERT INTO merchants(public_id,name) VALUES('merchant_test','test') RETURNING id")).rows[0].id;
  });
  afterAll(async () => { await pool.end(); });
  const input = (suffix: string) => ({ publicId: `pay_${suffix}`, merchantOrderReference: `order_${suffix}`, idempotencyKey: `idem_${suffix}`, fiatAmount: "10.00", fiatCurrency: "USD", rails: ["ethereum-usdc"] });

  it("enforces idempotent creation under concurrent calls", async () => {
    const request = input("idem");
    const records = await Promise.all(Array.from({ length: 6 }, () => repository.createPayment(merchantId, request)));
    expect(new Set(records.map((record) => record.id)).size).toBe(1);
  });
  it("rejects a transaction hash reused across rails on the same canonical chain", async () => {
    const first = await repository.createPayment(merchantId, input("one"));
    const second = await repository.createPayment(merchantId, input("two"));
    await pool.query(`INSERT INTO quotes(payment_id,rail_id,family,network_name,chain_id,asset,token_id,decimals,amount_base_units,rate,rate_source,destination,required_confirmations,underpay_bps,overpay_bps,expires_at)
      VALUES($1,'ethereum-usdc','evm_erc20','ethereum','1','USDC','token',6,'1','1','test','destination',12,100,200,now()+interval '1 hour'),
            ($2,'ethereum-usdt','evm_erc20','ethereum','1','USDT','token',6,'1','1','test','destination',12,100,200,now()+interval '1 hour')`, [first.id, second.id]);
    expect((await repository.submitTransaction(first.publicId, "0x" + "a".repeat(64))).kind).toBe("accepted");
    expect((await repository.submitTransaction(second.publicId, "0x" + "a".repeat(64))).kind).toBe("reused");
    expect((await pool.query("SELECT * FROM verification_jobs")).rowCount).toBe(1);
  });
  it("accepts the same transaction hash on different canonical chains", async () => {
    const first = await repository.createPayment(merchantId, input("ethereum"));
    const second = await repository.createPayment(merchantId, input("arbitrum"));
    await pool.query(`INSERT INTO quotes(payment_id,rail_id,family,network_name,chain_id,asset,token_id,decimals,amount_base_units,rate,rate_source,destination,required_confirmations,underpay_bps,overpay_bps,expires_at)
      VALUES($1,'ethereum-usdc','evm_erc20','ethereum','1','USDC','token',6,'1','1','test','destination',12,100,200,now()+interval '1 hour'),
            ($2,'arbitrum-usdc','evm_erc20','arbitrum','42161','USDC','token',6,'1','1','test','destination',20,100,200,now()+interval '1 hour')`, [first.id, second.id]);
    const hash = "0x" + "b".repeat(64);
    expect((await repository.submitTransaction(first.publicId, hash)).kind).toBe("accepted");
    expect((await repository.submitTransaction(second.publicId, hash)).kind).toBe("accepted");
  });
  it("claims each due verification job once using a lease", async () => {
    const claimed = await Promise.all([repository.claimVerificationJobs(10), repository.claimVerificationJobs(10)]);
    expect(claimed.flat().map((job: { id: string }) => job.id)).toHaveLength(1);
  });
});