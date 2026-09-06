# Open Crypto Checkout

Open Crypto Checkout is a neutral, non-custodial TypeScript starter for creating crypto payment requests, serving a React checkout, verifying submitted transaction hashes, and delivering signed merchant webhooks. It supports native ETH, Bitcoin, and the listed USDT/USDC rails on Ethereum, BNB Smart Chain, Arbitrum, Polygon, Solana, and Tron.

This repository is a starter, not a production-ready payment service. It never holds private keys, seed phrases, or a capability to spend customer funds.

## What recipients must provide

**No database is bundled or linked.** This archive contains no database service, database dump, database URL, production wallet, or secret. Each recipient must provide its own `DATABASE_URL`, public receiving wallets, merchant API key, webhook signing secret, RPC providers, and deployment configuration through its own secret manager. Copy `.env.example` locally and replace only its explicit placeholders; never commit `.env`.

## Local setup

Requires Node 22+ and pnpm 10.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# provide a local PostgreSQL DATABASE_URL and your own public wallet addresses
pnpm --filter @open-crypto-checkout/api db:migrate
pnpm dev
```

Run `pnpm test`, `pnpm typecheck`, `pnpm build`, and `pnpm check:standalone` before integration. On development startup the API idempotently creates one demo merchant from the server-only `BOOTSTRAP_*` values. The browser calls a development-only demo endpoint and never receives or sends that merchant key. Both the endpoint and demo storefront route are absent in production.

## Merchant integration

Create requests from your server with a merchant bearer key and an idempotency key:

```sh
curl -X POST "$PUBLIC_API_ORIGIN/v1/payments" \
  -H "authorization: Bearer $MERCHANT_API_KEY" \
  -H "idempotency-key: your-order-unique-key" -H "content-type: application/json" \
  -d '{"merchantOrderReference":"order-1001","fiatAmount":"49.99","fiatCurrency":"USD","rails":["ethereum-usdc"]}'
```

Redirect a customer to the returned checkout URL. Treat the status endpoint as authoritative; webhook delivery is retryable and not the sole source of truth. See [API.md](API.md) and the runnable [Express receiver](examples/merchant-express).

## Source archive

`pnpm archive:source` creates a deterministic gzip tarball at `deliverables/open-crypto-checkout-v1.0.0.tar.gz` (relative to the containing handoff directory). It rejects secret files, build output, dependency directories, symbolic links, traversal imports, parent-product references, likely credentials, non-placeholder database URLs, and unexpected large files before packaging.

## Required independent review

Before accepting real money, obtain independent security review; legal and tax review for the recipient’s jurisdiction; reliable RPC provider and finality review; secure secret-management and access-control review; operational monitoring; incident response; and tested database backup/restore procedures. Review [SECURITY.md](SECURITY.md), [PRODUCTION.md](PRODUCTION.md), [NETWORKS.md](NETWORKS.md), and [TROUBLESHOOTING.md](TROUBLESHOOTING.md).