# Member regional batch progress implementation plan

**Goal:** From the group-buy card's existing three-dot menu, members see their own region's filling progress and prepared batch statuses, only when sharing is enabled.

**Architecture:** Share the existing supplier queue eligibility calculation between staff and the read-only member endpoint. Resolve destinations server-side from active orders, falling back to the joined country leg/profile for members without orders. Filter historical snapshots by their country coverage before returning explicit safe summaries. Preserve repeatable-read transactions and never create allocations, alerts or readiness transitions from a member read.

**Tech stack:** Express, Drizzle/PostgreSQL, React Query, existing member dialog.

- [x] Add failing coverage for queue parity, country scoping (including GB/UK), safe regional progress and empty states.
- [x] Share the pure queue calculation and extend the member response with scoped region progress.
- [x] Render filling/ready kit progress above existing historical statuses; preserve visibility gating and refresh.
- [x] Verify backend, frontend, real database fixtures, production builds and app startup. Record the country-privacy rule in memory.

Verification: 42 backend tests (including synthetic PostgreSQL fixtures) and 5 member component tests pass. API and frontend production builds pass. Changed production files have no reported type errors; the wider repository still has unrelated type errors. Startup logs report Application ready. The screenshot browser sees the sign-in form, so the authenticated dialog was checked via component tests rather than a signed-in visual capture.
