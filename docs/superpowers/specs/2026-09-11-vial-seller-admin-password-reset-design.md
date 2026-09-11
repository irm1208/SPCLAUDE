# Admin Reset for Vial Shop Seller Passwords

## Goal

Allow an authenticated administrator to set a new password for a Vial Shop seller who cannot complete the existing self-service password-reset flow.

## User experience

The selected seller detail panel will contain a **Set new password** section. The administrator enters the new password twice and submits the form.

The form will:

- keep both password fields masked;
- require both values to match;
- enforce the same minimum password requirements as seller signup and self-service reset;
- disable submission while the request is in progress;
- clear both fields after success;
- show an explicit success or error message without revealing the stored password or hash.

## API and security

Add an admin-authenticated endpoint scoped to one seller. It will:

1. verify normal admin authentication;
2. validate the seller ID and new password;
3. verify that the target account is a Vial Shop seller;
4. hash the password with the existing seller password-hashing mechanism;
5. invalidate all active seller sessions for that seller;
6. record an audit event identifying the administrator action and target seller, but never the password;
7. return a minimal success response.

The current password cannot be read or recovered.

## Error handling

- Invalid or mismatched passwords are rejected before the request or at the API boundary.
- Missing sellers return 404.
- Non-seller accounts cannot be changed through this endpoint.
- Database failures return a generic error and do not report success.

## Testing

Backend tests will cover authorization, validation, secure password replacement, seller-only targeting, and session invalidation. Frontend regression coverage will confirm that the seller panel submits the intended endpoint and exposes the password confirmation flow.
