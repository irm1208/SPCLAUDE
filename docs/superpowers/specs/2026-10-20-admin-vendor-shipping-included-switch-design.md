# Admin Vendor Shipping Included Switch

## Goal

Make it easy for an admin to mark vendor shipping as included, without requiring them to type `0` into the amount field.

## Design

In the Admin Panel group-buy settings at **Details → Shipping → Vendor Shipping Notice**, add a switch labelled **Vendor shipping included (0)**. It appears only while the existing Vendor Shipping Notice setting is enabled.

- When switched on, the amount is set to `0` and the amount input is replaced by a short “No separate vendor-shipping charge” explanation.
- When switched off, restore the regular amount input. A positive amount is a fixed charge; a blank field remains TBD.
- The existing **Save Vendor Shipping** button remains the persistence action. The switch updates the form state; it does not save implicitly.
- The existing notice-enabled switch and all organiser settings remain unchanged.

## Data and behavior

No API or database changes are needed. The existing admin group-buy PATCH accepts `vendorShippingAmount` as a number or `null`. Saving the included state sends `0`; saving a blank amount continues to send `null`.

The included switch is derived from the form amount being zero. When an admin turns it off, clear the amount so the UI returns to the existing TBD/fixed-amount control. A manually entered positive amount turns the included state off.

## Verification

- Test that amount `0` renders the included state and that the switch is available in the admin shipping panel.
- Test that switching on sets the amount to `0` and switching off returns to the amount field.
- Test that saving still sends numeric zero for included shipping and `null` for blank/TBD.
- Run the focused test and the Peps Anonymous frontend build.
