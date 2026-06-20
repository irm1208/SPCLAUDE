---
name: ERC-20 stablecoin (USDT/USDC) currency authority
description: How a customer's chosen stablecoin must be validated, persisted, and re-read everywhere so verification never trusts client input.
---

# ERC-20 stablecoin (USDT/USDC) currency authority

USDT and USDC are offered as a customer choice ONLY on the Ethereum ERC-20 rail
(same shared wallet, 1:1 stablecoin). Gate via `isEthErc20StableRail(currency,
network, wallet)` in `payment-verify.ts` — base must be USDT + ERC-20/Ethereum net
+ valid EVM address. Never offer USDC on BEP-20/TRC-20/BTC/native ETH.

## The invariant (do not break)
Client currency is NEVER trusted at verify time. For every payment surface:
1. Compute allowed options server-side (`getOrderCryptoOptions` for orders,
   `poolCryptoOptions` for testing pools).
2. Validate the requested currency against those options; fall back to the
   persisted/base currency (`resolveEffectiveOrderCrypto` / `effectiveStableCurrency`).
3. Persist the chosen currency (`orders.paymentCryptoCurrency`, participant
   `paymentCurrency/paymentNetwork`) and have verify endpoints AND background
   auto-verifiers read the persisted value, not the request body.

**Why:** a buyer could otherwise claim USDC while paying a worthless token, or the
auto-verifier could check the wrong contract. Money-integrity bug.

## Four surfaces
- Orders (wholesale/GB): lock-rate validates+persists; submit-test/pay/auto-verify read persisted.
- Testing pools: opt-in validates+stores; submit-tx takes only the hash; pool auto-verifier reads participant currency.
- Balance top-up (`account.ts` balance-pay): validates client currency each call. There is NO
  background balance auto-verifier — verification is synchronous only, so the frontend must
  re-send the chosen currency on every retry (selection kept in component state). No DDL.

## Gotchas
- `availableCryptoOptions` is returned by `/payments-info` (orders) and pool opt-in/public
  payloads. Frontends must read it to render a USDT/USDC toggle (length > 1) and send the choice.
- Easy bug: returning the `poolCryptoOptions` *function* instead of the computed array.
- Display labels (`paymentCryptoCurrency || "USDT"`) are cosmetic; keep them in sync but they
  are not the verification authority.
