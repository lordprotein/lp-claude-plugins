---
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
timeout_seconds: 600
---

Сделай ревью этого кода перед мержем:

```ts
import { db } from "./db";

export async function findUser(req: { query: { name: string } }) {
  const rows = await db.query("SELECT * FROM users WHERE name = '" + req.query.name + "'");
  return rows[0].email;
}
```
