# GB onward payments API contract

All endpoints are same-origin `/api`, cookies included, JSON, and `Cache-Control: private, no-store`. Failures return `{error: string}` with 400 validation, 401/403 auth, 404 missing, 409 conflict, 503 pricing/provider failure.

## Types
```ts
type WalletSettings = {
  enabled: boolean; confirmationMode: "manual" | "automatic";
  currency: string; network: string; walletAddress: string;
};
type Rail = { currency: string; network: string };
type Charge = {
  id: string; orderId: string; status: "unpaid" | "pending_confirmation" | "paid" | "cancelled";
  amount: number; currency: "USD" | "EUR" | "GBP"; method: "pickup" | "home";
  note: string; reshipperUsername: string;
  wallet: {currency: string; network: string; walletAddress: string};
  cryptoAmount: number; confirmationMode: "manual" | "automatic";
  txHash: string | null; verificationNote: string | null;
  createdAt: string; submittedAt: string | null; confirmedAt: string | null;
};
type Envelope = {request: Charge | null; history: Charge[]; canManage: boolean; canSubmit: boolean; canRequest?: boolean; requestBlockedReason?: string|null};
```

## Reshipper
- Matrix editing: `GET /reshipper/gb/:gbId/onward-delivery` returns only the caller's active assignment and the standard country/template data. `PUT /reshipper/gb/:gbId/onward-delivery/:username` accepts the existing matrix schema, requires the caller's own active assignment and saves to the same matrix used by organiser/Admin estimates. Neither changes issued payment requests.

## Organiser management
Under `/organiser/group-buys/:gbId/reshippers/:username`, the organiser can GET `/onward-payments`, POST `/orders/:orderId/onward-payments`, and POST `/orders/:orderId/onward-payments/:requestId/confirm|reject|cancel`. Group ownership and the selected active assignment are authorized on the server; mutation authority is checked again in the transaction. These reuse the reshipper request workflows, wallet snapshots, replay guards and state transitions, while recording the actual organiser in audit entries. Wallet settings are read-only here and remain reshipper-managed. Matrix editing continues through the existing organiser matrix endpoints.

## Reshipper payment endpoints
- `GET /reshipper/gb/:gbId/onward-payments`: `{settings: WalletSettings, rails: Rail[], orders: [{id, code, username, country, kits, orderStatus, canRequest, requestBlockedReason?: string|null, estimate: OnwardEstimate, request: Charge|null}]}`. Existing estimate type is in frontend lib/onward-delivery.ts. Assigned EU orders included; closed GB and settlement after onward dispatch/delivery are allowed. Cancelled/refunded or direct-shipping orders cannot receive new requests.
- `PUT /reshipper/gb/:gbId/onward-payments/settings`: body `WalletSettings`; returns `{settings}`. Separate onward wallet; never product payment details.
- `POST /reshipper/gb/:gbId/orders/:orderId/onward-payments`: `{idempotencyKey: crypto.randomUUID(), amount: number, currency: "USD"|"EUR"|"GBP", method: "pickup"|"home", note?: string}` → `Envelope`. Final amount is entered/confirmed by reshipper, optionally prefilled from estimate. It does not auto-charge from an estimate.
- `POST /reshipper/gb/:gbId/orders/:orderId/onward-payments/:requestId/confirm`: `{}` → `Envelope`. Requires pending request, marks paid manually. Request uses snapshotted wallet/mode.
- Same path `/reject`: `{reason: string}` → `Envelope`. Pending → unpaid; retains audit attempt and releases unused TX claim. Member sees rejection explanation.
- Same path `/cancel`: `{}` → `Envelope`. Unpaid only; paid/pending protected.

## Member
- `GET /orders/:orderId/onward-payments` → `Envelope`. History only their own; includes cancelled requests.
- `POST /orders/:orderId/onward-payments/:requestId/submit`: `{txHash: string}` → `Envelope`. Unpaid → pending. Automatic mode verifies immediately if possible; pending is retried by scheduler, never falsely marked paid. Manual mode waits for reshipper.
- Same path `/verify`: `{}` → `Envelope`. Pending auto-mode request only; manual mode returns current state without automatic confirmation.

## Manager inspection
- `GET /admin/group-buys/:gbId/orders/:orderId/onward-payments`
- `GET /organiser/group-buys/:gbId/orders/:orderId/onward-payments`
- `GET /reshipper/gb/:gbId/orders/:orderId/onward-payments`
Return Envelope, authorization scoped to exact GB/order. Reshipper proof visible only if request belongs to the current assignment. Manager inspection is read-only.

## Frontend integration
Create dedicated components under `components/onward-delivery/` and optional typed client file. Export:
- `OnwardPaymentManager({gbId, fetcher})` for Reshipper Shipping tab, using existing reshipFetch.
- `OnwardPaymentCard({orderId})` for AccountOrderDetail, near existing estimate; component disappears when no request/history.
- `OnwardPaymentReadonly({source})` beside existing OnwardDeliveryReadonly manager views; source is existing `{kind:"admin"|"organiser"|"reshipper",gbId,orderId,fetcher?}`.
Preserve existing forms/deep-links. Existing UI uses var(--t-*) tokens, Peps brand and both themes. No new providers, global wallet fallback, product total changes or mocked data. Member status displays distinct "Onward delivery payment". Show exact crypto amount, currency, network and address with copy actions, TX input, pending and paid states. No screenshots/uploads required: this flow uses crypto TXIDs. Keep mobile compact and accessible.
