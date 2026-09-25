# Group-buy product import extraction and review

## Goal

Make product names and prices import reliably from files in the live group-buy organiser Products tab and the admin group-buy Products panel.

## Current behavior

- The organiser CSV importer assumes fixed column order and converts missing or unreadable prices to `0`.
- The organiser AI import accepts PDFs and images, but a missing extracted price also becomes `0`.
- The admin group-buy importer accepts simple three-column CSV or pasted CSV text. It preserves valid prices but does not support Excel or document uploads.
- Both save paths require a vendor and already enforce their respective organiser/admin access checks.

## Supported files

- CSV and TSV
- Excel `.xlsx`
- PDF and common raster images (JPEG, PNG, WebP, GIF)
- Word `.docx`
- Legacy `.xls` and `.doc` files are out of scope; users must convert them first.

## Extraction and price handling

- Use one shared extraction and normalization layer for both import screens.
- Parse CSV/TSV and `.xlsx` deterministically, including quoted fields, reordered columns, and common header names for product, price, and vendor.
- Use AI extraction for PDFs, images, and `.docx`; extract `.docx` text before sending it for interpretation.
- Return normalized rows with a required name, a price that may be unresolved, and a vendor that may be unresolved, plus optional category, size, and stock when present.
- Normalize explicit currency symbols and standard thousands/decimal formatting, but do not perform foreign-exchange conversion.
- Never turn an absent, malformed, or ambiguous price into zero. Flag it in the preview and require correction or row removal before import.

## Review and save behavior

- Both screens show an editable preview before saving; no products are written during extraction.
- The preview allows editing or removing rows and visibly marks missing required name, price, or vendor.
- Import stays disabled until every retained row has valid required fields. Organiser vendor restrictions remain enforced by the server.
- Preserve the existing role-specific save paths and authorization: admin imports remain admin-only; organiser imports remain restricted to the owning group buy and allowed vendors.
- After confirmation, refresh the product list and show the import result. If saving fails, keep the preview and show the error rather than discarding extracted data.
- Keep the admin panel's paste-CSV option.

## File limits and errors

- Limit files to 20 MB decoded, consistent with the current organiser file extraction endpoint.
- Reject unsupported, unreadable, empty, or over-limit files with a clear message and make no product changes.
- If AI cannot determine a price clearly, return an unresolved price for review; do not guess or silently omit the row.

## Verification

- Unit tests cover quoted CSV fields, reordered/header-mapped columns, currency symbols and separators, XLSX cell extraction, and missing or malformed prices.
- Route tests cover organiser ownership, admin authorization, supported file types, and extraction responses without saving products.
- UI tests cover both file pickers, preview editing/removal, blocked confirmation for unresolved required values, correct row payloads, and errors that preserve the preview.
- Run the focused API and web tests, API compile, and web production build.