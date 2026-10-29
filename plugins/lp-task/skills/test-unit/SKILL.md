---
name: test-unit
description: "Write ideal unit tests and review existing ones. Focused exclusively on unit testing — tests one unit in isolation. Not for integration or E2E tests. Two modes: generate new tests from code analysis, or review existing tests for antipatterns and quality issues."
---

# Unit Test Expert

## Overview

Generate high-quality unit tests or review existing tests using industry best practices. Works in two modes:

- **Mode 1: Generate Tests** — analyze code and produce comprehensive tests
- **Mode 2: Review Tests** — evaluate existing tests for quality, coverage, and antipatterns

Default to **Generate** mode unless the user explicitly asks to review existing tests or the input is clearly test code.

### Workflow loading

Required: load the workflow of the selected mode and follow it step by step. Do not load the other one unless an edge case switches modes.

- **Generate** → `references/generate-workflow.md`
- **Review** → `references/review-workflow.md`
- **Fixing or removing existing tests broken or made obsolete by code changes** (e.g. from `/lp-task:do`) → `references/review-workflow.md`, section "Fix existing tests"
- **Mixed test and production code** → load both: Review for the test files, Generate for the production files

### Scope

This skill is focused **exclusively on unit testing**:
- Tests **one unit in isolation** (function, class, component)
- Dependencies are mocked, stubbed, or faked
- No E2E tests, no full integration tests spanning multiple real services
- "Integration" within unit scope is acceptable: e.g., testing a component with its simple presentational children, or a service with an in-memory repository

### Questions to the user

Every question to the user (scope, confirmation, what to fix) is asked through `AskUserQuestion` (native select), never as plain text.

## Severity Levels

| Level | Name | Description | Action |
|-------|------|-------------|--------|
| **P0** | Critical | False confidence — test passes but doesn't verify correctness | Must fix immediately |
| **P1** | High | Major quality issue — fragile, over-mocked, missing critical coverage | Should fix before merge |
| **P2** | Medium | Maintainability concern — readability, naming, structure | Fix in this PR or follow-up |
| **P3** | Low | Style or minor suggestion | Optional improvement |

## Antipattern Detection Table

Used by the Generate self-check and by "Fix existing tests". Review mode loads the full `references/antipatterns-checklist.md` on top of it.

| Antipattern | Key signal (must be absent) | Severity | Fix |
|-------------|-----------------------------|----------|-----|
| The Liar | No meaningful assert, only "not null" / "doesn't throw", asserting a stub's own return value | P0 | Assert a specific expected outcome |
| Shared Mutable State | Tests affect each other, order matters, class/module state mutated | P0 | Fresh state per test, reset in setup |
| The Giant | Multiple Acts, many unrelated asserts | P1 | One behavior per test |
| The Mockery | Mock setup > test logic, mocking the SUT or value objects, chained mock returns | P1 | Real in-process objects, mock only unmanaged deps |
| The Inspector | Private fields/methods, reflection | P1 | Public API only, extract complex private logic |
| Fragile Tests | Breaks on refactor: call sequences, internal structures, internal collaborators mocked | P1 | Assert outcomes, not call order |
| Ice Cream Cone | Mostly E2E, few unit tests (suite level) | P1 | Push logic into units |
| The Slow Poke | sleep() or real I/O | P2 | Inject clocks, fakes, <100ms per test |
| Second Class Citizen | Copy-paste, magic values, no helpers, dead tests | P2 | Helpers, builders, clear names |
| Conditional Logic | if/for/try in test body | P2 | Separate tests or parameterized rows |
| 100% Coverage Trap | Tests for getters, DTOs, one-line delegations, constants | P3 | Delete, test real logic |
