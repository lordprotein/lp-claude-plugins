# Finding Format Template

## Per-finding structure

Each finding MUST follow this exact structure:

```
N. Brief title

**Status:**
🔴 Critical

**Files:**
- `file.ts:42`
- `other.ts:15`

**Description:**
Explanation text.
```lang
problematicCode()
```

**Fix:**
Suggested fix text.
```lang
betterCode()
```

---

M. Next finding title

**Status:**
🟡 Medium
...
```

The `---` separator goes after each finding EXCEPT the last one in a category.

## Format rules

- **Only the finding title is numbered** (`1.`, `2.`, etc.). Labels (**Status:**, **Files:**, **Description:**, **Fix:**) are NEVER numbered — they are plain bold text
- Labels are NOT indented — they start at the beginning of the line (no leading spaces)
- Each label is on its own line; value starts on the **next** line (not on the same line as the label)
- **Between findings**: empty line → `---` → empty line → next finding. The last finding in a category does NOT have `---` after it
- Empty categories are **not rendered** (if no Security findings — no Security section)
- Numbering **restarts at 1 in each category**
- Within a category, findings are sorted by severity: 🔴 first, then 🟠, 🟡, 🟢
- Severity summary appears only in the Next Steps section (one line)
- Description MUST include actual code blocks showing the problematic fragment
- Fix MUST include a code block with the suggested change when applicable

## Common mistakes — DO NOT

```
WRONG — numbered labels:
1. Title
  2. Status:        ← WRONG: label must NOT have a number
  🔴 Critical
  2. Files:          ← WRONG: label must NOT have a number

WRONG — no separator between findings:
1. First finding
   **Fix:** ...
2. Second finding   ← WRONG: must have --- between findings

WRONG — value on same line as label:
**Status:** 🔴 Critical         ← WRONG: value must be on the next line
**Description:** Some text...   ← WRONG: value must be on the next line

WRONG — indented labels (causes markdown to nest them under the number):
1. Title
   **Status:**      ← WRONG: label must NOT be indented
   🔴 Critical

CORRECT:
1. Title

**Status:**          ← label at line start, no indentation
🔴 Critical
```

## Compact example

1. SQL injection via unsanitized input

**Status:**
🔴 Critical

**Files:**
- `api/users.ts:42`

**Description:**
User input passed directly to query without sanitization.
```ts
db.query(`SELECT * FROM users WHERE id = ${req.params.id}`)
```

**Fix:**
Use parameterized query.
```ts
db.query('SELECT * FROM users WHERE id = $1', [req.params.id])
```

Note: follow the same structure for all categories (Security, Architecture, Performance, Quality). Numbering restarts at 1 per category. Use `---` between findings within a category (not after the last one).