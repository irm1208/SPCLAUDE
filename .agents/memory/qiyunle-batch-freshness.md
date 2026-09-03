---
name: Qiyunle batch freshness
description: Rules for mapping newly dated Qiyunle codes and choosing the batch shown in wholesale ordering.
---

New Qiyunle inventory codes that differ only by a trailing batch-date suffix inherit the existing product mapping when that base code maps to exactly one product. Ambiguous bases remain unmapped. The wholesale catalogue chooses the most recent positive-stock dated batch first, using stock only to break equal-date ties.

**Why:** Qiyunle creates a new inventory code for each batch. Treating each date as a new product left fresh batches unmapped whenever AI mapping was unavailable, while stock-first selection could intentionally display an older batch.

**How to apply:** Preserve deterministic base-code carry-forward before any AI mapping. Interpret far-future MMDD suffixes as the previous year around year rollover, and never infer a product when historical mappings for the same base disagree.