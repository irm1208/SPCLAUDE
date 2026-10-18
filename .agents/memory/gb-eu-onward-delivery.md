---
name: Group-buy EU onward delivery
description: User-defined scope of the EU reshipper-to-member delivery estimate matrix.
---

The EU delivery matrix is for onward delivery from the reshipper to the member, not vendor shipping. Rates are estimates, specific to destination country, pickup point versus address delivery, and quantity bands 1–5 and 6–25.

Quantity means kits; half a kit counts as 0.5.

The user approved quantity bands of up to 5 kits and over 5 through 25 kits; 5.5 kits uses the larger band.

Show an estimate only; members pay the reshipper later. Do not include this estimate in the amount payable with the order.

Each reshipper has a separate matrix within the group buy, rather than one matrix shared by all reshippers.

Above 25 kits, show "Quote required". Blank rates mean unavailable, not free delivery. Admin and organiser manage the matrices; members choose an optional pickup/home preference.

**Why:** The user explicitly distinguished this shipping leg from vendor shipping and wants these options available per group buy.

**How to apply:** Keep onward estimates separately labelled and stored from vendor-shipping charges and exclude them from the checkout amount payable. Match rates to the particular reshipper, group buy, destination country, delivery method, and quantity band. Re-resolve against current assignment/quantity/country rather than treating an old estimate as a payable charge. Destination country can differ from the routing country leg; never substitute the hub country for the member's known address country.

Use the existing database-backed configuration store for these optional settings and preferences, not new payment fields.

**Why:** This follows the existing group-update/preference convention without adding a production schema migration or letting an informational estimate become a financial obligation.

**How to apply:** Key matrix identity by stable reshipper assignment rather than mutable username, and preferences by order identity. Removing and re-adding a reshipper should require consciously enabling rates again.

Separate onward-delivery payment requests are approved for existing orders, including closed group buys. Keep the original product payment, vendor shipping and order total untouched.

Enabling “Accept payments” only enables the wallet. Keep reshipper-approved requests; do not automatically make selected matrix estimates payable.

**Why:** The user explicitly chose to keep reshipper-approved requests rather than let members pay their matrix price immediately.

**How to apply:** Make request creation easy to find, but require review and submission of each final charge before exposing member payment instructions.

The reshipper provides their crypto address for onward-delivery charges. Manual confirmation is the default, with a reshipper-panel option to accept manually or automatically.

**Why:** The user wants reshippers to collect the actual onward-delivery charge after product ordering has closed, and explicitly requested both confirmation modes.

**How to apply:** Estimates alone never create an amount owed. Track an explicitly requested onward charge separately. Automatic acceptance must mean verified blockchain receipt, not accepting a submitted transaction ID without verification.

Use a separate onward-delivery wallet setting for each reshipper within the group buy, never the product-payment wallet or a global wallet fallback.

**Why:** The user explicitly chose a separate onward-delivery wallet setting.

**How to apply:** Capture the receiving wallet, final amount, currency conversion and confirmation mode when issuing a request. Later settings changes apply to new requests, not existing debts. Closing a group buy or completing fulfilment must not erase an already-issued delivery debt or alter the original product payment.

Reshippers may update their own matrix prices. Group-buy organisers may edit matrix prices and manage onward-payment requests for their group buys.

**Why:** The user explicitly requested both price editing and payment-request management for organisers, in addition to reshipper price editing.

**How to apply:** Keep one shared matrix per assignment, rather than separate organiser/reshipper copies. Restrict reshippers to their own active assignments. Organiser actions must validate group ownership and retain the selected reshipper's wallet destination and the real organiser's audit identity. Cover both organiser dashboards.
