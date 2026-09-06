# Security Incident Report — 6 September 2026

## Summary

Production audit data showed automated enumeration of the legacy public order lookup and coordinated creation of accounts using `aud*` and `hermesaudit*` names. The public PIN-based order portal and its related mutation routes have been emergency-disabled.

This report deliberately excludes customer identifiers, order identifiers, PINs, IP addresses, wallet addresses, and other sensitive values.

## Confirmed scope

- 18,428 failed public lookup attempts were recorded on 6 September.
- 517 successful public lookup responses were recorded.
- A sequential scan tested thousands of order codes.
- One PIN had been reused across 1,589 orders.
- 23 automated-pattern accounts were identified; 21 were not banned at investigation time.
- 17 of those accounts had logged in.
- Two applied for organiser access, one for reshipper access, and one for pool-leader access.
- Those accounts created no orders and had no paid-like orders.
- No wallet, payment-destination, or payment-routing change was found.

## Admin access assessment

Before authenticator 2FA was enabled, legacy `admin_login_success` records represented successful shared-secret `/admin/auth-check` requests, including repeated browser checks rather than unique login sessions. Recorded addresses were proxy infrastructure and cannot distinguish the administrator from an attacker. A pre-2FA shared-secret compromise therefore cannot be conclusively ruled out.

After 2FA was enabled, no evidence was found of an Authenticator bypass or an unauthorised payment-destination change.

## Containment

- All legacy PIN-based order read and mutation routes return HTTP 410 before processing credentials.
- Account-session order APIs remain available.
- A production-gated, idempotent pre-traffic remediation will:
  - ban automated-pattern accounts and reject their pending privileged-role applications;
  - revoke all admin sessions, pending challenges, and step-up assertions;
  - invalidate all unused admin recovery codes;
  - invalidate every order credential sharing the compromised PIN;
  - write a durable remediation marker to the audit log.
- Blocked legacy requests record correlation ID, forwarding-chain signals, user agent, language, and a SHA-256 request fingerprint for correlation. These signals improve investigation but are not treated as definitive identity.

## Required production operation

Publish the current application version. The remediation runs before the server starts accepting traffic and only once. The administrator must then sign in with password and Authenticator, regenerate recovery codes, and securely store the new codes.

`ADMIN_SECRET` must also be replaced through Replit Secrets. Its value must never be placed in source code, logs, chat, or this report.