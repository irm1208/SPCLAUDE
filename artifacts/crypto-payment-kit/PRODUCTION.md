# Production preparation

Do not treat this starter as production-ready. Before accepting real payments, recipients must independently:

1. Provision their own PostgreSQL instance and `DATABASE_URL`; no database is bundled or linked here.
2. Configure their own public receiving wallets, secrets, merchant credentials, RPC endpoints, checkout/API origins, and webhook URL in a secret manager.
3. Run migrations with an audited rollout and verify backup/restore, retention, monitoring, alerting, and incident response.
4. Use HTTPS, CORS allowlists, rate limits, network isolation, least-privilege credentials, and separate worker scaling where appropriate.
5. Commission security testing and review confirmation/finality, quote, wallet, reconciliation, and idempotency policies.
6. Obtain independent legal and tax advice for their jurisdiction.

Production startup refuses missing RPC URLs for Ethereum, BSC, Arbitrum, Polygon, Solana, Tron, or Bitcoin, and refuses a missing rate provider. The API starts persisted verification and webhook loops with the HTTP process and drains timers, the listener, and PostgreSQL on SIGINT/SIGTERM.

Webhook destinations must be HTTPS in production. URL persistence and every delivery resolve DNS and reject loopback, private, link-local, unique-local, and multicast addresses. Delivery pins the validated address, validates the connected socket address, and never follows redirects. Local HTTP/private destinations require both non-production mode and explicit `ALLOW_LOCAL_WEBHOOKS=true`.

Private keys and seed phrases do not belong in this service. The system only presents public destinations and verifies chain evidence.