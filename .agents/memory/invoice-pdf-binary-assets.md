---
name: Invoice PDF binary assets
description: Constraints for generating branded PDFs with embedded images in the workspace
---

PDF streams containing compressed images must be assembled with `Buffer.concat` and explicit binary encodings, not by interpolating binary content into a UTF-8 string. The declared `/Length` must include any separator byte placed before `endstream`.

**Why:** String interpolation changed pound-sign bytes and an embedded logo stream length mismatch produced `pdftotext` warnings even though the PDF initially opened.

**How to apply:** When adding or changing embedded PDF assets, validate with both `pdfinfo` and `pdftotext`; resolve asset paths from both the workspace root and an artifact-root process working directory.