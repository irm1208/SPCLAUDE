# New Account Verification Design

## Goal

Reduce automated and disposable account abuse even when attackers stop using recognizable usernames.

Every account created after rollout must:

1. Pass Cloudflare Turnstile before the account is created.
2. Verify either its email address or its Telegram account.

Existing accounts are grandfathered and remain unaffected.

## User Flow

### Signup

The existing signup form keeps username, password, email, country, and invite-code fields and adds Cloudflare Turnstile.

The API verifies the Turnstile token with Cloudflare before performing account or invite-code writes. A missing, invalid, expired, or reused token returns a generic signup failure.

After successful CAPTCHA validation, the account is created with verification required. The server issues a restricted account session and sends the existing `email_verification` template with a six-digit code.

### Verification

The user is sent to a verification screen showing two equal choices:

- Enter the code sent to the signup email.
- Connect Telegram using the existing account-link flow.

The screen displays the completion state of each method. Completing either method activates full access immediately; the other method becomes optional profile setup.

The user can log out, resend the email code subject to limits, or restart Telegram linking while restricted.

### Completion

The server records the successful method and timestamp, invalidates outstanding email codes, and upgrades the restricted session to a normal account session.

Username changes do not reset verification. If a verified email is later replaced, the new address must be confirmed before replacing the authoritative verified email, but Telegram-verified account access remains valid.

## Account and Session Model

New account verification state is stored separately from `account_status`, so administrative suspension and verification are independent.

The account record gains:

- `verification_required_at`: null for grandfathered accounts; creation time for new accounts.
- `verified_at`: null until one verification method succeeds.
- `verification_method`: null, `email`, or `telegram`.
- `email_verified_at`: set only for successful email verification.

Email challenges are stored as hashed codes with:

- Account identity.
- Expiry time.
- Attempt count.
- Consumption time.
- Creation and most-recent-send timestamps.

Raw codes are never stored.

Restricted sessions carry an explicit restricted claim. Every login path must derive that claim from current database verification state rather than issuing an unrestricted cookie by default.

## Server Authorization

The shared account middleware separates:

- Session identity validation.
- Full verified-account authorization.

Existing protected routes continue using the full authorization middleware and reject restricted accounts with a stable `verification_required` response.

Only these routes accept a restricted session:

- Current account and verification status.
- Email-code confirmation.
- Email-code resend.
- Telegram link initialization and status.
- Logout.

Organiser applications, reshipper applications, orders, group-buy membership, account mutations, and other protected actions require a verified or grandfathered account.

The server remains authoritative; the frontend cannot bypass verification by navigating directly to another page.

## CAPTCHA

Cloudflare Turnstile is validated server-side using:

- A public site key exposed to the frontend.
- A secret key stored only in Replit Secrets.
- The request IP where available.

Development and automated tests use Cloudflare's documented test credentials or an injected verifier. Production fails closed if Turnstile configuration is absent.

Turnstile is required for every new normal, seller, and wholesale-invite registration path so attackers cannot bypass it by selecting a secondary signup route.

## Email Verification

The existing Resend integration and `email_verification` template are reused.

Rules:

- Six-digit cryptographically random code.
- Fifteen-minute expiry.
- Maximum five failed attempts per challenge.
- Sixty-second resend cooldown.
- Daily resend limit per account and IP.
- New resend invalidates the prior challenge.
- Responses do not reveal whether another account owns an email address.

Email verification marks the account verified and does not require Telegram.

## Telegram Verification

The existing Telegram link token and bot/deep-link flow are reused.

When Telegram linking succeeds for a restricted account, the same transaction:

1. Records `verified_at`.
2. Records `verification_method = telegram`.
3. Invalidates outstanding email challenges.

The browser polls the existing Telegram status endpoint and upgrades its session after the server reports completion.

Telegram verification does not require the email code.

## Existing Accounts and Rollout

All accounts present before the feature is published have `verification_required_at = null` and are treated as grandfathered.

No existing user is forced to connect Telegram or verify an historical email address.

The publish migration is additive only. It adds nullable account columns and a verification-challenge table/indexes. It does not rewrite existing rows.

Recognized abusive username families remain blocked independently of verification and cannot use verification to restore access.

## UI States

The signup page covers:

- CAPTCHA loading, expiry, failure, and retry.
- Generic server rejection.
- Successful transition to verification.

The verification screen covers:

- Email code entry and resend countdown.
- Telegram link/start and linked state.
- “Verify with either option” explanation.
- Session expiry and restart.
- Completion and navigation to the account home.

The UI is responsive and accessible, with labelled inputs, keyboard submission, visible focus states, and non-colour status indicators.

## Audit and Abuse Controls

Audit events are recorded for:

- CAPTCHA rejection.
- Verification email sent and rate-limited.
- Invalid and successful email verification.
- Telegram verification completion.
- Restricted-session access attempts against protected routes.

Logs omit passwords, raw email codes, CAPTCHA tokens, Telegram tokens, and session credentials.

Existing signup and login rate limiters remain in force.

## Testing

Backend tests cover:

- Every registration route requires a valid Turnstile result.
- Invalid CAPTCHA creates no account and consumes no invite.
- New accounts receive restricted sessions.
- Grandfathered accounts remain unrestricted.
- Restricted sessions cannot call protected routes.
- Restricted sessions can use verification routes.
- Email challenge expiry, attempt limits, resend limits, and one-time consumption.
- Either email or Telegram independently completes verification.
- Every login method preserves restricted state until verification.
- Known abusive names remain blocked after verification attempts.

Frontend tests cover:

- Signup submits the Turnstile token.
- Restricted authentication renders verification instead of the account portal.
- Email and Telegram completion each unlock navigation.
- Error, expiry, resend, and loading states.

Final verification includes the complete API test suite, frontend tests, type/build checks, canonical workflow restart, and browser smoke checks for desktop and mobile layouts.