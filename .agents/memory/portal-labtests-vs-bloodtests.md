---
name: Portal lab-tests vs blood-tests sections
description: Two distinct CustomerPortal sections that are easy to conflate when wiring dashboard navigation.
---

# `blood-tests` vs `lab-tests` are DIFFERENT portal sections

CustomerPortal's `Section` union has both `"blood-tests"` and `"lab-tests"`. They are NOT synonyms:

- `blood-tests` → the member's own **blood work** (upload & analyse bloodwork results). The dashboard "Lab Tests" KPI stat card counts `bloodTestCount` and navigates here — a pre-existing label quirk.
- `lab-tests` → **product CoA / lab reports** (Janoshik/Uzorak certificates). The global search "Lab Tests" group (fed by `useListLabTests`) and any "lab reports" nav should target this.

**Why:** Wiring a menu/search item to the wrong one silently sends users to the unrelated feature; I shipped a menu with two identically-labelled "Lab tests" items pointing at different sections.

**How to apply:** When adding dashboard nav/search/menu items, label by destination — use "Blood tests" for `blood-tests` and "Lab tests"/"Lab reports" for `lab-tests`. Don't assume the KPI label matches the section name.
