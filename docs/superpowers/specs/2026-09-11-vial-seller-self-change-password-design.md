# Vial Seller Self-Service Password Change

## Goal

Allow a logged-in Vial Shop seller to change their own password from the Seller Dashboard.

## User experience

The seller Profile tab will include a **Change password** section with:

- current password;
- new password;
- new password confirmation.

All fields are masked and labelled. The form requires the new password to be at least eight characters and both new-password values to match.

After a successful change, the dashboard clears the saved seller session and returns to the seller login screen with a confirmation that the password was changed. The seller must sign in again using the new password.

## API and security

Add a seller-authenticated password-change endpoint. It will:

1. authenticate the seller using the existing seller headers;
2. verify the submitted current password against the authenticated seller;
3. validate the new password;
4. reject using the same value as the current password;
5. replace the stored seller password hash;
6. clear any pending forgot-password code and expiry;
7. record a password-change audit event without credentials;
8. return a minimal success response.

Because seller sessions use the password hash as their token, replacing the hash invalidates the current browser and all other seller sessions.

## Error handling

- Incorrect current passwords return a generic authentication error.
- Invalid or mismatched new passwords are rejected.
- Failed database writes do not sign the seller out or report success.
- The UI disables all password fields and submission while the request is running.
- Password values are cleared after success and whenever the seller session changes.

## Testing

Backend behavioral tests will cover authentication, current-password verification, validation, hash replacement, reset-code clearing, audit safety, and invalidation of the previous token.

Frontend regression coverage will confirm the form contract, request body, loading and error behavior, and logout after success.
