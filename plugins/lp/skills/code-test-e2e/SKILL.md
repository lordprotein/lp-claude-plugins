---
name: code-test-e2e
description: "Generate or review E2E tests only: full user journeys through a real browser. Generates tests from feature analysis, reviews for antipatterns and flakiness. Not for unit or integration tests."
---

# E2E Test Expert

## Overview

Generate high-quality E2E tests or review existing tests using industry best practices. Works in two modes:

- **Mode 1: Generate E2E Tests** — analyze application flows and produce comprehensive end-to-end tests
- **Mode 2: Review E2E Tests** — evaluate existing E2E tests for quality, flakiness, and antipatterns

Default to **Generate** mode unless the user explicitly asks to review existing tests or the input is clearly test code.

### Scope

This skill is focused **exclusively on E2E testing**:
- Tests **full user journeys** through a real browser
- Verifies **critical business flows** end-to-end
- External services mocked at **network level only**
- No unit tests, no component tests, no pure API tests
- "Integration" within E2E scope is acceptable: e.g., testing a multi-step checkout that spans multiple pages

## Severity Levels

| Badge | Level | Description | Action |
|-------|-------|-------------|--------|
| 🔴 | **Critical** | False confidence (test passes but doesn't verify outcome), flaky tests (non-deterministic pass/fail), shared test data (tests pollute each other) | Must fix immediately |
| 🟠 | **High** | sleep()/hardcoded waits, test order dependency, UI login in every test, fragile selectors (CSS/XPath), missing critical flow coverage, no Page Objects | Should fix before merge |
| 🟡 | **Medium** | Readability, naming, poor test organization, environment-specific tests | Fix in this PR or follow-up |
| 🟢 | **Low** | Style, minor suggestions | Optional improvement |

---

## Mode 1: Generate E2E Tests

### 0) Determine test scope

Required, before preflight.

- Analyze the application and determine which flow categories are present:
  - **Critical user journeys** — auth, checkout, payment, data creation/deletion
  - **Core feature flows** — main CRUD operations, search, navigation
  - **Cross-page workflows** — multi-step wizards, onboarding, settings
- **Ask the user** (multiselect) which types of E2E tests to generate:
  - E2E tests for critical user journeys
  - E2E tests for core feature flows
  - E2E tests for cross-page workflows
- If the application clearly belongs to only one category, still confirm with the user before proceeding.
- Generate only the selected categories — do NOT generate tests for unselected categories.

### 1) Preflight context

- Use `git status -sb`, `git diff --stat`, and `git diff` to scope changes. If user specifies features/pages, analyze those instead.
- Identify the E2E test framework (Playwright, Cypress, Selenium, etc.) and configuration.
- Search for existing E2E tests (`rg -g "*e2e*" -g "*spec*" -g "*test*" --files`) to discover:
  - Test directory structure and file naming conventions
  - Page Objects or abstractions in use
  - Fixtures, helpers, auth setup patterns
  - Base URL, environment config
- Search for existing Page Objects/abstractions.
- Identify authentication mechanism (API-based, UI-based, storage state).

**Edge cases:**
- **No E2E framework found**: Ask user about preferred framework or propose Playwright.
- **No changes**: If `git diff` is empty, ask which features/flows to test.
- **Large scope**: Summarize features first, ask user to prioritize.
- **Test files in diff**: Switch to Mode 2 for test files, Mode 1 for production files.

### 2) Classify flows (E2E Flow Matrix)

Required: classify every flow before generating tests. List the user-facing flows, rate each on **business criticality** x **flow complexity**, apply the cell, then check risk tags.

| Criticality \ Complexity | Low | Medium | High |
|--------------------------|-----|--------|------|
| **Critical** | Core CRUD: few focused tests | **Critical journeys, the sweet spot**: test thoroughly (happy + sad + edge) | System integration: key happy paths, supplement with monitoring |
| **Important** | Happy path only | Happy + primary sad paths | Happy path + monitoring/alerting |
| **Nice-to-have** | Skip E2E entirely | Skip or single smoke test | Contract tests instead of E2E |

**Risk tags**: `PAYMENT` (money movement, billing, subscriptions), `AUTH` (authentication, authorization, sessions), `DATA_INTEGRITY` (create, mutate or delete with no undo: bulk delete, import, merge), `PII` (personal data: profile, export, consent), `COMPLIANCE` (GDPR, HIPAA, SOX: audit trail, retention).

Decision rules, in order:
1. Any risk tag overrides the matrix: E2E required (at minimum happy path), even for a nice-to-have flow. Multiple tags = higher priority; risk-tagged flows are written first.
2. Critical x Medium is always the sweet spot for E2E investment.
3. Nice-to-have without risk tags: skip E2E, recommend unit/integration instead.
4. High complexity or cross-service: contract tests + selective E2E for key paths.
5. When in doubt, write fewer, stronger tests. If a bug can be caught by a cheaper test type, use that type.
6. Budget: E2E is 5-10% of all tests. If the total exceeds it, cut from the bottom-right of the matrix.

- Report classification to user before generating tests.
- Optional: load `references/e2e-testing-principles.md` only to justify E2E vs lower-level tests (four pillars, pyramid, FIRST, signs of too many/few E2E tests).

### 3) Determine scenarios

Required: load `references/user-flow-testing.md` (scenario identification, budget per flow).

- For each classified flow, identify:
  - **Happy path**: The primary successful user journey — always first
  - **Critical sad paths**: Payment failure, auth rejection, data validation failure
  - **State transitions**: Multi-step navigation, back/forward, resume after interruption
  - **Edge conditions**: Empty states, maximum data, concurrent access
- Prioritize: revenue-impacting first, data-integrity second, user-blocking third.
- Limit: 3-8 scenarios per flow. E2E tests are expensive — be selective.

### 4) Generate tests

Required before writing test code: load `references/e2e-test-design-patterns.md` (POM, selectors, auth). Also load, only when it applies:
- `references/network-and-api-handling.md`: the flow calls external/third-party services, GraphQL or WebSocket, or needs error simulation or clock control
- `references/waiting-and-synchronization.md`: animations, polling, slow/async operations, or timeout tuning
- `references/test-data-management.md`: test data setup needed
- `references/accessibility-in-e2e.md`: accessibility checks selected

Apply these rules:

**Structure:**
- Follow AAA pattern adapted for E2E: Arrange (navigate + API setup) → Act (UI interactions) → Assert (visible outcome)
- Use Page Object Model for UI abstraction — tests read as user stories
- One user flow per test — never mix unrelated journeys
- No conditional logic in tests (no if/for/try-catch)
- Group tests by feature/flow using describe/context

**Selectors (priority order):**
- role > label > text > placeholder > test-id > NEVER css/xpath (full rules in design patterns)
- Document selector strategy choice in Page Objects

**Naming:**
- Use project's existing naming convention if detected
- Otherwise: describe the user journey, not implementation
- Format: `test_[user_action]_[expected_outcome]` or `should [describe user journey]`
- Use domain language: "checkout", "register", not "click button then fill form"

**Authentication:**
- ONE UI login test — verifies the login flow itself
- ALL other tests: programmatic login (API call → token → inject into storage/cookies)
- Use storage state reuse across tests in same auth context
- Multi-role: create fixtures per role (admin, user, guest)

**Network handling:**
- Mock ONLY external third-party services at network level
- NEVER mock your own backend — E2E means end-to-end
- Wait for network responses before assertions — never assume timing

**Wait strategy:**
- NEVER use sleep()/wait(ms)/hardcoded delays
- Use framework's auto-waiting capabilities
- Use explicit wait-for-condition: wait for text, element, URL change, network idle
- Set reasonable timeouts (not too short, not too long)

**Typing (TypeScript / typed languages):**
- Always use real types from the project — import and reuse existing interfaces, types, enums
- If the real type is not found — use `unknown`, never `any`
- `any` is forbidden unless there is absolutely no other option

**Data setup:**
- Prefer API-based setup in beforeEach (create test data via API)
- Each test manages its own data — no shared mutable test data
- Clean up in afterEach via API calls
- Use unique identifiers (UUID) to prevent data collision

### 5) Self-check against antipatterns

Required: load `references/e2e-antipatterns-checklist.md` and run every check below for each generated test before output:
  - [ ] Not a False Prophet — has meaningful visible-outcome assertions
  - [ ] Not a Sleeper — no sleep()/hardcoded waits
  - [ ] Not a Chain Gang — tests are independent, run in any order
  - [ ] Not a Greedy Test — focused on one flow
  - [ ] Not a CSS Sniper — uses accessible selectors
  - [ ] Not a UI Typist — programmatic auth (except the one login test)
  - [ ] Not a Data Leaker — isolated test data
  - [ ] Not a Network Optimist — handles error scenarios
- If any check fails, fix the test before outputting.

### 6) Output format

```markdown
## E2E Test Generation Summary

**Scope**: X flows analyzed. **Tests generated**: Z across N flows

## Flow Classification

> Required: every analyzed flow is listed here. Risk tags appear only in this table.

| Flow | Criticality x Complexity | Risk Tags | Strategy |
|------|--------------------------|-----------|----------|
| `Checkout flow` | Critical x Medium | PAYMENT, DATA_INTEGRITY | Full E2E: happy + sad paths |

## Page Objects

### [PageName]Page

[Page Object code with high-level methods]

## Generated Tests

### [flow_name.e2e.ext]

[Test code with comments explaining the scenario for non-obvious cases]

## Coverage Gaps

(optional, omit if none) Flows left uncovered and why: skipped nice-to-have, better served by monitoring, pushed to unit/integration.

Next: run the tests, extract more Page Objects, add axe-core or visual regression checks?
```

**Important**: Do NOT write test files to disk until user explicitly confirms. Present the generated tests in the output first, then ask how to proceed.

---

## Mode 2: Review E2E Tests

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

