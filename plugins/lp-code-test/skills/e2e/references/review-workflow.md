# E2E: Review workflow

Loaded by `SKILL.md` in Review mode. Severity levels are defined in `SKILL.md`.

### 1) Preflight context

- Collect existing E2E test files: from `git diff` or user-specified files.
- Identify E2E framework, configuration, and project conventions.
- Read the corresponding Page Objects and production code to understand what's being tested.
- Identify auth setup pattern in use.

**Edge cases:**
- **No E2E test files found**: Inform user and offer to switch to Mode 1 (Generate).
- **Mixed test and production code in diff**: Review tests (Mode 2), generate tests for uncovered flows (Mode 1).

### 2) Evaluate against checklist

Required: load all three, do not evaluate from memory: `references/e2e-test-review-checklist.md`, `references/e2e-antipatterns-checklist.md`, `references/waiting-and-synchronization.md`.

Follow this exact sequence for every review, without skipping steps or merging findings:
1. **Scan for False Prophets** (🔴 Critical) — meaningful visible-outcome assertions?
2. **Check flakiness risk** (🔴 Critical) — non-deterministic elements? race conditions?
3. **Check test isolation** (🔴 Critical) — shared test data? order dependency?
4. **Check wait strategy** (🟠 High) — sleep()? hardcoded delays? proper auto-waiting?
5. **Check selectors** (🟠 High) — CSS/XPath? accessible selectors?
6. **Check flow coverage** (🟠 High) — critical journeys tested? happy + sad paths?
7. **Check abstraction** (🟠 High) — Page Objects used? code duplication?
8. **Check test data** (🟠 High) — API-based setup? proper isolation? cleanup?
9. **Check readability** (🟡 Medium) — names describe user journeys? AAA structure?
10. **Check auth efficiency** (🟠 High) — programmatic login? storage state reuse?

### 3) Assess severity

Assign severity to each finding per the Severity Levels table above (per-antipattern severities are in the antipatterns checklist).

### 4) Output format

```markdown
## E2E Test Review Summary

**Files reviewed**: X test files, Y test cases. **Flows checked**: [checkout, registration, ...]
**Overall assessment**: [APPROVE / REQUEST_CHANGES / COMMENT]. **Flakiness risk**: [Low / Medium / High]. **Flow coverage**: [Good / Adequate / Insufficient]

## Findings

### 🔴 Critical
(none or list)

### 🟠 High

### 🟡 Medium

### 🟢 Low

> **Finding format** (one per issue, severity given by its section):
>
> N. **Brief title**: `test_file.ts:42`
>    Problem: [description or problematic code]
>    Fix: [suggested fix, code example when useful]

## Flakiness Risk Assessment

- [Sources of non-determinism, wait strategy issues, data isolation concerns]

## Coverage Gaps

- [Critical user journeys not covered by any E2E test]

## Positive Observations

(optional, max 2 bullets) [What's done well]

Found X issues (🔴 _, 🟠 _, 🟡 _, 🟢 _). Fix: all / only 🔴🟠 / numbers, comma-separated / nothing?
```

**Important**: Do NOT implement any changes until user explicitly confirms. This is a review-first workflow.

