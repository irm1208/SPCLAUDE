# Supplier-batch addition timing correction

Approved scope:
- Identify whole orders appended after a batch's preparation from recorded append
  events, separately from customer quantity increases.
- Advertise quantity increases only when evidenced after preparation. Earlier
  edits must not flag already-purchased quantities as batch additions.
- Show the append timestamp and current allocated kits for each late order.
- Reuse the protected whole-order correction with these orders preselected, a
  user-selected destination, explicit acknowledgement and unchanged payments.
- Collapse released/undone batches into a separate history section. Preserve all
  records and do not perform live allocation moves on the user's behalf.

Verification:
1. Failing tests for timing classification and late-order UI selection.
2. Implement derived API fields and UI using existing move endpoints.
3. Run classification, move/undo and manager interaction regression tests.
4. Build both artifacts, restart canonical workflow, inspect available preview.
