---
name: Mockup sandbox verification & presentArtifact id
description: How to truly verify a mockup renders, and how to find the artifactId presentArtifact needs.
---

# Verifying mockup-sandbox previews

**A 200 on the preview PAGE url does not mean the component compiled.** `GET /__mockup/preview/<folder>/<Component>` serves the static HTML shell and returns 200 even when the component's `.tsx` module has a syntax/compile error (the error only surfaces when the browser loads the module and Vite returns 500 for it, painting an error overlay).

**How to actually verify:** curl the transformed MODULE url — `GET /__mockup/src/components/mockups/<folder>/<Component>.tsx` — and require HTTP 200. Or screenshot the frame. Do this for EVERY variant, not just a couple; broken frames are invisible until checked and a Vite error overlay bleeds across the whole canvas.

**Why:** a DESIGN subagent once wrote literal backslash-escaped backticks (`\`...\``) into a `style={{ width: ... }}` template literal — a heredoc/escaping leak. Page url returned 200, module url returned 500, and it shipped to the canvas broken. Also watch for `Math.random()` in mockups (non-deterministic widths re-roll every render) — prefer a deterministic expression like `((i * 7) % 4) + 1`.

# Check iframe `url` after DESIGN subagents finish

DESIGN subagents can set `state: "live"` + `componentPath` on their canvas iframe but leave `url` EMPTY — the user then sees frames that "aren't loading" even though the modules compile fine. After all subagents complete, `getCanvasState()` and verify every mockup iframe has a non-empty `url`; if blank, patch it yourself with an `update` action (`https://<dev-domain>/__mockup/preview/<folder>/<Component>`).

# presentArtifact needs an artifactId

`presentArtifact({ artifactId, shapeIds })` fails without `artifactId`, and the id is NOT the slug (`"mockup-sandbox"` is rejected). Each project's artifacts have opaque ids. Discover them: call `presentArtifact` with any wrong id and read the thrown error's `Available artifacts: [{id,title}, ...]` list — the mockup sandbox appears there titled **"Component Preview Server"** with a random id. Use that id.
