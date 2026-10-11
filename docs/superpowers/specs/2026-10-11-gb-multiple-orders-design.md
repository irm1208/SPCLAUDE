# Multiple orders within a group buy

Approved scope: organiser and Admin GB order lists.

- Highlight multiple separate active orders from the same canonical account handle within the same group buy.
- Show the number of affected people and provide a multiple-orders-only filter.
- Calculate counts in the database before pagination, independent of other row filters.
- Exclude cancelled, draft, deleted and genuine add-on orders from duplicate candidates. Label add-ons separately.
- Match stored account handles, not names or addresses. Do not expose other reshippers' order counts through shared handlers.
- Preserve all orders, amounts, selection safeguards and existing actions. No automatic consolidation or removal.
- Verify canonical identity matching, scope isolation, exclusions, full-list counts and unchanged totals with database fixtures.
