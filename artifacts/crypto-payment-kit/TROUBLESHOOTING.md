# Troubleshooting

**Checkout cannot load:** confirm `PUBLIC_API_ORIGIN`, `PUBLIC_CHECKOUT_ORIGIN`, and browser CORS origin configuration. Query `/health` and `/ready`; do not expose internal error output to customers.

**Payment remains confirming:** verify the submitted hash, selected network, token identifier, destination, transaction success, timestamp, and configured confirmations. An RPC outage is retryable and must not become a paid or failed result.

**Webhook rejected:** ensure the route receives `express.raw({ type: "application/json" })` before JSON middleware. Validate `x-webhook-timestamp` in seconds, HMAC `timestamp + "." + raw bytes`, use a constant-time comparison, and use the same secret configured by the recipient.

**Webhook repeats:** delivery is intentionally retryable. Store the event ID with a unique constraint in your own database and make fulfilment idempotent.

**Database connection fails:** supply a recipient-owned `DATABASE_URL`, confirm network access and TLS requirements, then run migrations. This archive includes no hosted database, database link, or credentials.