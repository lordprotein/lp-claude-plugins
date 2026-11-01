---
type: llm
weight: 1
---

The answer is unit tests (not E2E) for formatPrice: the happy path for both currencies, rounding, and the error cases (negative, NaN, Infinity) with a specific assertion on the thrown error. Each test checks one behaviour with a concrete expected value; no mocks of the function itself.
