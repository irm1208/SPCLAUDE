# Standalone Crypto Payment Kit Design

## Purpose

Create a completely standalone, neutral starter repository that another developer can integrate into an existing website to accept and verify non-custodial cryptocurrency payments.

The repository must not contain Peps branding, source-specific routes, order models, group-buy or wholesale behavior, customer data, production wallet addresses, credentials, authentication artifacts, or deployment configuration. Reuse is limited to generalized payment concepts and independently implemented verification behavior.

## Scope

Version 1 supports:

- Native ETH
- Bitcoin
- USDT and USDC on Ethereum
- USDT on BNB Smart Chain
- USDT and USDC on Arbitrum
- USDT and USDC on Polygon
- USDT and USDC on Solana
- USDT on Tron
- Fiat-priced payment requests converted to an exact crypto amount
- Customer transaction-hash submission
- Automatic background verification
- Signed merchant webhooks
- A React demo store and checkout
- PostgreSQL persistence

Version 1 does not include:

- Peps branding, data, or business rules
- AnonPay or Trocador
- Fiat payment processing
- Custody, private keys, seed phrases, or fund transfers
- Refund execution
- Crypto exchange or conversion execution
- Store order fulfilment
- Group-buy, wholesale, testing-pool, organiser, or reshipper logic
- A production administration dashboard
- Multi-tenant merchant onboarding

## Repository Architecture

The deliverable is a TypeScript monorepo with four principal units:

### `apps/api`

An Express service responsible for:

- Merchant authentication
- Payment-request creation
- Quote locking
- Public checkout data
- Transaction submission
- Verification scheduling
- Payment status queries
- Signed webhook delivery and replay
- Health and readiness checks

### `apps/web`

A React application containing:

- A fake demonstration store
- A hosted checkout page
- Network and token selection
- Exact payment amount and destination
- QR codes and wallet-compatible payment URIs where applicable
- Copyable payment details
- Transaction-hash submission
- Live confirmation and terminal-state display
- Responsive and accessible behavior

The web application is a demonstration integration, not a store framework.

### `packages/core`

Framework-independent shared code containing:

- Payment and network types
- Payment status definitions
- Chain and token registry
- Address and transaction-hash validation
- Amount and tolerance rules
- API request and response schemas
- Webhook event schemas

### `packages/verifiers`

Isolated verification adapters for:

- EVM native transfers
- EVM ERC-20/BEP-20 token transfers
- Bitcoin
- Solana SPL tokens
- Tron TRC-20 tokens

Each adapter accepts a server-authoritative verification request and returns normalized evidence. It must not import merchant, order, checkout, or database code.

## Integration Flow

1. The host website creates its own order.
2. Its server authenticates to the payment API with a merchant API key.
3. It creates a payment request containing:
   - A unique merchant order reference
   - Fiat amount and currency
   - Allowed payment rails
   - Optional return URL
   - Optional non-sensitive metadata
4. The API validates the request, locks a quote for a configurable duration, and returns:
   - An opaque public payment ID
   - A checkout URL
   - Expiration time
   - Allowed payment options
5. The customer opens checkout and selects a payment rail.
6. The API provides the exact network, asset, destination, and amount from server configuration.
7. The customer transfers funds and submits the transaction hash.
8. The API validates the hash format, records it idempotently, and schedules verification.
9. The selected verifier checks the transaction until it is final, terminally invalid, or expired.
10. A successful verification atomically marks the payment paid and records immutable evidence.
11. The API sends a signed webhook to the host website.
12. The host fulfils its own order only after validating the webhook or querying the payment API.

Webhooks are not the sole source of truth. The host can query payment status by public ID.

## API Surface

The initial API includes:

- `POST /v1/payments` — create an idempotent payment request
- `GET /v1/payments/:publicId` — merchant-authenticated payment status
- `GET /v1/checkout/:publicId` — restricted public checkout data
- `POST /v1/checkout/:publicId/select` — select or refresh an allowed quote
- `POST /v1/checkout/:publicId/transactions` — submit a transaction hash
- `POST /v1/webhooks/:deliveryId/replay` — manually replay a failed delivery
- `GET /health` — liveness
- `GET /ready` — database and worker readiness

Merchant mutation requests support idempotency keys. Public IDs are random opaque identifiers and must not reveal sequential database IDs.

## Status Model

Normal progression:

`created → awaiting_payment → transaction_submitted → confirming → paid`

Terminal or review states:

- `expired`
- `underpaid`
- `overpaid_review`
- `failed`
- `cancelled`

A paid payment cannot be silently reverted. Administrative correction, if added later, must use an explicit append-only adjustment event rather than mutating verification history.

Repeated creation requests, transaction submissions, verification jobs, and webhook deliveries must be safe to retry.

## Verification Rules

Every verifier must check, as applicable:

- Expected blockchain/network
- Successful transaction execution
- Correct token contract or mint
- Correct receiving address
- Expected amount
- Configured underpayment and overpayment rules
- Required confirmations or finality
- Transaction timestamp relative to request validity
- Transaction hash has not paid another request

Default amount handling allows approximately 1% underpayment tolerance to account for locked-rate and display precision. Overpayments above a small configurable threshold enter `overpaid_review`; they are not automatically treated as refunds or credited value.

The destination, token identifier, expected amount, network, tolerance, and finality rules are loaded server-side. Checkout input cannot override them.

RPC failures must produce an explicit retryable verification-unavailable result. They must not be interpreted as transaction failure or payment success.

## Data Model

