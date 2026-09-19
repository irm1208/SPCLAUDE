---
name: Invoice PDF binary assets
description: Constraints for generating branded PDFs with embedded images in the workspace
---

PDF streams containing compressed images must be assembled with `Buffer.concat` and explicit binary encodings, not by interpolating binary content into a UTF-8 string. The declared `/Length` must include any separator byte placed before `endstream`.

Native image processors must not be imported at API module scope. Load them lazily inside logo rendering and fall back to the text logo if unavailable.

**Why:** String interpolation changed pound-sign bytes and an embedded logo stream length mismatch produced `pdftotext` warnings even though the PDF initially opened. A top-level native image import also crash-looped the artifact deployment before the API could bind its port.

**How to apply:** When adding or changing embedded PDF assets, validate with both `pdfinfo` and `pdftotext`; resolve asset paths from both the workspace root and an artifact-root process working directory. Test the compiled API with the native image module unavailable and require `/api/healthz` to return 200.