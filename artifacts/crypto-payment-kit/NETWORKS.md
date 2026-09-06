# Network support matrix

| Network | Assets | Finality default |
| --- | --- | --- |
| Ethereum | ETH, USDT, USDC | 12 confirmations |
| BNB Smart Chain | USDT | 15 confirmations |
| Arbitrum | USDT, USDC | 20 confirmations |
| Polygon | USDT, USDC | 128 confirmations |
| Solana | USDT, USDC | 1 finality check |
| Tron | USDT | 19 confirmations |
| Bitcoin | BTC | 3 confirmations |

Token identifiers are public registry metadata, not receiving wallets. Configure every receiving wallet yourself. Confirm the displayed chain and token contract/mint in the customer wallet; sending an asset on another network can be unrecoverable. Independently validate provider behavior and appropriate confirmation thresholds for your risk model.