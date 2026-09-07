# Telegram-first account verification

## Behavior

When account verification offers Telegram, the verification page selects Telegram by default. Email remains visible and selectable as a fallback.

If Telegram is unavailable and Email is available, Email is selected. If neither method is available, no method is selected.

## Implementation

Keep method selection as a small pure helper in the account-verification flow module. The verification page uses that helper when verification status first supplies the available methods.

This change does not alter backend verification rules, remove Email verification, or persist a browser-specific preference.

## Error handling

Existing Telegram link errors retain the Email fallback and retry controls. Existing Email errors remain unchanged.

## Testing

Unit tests cover:

- Telegram preferred when both methods are available.
- Telegram selected when it is the only method.
- Email selected when Telegram is unavailable.
- No selection when no method is available.

The existing regression contract continues to ensure Telegram link initialization does not restart when mutation state changes.