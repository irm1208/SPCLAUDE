# Frontend API contract — EU onward estimates

All routes under `/api`. Use fetch with credentials, existing admin auth interception and organiser header helpers. Errors are `{error:string}`. No generated hooks exist for these routes.

Matrix: `{enabled:boolean,currency:"USD"|"EUR"|"GBP"|"USDT"|"USDC",rates:Array<{country:ISO_EU_code,pickupSmall:number|null,pickupLarge:number|null,homeSmall:number|null,homeLarge:number|null}>}`.
Blank prices map to null, never 0. Small = >0–5 kits; large = >5–25. Half counts 0.5.

- GET `/{admin|organiser}/group-buys/:id/onward-delivery`
  returns `{reshippers:[{username:string,enabled:boolean,matrix:Matrix|null}],template:Matrix,countries:[{code,name}],currencies:string[]}`. Template contains all 27 rates from supplied image, USD; use only when explicitly chosen by manager, never silently apply.
- PUT `/{admin|organiser}/group-buys/:id/onward-delivery/:username`
  body Matrix; returns `{matrix:Matrix}`.
- POST `/group-buys/:id/onward-delivery/estimate`
  body `{country:string,kits:number,reshipperCode?:string,directShippingRequested?:boolean,orderId?:string}`.
  returns Estimate. orderId optional for an existing member-owned order; use its assigned reshipper. Otherwise server resolves unique country reshipper or reshipper code.
- GET `/orders/:orderId/onward-delivery` owner only, returns Estimate.
- PUT `/orders/:orderId/onward-delivery` owner only, body `{method:"pickup"|"home"|null}`, returns Estimate.
- GET `/{admin|organiser}/group-buys/:id/orders/:orderId/onward-delivery` for managers.
- GET `/reshipper/gb/:id/orders/:orderId/onward-delivery` assigned reshipper only.

Estimate: `{status:"available"|"unassigned"|"unavailable"|"quote_required"|"not_applicable",configured:boolean,country:string|null,kits:number,currency:string|null,reshipperUsername:string|null,options:Array<{method:"pickup"|"home",amount:number}>,selectedMethod:"pickup"|"home"|null}`.
Hide unconfigured estimates when there is no saved preference. If configured is true but status is unavailable, explicitly show that no matching rate is available, rather than silently hiding it.
When assigned reshipper changes the rate is re-resolved, not locked. selectedMethod may be unavailable; visibly require reselection rather than imply the old price is current.

Order create/update payload accepts optional `onwardDeliveryMethod:"pickup"|"home"|null`. Keep in draft store; send on create and update. This is an optional preference, never a required checkout payment. It is stored atomically with orders, but NOT added to any total, vendorShipping, deliveryPrice, amountDue, coupon basis or credits.

UI scope:
- Compact collapsible matrix editor in Admin reshippers and both organiser routes (V2 reuses OrganiserReshippersTab from GbOrganiser).
- Selectable estimates on member OrderForm (near delivery), Review and slide-out order panel if straightforward; show pending assignment/no matching rate/quote required clearly. Above 25 quote required.
- Saved choice displayed and editable on AccountOrderDetail when not cancelled/dispatched; informational estimate for organiser/Admin and assigned reshipper orders.
- Explicit caption: Reshipper to you. Estimate only; pay the reshipper later. Not vendor shipping and not included in order total.
- Only GBs, no wholesale/FS3 changes. No map/provider integrations, pickup-point IDs or actual payment collection in this scope.
