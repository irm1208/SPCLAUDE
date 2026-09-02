---
name: Google Drive database backups
description: Production backup destination, lifecycle, and scheduling rules that prevent database and project-storage contention.
---

Production database backups must stream through gzip into a temporary `/tmp` file, upload to the dedicated Google Drive backup folder, and delete the temporary file only after Drive confirms the upload. Development servers do not run scheduled backups. Production waits 10 minutes after startup, and a PostgreSQL advisory lock prevents multiple instances from backing up simultaneously.

**Why:** immediate full dumps during application startup took nearly six minutes, pushed normal API requests into 30–289 second waits, and accumulated tens of gigabytes inside the project.

**How to apply:** preserve the upload-before-delete ordering, the advisory lock, delayed production schedule, and remote retention limit. On upload failure, retain the temporary compressed file for diagnosis rather than reporting a successful backup.