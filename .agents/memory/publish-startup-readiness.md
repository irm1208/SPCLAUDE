---
name: Publish startup readiness
description: Production startup ordering required to prevent publish port timeouts during database bootstrap.
---

The production API must bind its configured port and expose its health endpoint before running migrations, seeding, template setup, cleanup, or remediation. For artifact services, Replit also probes the service mount path itself (for example `/api`), so that exact path must return 200 before the readiness gate. Normal API routes stay readiness-gated until bootstrap succeeds.

**Why:** Production database locks can make idempotent bootstrap work exceed the publisher's port-open timeout. Waiting to call `listen` makes a healthy build appear to have never opened its port. A separate `/api/healthz` endpoint is not enough when the artifact router probes `/api`.

**How to apply:** New startup prerequisites belong in the guarded bootstrap chain after the server binds. Keep both the explicit health endpoint and artifact mount-path health response outside the readiness gate; start background schedulers only after readiness.