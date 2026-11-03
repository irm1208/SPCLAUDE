import { afterEach, describe, expect, it, vi } from "vitest";
import { verifySolanaNativePayment as verifyNative } from "./solana-payment-verify";

// VerifyResult is a union; the tests inspect whichever branch came back.
const verifySolanaNativePayment = async (...args: Parameters<typeof verifyNative>): Promise<any> => verifyNative(...args);

const WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const PAYER = "9ZNTfG4NyQgxy2SWjSiQoUyBPEvXT2xo7fKc5hPYYJ7b";
const SIG = "5".repeat(87);
const ENDPOINTS = ["https://rpc.test/one", "https://rpc.test/two"];

function rpcResult(overrides: Record<string, unknown> = {}) {
  return {
    transaction: { signatures: [SIG], message: { accountKeys: [{ pubkey: PAYER, signer: true }, { pubkey: WALLET }, { pubkey: "11111111111111111111111111111111" }] } },
    meta: { err: null, fee: 5000, preBalances: [2_000_000_000, 100_000_000, 1], postBalances: [1_499_995_000, 600_000_000, 1] },
    ...overrides,
  };
}
function stubRpc(responder: (endpoint: string) => { ok?: boolean; body?: any } | Error) {
  vi.stubGlobal("fetch", vi.fn(async (endpoint: string) => {
    const r = responder(endpoint);
    if (r instanceof Error) throw r;
    return { ok: r.ok ?? true, json: async () => r.body } as Response;
  }));
}
afterEach(() => vi.unstubAllGlobals());

describe("native SOL verification", () => {
  it("accepts a transfer whose net lamport change covers the quoted amount", async () => {
    stubRpc(() => ({ body: { result: rpcResult() } }));
    const result = await verifySolanaNativePayment(SIG, WALLET, 0.5, 0.15, ENDPOINTS);
    expect(result.verified).toBe(true);
    expect(result.amountUsdt).toBeCloseTo(0.5, 9);
    expect(result.observedTransfers).toEqual([{ recipientAddress: WALLET, amount: 0.5 }]);
  });
  it("uses the tolerance for small underpayments and rejects large ones", async () => {
    stubRpc(() => ({ body: { result: rpcResult() } }));
    expect((await verifySolanaNativePayment(SIG, WALLET, 0.55, 0.15, ENDPOINTS)).verified).toBe(true);
    const short = await verifySolanaNativePayment(SIG, WALLET, 0.7, 0.15, ENDPOINTS);
    expect(short.verified).toBe(false);
    expect(short.reason).toMatch(/Underpayment/);
  });
  it("rejects payments to another wallet and failed transactions", async () => {
    stubRpc(() => ({ body: { result: rpcResult() } }));
    const other = await verifySolanaNativePayment(SIG, PAYER, 0.1, 0.15, ENDPOINTS);
    expect(other.verified).toBe(false);
    expect(other.reason).toMatch(/No SOL payment/);
    stubRpc(() => ({ body: { result: rpcResult({ meta: { err: { InstructionError: [0, "Custom"] }, preBalances: [1, 1], postBalances: [1, 1] } }) } }));
    expect((await verifySolanaNativePayment(SIG, WALLET, 0.1, 0.15, ENDPOINTS)).reason).toMatch(/failed on-chain/);
  });
  it("falls through to the next node and reports pending when nothing answers", async () => {
    const calls: string[] = [];
    stubRpc(endpoint => { calls.push(endpoint); return endpoint.endsWith("one") ? new Error("boom") : { body: { result: rpcResult() } }; });
    expect((await verifySolanaNativePayment(SIG, WALLET, 0.5, 0.15, ENDPOINTS)).verified).toBe(true);
    expect(calls).toEqual(ENDPOINTS);
    stubRpc(() => ({ body: { result: null } }));
    const pending = await verifySolanaNativePayment(SIG, WALLET, 0.5, 0.15, ENDPOINTS);
    expect(pending.verified).toBe(false);
    expect(pending.pending).toBe(true);
  });
  it("refuses bad inputs without touching the network", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect((await verifySolanaNativePayment(SIG, "not-a-key", 0.5, 0.15, ENDPOINTS)).reason).toMatch(/Invalid Solana/);
    expect((await verifySolanaNativePayment(SIG, WALLET, 0, 0.15, ENDPOINTS)).reason).toMatch(/Invalid expected/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
