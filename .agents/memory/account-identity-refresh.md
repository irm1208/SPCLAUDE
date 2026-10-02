---
name: Account identity refresh
description: Why changing a canonical account username requires more than client-side navigation.
---

After changing the canonical account username, refresh all account-scoped client state with the renewed session rather than merely navigating to another client-side route.

**Why:** Issuing a new account cookie does not invalidate React Query's cached identity. A client-side transition can leave the old synthetic Discord username and incomplete setup state visible after a successful rename.

**How to apply:** Prefer full-page navigation after username changes. If replacing it with client-side navigation, explicitly refresh or clear every identity-scoped cache and test the resulting account identity, not just the navigation target.