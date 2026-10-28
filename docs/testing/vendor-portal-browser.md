# Vendor portal signed-in browser check

Run from the workspace root:

```sh
pnpm --filter @workspace/api-server run test:e2e:vendor-portal
```

This is an opt-in integration check, not a mocked UI test. It needs the **development** PostgreSQL database, working App Storage, OpenSSL, and Chromium. It uses Replit's Chromium wrapper when available. Elsewhere, install Chromium with `pnpm --filter @workspace/api-server exec playwright install chromium` (and its operating-system dependencies), or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

The check starts a temporary Vite server and an HTTPS server on free local ports. It does not need the preview workflows to be running. The browser trusts only the temporary self-signed test certificate through its test context settings; no application security setting is changed.

## Coverage

- Two vendor accounts and two members sign in through the actual login form in separate Chromium contexts. Admin signs in through the real legacy-secret login endpoint in a fifth context, obtaining a real session and CSRF cookie. A sixth, unsigned context checks guest rejection.
- Secure account cookies survive navigation and reload. The API worker retains the environment's Replit preview cookie configuration.
- Admin session authentication and CSRF protection guard vendor access grants and submissions.
- Paid but unsubmitted orders do not appear. Explicit Admin submissions appear only for their assigned vendor, in both the rendered lists and API responses.
- Shared orders become a single combined supplier shipment. Supplier costs are correct; customer prices, payment fields, internal source data, and private onward addresses do not leak.
- A vendor marks a shipment as processing, uploads a real PNG through the form to App Storage, and saves tracking through the form.
- The delivery recipient can list, download, and render the real combined photo. Another vendor, a non-recipient member, and a guest cannot retrieve guessed photo URLs.
- Combined tracking is visible on the recipient's direct order page and response. It is absent from the other member's own order response, order listing, and rendered page. Opening the recipient's direct order URL as the other member fails.
- Revoking vendor access after sign-in immediately denies listing, mutation, and photo requests using the existing cookie; reload shows the restricted screen. The other vendor remains authorized.
- Logout invalidates the other vendor's session.

## Isolation and cleanup

Only the exported database connection is redirected to a real PostgreSQL transaction. Authentication, authorization, configuration loading, route handlers, supplier-cost calculations, and image storage are not mocked. Nested transactions use real savepoints.

All accounts, orders, shared-order membership, Admin settings, access grants, audit records, and sessions are rolled back, including on failure. Synthetic credentials are generated inside the test worker and never added to workspace secrets. Uploaded synthetic objects are separately deleted from App Storage. Browser contexts are closed before rollback, and the temporary servers and certificate files are removed.

Run against development resources only. This test temporarily overrides vendor configuration and Admin security mode **inside its uncommitted transaction**, without changing settings visible to the running app.

## Boundaries

This check covers the legacy-secret Admin session mode, not Admin two-factor enrollment/login. It exercises a real HTTPS top-level browser origin, not a cross-site embedded preview iframe or a production custom domain.
