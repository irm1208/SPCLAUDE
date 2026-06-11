---
name: Uzorak bulk import fix
description: Why direct PDF download fails for uzorak.com and how to work around it via their Supabase API.
---

## The rule
Never attempt to fetch `uzorak.com/verify/*.pdf` directly. Always use the Supabase `get_public_order` RPC instead.

**Why:** Uzorak's server 302-redirects `/verify/X.pdf` → `/#/verify/X.pdf`. Node's `fetch()` follows this redirect, strips the hash fragment, hits `uzorak.com/` and gets HTML. The MIME check fails and extraction returns null. The SPA is client-side only; the server never serves the PDF at that path.

**How to apply:** In `gemini-lab-extract.ts`, `extractCoADataFromAnyUrl` has a Uzorak intercept at the top: detect `uzorak.com` hostname, extract the public ID (first `_`-delimited segment of the filename in `rawU.hash`, e.g. `FIQCM7` from `FIQCM7_ghk_xxx.pdf`), call `resolveUzorakContent(publicId)` via Supabase REST RPC, then pass the result to Gemini.

## Supabase lookup
- URL: `https://ipiswrksmjksygmntamq.supabase.co`
- Anon/publishable key: in `UZORAK_ANON_KEY` constant in `gemini-lab-extract.ts` (public client-side key from their JS bundle — safe to hardcode)
- RPC: `POST /rest/v1/rpc/get_public_order` with body `{ p_public_id: "FIQCM7" }`
- Response priority: `snapshot_base64` JPEG (top-level or per item) → `report_url` Google Drive PDF

## Google Drive download
`downloadTrustedFile()` converts Drive share/view URLs to `drive.google.com/uc?export=download&id=...` before fetching.
