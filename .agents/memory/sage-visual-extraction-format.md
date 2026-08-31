---
name: Sage visual extraction format
description: Required image-message and JSON-response handling for GPT-5.5 lab extraction through Nuoda and Zhihuiai.
---

Sage visual extraction uses GPT-5.5 through OpenAI-compatible Nuoda/Zhihuiai endpoints. Image content must be serialized as OpenAI `image_url` data-URI parts; collapsing structured content to text silently removes the report while leaving the request otherwise valid. PDFs must be rasterized before sending because native PDF document blocks are not reliable through these proxies.

Zhihuiai can prepend `<think>...</think>` reasoning even in JSON mode. Extraction parsers must remove reasoning/code-fence wrappers and isolate the returned JSON object or array before parsing.

**Why:** a live lab extraction failed in two silent layers: the adapter dropped the rasterized report image, then GPT-5.5's valid JSON was rejected because a reasoning wrapper preceded it. A real stored certificate succeeded only after both boundaries were fixed.

**How to apply:** whenever adding a Sage vision caller, verify the outgoing request contains `image_url` content and smoke-test with a real, reasonably sized stored report. Reuse the tolerant Sage JSON parser for structured GPT-5.5 output.