---
name: App Storage bucket readiness
description: Verify Replit App Storage is attached before declaring uploads functional.
---

Constructing the `@replit/object-storage` Client is not a readiness check. Its default-bucket initialization runs asynchronously; a constructor-only probe can report success immediately before an unhandled “A bucket name is needed” failure.

**Why:** The SDK needs a default App Storage bucket associated with the workspace or an explicitly configured bucket ID. Mocked upload tests and successful API compilation cannot establish that the bucket is available at runtime.

**How to apply:** Before declaring a storage-backed feature ready, confirm a bucket is attached in the Project Editor and await a harmless SDK operation in the relevant environment. If a bucket was just attached, restart the canonical app workflow first so its environment is refreshed. Do not substitute constructor success for an awaited check.