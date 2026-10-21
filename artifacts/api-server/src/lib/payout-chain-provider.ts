import { createHash } from "node:crypto";
import bs58 from "bs58";
import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { getPayoutAsset, transferData, type PayoutAsset } from "@workspace/payout-assets";
import type { ChainIntent } from "./payout-chain-schema";
import { PayoutError } from "./reshipper-payout-rules";

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
export async function chainRpc(asset: PayoutAsset, method: string, params: unknown[] = []): Promise<any> {
  const res = await fetch(asset.rpc, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new PayoutError("Blockchain provider unavailable. The payment remains pending; do not send again.", 503);
  const json = await res.json() as { error?: unknown; result?: unknown };
  if (json.error) throw new PayoutError("Blockchain request could not be completed. Retry checking the existing payment.", 503);
  return json.result;
}
async function tronRpc(path: string, body: unknown): Promise<any> {
  const res = await fetch(`https://api.trongrid.io/${path}`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new PayoutError("Tron provider unavailable. Retry the existing payment.", 503);
  return res.json();
}
export function tronHex(address: string): string {
  try {
    const bytes = Buffer.from(bs58.decode(address)), payload = bytes.subarray(0, 21);
    const checksum = createHash("sha256").update(createHash("sha256").update(payload).digest()).digest().subarray(0, 4);
    if (bytes.length !== 25 || payload[0] !== 0x41 || !checksum.equals(bytes.subarray(21))) throw new Error();
    return payload.toString("hex");
  } catch { throw new PayoutError("Enter a valid Tron wallet address."); }
}
export function assetFor(intent: Pick<ChainIntent, "network" | "token">) {
  const asset = getPayoutAsset(intent.network, intent.token);
  if (!asset) throw new PayoutError("Unsupported payout token/network.");
  return asset;
}
export function matchesEvmPayout(intent: ChainIntent, tx: any): "transfer" | "cancel" | null {
  if (!tx || String(tx.from).toLowerCase() !== intent.sender.toLowerCase() ||
    BigInt(tx.nonce) !== BigInt(String(intent.transaction.nonce)) || BigInt(tx.value) !== 0n) return null;
  if (String(tx.to).toLowerCase() === assetFor(intent).contract.toLowerCase() &&
    String(tx.input).toLowerCase() === transferData(intent.destination, intent.tokenUnits)) return "transfer";
  // A zero-value, empty-data self-transfer consumes the SAME nonce, preventing the original payout from mining later.
  return String(tx.to).toLowerCase() === intent.sender.toLowerCase() && ["0x", ""].includes(tx.input) ? "cancel" : null;
}
export async function validateReplacementHash(intent: ChainIntent, txid: string) {
  if (!/^0x[0-9a-f]{64}$/i.test(txid) || assetFor(intent).family !== "evm") throw new PayoutError("Invalid replacement TXID.");
  const tx = await chainRpc(assetFor(intent), "eth_getTransactionByHash", [txid]);
  if (!matchesEvmPayout(intent, tx)) throw new PayoutError("The replacement is not visible yet or does not match this payment's sender, nonce and transfer. Wait, then recover its TXID again.", 409);
}
export async function prepareChainTransaction(intent: ChainIntent): Promise<Record<string, unknown>> {
  const asset = assetFor(intent);
  if (asset.family === "evm") {
    if (!/^0x[0-9a-f]{40}$/i.test(intent.sender) || intent.sender.toLowerCase() === intent.destination.toLowerCase())
      throw new PayoutError("Connect a different sending wallet from the recipient.");
    const chainId = await chainRpc(asset, "eth_chainId");
    if (BigInt(chainId) !== BigInt(asset.chainId!)) throw new PayoutError("Blockchain provider returned the wrong network.", 503);
    const nonce = await chainRpc(asset, "eth_getTransactionCount", [intent.sender, "pending"]);
    return { from: intent.sender, to: asset.contract, data: transferData(intent.destination, intent.tokenUnits),
      value: "0x0", nonce, chainId: `0x${asset.chainId!.toString(16)}` };
  }
  if (asset.family === "solana") {
    const payer = new PublicKey(intent.sender), destination = new PublicKey(intent.destination), mint = new PublicKey(asset.contract);
    if (payer.equals(destination)) throw new PayoutError("The sending and receiving wallets must differ.");
    const source = PublicKey.findProgramAddressSync([payer.toBuffer(), TOKEN_PROGRAM.toBuffer(), mint.toBuffer()], ATA_PROGRAM)[0];
    const target = PublicKey.findProgramAddressSync([destination.toBuffer(), TOKEN_PROGRAM.toBuffer(), mint.toBuffer()], ATA_PROGRAM)[0];
    const block = await chainRpc(asset, "getLatestBlockhash", [{ commitment: "finalized" }]);
    if (!block?.value?.blockhash) throw new PayoutError("Could not prepare a Solana transaction.", 503);
    const tx = new Transaction({ feePayer: payer, recentBlockhash: block.value.blockhash });
    // Idempotent ATA creation lets a new recipient receive this token without having an existing token account.
    tx.add(new TransactionInstruction({ programId: ATA_PROGRAM, keys: [
      { pubkey: payer, isSigner: true, isWritable: true }, { pubkey: target, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: false }, { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
    ], data: Buffer.from([1]) }));
    const data = Buffer.alloc(10); data[0] = 12; data.writeBigUInt64LE(BigInt(intent.tokenUnits), 1); data[9] = asset.decimals;
    tx.add(new TransactionInstruction({ programId: TOKEN_PROGRAM, keys: [
      { pubkey: source, isSigner: false, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: target, isSigner: false, isWritable: true }, { pubkey: payer, isSigner: true, isWritable: false },
    ], data }));
    return { unsignedBase64: tx.serialize({ requireAllSignatures: false }).toString("base64"),
      messageBase64: tx.serializeMessage().toString("base64"), lastValidBlockHeight: block.value.lastValidBlockHeight };
  }
  const owner = tronHex(intent.sender), target = tronHex(intent.destination);
  if (owner === target) throw new PayoutError("The sending and receiving wallets must differ.");
  const parameter = target.slice(2).padStart(64, "0") + BigInt(intent.tokenUnits).toString(16).padStart(64, "0");
  const prepared = await tronRpc("wallet/triggersmartcontract", {
    owner_address: owner, contract_address: tronHex(asset.contract), function_selector: "transfer(address,uint256)",
    parameter, fee_limit: 100_000_000, call_value: 0,
  });
  if (!prepared?.result?.result || !prepared.transaction?.txID) throw new PayoutError("Tron could not prepare the transfer. Check TRX/USDT balances.", 503);
  const tx = prepared.transaction, call = tx.raw_data?.contract?.[0];
  if (tx.raw_data?.contract?.length !== 1 || call?.type !== "TriggerSmartContract" ||
    call.parameter?.value?.owner_address?.toLowerCase() !== owner ||
    call.parameter?.value?.contract_address?.toLowerCase() !== tronHex(asset.contract) ||
    call.parameter?.value?.data?.toLowerCase() !== `a9059cbb${parameter}` || Number(call.parameter?.value?.call_value ?? 0) !== 0 ||
    !/^[0-9a-f]+$/i.test(tx.raw_data_hex ?? "") ||
    createHash("sha256").update(Buffer.from(tx.raw_data_hex, "hex")).digest("hex") !== tx.txID)
    throw new PayoutError("Tron returned an unexpected unsigned transaction. Nothing was signed.", 503);
  return { unsigned: prepared.transaction };
}
/** Validate a wallet signature against the immutable server-prepared transfer before any broadcast. */
export function acceptSignedTransaction(intent: ChainIntent, input: unknown): { txid: string; signedRaw: string | null } {
  const asset = assetFor(intent);
  const body = input as { txid?: string; signedTransaction?: string };
  if (asset.family === "evm") {
    if (typeof body?.txid !== "string" || !/^0x[0-9a-f]{64}$/i.test(body.txid)) throw new PayoutError("Enter the transaction hash returned by your wallet.");
    return { txid: body.txid.toLowerCase(), signedRaw: null };
  }
  if (typeof body?.signedTransaction !== "string" || body.signedTransaction.length > 30000) throw new PayoutError("A signed transaction is required.");
  try {
    if (asset.family === "solana") {
      const tx = Transaction.from(Buffer.from(body.signedTransaction, "base64"));
      if (tx.serializeMessage().toString("base64") !== intent.transaction.messageBase64 || !tx.verifySignatures() || !tx.signature)
        throw new Error();
      return { txid: bs58.encode(tx.signature), signedRaw: tx.serialize().toString("base64") };
    }
    const signed = JSON.parse(body.signedTransaction), expected = intent.transaction.unsigned as any;
    if (signed.txID !== expected.txID || signed.raw_data_hex !== expected.raw_data_hex ||
      JSON.stringify(signed.raw_data) !== JSON.stringify(expected.raw_data) ||
      !Array.isArray(signed.signature) || signed.signature.length !== 1 || !/^[0-9a-f]{130}$/i.test(signed.signature[0])) throw new Error();
    return { txid: expected.txID.toLowerCase(), signedRaw: JSON.stringify(signed) };
  } catch { throw new PayoutError("The signed transaction does not match the approved payout. Nothing was broadcast."); }
}
export async function broadcastChainTransaction(intent: ChainIntent) {
  const asset = assetFor(intent);
  if (!intent.signedRaw || asset.family === "evm") return;
  if (asset.family === "solana") {
    const txid = await chainRpc(asset, "sendTransaction", [intent.signedRaw, { encoding: "base64", preflightCommitment: "confirmed", maxRetries: 3 }]);
    if (txid !== intent.txid) throw new PayoutError("Solana returned an unexpected transaction identity. Check this payment; do not send again.", 503);
  } else {
    const result = await tronRpc("wallet/broadcasttransaction", JSON.parse(intent.signedRaw));
    if (!result.result && result.code !== "DUP_TRANSACTION_ERROR") throw new PayoutError("Tron broadcast is not confirmed. Check the existing payment before retrying.", 503);
  }
}
export type ChainResult = { state: "pending" | "confirmed" | "failed"; reason: string };
export async function verifyChainIntent(intent: ChainIntent): Promise<ChainResult> {
  const asset = assetFor(intent);
  if (!intent.txid) return { state: "pending", reason: "Waiting for the wallet transaction hash." };
  const pending = (reason: string): ChainResult => ({ state: "pending", reason });
  if (asset.family === "evm") {
    const [tx, receipt, head] = await Promise.all([
      chainRpc(asset, "eth_getTransactionByHash", [intent.txid]), chainRpc(asset, "eth_getTransactionReceipt", [intent.txid]), chainRpc(asset, "eth_blockNumber"),
    ]);
    if (!tx || !receipt?.blockNumber) return pending("Waiting for the transaction to be mined.");
    const kind = matchesEvmPayout(intent, tx);
    if (!kind)
      return pending("Transaction does not match the approved sender, nonce, token, destination or exact amount. Do not send again; review the TXID.");
    if (BigInt(head) - BigInt(receipt.blockNumber) + 1n < BigInt(asset.confirmations!)) return pending(`Waiting for ${asset.confirmations} network confirmations.`);
    const block = await chainRpc(asset, "eth_getBlockByNumber", [receipt.blockNumber, false]);
    if (!block || block.hash !== receipt.blockHash) return pending("Waiting for canonical blockchain confirmation.");
    if (kind === "cancel") {
      const code = await chainRpc(asset, "eth_getCode", [intent.sender, receipt.blockNumber]);
      return receipt.status === "0x1" && code === "0x" && (receipt.logs ?? []).length === 0
        ? { state: "failed", reason: "Payout cancelled on-chain using the same nonce. Only the network fee was spent." }
        : pending("Wallet cancellation needs review; its orders remain reserved.");
    }
    if (receipt.status === "0x0") return { state: "failed", reason: "The transaction reverted on-chain; no payout was made." };
    const fromTopic = `0x${intent.sender.slice(2).toLowerCase().padStart(64, "0")}`;
    const toTopic = `0x${intent.destination.slice(2).toLowerCase().padStart(64, "0")}`;
    const transfers = (receipt.logs ?? []).filter((l: any) => !l.removed && String(l.address).toLowerCase() === asset.contract.toLowerCase() &&
      l.topics?.[0] === TRANSFER_TOPIC && String(l.topics?.[1]).toLowerCase() === fromTopic && String(l.topics?.[2]).toLowerCase() === toTopic);
    if (receipt.status !== "0x1" || transfers.length !== 1 || BigInt(transfers[0].data) !== BigInt(intent.tokenUnits))
      return pending("Expected successful token transfer was not found. Admin review is required; do not send again.");
    return { state: "confirmed", reason: "Confirmed exact token transfer." };
  }
  if (asset.family === "solana") {
    const result = await chainRpc(asset, "getTransaction", [intent.txid, { encoding: "base64", commitment: "finalized", maxSupportedTransactionVersion: 0 }]);
    if (!result) {
      const [height, status] = await Promise.all([
        chainRpc(asset, "getBlockHeight", [{ commitment: "finalized" }]),
        chainRpc(asset, "getSignatureStatuses", [[intent.txid], { searchTransactionHistory: true }]),
      ]);
      if (typeof height === "number" && height > Number(intent.transaction.lastValidBlockHeight) && status?.value?.length === 1 && status.value[0] === null)
        return { state: "failed", reason: "The Solana transaction expired without being recorded on-chain. No token payment was made." };
      return pending("Waiting for Solana finalization.");
    }
    if (!intent.signedRaw || result.transaction?.[0] !== intent.signedRaw) return pending("Finalized transaction does not match the approved signed payment.");
    return result.meta?.err ? { state: "failed", reason: "Solana transaction failed; no token payment was made." }
      : result.meta ? { state: "confirmed", reason: "Solana payment finalized." } : pending("Waiting for complete transaction evidence.");
  }
  const [info, tx] = await Promise.all([
    tronRpc("walletsolidity/gettransactioninfobyid", { value: intent.txid }),
    tronRpc("walletsolidity/gettransactionbyid", { value: intent.txid }),
  ]);
  if (!info?.id || !info.blockNumber || !tx?.txID) {
    if (!info?.id && !tx?.txID) {
      const block = await tronRpc("walletsolidity/getnowblock", {});
      const unsigned = intent.transaction.unsigned as any;
      if (Number(block?.block_header?.raw_data?.timestamp) > Number(unsigned?.raw_data?.expiration) + 60_000)
        return { state: "failed", reason: "The Tron transaction expired without being recorded on-chain. No token payment was made." };
    }
    return pending("Waiting for Tron solid-block confirmation.");
  }
  const expected = intent.transaction.unsigned as any;
  if (tx.txID.toLowerCase() !== intent.txid || tx.raw_data_hex !== expected.raw_data_hex) return pending("Tron transaction does not match the prepared payment.");
  if (info.receipt?.result && info.receipt.result !== "SUCCESS") return { state: "failed", reason: "Tron transaction failed; no token payment was made." };
  const logs = (info.log ?? []).filter((l: any) => String(l.address).toLowerCase() === tronHex(asset.contract).slice(2) &&
    l.topics?.[0] === TRANSFER_TOPIC.slice(2) && l.topics?.[1] === tronHex(intent.sender).slice(2).padStart(64, "0") &&
    l.topics?.[2] === tronHex(intent.destination).slice(2).padStart(64, "0"));
  return info.receipt?.result === "SUCCESS" && logs.length === 1 && BigInt(`0x${logs[0].data}`) === BigInt(intent.tokenUnits)
    ? { state: "confirmed", reason: "Tron payment confirmed in a solid block." } : pending("Expected Tron token transfer was not found; review this payment.");
}
