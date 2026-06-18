---
name: Lab-test list endpoints must exclude pdfBlob
description: Why list/bulk lab-test queries must use explicit column projection that omits pdfBlob
---

# Lab-test list endpoints must never return pdfBlob

Any list/bulk endpoint over `lab_tests` (e.g. public `GET /api/lab-tests`, admin
`GET /api/admin/lab-tests/pending`) must use an **explicit `.select({...})`
projection that omits `pdfBlob`** — never a bare `db.select()`.

**Why:** `pdfBlob` holds a base64 WebP of the full certificate image (~100KB+ each).
A bare `.select()` returns it for every row. Once all lab tests have stored blobs
(e.g. after a bulk reimport), the list response explodes — observed ~105MB for 894
rows at `?limit=1000` — and the frontend fetch silently fails (swallowed by an empty
`catch{}`), so the Lab Reports page (`/tests`) renders nothing. Explicit projection
dropped the same response to ~647KB.

**How to apply:** The frontend never reads `pdfBlob` from list payloads — certificate
images/PDFs are loaded per-record via `GET /lab-tests/:id/proxy` and `/preview`
(true for both the public `LabTests.tsx` page and the admin `LabTestsTab.tsx` review
UI). So excluding `pdfBlob` from lists is always safe. Single-record `GET
/lab-tests/:id` may still return it. When adding a new lab-test list/aggregate
endpoint, project columns explicitly and leave `pdfBlob` out.
