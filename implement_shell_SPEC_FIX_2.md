# Shared shell final spec fix

Work only in `/home/amoney/UpdateSP`. Do not commit. Preserve unrelated files.
Use TDD.

The spec re-review found one remaining no-op control:

- `SetupWizard.tsx` always supplies `onBack`, but on the initial step its
  handler clamps `current` to zero. The enabled “Go back” button therefore does
  nothing. Omit the `onBack` prop when `current === 0`; supply the existing
  decrement callback only for later steps. `OrganiserTopbar` already renders
  Back conditionally when the handler exists.

Add a focused source contract, observe RED, implement the minimal fix, then run
the 11 shared-shell checks, targeted TypeScript, workspace/Peps theme tests and
`git diff --check`. Preserve the approved dashboard typography and all prior
responsive/accessibility fixes.
