# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

**test-unit** — AI skill (Claude Code skill) for writing and reviewing unit tests. Language-agnostic, exclusively unit-level (one unit in isolation, dependencies mocked/stubbed/faked). Based on practices from Beck, Fowler, Khorikov, and Google.

Two modes:
- **Generate** (default) — analyze code, classify it, produce tests
- **Review** — evaluate existing tests for antipatterns and quality

## Architecture

```
SKILL.md              ← Main skill definition: workflow, rules, output formats
agents/agent.yaml     ← Agent interface config (display name, default prompt)
references/           ← Knowledge base loaded on-demand during skill execution
```

### Skill Execution Flow

The skill is invoked via `/lp-task:test-unit`. SKILL.md defines the entire workflow:

**Generate mode** (7 steps): Determine scope → Preflight → Classify code (Khorikov matrix) → Determine scenarios → Generate tests → Self-check antipatterns → Output

**Review mode** (4 steps): Preflight → Evaluate against checklist → Assess severity → Output

Steps marked «Required» in SKILL.md must load specific reference files before execution — this is enforced by the workflow, not optional.

### References (Knowledge Base)

Each reference file is loaded at specific steps, not all at once:

| File | Loaded When |
|------|-------------|
| `testing-principles.md` | Step 2, only if the category is ambiguous (the matrix lives in SKILL.md) |
| `business-logic-testing.md` | Step 3, only if business logic or utilities are selected |
| `test-design-patterns.md` | Step 4 (Generate tests) |
| `test-doubles-guide.md` | Step 4 (Generate) / Step 2 (Review) |
| `ui-component-testing.md` | Step 4, only if UI tests selected |
| `utility-and-hooks-testing.md` | Step 4, only if utility/hooks tests selected |
| `antipatterns-checklist.md` | Step 2 (Review mode only); Generate self-check uses the Detection Table in SKILL.md |
| `test-review-checklist.md` | Step 2 (Review mode only) |

### Key Concepts

- **Khorikov classification matrix** (domain model / UI / utility / trivial / controller / overcomplicated) drives which code gets tested and how
- **Severity levels** P0-P3: P0 = false confidence and shared mutable state, P1 = over-mocking/fragility, P2 = readability, P3 = trivial
- **Classical school by default**: real objects preferred, mocks only for unmanaged out-of-process dependencies
- **Confirmation-first**: never write test files to disk without user confirmation

## Editing Guidelines

- `SKILL.md` is the single source of truth for the skill workflow. All mandatory steps, output formats, and rules live here.
- `references/` files are the knowledge base. They are self-contained documents — each covers one topic fully.
- Keep content portable: examples and instructions must work in any project — use neutral placeholders (e.g. `acme`) instead of real project names, paths, domains or other identifying details
- `agents/agent.yaml` defines the agent interface only (display name, description, default prompt). Keep it minimal.
- When adding a new testing topic, create a new file in `references/` and add a loading instruction to the relevant step in SKILL.md.

## Важно
- Не делай вывод слишком громоздким, чтобы экономить токены на выводе
