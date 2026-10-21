# Wallet-approved reshipper payouts

## Approved behavior
Reshippers choose a supported USDT/USDC network and address. Admin selects payable order fees, reviews the destination and amount, and approves a transfer in their own wallet. Private keys never enter the app. Only verified chain confirmation settles the selected allocations. Manual external payout records remain distinct.

## Scope
USDT/USDC on Ethereum, Arbitrum, Polygon and Solana; USDT on BSC and Tron. Preserve existing native ETH/Bitcoin manual destinations. An older destination without a token must be updated before connected payments. A compatible browser wallet is required (EVM provider, Phantom-compatible Solana provider, or TronLink). Unsupported wallets are explicitly explained, not silently substituted.

## Financial integrity
Persist immutable payment intents in the existing transactional payout ledger. Reserve the selected orders against manual payments, corrections and a second intent. Snapshot destination, asset, exchange rate, original currency, exact token base units and allocations. Use strict live fiat rates for non-USD fees; block if unavailable. Show gas separately. Do not release reservations on RPC errors or uncertain wallet outcomes.

EVM requests bind sender and nonce; retries use the same nonce, never a new transfer. Solana/Tron wallets sign only; the server persists the approved signed transaction before broadcasting. Pending transactions survive reload and are checked by a bounded background worker. Only confirmed success creates a receipt; confirmed reverts release the reservation. Unsent prepared intents can be cancelled. Ambiguous EVM approvals require recovery of their TXID or retry of the same nonce.

EVM replacement TXIDs are accepted only after verifying the same sender, nonce and transfer; previous hashes remain tracked. A rejected/stuck approval can be cancelled by an approved zero-value, empty-data EOA self-transfer using the same nonce, with a network fee. Reservations release only after its successful canonical confirmation and absence of token logs. Solana/Tron expiry requires confirmed chain evidence that the signed transaction was not recorded.

## Verification and visibility
Verify expected chain, token contract/mint, sender, destination, exact amount and successful execution/finality. Reject transaction replay across payouts. Settled chain receipts cannot be voided as if money were returned. Both parties see the covered orders, asset, network, destination and TXID. Signed payloads, sender nonce details and historical customer payment evidence are Admin-only.

## Tests
Cover supported asset pairs, precision, reservations, concurrent prepare, immutable snapshots, unauthorized calls, wrong tokens/recipients/amounts, pending/reverted transfers, idempotent confirmation, replay, reload recovery and rejection. Use simulated chain responses; never send real funds during development verification.
