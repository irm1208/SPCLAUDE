# Security guidance

This starter is non-custodial and is not production-ready by itself. It does not bundle or link a database and contains no production wallet, secret, credential, or deployment configuration.

Recipients must use their own secret manager for `DATABASE_URL`, merchant keys, webhook secrets, RPC credentials, and public receiving wallets. Rotate credentials, restrict access, use TLS, set origin allowlists, bound request sizes, monitor webhook failures and RPC outages, and test database backup/restore.

Never expose API keys in browser code. Verify webhook HMACs against the exact raw request body and timestamp with constant-time comparison, dedupe event IDs durably, and make fulfilment idempotent. Re-query payment status before high-value fulfilment. Independently audit authorization, migrations, rate limits, wallet configuration, provider trust, dependency updates, logging redaction, incident response, and recovery workflows.

Cryptocurrency acceptance has material legal, sanctions, consumer-protection, accounting, and tax implications. Obtain independent security, legal, tax, operational, and RPC/finality review in the jurisdiction where the recipient operates.