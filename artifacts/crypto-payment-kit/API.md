# API and webhook integration

All API errors use `{ "error": { "code", "message", "requestId" } }`. Merchant endpoints require `Authorization: Bearer <merchant key>` and mutations require an `Idempotency-Key`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/v1/payments` | Create an idempotent payment request |
| GET | `/v1/payments/:publicId` | Merchant status query |
| GET | `/v1/checkout/:publicId` | Restricted checkout data |
| POST | `/v1/checkout/:publicId/select` | Select an allowed rail and lock quote |
| POST | `/v1/checkout/:publicId/transactions` | Submit one transaction hash |
| POST | `/v1/webhooks/:deliveryId/replay` | Replay a failed merchant delivery |
| GET | `/health`, `/ready` | Liveness and readiness |

The API owns destination address, selected rail, amount, tolerance, quote expiry, and confirmation policy. Do not trust checkout-supplied replacements.

Both checkout GET and successful rail selection return exactly:

```json
{
  "publicId": "pay_opaque",
  "status": "awaiting_payment",
  "fiatAmount": "49.99",
  "fiatCurrency": "USD",
  "expiresAt": "2030-01-01T00:00:00.000Z",
  "allowedRails": [{ "id": "ethereum-usdc", "network": "ethereum", "chainId": "1", "asset": "USDC", "decimals": 6, "tokenId": "public-contract", "confirmations": 12, "kind": "evm_erc20" }],
  "selectedQuote": { "railId": "ethereum-usdc", "network": "ethereum", "chainId": "1", "asset": "USDC", "tokenAddress": "public-contract", "destinationAddress": "public-wallet", "amountBaseUnits": "49990000", "expiresAt": "2030-01-01T00:00:00.000Z" }
}
```

## Signed webhooks

The API sends the exact JSON request bytes with:

* `x-webhook-timestamp`: Unix seconds
* `x-webhook-signature`: lowercase hex HMAC-SHA256 of `timestamp + "." + rawBody`, keyed with your webhook signing secret

Verify the timestamp within a short tolerance, calculate the HMAC over the untouched raw bytes, and compare fixed-size values with a constant-time function. Persist a unique event ID in **your own** database transaction before fulfilment, returning a successful response for already-completed work. Never fulfil only because a browser says payment succeeded. The runnable example at `examples/merchant-express` uses `express.raw()` before JSON parsing, verifies both headers, and demonstrates process-local event dedupe. Replace that in-memory set with a uniqueness constraint backed by your own `DATABASE_URL` for any durable deployment.

The immutable event body contains `id`, `type`, `createdAt`, `merchantOrderReference`, `paymentId`, `status`, `railId`, `network`, `asset`, `amountBaseUnits`, and `transactionHash`. Deliveries retry only transport failures, 408/425/429, and 5xx responses; other HTTP outcomes are terminal unless manually replayed.