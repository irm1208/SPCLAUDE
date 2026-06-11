---
name: git-rebase-stuck
description: Fix the Replit Git UI stuck in "Unsupported state: you are in the middle of a rebase" error. Use when the Replit Git panel shows this error, git rebase --continue says "no rebase in progress", or Sync Changes keeps failing with a merge conflict.
---

# Git Rebase Stuck — Replit Fix

## What Causes This

The Replit Git UI "Sync Changes" button runs `git pull --rebase <remote> main` under the hood. If there's a conflict (commonly in auto-generated files like `mockup-components.ts`), it creates a `.git/rebase-merge/` directory and stops. The user can't complete or abort the rebase through the UI, and `git rebase --continue` from the terminal says "no rebase in progress" due to Replit environment interference.

## Diagnosis

Check what's happening:

```bash
git status
ls .git/rebase-merge/
git remote -v
```

Note the remote name — in this project it is `snp123` (not `origin`).

## The Fix

Have the user paste this single line into their terminal:

```bash
git rebase --abort; git config pull.rebase false; git pull snp123 main
```

- `git rebase --abort` — clears any stuck rebase state
- `git config pull.rebase false` — permanently switches Replit's sync from rebase to merge (prevents recurrence)
- `git pull snp123 main` — completes the sync using merge instead

## If a Merge Conflict Appears After the Pull

The agent resolves conflicts in the files directly (edit out the `<<<<<<<`/`=======`/`>>>>>>>` markers), then gives the user these commands to finish:

```bash
git add Product-Landing-Page/artifacts/peps-anonymous/src/pages/Lookup.tsx Product-Landing-Page/artifacts/mockup-sandbox/src/.generated/mockup-components.ts && git merge --continue
```

For the `mockup-components.ts` auto-generated file specifically, if you just want to take one side:

```bash
git checkout --theirs Product-Landing-Page/artifacts/mockup-sandbox/src/.generated/mockup-components.ts
git add Product-Landing-Page/artifacts/mockup-sandbox/src/.generated/mockup-components.ts
git merge --continue
```

## Permanent Prevention — .gitattributes

`mockup-components.ts` is auto-generated and always conflicts. The permanent fix is a `.gitattributes` rule using the `union` merge strategy, which combines both sides automatically instead of conflicting. This file already exists at `Product-Landing-Page/.gitattributes`:

```
Product-Landing-Page/artifacts/mockup-sandbox/src/.generated/mockup-components.ts merge=union
```

If this file is missing or the conflicts keep happening on `mockup-components.ts`, recreate it at `Product-Landing-Page/.gitattributes` with that content.

## Why the Agent Can't Fix This Alone

The Replit sandbox blocks all agent writes to `.git/` (config, rebase-merge files, lock files). The user must run the commands themselves from the terminal. The agent cannot run: `git merge`, `git rebase --continue/abort`, `git config`, or `rm` anything inside `.git/`.

## After the Merge — Pushing to GitHub

There is no `origin` remote. The user's GitHub remote is `snp123` → `https://github.com/Spinoza789/UpdateSP`.

After completing the merge, push with:

```bash
git push snp123 main
```

If that is rejected as non-fast-forward (because the merge commit diverged from the remote), force push:

```bash
git push snp123 main --force
```

This is safe — the local branch already contains all the merged remote changes.

## Project-Specific Notes

- Remote name: `snp123` → `https://github.com/Spinoza789/UpdateSP`
- Replit backup remote: `gitsafe-backup`
- `mockup-components.ts` is auto-generated — safe to use `--theirs` or `--ours` without losing real work
- `Lookup.tsx` conflicts: always keep HEAD (our version has the FormData upload fix)
