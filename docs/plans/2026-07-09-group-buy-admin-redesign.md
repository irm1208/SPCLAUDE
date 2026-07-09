# Group Buy Admin Redesign

## The problem today

`AdminGroupBuys.tsx` is a single 12,192-line file with **21 flat tabs** in one horizontally-scrolling row (Summary, Details, Products, Orders, Members, Waitlist, Payments, Parcels, Delivery, Intl Shipping, Shared Shipping, Fee by Country, P&L, Reshippers, Country Legs, Leg Calc, Testing, Rules, Broadcast, Fulfilment, QR Codes) plus 5 sub-tabs inside Details. Specific issues found:

1. **Duplicated settings** — Admin Fee and Entry Fee editable in *both* Details→General (form submit) and Details→Payments (own save buttons); two different save paths can overwrite each other. "Fee by Country" is a third fee surface as its own top-level tab.
2. **Two shipping-config surfaces** — Details→Shipping "Shipping Options" editor vs. the "Delivery" tab ("Custom Postage Options" + "Global Delivery Methods") configure overlapping things; custom options silently override global ones.
3. **Access settings scattered** — Invite PIN, blocked accounts, hidden-from-list, country restrictions live in Details→General; the Details→Access tab only has QR/Leg viewer grants; entry fee (a join gate) is in General + Payments.
4. **Ops mixed with setup** — day-to-day tabs (Orders, Payments status, Fulfilment) sit beside one-time config (Rules, Delivery, Fee by Country) with no grouping.
5. **Rules tab is misleading** — `RulesetEditorPanel` only takes `secret`, it's a *global* editor, not per-GB, but appears per-GB.
6. **Inconsistent save models** — instant toggles vs. per-card Save buttons vs. General's one big form (stale form submit can clobber toggle changes made elsewhere).

## Scope (per user answers)

- UI reorganization **and** code split into separate files.
- **Frontend-only** — reuse all existing endpoints, no API changes.
- Fix: too many tabs, misplaced/duplicated settings, ops vs. setup separation, unclear purpose of settings.

## Target design

### Navigation: grouped sidebar replacing the 21-tab row

Left sidebar (collapsible groups, active GB header stays on top with Clone / Open-as-organiser):

```
OVERVIEW
  Dashboard        (Summary + key stats)
  P&L

OPERATIONS  (day-to-day work)
  Orders
  Members          (+ Waitlist folded in as a filter/section)
  Payment Status   (existing "Payments" ops tab, renamed)
  Testing

FULFILMENT
  Fulfilment       (routing; keeps red unrouted badge)
  Parcels
  QR Codes
  Reshippers
  Country Legs     (+ Leg Calc folded in as a section)
  Intl Shipping
  Shared Shipping

COMMUNICATION
  Broadcast

SETUP  (one-time configuration)
  Settings         (redesigned — see below)
  Products
  Shipping & Delivery   (merges Delivery tab + Details→Shipping)
  Fees             (merges Admin Fee, Entry Fee, Fee by Country)
```

- "Rules" moves out of the per-GB view (it's global) — link to it from the GB list page instead.
- Tab state still persisted in `sessionStorage`; old tab ids map to new routes so saved state doesn't break.
- Mobile/narrow: sidebar collapses to a grouped dropdown.

### Settings page (replaces Details' 5 sub-tabs)

Single scrollable page with anchored sections (sticky section nav), each section saving independently (consistent per-section Save, replacing the one-big-form model). Every setting gets a one-line "what this does" description.

```
1. Basics      name*, description, status (incl. archived — currently unreachable),
               close date, currency, manufacturer (+country), sort order,
               hidden from list, lab test supplier
2. Access & Joining   invite PIN, member limit, min members, blocked accounts,
               allowed/excluded ORDER countries, entry fee (single home),
               QR viewer + leg viewer grants (from old Access sub-tab)
3. Ordering    max kits/customer, max kits total, allow extra orders,
               allow order add-ons, stock view, organiser edit permissions (7 toggles),
               closed-GB customer permissions (10 toggles),
               info cards, order page message,
               country sub-groups toggle, lab testing toggle
4. Payments    accept payments, direct-to-home payments, gateway (crypto/Revolut/
               PayPal/AnonPay), PAYMENT country restrictions (relabelled to
               distinguish from order countries), payment instructions,
               payment page banner, admin fee (single home)
5. Shipping    lives in "Shipping & Delivery" page: custom postage options +
               global delivery methods side by side with the override rule made
               explicit, vendor shipping notice, direct shipping, QR upload config
```

Deduplication decisions:
- Admin Fee & Entry Fee editors **removed from the General form**; single source each (Admin Fee → Payments section / Fees page; Entry Fee → Access & Joining). Entry-fee payment review list moves to Payment Status (ops).
- Country restrictions renamed: "Who can order (countries)" vs. "Who can pay (countries)" with explanatory text.
- QR settings consolidated: upload toggles + message + viewer access together in one place, cross-linked from shipping options' "requires QR" checkbox.

## Code split

New folder `src/components/admin/group-buys/`:

```
index.tsx               (exports AdminGroupBuys — list + detail shell)
GbDetailShell.tsx       (header, sidebar nav, routing between panels)
GbList.tsx, GbForm.tsx  (creation form — slimmed: Basics fields only)
panels/
  SummaryPanel.tsx, PnlPanel.tsx, OrdersPanel.tsx, MembersPanel.tsx,
  PaymentStatusPanel.tsx, TestingPanel.tsx, FulfilmentPanel.tsx,
  ParcelsPanel.tsx, QrCodesPanel.tsx, ReshippersPanel.tsx,
  CountryLegsPanel.tsx, IntlShippingPanel.tsx, SharedShippingPanel.tsx,
  BroadcastPanel.tsx, ProductsPanel.tsx, ShippingDeliveryPanel.tsx,
  FeesPanel.tsx
settings/
  SettingsPage.tsx, BasicsSection.tsx, AccessSection.tsx,
  OrderingSection.tsx, PaymentsSection.tsx
shared/  (InfoCardsEditor, ShippingOptionsEditor, country pickers,
          toggle-card, save-button primitives, constants)
```

## Implementation phases

**Phase 1 — mechanical split (no behavior change).**
Extract every sub-tab component verbatim into the new folder; `AdminGroupBuys.tsx` becomes a thin re-export. Verify with `pnpm build` / typecheck. This is pure moves, easy to review.

**Phase 2 — new navigation shell.**
Build the grouped sidebar in `GbDetailShell`, map old sessionStorage tab ids → new panel ids, keep the fulfilment badge. Old 21-tab row deleted. Rules link relocated to GB list page.

**Phase 3 — settings redesign + dedup.**
Build the sectioned Settings page from the existing cards; remove fee editors from the General form; per-section save; relabel country restrictions; merge Delivery + Shipping into ShippingDeliveryPanel; merge fee surfaces into FeesPanel. All using the existing PATCH endpoints (they already accept partial bodies).

**Phase 4 — polish.**
Descriptions on every setting, consistent toggle-card component, mobile nav, remove dead code.

Each phase is independently shippable; Phase 1 carries no UX change, so the risk is concentrated in 2–3 where we can test tab-by-tab.

## Verification

- `pnpm --filter peps-anonymous build` (or the workspace's typecheck script) after each phase.
- Manual pass per panel: every existing setting reachable, saves round-trip (network tab shows same PATCH bodies as before).
- Session-restore check: an old `adm_gb_state` value still lands somewhere sensible.
