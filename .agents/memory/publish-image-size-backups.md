---
name: Publish image size and local backups
description: Prevent Autoscale publish failures caused by local database backups and workspace metadata entering the deployment image.
---

Local SQL dumps, scheduled database backups, Git/worktree data, caches, attached debug assets, and agent/editor metadata must be explicitly excluded in the root `.replitignore`. A `.gitignore` entry alone is not sufficient protection for the Repl layer.

**Why:** a publish completed both API and frontend builds but failed while creating the Repl layer because the image exceeded 8 GiB. The workspace contained roughly 19 GiB of dev-only API backups plus several gigabytes of dumps and workspace metadata.

**How to apply:** keep all generated backup locations and root `*.sql` files in `.replitignore`. When this failure recurs, inspect the build tail for the image-size error and run a workspace disk-usage audit before changing build code.