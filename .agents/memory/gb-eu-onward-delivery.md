---
name: Group-buy EU onward delivery
description: User-defined scope of the EU reshipper-to-member delivery estimate matrix.
---

## Current preference: EU custom postage instead of the matrix

Use country-specific Custom Postage Options for EU Home delivery and Pickup point, keeping both quantity bands automatic: up to 5 kits and over 5 through 25 kits; half kits count as 0.5. Preserve existing UK/US couriers. Imported custom charges are collected during normal checkout rather than as a second matrix payment.

**Why:** The user said the EU matrix was not working and they did not have time to fix it, and explicitly asked to put its entries in Custom Postage Options. They selected keeping both quantity bands automatically.

**How to apply:** Copy the selected saved reshipper prices or supplied template into the ordinary custom postage settings. Do not silently convert currencies or mutate old paid orders. Bypass the legacy matrix and new matrix-payment creation for converted checkout routes, on the server as well as in the UI. Preserve previously issued delivery debts. Groups/countries not converted retain the legacy behavior below.

## Legacy matrix and existing payment requests

Reshipper courier lists must follow the reshipper's actual country coverage (multi-country coverage takes precedence over the legacy single country). UK and GB refer to the same destination; explicitly global options still apply everywhere.

**Why:** The user asked to show reshippers only couriers linked to their countries. Filtering a shared group-wide options array must not delete hidden countries' settings or apply an edit to the wrong row.

**How to apply:** Scope new courier options to an assigned country, preserve country/quantity-band/upload metadata on edits, and preserve the full saved array while filtering the displayed rows.

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

Enabling “Accept payments” now lets members explicitly start payment at their current EU matrix rate without waiting for a reshipper-issued request. Keep staff-issued requests for custom amounts and preserve existing request snapshots.

**Why:** The user changed the previous request-only policy: “we'll be accepting payments right away” and approved immediate separate delivery payment.

**How to apply:** Remove the Optional pill. Require Name, Address, Country, Mobile and Email for EU matrix delivery, including older orders before payment. Resolve the price and wallet on the server; never create a charge as a GET side effect.

Treat collection as a later, separate task on existing paid group buys, potentially a month after ordering when the reshipper receives the shipment. Explain the reshipper and member steps simply within both interfaces, rather than relying on support explanations.

**Why:** The user said the matrix and enabled wallet did not make it clear how the reshipper collects onward delivery or how the member pays.

**How to apply:** Distinguish wallet setup from sending a request, show the matrix estimate during charge review, and explain the member's waiting, payment and confirmation stages without suggesting the original product payment is owed again.

The reshipper provides their crypto address for onward-delivery charges. Manual confirmation is the default, with a reshipper-panel option to accept manually or automatically.

**Why:** The user wants reshippers to collect the actual onward-delivery charge after product ordering has closed, and explicitly requested both confirmation modes.

**How to apply:** Estimates alone never create an amount owed. Track a staff-issued or explicitly member-started onward charge separately. Automatic acceptance must mean verified blockchain receipt, not accepting a submitted transaction ID without verification.

Use a separate onward-delivery wallet setting for each reshipper within the group buy, never the product-payment wallet or a global wallet fallback.

**Why:** The user explicitly chose a separate onward-delivery wallet setting.

**How to apply:** Capture the receiving wallet, final amount, currency conversion and confirmation mode when issuing a request. Later settings changes apply to new requests, not existing debts. Closing a group buy or completing fulfilment must not erase an already-issued delivery debt or alter the original product payment.

Reshippers may update their own matrix prices. Group-buy organisers may edit matrix prices and manage onward-payment requests for their group buys.

**Why:** The user explicitly requested both price editing and payment-request management for organisers, in addition to reshipper price editing.

**How to apply:** Keep one shared matrix per assignment, rather than separate organiser/reshipper copies. Restrict reshippers to their own active assignments. Organiser actions must validate group ownership and retain the selected reshipper's wallet destination and the real organiser's audit identity. Cover both organiser dashboards.

The EU quantity-band matrix is only for EU onward-delivery estimates. Other destinations, including the UK, use the group buy's existing custom postage options, scoped to a selected country; options may require a member-uploaded QR/label or a delivery address.

**Why:** The user clarified that only the EU needs the multi-country matrix and non-EU country-specific options should not be shown to other countries.

**How to apply:** Render the EU matrix picker only for EU destination countries; for UK/GB and other non-EU destinations, omit the component and do not request an estimate. Show only global or destination-matching custom options to members, reject mismatched selections on the server, and retain the standard global methods if no custom option matches.

Members may optionally pay products and onward delivery together only when the receiving wallet, token and network match. Keep both allocations separate and never add delivery to the product order total.

**Why:** The user requested “the option to keep the payments together” and explicitly selected “Combine only when both wallets match.”

**How to apply:** Combined verification must verify the sum, atomically allocate one reserved transaction to those two charges only, and preserve manual reshipper confirmation when configured. Separate transfers remain available; an already-paid product order must never be charged again.

Country-scoped checkout must submit the same effective destination used to display the option: explicit shipping country, then account country, then country-leg code.

**Why:** The order form can show a valid option using the account/leg fallback while the review payload previously sent only the optional draft country, causing the server to reject the selected method.

**How to apply:** Share one destination-resolution rule between the order form and final order payload; keep the server-side country match authoritative.

New-order checkout must not offer the separate “Potential onwards delivery charge” matrix picker. Use country-specific custom postage instead, retaining its quantity bands and contact requirements.

**Why:** The user chose custom postage as the replacement and explicitly asked to remove the old matrix choice from checkout.

**How to apply:** Keep it absent from both product selection and review; do not require a legacy matrix choice on ordinary checkout. Preserve historical delivery preferences and issued payment requests.

Reshippers must be able to view and edit custom postage for every country they are assigned within a group buy, including US, UK and EU countries.

**Why:** The user explicitly wants country assignment to grant management of that country's postage, not just visibility.

**How to apply:** Enforce the scope server-side as well as in the panel. Keep global options Admin/organiser-managed, preserve other countries' current settings during saves, and do not reprice existing orders when changing rates.
