---
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
timeout_seconds: 600
---

Напиши юнит-тесты для этой функции (vitest):

```ts
export function formatPrice(value: number, currency: "USD" | "EUR"): string {
  if (!Number.isFinite(value) || value < 0) throw new Error("invalid price");
  const rounded = Math.round(value * 100) / 100;
  return `${rounded.toLocaleString("ru-RU")} ${currency === "USD" ? "$" : "€"}`;
}
```
