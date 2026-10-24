---
name: Reshipper payout method
description: Admin records external payouts by TXID rather than connecting a wallet.
---
Admin sends reshipper payouts separately and provides the TXID. New payouts must not require or prompt for a wallet connection.

**Why:** The user explicitly replaced the earlier connected-wallet payout choice with providing a transaction ID.

**How to apply:** Make selecting orders and recording one external transfer the main flow, using the saved recipient wallet and exact selected totals. Clearly distinguish manual records from blockchain-verified payments. Preserve recovery of historical pending chain payments so their reserved orders are not stranded.
