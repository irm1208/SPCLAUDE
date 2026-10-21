import { getPayoutAsset, type PayoutAsset } from "@workspace/payout-assets";
import type { ChainPayment } from "./reshipper-payouts";
type Provider = { request?: (args: { method: string; params?: unknown[] }) => Promise<any>; [key: string]: any };
export interface ConnectedPayoutWallet { address: string; provider: Provider; family: PayoutAsset["family"] }
export async function connectPayoutWallet(asset: PayoutAsset): Promise<ConnectedPayoutWallet> {
  const w = window as unknown as { ethereum?: Provider; phantom?: { solana?: Provider }; solana?: Provider; tronLink?: Provider; tronWeb?: Provider };
  if (asset.family === "evm") {
    const provider = w.ethereum;
    if (!provider?.request) throw new Error("Open this page in a wallet browser or a browser with MetaMask, Rabby or another Ethereum-compatible wallet installed.");
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    if (!accounts?.[0]) throw new Error("No sending wallet was connected.");
    await switchPayoutNetwork(provider, asset);
    return { provider, address: accounts[0], family: "evm" };
  }
  if (asset.family === "solana") {
    const provider = w.phantom?.solana ?? w.solana;
    if (!provider?.connect || !provider.signTransaction) throw new Error("Open this page with a Phantom-compatible Solana wallet that supports signing transactions.");
    const connected = await provider.connect();
    const address = (connected?.publicKey ?? provider.publicKey)?.toString();
    if (!address) throw new Error("No Solana wallet was connected.");
    return { address, provider, family: "solana" };
  }
  if (!w.tronLink?.request) throw new Error("Open this page in TronLink or a browser with TronLink installed.");
  await w.tronLink.request({ method: "tron_requestAccounts" });
  const provider = w.tronWeb;
  if (!provider?.defaultAddress?.base58 || !provider.trx?.sign) throw new Error("Unlock TronLink and connect your wallet.");
  if (/nile|shasta/i.test(provider.fullNode?.host ?? "")) throw new Error("Switch TronLink to Tron Mainnet.");
  return { provider, address: provider.defaultAddress.base58, family: "tron" };
}
async function switchPayoutNetwork(provider: Provider, asset: PayoutAsset) {
  const chainId = `0x${asset.chainId!.toString(16)}`;
  const current = await provider.request!({ method: "eth_chainId" });
  if (BigInt(current) === BigInt(chainId)) return;
  try { await provider.request!({ method: "wallet_switchEthereumChain", params: [{ chainId }] }); }
  catch (error) {
    if ((error as { code?: number }).code !== 4902) throw error;
    const symbol = asset.chainId === 56 ? "BNB" : asset.chainId === 137 ? "POL" : "ETH";
    await provider.request!({ method: "wallet_addEthereumChain", params: [{ chainId, chainName: asset.network,
      nativeCurrency: { name: symbol, symbol, decimals: 18 }, rpcUrls: [asset.rpc] }] });
  }
  if (BigInt(await provider.request!({ method: "eth_chainId" })) !== BigInt(chainId)) throw new Error("The wallet is on the wrong network.");
}
export async function approvePayoutTransfer(payment: ChainPayment, wallet: ConnectedPayoutWallet): Promise<{ txid?: string; signedTransaction?: string }> {
  const asset = getPayoutAsset(payment.network, payment.token);
  if (!asset || wallet.family !== asset.family) throw new Error("Connect a wallet compatible with this payout network.");
  const equal = asset.family === "evm" ? wallet.address.toLowerCase() === payment.sender?.toLowerCase() : wallet.address === payment.sender;
  if (!equal) throw new Error("Connect the original sending wallet for this pending payment.");
  if (asset.family === "evm") {
    await switchPayoutNetwork(wallet.provider, asset);
    const accounts = await wallet.provider.request!({ method: "eth_accounts" });
    if (accounts?.[0]?.toLowerCase() !== payment.sender?.toLowerCase()) throw new Error("The wallet account changed. Reconnect the original sender.");
    const nonce = await wallet.provider.request!({ method: "eth_getTransactionCount", params: [payment.sender, "latest"] });
    if (BigInt(nonce) > BigInt(String(payment.transaction?.nonce))) throw new Error("This transaction nonce was already used. Recover its TXID below; do not send a new payment.");
    const txid = await wallet.provider.request!({ method: "eth_sendTransaction", params: [payment.transaction] });
    if (typeof txid !== "string" || !/^0x[0-9a-f]{64}$/i.test(txid)) throw new Error("The wallet did not return a TXID. Keep this payment pending and recover the TXID from wallet activity.");
    try { localStorage.setItem(`reshipper_payout_tx:${payment.id}`, txid); } catch { /* Recovery remains possible from wallet activity. */ }
    return { txid };
  }
  if (asset.family === "solana") {
    const { Transaction } = await import("@solana/web3.js");
    const { Buffer } = await import("buffer");
    const tx = Transaction.from(Buffer.from(String(payment.transaction?.unsignedBase64), "base64"));
    const signed = await wallet.provider.signTransaction(tx);
    return { signedTransaction: Buffer.from(signed.serialize()).toString("base64") };
  }
  if (wallet.provider.defaultAddress?.base58 !== payment.sender) throw new Error("The TronLink account changed. Reconnect the original sender.");
  const signed = await wallet.provider.trx.sign(payment.transaction?.unsigned);
  return { signedTransaction: JSON.stringify(signed) };
}
export async function approvePayoutCancellation(payment: ChainPayment, wallet: ConnectedPayoutWallet) {
  if (wallet.family !== "evm") throw new Error("This cancellation is only for EVM wallet payments.");
  return approvePayoutTransfer({ ...payment, transaction: { ...payment.transaction, to: payment.sender, value: "0x0", data: "0x" } }, wallet);
}
