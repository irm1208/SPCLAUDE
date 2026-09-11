---
name: Publish startup readiness
description: Production startup ordering required to prevent publish port timeouts during database bootstrap.
---

The production API must bind its configured port and expose its health endpoint before running migrations, seeding, template setup, cleanup, or remediation. Normal API routes stay readiness-gated until bootstrap succeeds.

**Why:** Production database locks can make idempotent bootstrap work exceed the publisher's port-open timeout. Waiting to call `listen` makes a healthy build appear to have never opened its port.

**How to apply:** New startup prerequisites belong in the guarded bootstrap chain after the server binds. Keep the deployment health endpoint outside the readiness gate; start background schedulers only after readiness.