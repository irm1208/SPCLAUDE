---
name: Group-buy stock scope
description: Organiser stock changes are group-only; bulk quantities refer to available kits.
---
Organiser stock edits within group-buy management must affect only the selected group buy, not the shared catalogue or other group buys.

**Why:** The user explicitly chose “Only this group buy.”

**How to apply:** Keep group allocations separate from catalogue stock. Bulk set/increase/decrease controls refer to available kits and preserve quantities already ordered. Label any total-allocation editor clearly because its number includes those ordered kits.

Bulk selection must submit explicit selected product IDs, including when all loaded products are selected.

**Why:** Expanding a client selection to server-side “all” could also change products added after the organiser reviewed the catalogue.

**How to apply:** Keep “select visible” and “select all” distinct, and clear selection when switching group buys.
