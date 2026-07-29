# Quality fix 2: approved selectors and visual contract

Work only in `/home/amoney/UpdateSP`. Do not commit. Preserve unrelated files.

The second code-quality review found three remaining issues. Fix only these,
using TDD (write/extend tests and observe the expected failure before the
production or helper change):

1. `approved-selectors.ts` accepts malformed timestamp suffixes because its
   date matcher validates only a prefix. Define and enforce a complete,
   deterministic accepted grammar for either `YYYY-MM-DD` or a valid ISO-like
   datetime beginning `YYYY-MM-DDT...`. Inputs such as `2026-03-01T`,
   `2026-03-01Trash`, and `2026-03-01Tgarbage` must be rejected. Retain support
   for the real organiser timestamps. Add exact regression tests.
2. `approved-workspace.test.ts` must prove each approved class hook is on the
   returned component root element, not any nested/dead JSX `className`.
   Strengthen the TypeScript AST assertion accordingly without brittle regex.
3. Add an exact `stock: null` allocation case exercising the unlimited-stock
   branch.

Verification:

- focused selector tests must pass;
- targeted strict TypeScript for the affected files must pass;
- combined approved-workspace command should retain only the intentional
  not-yet-built UI/CSS failures;
- `git diff --check` must pass.

Report DONE or DONE_WITH_CONCERNS with exact commands/results.
