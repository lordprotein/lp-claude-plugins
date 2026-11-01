---
name: e2e
description: "Generate or review E2E tests only: full user journeys through a real browser. Generates tests from feature analysis, reviews for antipatterns and flakiness. Not for unit or integration tests."
---

# E2E Test Expert

## Overview

Generate high-quality E2E tests or review existing tests using industry best practices. Works in two modes:

- **Mode 1: Generate E2E Tests** — analyze application flows and produce comprehensive end-to-end tests
- **Mode 2: Review E2E Tests** — evaluate existing E2E tests for quality, flakiness, and antipatterns

Default to **Generate** mode unless the user explicitly asks to review existing tests or the input is clearly test code.

### Workflow loading

Required: load the workflow of the selected mode and follow it step by step. Do not load the other one unless an edge case switches modes.

- **Generate** → `references/generate-workflow.md`
- **Review** → `references/review-workflow.md`
- **Mixed test and production code** → load both: Review for the test files, Generate for the production files

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
