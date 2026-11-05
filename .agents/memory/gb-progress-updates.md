---
name: Group-buy progress and updates
description: User-approved stages, audience, and separation from order/payment processing.
---

The member-facing group-buy progress section should be minimized by default.

On member order details, group-buy progress belongs inside the blue order summary, not in a second standalone progress box. The COA section starts collapsed, and the refund section belongs at the bottom.

**Why:** The user requested a less cluttered order page with no duplicate group-buy progress view.

**How to apply:** Keep one expandable group-progress entry on order details, preserve its organiser updates and deep link, and keep individual fulfilment/payment status distinct from whole-group progress.

**Why:** The user explicitly requested a minimized default after compacting the half-kit section.

**How to apply:** Keep the current stage visible in the collapsed summary and allow expansion for the full tracker and updates. Direct progress/update links must still reveal their target.

Organisers and Admin manually provide group-wide progress and dated updates with optional images. The approved stages are Open, Closed, Ordered from vendor, In transit, With reshipper, and Dispatched.

**Why:** The user requested status announcements and a visual view of group-buy progress, and selected these six ordering/shipping stages.

**How to apply:** Keep the tracker separate from individual order, payment and parcel statuses. Setting a stage must not mutate those records or reopen ordering. Keep progress and member announcements reachable after the group buy closes. Cover both organiser dashboards and Admin controls.

Organisers and Admin choose whether each published group-buy update or group-stage change also sends private Telegram alerts to members, not to a public group/topic.

**Why:** The user selected private messages to group-buy members, then explicitly requested organiser/Admin control over whether alerts go out.

**How to apply:** Keep the send-alert choice separate from website publication in all three management paths. Default it off to avoid unrequested broadcasts. Respect Telegram notification preferences and group access restrictions. Drafts must not send; repeated saves must not broadcast duplicates. Link to the member-facing full update, including any image, without exposing private storage paths.
