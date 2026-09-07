# Seller Signup Turnstile Design

## Goal

Allow Lonely Vial seller applications to satisfy the backend's existing Cloudflare Turnstile requirement.

## Scope

- Reuse the account-signup Turnstile site-key resolution and explicit widget-loading pattern in the seller signup form.
- Render the security check immediately above the seller application submit button.
- Keep submission disabled until a site key is available and Turnstile supplies a valid token.
- Include `turnstileToken` in `POST /api/vial/seller/signup`.
- Clear expired or failed tokens.
- Show a clear unavailable/load-error message and a retry control.
- Reset the widget after a rejected submission so a spent token is not reused.

## Security

- Keep server-side Turnstile verification mandatory.
- Do not allow member sessions to bypass CAPTCHA.
- Never expose the Turnstile secret key to the browser.
- Use `VITE_TURNSTILE_SITE_KEY` in production and the existing Cloudflare test site key in development.

## Testing

- Add a testable seller-signup request helper or model that proves the token is required and included in the request body.
- Preserve the existing server integration tests that reject missing/invalid tokens and accept valid tokens.
- Run frontend tests/typecheck and the focused server registration tests.

## Out of Scope

- Refactoring all CAPTCHA usage into a shared visual component.
- Changing seller approval or member authentication.
- Weakening anti-automation checks.