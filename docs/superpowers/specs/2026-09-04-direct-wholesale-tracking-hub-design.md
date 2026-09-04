# Direct Wholesale Tracking Hub Design

## Scope

Build a signed-in customer tracking hub for direct wholesale orders only. Shared wholesale orders, group buys, onward parcels, organisers, and shared-order members are explicitly excluded.

## Customer experience

- Add `/wholesale/tracking`, linked from My Orders and `/wholesale`.
- Show every direct wholesale order that has at least one tracking number.
- Each order card shows its order code, tracking numbers, cached carrier status, last check time, latest event, and a link to the order detail.
- Provide All, In transit, Attention needed, and Delivered filters plus summary counts.
- Provide an account-level “Wholesale tracking alerts” switch. It defaults off.
- When enabled, important updates appear in the existing in-app bell feed and are sent through the customer’s linked Telegram or Discord account.

## Status model

Retain the existing tracking status cache on `orders`. Enhance Track17 event normalization with:

- `redirected` for explicit redirected/rerouted wording.
- `seized` only for explicit seizure/confiscation wording.
- `return_to_sender` for explicit return-to-sender wording.

Uncertain customs wording remains `exception`. Wholesale alert statuses are `delivered`, `redirected`, `seized`, and `return_to_sender`. Repeated polls with the same normalized status do not resend notifications.

## Data and security

- Customer API queries require account authentication.
- Ownership is derived from the authenticated account, never request input.
- Query only `order_type = 'wholesale'`, excluding deleted and shared orders.
- Reuse `accounts.telegram_notifications.wholesale_tracking` for the opt-in; absence means disabled.
- Reuse `telegram_message_logs` for in-app notifications through the existing notification helper.
- No new database table or column is required.

## Failure handling

- The page renders loading, empty, and error states.
- Missing Track17 data renders as Pending without blocking the order link.
- Telegram/Discord delivery failure does not prevent cached tracking updates; the in-app notification log remains the source for the bell feed when the opt-in is enabled.

## Verification

- Unit-test event classification and alert-status selection.
- Route-test direct-wholesale scoping and preference privacy.
- Source/UI-test page route, links, filters, and opt-in behavior.
- Run API tests/typecheck, frontend tests/typecheck/build, restart the canonical workflow, inspect logs, and capture the page.