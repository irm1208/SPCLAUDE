# Vendor site isolation

The API bootstrap adds `vendor_accounts` and `vendor_sessions` through `ensureVendorAccountSchema` before production readiness. Existing member accounts, legacy vendor grants and orders are preserved. Dedicated vendor identities have no member-account foreign keys and no member password hashes are copied.

## Account setup

Vendor users can register at `https://pepsanonymous.com/`. Accounts start pending with no order access. In the main Salt & Peps Admin vendor portal, approve an account and select its existing vendor profile. Alternatively create a vendor account directly in Admin. Email is optional. Resetting a password, suspending or reassigning a vendor revokes its sessions immediately.

Existing member-based vendor users must register a dedicated vendor account or receive one from Admin. Matching usernames on the two sites are independent identities. Existing vendor orders remain linked by configured vendor ID, so approving the correct vendor assignment exposes that vendor's existing and future submissions.

## Domains and deployment

Keep `pepsanonymous.com` (and optionally its `www` alias) attached to the same deployment. The backend Host boundary exposes only vendor pages/APIs on those hosts and denies vendor pages/APIs on all other production hosts. Member/admin pages and APIs are unavailable through the vendor domain. Do not rewrite Host to an internal host in a proxy; do not use untrusted forwarded headers as a substitute. Verify the actual custom-domain Host delivered by hosting before rollout.

Vendor cookies are host-only, HttpOnly and Secure in production, scoped to `/api/vendor`; authentication uses dedicated database sessions and CSRF protection. Member cookies and JWTs are never accepted by vendor authentication. Main admin routes remain on the main domains.

Development permits vendor preview paths only on localhost/loopback, the configured Replit dev domain, or explicit `VENDOR_DEV_HOSTS` entries. Production never enables these exceptions. Vendor page routing does not mount member auto-login, member session refresh or member account dialogs.

Before publishing, verify signup/approval/login, vendor-only order visibility, CSV tracking import, suspension, reset and reassignment. Confirm requests to `pepsanonymous.com/api/account/me` and `saltandpeps.co.uk/api/vendor/me` are blocked; check both exact and forwarded-host spoofed requests. No live DNS changes or deployment are performed by this change.
