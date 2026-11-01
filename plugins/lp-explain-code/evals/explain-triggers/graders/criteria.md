---
type: llm
weight: 1
---

The explanation (in Russian) says that the effect reruns on every query change, that the cleanup aborts the previous request so a stale response cannot overwrite newer items (race condition), and that AbortError is ignored because it is the expected result of the abort. It explains, it does not review or rewrite the code.
