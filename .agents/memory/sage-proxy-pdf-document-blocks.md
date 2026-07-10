---
name: Sage/Claude proxy silently drops PDF document blocks
description: Anthropic-format "document" content blocks are not honored by the Sage proxy; PDFs must be rasterized to an image before sending.
---

The Sage AI proxy (`sage-ai.ts` → `SAGE_PROXY_BASE_URL`/`v1/messages`) accepts a request body containing a valid Anthropic `{ type: "document", source: { type: "base64", media_type: "application/pdf", data } }` content block with no error, but the model responds as if no attachment was sent at all (e.g. "I don't see any document attached to your message"). Verified empirically across two working models (`claude-opus-4-7`, `claude-sonnet-4-5-20250929`) with a real, valid, text-readable PDF — same negative result both times, so the block is being dropped/ignored upstream in the proxy, not a model-specific limitation.

**Why:** this proxy layer evidently doesn't forward or translate the `document` block type to the underlying Claude API (or the underlying account/tier doesn't support it), even though `image` blocks work fine and the request otherwise validates.

**How to apply:** any pipeline sending a PDF to Claude through this proxy must rasterize it to an image first (e.g. `pdftoppm -png -singlefile -f 1 -l 1` from poppler-utils) and send that as an `image` content block instead of relying on native `document` support. This was fixed in `gemini-lab-extract.ts`'s `rasterizePdfFirstPage()`/`toClaudeContentParts()` for the Janoshik/Uzorak lab-cert extraction pipeline. Only the first page is rasterized (acceptable fidelity loss since these certs are single-page); a genuinely multi-page PDF would lose pages 2+. `poppler-utils` must be present in both the dev Nix env and the Autoscale deployment image (added via `installSystemDependencies`, not manual `.replit`/`replit.nix` edits) or this silently degrades to metadata-only fallback with no purity data in production.
