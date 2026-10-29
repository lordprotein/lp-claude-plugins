# Mode 2: Review Tests

## 1) Preflight context

- Collect existing test files: from `git diff --stat` (then `git diff -- <files>` for those files) or user-specified files.
- Identify test framework, assertion library, and project conventions.
- Read the corresponding production code to understand what's being tested.

**Edge cases:**
- **No test files found**: Inform user and offer (`AskUserQuestion`) to switch to Mode 1 (Generate).
- **Mixed test and production code in diff**: Review tests (Mode 2), generate tests for uncovered production code (Mode 1, load `references/generate-workflow.md`).

## 2) Evaluate against checklist

Required: load ALL THREE files below. Do not evaluate from memory alone.

- Load `references/test-review-checklist.md` for the full checklist.
- Load `references/antipatterns-checklist.md` for antipattern detection.
- Load `references/test-doubles-guide.md` for doubles assessment.

Required procedure, in this exact order, no skipped steps or merged findings:
1. **Scan for Liars** (P0) — meaningful assertions in every test?
2. **Check isolation** (P0) — shared mutable state?
3. **Check doubles usage** (P1) — over-mocking? mocking internals?
4. **Check fragility** (P1) — behavior or implementation verification?
5. **Check coverage quality** (P1) — critical paths tested?
6. **Check readability** (P2) — names, AAA structure, clarity
7. **Check speed** (P2) — unnecessary delays or real I/O?
8. **Check for trivial tests** (P3) — testing getters/constructors?

## 3) Assess severity

Assign severity to each finding using the severity levels defined in SKILL.md (P0-P3).

## 4) Output format

```markdown
## Test Review Summary

**Files reviewed**: X test files, Y test cases
**Overall assessment**: [APPROVE / REQUEST_CHANGES / COMMENT]
**Coverage quality**: [Good / Adequate / Insufficient]

---

## Findings

### P0 - Critical
(none or list)

### P1 - High
1. **[test_file:line]** Brief title
   - **Antipattern**: Which antipattern
   - **Problem**: What's wrong
   - **Impact**: Why it matters
   - **Fix**: Suggested correction with code example

### P2 - Medium
2. (continue numbering)

### P3 - Low
...

---

## Coverage Gaps

- [Business rules / paths not covered by any test]

## Positive Observations (optional, max 2 bullets, only when notable)

- [What's done well]

---

Найдено X (P0: _, P1: _, P2: _, P3: _).
```

Then, if there is at least one finding, ask via `AskUserQuestion`, header «Исправить», single select:
- «Все»
- «Только P0–P1»
- «Выбрать номера» — the user enters the finding numbers via Other (e.g. `1, 3, 5`); if they pick this option without numbers, ask for them
- «Ничего»

Skip the question when there are no findings.

**Important**: Do NOT implement any changes until user explicitly confirms. This is a review-first workflow.

When fixing, apply every rule from step 4 of `references/generate-workflow.md` to the changed tests (load it if not loaded) and re-run the Antipattern Detection Table from SKILL.md on each changed test.

---

## Fix existing tests

For existing unit tests that code changes broke or made obsolete (e.g. called from `/lp-task:do`). No step 0, no classification table, no full review of untouched tests.

1. Find the affected tests: run the tests of the changed modules, or match test files to the changed production files. Read the failing tests and the changed code.
2. For each affected test decide: **fix** (behavior kept, test needs the new API or data), **update** (behavior intentionally changed, the expectation follows the new behavior) or **remove** (the tested behavior no longer exists). Never weaken an assertion just to make a test pass.
3. Load `references/test-doubles-guide.md` if the fix touches mocks, stubs or fakes.
4. Output a short list: `test_file:line — fix / update / remove — why`, then ask via `AskUserQuestion`, header «Тесты»: «Применить» / «Выбрать номера» (via Other) / «Ничего».
5. After confirmation apply the changes following the rules from step 4 of `references/generate-workflow.md` (load it), run the Antipattern Detection Table from SKILL.md on each changed test, run the affected tests and report `X passed, Y failed`.