PostgreSQL stores:

- Merchants
- Hashed merchant API keys
- Merchant webhook endpoints and signing configuration
- Payment requests
- Locked quotes and selected rails
- Submitted transaction hashes
- Verification attempts
- Immutable verification evidence
- Payment status events
- Webhook events
- Webhook delivery attempts

Important constraints include:

- Unique merchant plus merchant-order reference
- Unique idempotency key within merchant scope
- Globally unique accepted transaction hash within the applicable network namespace
- Optimistic or row-level concurrency control for state transitions
- Append-only status and verification evidence

Demo seed data uses fake merchant records and placeholder public receiving addresses that cannot be mistaken for production configuration.

## Background Processing

The API process may run an in-process worker for the starter repository, provided jobs are persisted in PostgreSQL so restarts do not lose work.

The worker:

- Claims due verification jobs atomically
- Uses bounded exponential backoff
- Applies RPC timeouts and configured failover
- Prevents concurrent processing of the same job
- Stops retrying terminally invalid transactions
- Continues checking transactions awaiting finality
- Claims webhook deliveries atomically
- Records response status and a bounded, redacted response excerpt

The documentation will explain that higher-volume installations should move workers into a separately scaled process without changing the persisted job contract.

## Configuration and Secret Boundaries

The repository contains `.env.example` placeholders for:

- PostgreSQL URL
- Merchant API-key bootstrap value or hash
- Webhook signing secret
- Public receiving wallet addresses
- Optional custom RPC endpoints
- Quote provider
- Quote expiration
- Confirmation thresholds
- Underpayment and overpayment tolerances
- Public API and checkout origins

The deliverable must not contain:

- Private keys or seed phrases
- Real production wallet configuration
- Real API keys, passwords, tokens, or connection strings
- Production database exports
- Customer, account, order, or transaction data
- Existing admin secrets or password hashes
- Existing webhook secrets
- Existing deployment environment variables

Public token contracts, mint addresses, and public default RPC URLs may be included as implementation constants where appropriate.

## Security Controls

The starter implements:

- Hashed API-key storage
- Constant-time credential comparison
- Strict request and environment validation
- Separate public and merchant endpoint rate limits
- Bounded request bodies
- CORS allowlisting
- Signed, timestamped webhooks
- Webhook replay protection guidance
- Atomic status transitions
- Transaction-reuse prevention
- Server-authoritative payment instructions
- RPC timeouts and failover
- Redacted structured logging
- Audit events for material changes
- Safe error responses that do not expose internals or secrets

The system is non-custodial and contains no operation capable of signing transactions or spending funds.

The README must state that accepting real money requires an independent security review, suitable RPC providers, operational monitoring, secure secret management, database backups, and legal/tax review for the recipient's jurisdiction.

## Webhook Contract

Webhook events include:

- Stable event ID
- Event type
- Creation timestamp
- Merchant order reference
- Public payment ID
- Payment status
- Paid asset, network, and normalized amount where relevant
- Transaction hash after submission

The sender signs the exact raw body plus timestamp. The integration guide includes Express verification middleware and explains timestamp tolerance, constant-time comparison, event-ID deduplication, and why fulfilment must be idempotent.

## Error Handling

Errors use a stable JSON envelope with:

- Machine-readable code
- Human-readable message
- Request ID
- Optional field-level validation details

The API distinguishes:

- Invalid customer input
- Merchant authentication failure
- Payment expiration
- Duplicate transaction use
- Transaction not found yet
- Transaction found but awaiting finality
- Terminal transaction mismatch
- Retryable RPC/provider unavailability
- Internal persistence failure

Temporary infrastructure failures do not silently change payment state.

## Testing Strategy

Automated tests cover:

- Chain adapters using fixed fixtures and mocked RPC responses
- Recipient, token, network, amount, success, and finality validation
- Amount precision and tolerance boundaries
- Invalid and reused transaction hashes
- Idempotent payment creation and submission
- Concurrent verification
- Expiration behavior
- Atomic paid transitions
- Webhook signatures, replay protection guidance, retries, and manual replay
- Merchant authorization and public-data minimization
- Environment validation
- API contracts
- Demo checkout status behavior

Optional real-chain smoke tests are disabled by default and require explicit configuration because public RPC availability is nondeterministic.

## Documentation and Deliverable

The handoff contains:

- Neutral project name and package names
- README with local and production setup
- PostgreSQL migrations
- `.env.example`
- Network support matrix
- Merchant integration tutorial
- API examples
- Webhook receiver example
- Example host-website integration
- Security and production-readiness checklist
- Troubleshooting guide
- Automated tests
- License file
- Downloadable source archive

The repository uses standard Node.js and PostgreSQL tooling and does not require Docker. Optional Docker files may be added later, but are not part of version 1.

## Acceptance Criteria

The design is satisfied when:

1. The starter runs independently with TypeScript, Express, React, and PostgreSQL.
2. No Peps identifiers, data, branding, routes, schemas, or business rules are present.
3. No secret or real production configuration is present.
4. A demo merchant can create and view a payment request.
5. The checkout renders valid instructions for every supported rail.
6. Submitted transactions are verified through isolated chain adapters.
7. Concurrent or repeated operations cannot double-credit a transaction.
8. Paid status produces a signed, retryable webhook.
9. The host integration example verifies and deduplicates webhook events.
10. Tests verify the security-critical and money-integrity rules.
11. Documentation clearly separates demo behavior from production requirements.
12. The finished repository is packaged as a source archive suitable for sending to another developer.