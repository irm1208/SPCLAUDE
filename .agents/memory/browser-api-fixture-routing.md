---
name: Browser API fixture routing
description: Avoid intercepting frontend source modules when isolating browser tests from real API data.
---

Browser API fixtures must check that the URL pathname starts with `/api/`; a broad `**/api/**` glob also matches frontend source directories.

**Why:** An organiser source module lives under an `api` directory. A broad fixture returned JSON for that module, leaving the entire app blank with a JavaScript MIME-type error before any actual API requests.

**How to apply:** Route broadly only when the handler immediately passes through every request whose parsed pathname does not start with `/api/`. Keep this check when using fixture-only checkout tests so no real mutation is required.
