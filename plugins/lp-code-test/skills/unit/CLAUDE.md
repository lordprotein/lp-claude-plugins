# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**unit** (plugin `lp-code-test`) — AI skill (Claude Code skill) for writing and reviewing unit tests. Language-agnostic, exclusively unit-level (one unit in isolation, dependencies mocked/stubbed/faked). Based on practices from Beck, Fowler, Khorikov, and Google.

Two modes:
- **Generate** (default) — analyze code, classify it, produce tests
- **Review** — evaluate existing tests for antipatterns and quality

## Architecture

```
SKILL.md              ← Entry point: modes, scope, severity, Detection Table, which workflow to load
agents/agent.yaml     ← Agent interface config (display name, default prompt)
references/           ← Mode workflows + knowledge base, loaded on demand during skill execution
```

### Skill Execution Flow

The skill is invoked via `/lp-code-test:unit`. SKILL.md picks the mode and loads only its workflow file:

**Generate mode** (`references/generate-workflow.md`): Determine scope → Preflight → Classify code (Khorikov matrix) → Scenarios plan + confirmation → Generate tests → Self-check antipatterns → Write and run (or show code)

**Review mode** (`references/review-workflow.md`): Preflight → Evaluate against checklist → Assess severity → Output → what to fix. Its section "Fix existing tests" is the short path for tests broken by code changes (used by `/lp-task:do`).

Steps marked «Required» must load specific reference files before execution — this is enforced by the workflow, not optional. All questions to the user go through `AskUserQuestion`.

### References (Knowledge Base)

Each reference file is loaded at specific steps, not all at once:

| File | Loaded When |
|------|-------------|
| `generate-workflow.md` | Generate mode; also when Review fixes tests |
| `review-workflow.md` | Review mode and "Fix existing tests" |
| `testing-principles.md` | Generate step 2, only if the category is ambiguous (the matrix lives in the workflow) |
| `business-logic-testing.md` | Generate step 3, only if business logic or utilities are selected |
| `state-and-concurrency-testing.md` | Generate step 3, only if the code has states/transitions or concurrency, idempotency, ordering |
| `test-design-patterns.md` | Generate step 4 |
| `test-doubles-guide.md` | Generate step 4 (skipped only for pure functions with no dependencies) / Review step 2 / Fix, if doubles are touched |
| `ui-component-testing.md` | Generate step 4, only if UI tests selected |
| `utility-and-hooks-testing.md` | Generate step 4, only if utility/hooks tests selected |
| `antipatterns-checklist.md` | Review step 2 only; Generate self-check and Fix use the Detection Table in SKILL.md |
| `test-review-checklist.md` | Review step 2 only |

### Key Concepts

- **Khorikov classification matrix** (domain model / UI / utility / trivial / controller / overcomplicated) drives which code gets tested and how
- **Severity levels** P0-P3: P0 = false confidence and shared mutable state, P1 = over-mocking/fragility, P2 = readability, P3 = trivial
- **Classical school by default**: real objects preferred, mocks only for unmanaged out-of-process dependencies
- **Confirmation-first**: Generate confirms the scenarios plan (code is shown only on request), Review and Fix confirm what to change; nothing is written to disk without confirmation

## Editing Guidelines

- `SKILL.md` + `references/*-workflow.md` are the source of truth for the skill workflow: mandatory steps, output formats and rules live there. Keep SKILL.md small, mode-specific content goes into the workflow files.
- `references/` files are the knowledge base. They are self-contained documents — each covers one topic fully.
- Keep content portable: examples and instructions must work in any project — use neutral placeholders (e.g. `acme`) instead of real project names, paths, domains or other identifying details
- `agents/agent.yaml` defines the agent interface only (display name, description, default prompt). Keep it minimal.
- When adding a new testing topic, create a new file in `references/` and add a loading instruction to the relevant step in SKILL.md.

## Важно
- Не делай вывод слишком громоздким, чтобы экономить токены на выводе
