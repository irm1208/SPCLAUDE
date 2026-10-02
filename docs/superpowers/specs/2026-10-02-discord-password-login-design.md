# Discord account username and password setup

## Goal

Let existing Discord-linked users choose a site login username and create a password so they can sign in without using Discord. Keep Discord sign-in available.

## Approved flow

- Offer an optional setup prompt after successful Discord login when the account has no password or still uses a synthetic Discord account identifier.
- Provide the same setup in Account Settings.
- Step 1 creates the first password if none exists. Do not ask for a current password in this state.
- Step 2 chooses an available site login username using the existing username-change flow. Ask the user to re-enter the password established in step 1, or their existing password when one is already set.
- Skip any step already satisfied: an account with a regular site username only needs first-password setup, while an account with a password and a synthetic identifier only needs username selection.
- Explain that this changes the site's account username, not the user's name on Discord.
- Allow “Skip for now.” Dismissal applies to the current login; incomplete setup can be offered again after a later Discord login.
- Stop prompting once the account has both a password and a non-synthetic site username.
- If password creation succeeds but username selection fails, keep the saved password and allow the user to retry the username step.

## Data and architecture

- Keep the existing custom account authentication system. Do not introduce another authentication library or a separate identity database.
- Expose a boolean password-availability flag to the authenticated account UI; never return password hashes.
- Use the existing first-password endpoint and username-change endpoint, preserving password validation, current-password verification, transactional related-record updates, and refund mutation protections.
- Preserve the Discord ID and linked provider data when the site username changes. Discord login must resolve the renamed account through its Discord ID.
- Renew the account session after a successful username change using the existing session issuance path, then refresh account-scoped UI data.
- Carry a non-sensitive successful-Discord-login marker to the account page to trigger the optional prompt. Treat it only as a presentation hint, never as authentication or authorization.
- Keep first-password behavior consistent in the secondary profile/password surface so it does not demand a password the user has never created.

## Security and errors

- Require a valid authenticated account session for all setup writes.
- Preserve account activation, suspension, and verification gates. This feature does not create new accounts through Discord or bypass signup verification.
- If a password already exists, changing it still requires the current password.
- Preserve existing username normalization, allowed characters, length limits, uniqueness checks, and related-record safeguards.
- Show validation, unavailable-username, incorrect-password, and rename-blocked errors without claiming setup completed.
- Keep passwords only in transient form state; clear them after successful submission and never store them in browser storage, URLs, or logs.
- Retain normal password-login failure handling and rate limits.

## Presentation

Use existing account-page styles. Show clear password-setup versus password-change labels and concise step guidance. Keep ordinary non-Discord account management behavior unchanged.

## Verification

- Test password-availability response data without exposing hashes.
- Test incomplete and complete account states, skip behavior, and the successful-Discord-login trigger.
- Test first-password setup without a current password, and existing-password rejection without valid current credentials.
- Test username retry behavior after password creation.
- Test password login using the chosen username and continued Discord login after rename.
- Verify existing username-change related-record and refund protections remain in place.
- Run relevant account/Discord tests and frontend/API checks, and inspect accessible preview routes. If the signed-in UI cannot be rendered in the verification browser, report that limitation explicitly.

## Out of scope

No new Discord signup route, no provider-side Discord username edits, no removal of Discord sign-in, no unrelated authentication migration, and no changes to verification requirements.