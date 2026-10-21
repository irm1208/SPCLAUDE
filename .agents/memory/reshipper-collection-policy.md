---
name: Reshipper collection totals
description: Scope and ownership rules for admin-fee and member-postage summaries.
---

The Admin will owe reshippers the admin fee and onward-shipping fee, and needs to record which specific orders a payout has covered.

**Why:** The user explicitly described these amounts as money they will owe the reshippers and asked for somewhere to show that the fees for the following orders have been paid.

**How to apply:** Distinguish customer charges collected from Admin-to-reshipper settlement. A collected-fees summary alone is not proof a reshipper has been paid, and a payout must not change the member's payment or fulfilment status.

Historical collection ownership must be established before those fees become payable by Admin. Current payment-routing settings are not evidence of who received an old payment. A verified full on-chain payment matched to an Admin-declared, dated wallet owner can establish collection automatically; uncertain cases still need explicit review.

Collection review should show Admin the customer's recorded incoming payment TXIDs, separately from outgoing reshipper-payout TXIDs. Do not expose those incoming transactions in the reshipper payout response.

**Why:** The user wants to check the payment before confirming who held the fees. An incoming transaction is evidence to inspect, not automatic proof that Admin collected the money.

**How to apply:** Include genuine original, additional and balance chain transactions, deduplicate them, and exclude fiat/AnonPay markers. Preserve the explicit ownership review and clearly state when no blockchain TXID is recorded.

**Why:** Existing orders do not reliably snapshot the original receiving wallet/recipient, and reshipper assignments and payment targets can change later. Inferring history from current settings could pay postage twice.

**How to apply:** Keep uncertain fees on review/hold, distinguish Admin-held fees from directly received reshipper payments, and retain the review reason and prior financial snapshots. An external payout record is not an on-chain verification claim.

The user wants automatic identification of who collected a crypto payment, not a manual blockchain check for each order. Wallet ownership may be declared once for a reshipper/group buy and an effective date range; never infer historical ownership from the current payment configuration.

**Why:** The user explicitly approved automatic wallet checks to avoid reviewing every transaction themselves. Incorrect collection attribution can pay a reshipper twice.

**How to apply:** Require confirmed full-payment chain evidence and a single unambiguous dated owner. Leave split/test/balance/credit-adjusted payments, fiat and missing evidence for review. Preserve prior reviews and payouts, revalidate order/ownership snapshots before committing, and hold automatic entitlements if their supporting evidence or ownership declaration changes.

Keep the outgoing reshipper payout wallet concept separate from historical incoming customer-payment wallets. The user wants a simple saved reshipper wallet, selected orders, one transfer and one TXID, with the covered orders visible to the reshipper.
Reshippers should be able to enter and edit their own outgoing payout destination, not rely on Admin to enter it for them.

**Why:** The user found collection-wallet setup and manual destination/amount entry confusing and approved a simpler bulk-payout flow.

**How to apply:** Keep historical checks/corrections secondary, never bypass eligibility, and preserve each receipt's destination/network/order amounts even after the saved wallet changes. Distinguish manual external-transfer records from any wallet-approved on-chain payment flow; do not imply a manual record sends money.

For connected-wallet payouts, the reshipper chooses the supported token and network for their payout destination; Admin approves each transfer in their own wallet. Do not require every reshipper to use one Admin-selected token or network.

**Why:** The user selected wallet-approved payouts rather than unattended spending and said the token/network should be “Whichever they choose.”

**How to apply:** Present validated supported token/network pairs, keep private keys out of the app, and only settle the selected order allocations after server-side blockchain confirmation. Preserve an explicit manual route for unsupported combinations rather than silently substituting another token or network.

The user approved supported USDT/USDC payout choices for the connected-wallet version; native ETH and Bitcoin remain manual.

**Why:** The user explicitly chose “Yes—reshippers choose supported USDT/USDC payout options.”

**How to apply:** Do not add arbitrary tokens or unattended signing under this approval. Wallet pairing requires a compatible browser provider; extending to mobile QR pairing is separate work.

Pending wallet-approved payouts must reserve their fee allocations against manual payouts and corrections. A wallet rejection, lost TXID, RPC outage or dropped transaction is not proof that no money can move.

**Why:** EVM wallet requests can broadcast before the browser saves the returned hash, and releasing the fees would permit a second payout.

**How to apply:** Bind EVM retries and replacements to the original sender and nonce, retain previous hashes, and release a stuck approval only after an unsent cancellation or confirmed same-nonce on-chain cancellation. For Solana/Tron, sign without broadcasting in the browser and persist approved signed bytes before server broadcast. Never void a verified receipt as if funds were returned.

The reshipper dashboard should show collected admin fees and member delivery/postage for the selected group buy. Do not include vendor shipping in that shipping total.

**Why:** The user asked for a dashboard card so reshippers know how much was collected, and explicitly selected “Member delivery/postage only.”

**How to apply:** Count ordinary charges only from fully paid orders assigned to that reshipper, excluding unpaid balances, test-only payments, cancelled/refunded/deleted orders and direct shipping. Include actually paid separate onward-delivery receipts as well, without exposing wallets or transaction proof belonging to someone else. Keep different currencies separate rather than guessing conversions. These totals describe paid charges, not a live wallet balance.

Receipt parsing must distinguish order-payment status from onward-payment status.

**Why:** Fully paid orders use `confirmed`, but confirmed onward charges use `paid`. Treating them as the same status silently omits collected delivery money.

**How to apply:** Use the canonical onward-payment types and shared ledger-key function when aggregating receipts; deduplicate historical/current receipt IDs, and fail explicitly if a financial summary cannot be read.
