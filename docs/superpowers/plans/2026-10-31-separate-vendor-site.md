# Separate vendor site and identities

User-approved requirement: pepsanonymous.com is a vendor-only site with entirely separate vendor accounts; vendor IDs link those accounts to orders in Salt & Peps. Main domains cannot serve vendor routes and the vendor domain cannot serve main pages/APIs.

Implementation:
- Dedicated vendor_accounts and vendor_sessions tables. No member account foreign keys, copied member credentials, or shared sessions.
- Opaque, hashed vendor session tokens in host-only HttpOnly cookies; CSRF token on authenticated mutations; origin checks and login/signup throttles.
- Dedicated signup/login/session/logout endpoints, pending account approval, admin vendor linking, suspension and password reset. Session revocation on any account access change.
- Existing orders, snapshots, cost allowlists, refunds, shipping updates and CSV workflows remain server-authorized by vendor ID. Member image access remains separate.
- Exact domain policy at backend, vendor-only routing at frontend, and development-only preview access. No member auto-login on vendor surfaces.
- Verify auth session isolation/revocation/CSRF and domain bypass cases; exercise vendor and admin UI; update rollback integration fixtures to separate vendor identities.

No existing customer passwords or grants are migrated into dedicated vendor credentials. Existing vendor grants remain historical; create a vendor account or approve a new vendor signup and link it to the appropriate vendor ID. Production DNS/custom-domain attachment and deployment remain external steps.

Verification complete: dedicated auth and domain/document suites (14 tests); frontend policy/CSRF/CSV transport tests (19); dedicated account admin UI (7); login and portal UI (13); PostgreSQL rollback fixtures verify account independence, vendor-only orders, suspension, reset and reassignment revocation. Browser test at simulated pepsanonymous.com verified dedicated signup without email, pending approval, no member API calls and main-page denial. Live local API Host smoke checks confirm both domain directions and forwarded-host spoofing are blocked. Workspace library build passes; API/frontend full typechecks still report pre-existing unrelated errors. No production deployment or DNS changes.
