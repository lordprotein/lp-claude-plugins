---
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
timeout_seconds: 600
---

Объясни, как работает этот код и зачем тут AbortController:

```ts
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/items?q=${query}`, { signal: controller.signal })
    .then((r) => r.json())
    .then(setItems)
    .catch((e) => { if (e.name !== "AbortError") setError(e); });
  return () => controller.abort();
}, [query]);
```
