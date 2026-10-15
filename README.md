# LP Code Test Unit

A comprehensive **unit testing** skill for AI agents. Focused exclusively on unit tests — one unit in isolation, dependencies mocked. Generates ideal tests and reviews existing ones using best practices from Kent Beck, Martin Fowler, Vladimir Khorikov, and Google.

## Installation

```bash
npx skills add lordprotein/lp-code-test-unit
```

Or via Agent Skills:

```bash
npx agent-skills-cli install @lordprotein/lp-code-test-unit
```

## Features

- **Two Modes** — Generate new tests or review existing ones
- **Test Scope Selection** — Choose which types of tests to generate: business logic, UI components, utilities/hooks
- **Code Classification** — Extended Khorikov matrix: domain model, UI components, utilities/hooks, trivial, controllers, overcomplicated
- **Business Logic Focus** — Decision tables, boundary analysis, invariants, state machines
- **UI Component Testing** — Unit testing individual components in isolation: rendering, interactions, states, a11y, query priority, snapshot rules
- **Utility & Hooks Testing** — Output-based testing, parameterized tests, boundary value analysis, hooks/composables
- **Smart Test Doubles** — Classical school by default, mocks only for unmanaged dependencies
- **Antipattern Detection** — 12 antipatterns with severity levels and fixes
- **Language Agnostic** — Works with any language and test framework
- **Project-Aware** — Discovers existing conventions, helpers, and patterns

## Usage

After installation, run:

```
/lp-code-test-unit
```

### Mode 1: Generate Tests

The skill analyzes your code changes (or specified files) and generates comprehensive unit tests:

1. Determines test scope — asks which test types to generate (business logic, UI, utilities)
2. Classifies code by testability (domain logic, UI components, utilities, trivial, controllers)
3. Identifies test scenarios (happy paths, boundaries, errors, invariants)
4. Generates tests following AAA pattern with proper naming
5. Self-checks against antipatterns before output

### Mode 2: Review Tests

The skill reviews existing tests for quality issues:

1. Evaluates against the Four Pillars (Khorikov)
2. Detects antipatterns (The Liar, The Mockery, Fragile Tests, etc.)
3. Assesses business logic coverage gaps
4. Reports findings by severity (P0-P3)
5. Asks for confirmation before implementing fixes

## Workflow

### Generate Mode
1. **Scope** — Determine test types: business logic, UI components, utilities/hooks
2. **Preflight** — Analyze code, detect language/framework, find conventions
3. **Classify** — Extended matrix (domain model / UI component / utility / trivial / controller / overcomplicated)
4. **Scenarios** — Business rules, boundaries, error paths, invariants, UI states, a11y
5. **Generate** — AAA pattern, proper doubles, meaningful names
6. **Self-check** — Verify against antipatterns checklist
7. **Output** — Tests with classification and coverage notes

### Review Mode
1. **Preflight** — Collect test files, read production code
2. **Evaluate** — Check against review checklist
3. **Severity** — Assign P0-P3 to each finding
4. **Output** — Findings with suggested fixes
5. **Confirm** — Ask user before implementing changes

## Severity Levels

| Level | Name | Action |
|-------|------|--------|
| P0 | Critical | Must fix — false confidence or test pollution |
| P1 | High | Should fix — fragile, over-mocked, missing coverage |
| P2 | Medium | Fix or follow-up — readability, naming, structure |
| P3 | Low | Optional — style, minor suggestions |

## Structure

```
lp-code-test-unit/
├── SKILL.md                           # Main skill definition
├── agents/
│   └── agent.yaml                     # Agent interface config
└── references/
    ├── testing-principles.md          # Four pillars, FIRST, pyramid, classification
    ├── test-design-patterns.md        # AAA, builders, parameterization, naming
    ├── test-doubles-guide.md          # Dummy/Stub/Spy/Mock/Fake guide
    ├── business-logic-testing.md      # Decision tables, boundaries, invariants
    ├── ui-component-testing.md        # Unit testing UI components, query priority, UI states, a11y, snapshots
    ├── utility-and-hooks-testing.md   # Pure functions, parameterized tests, hooks, boundaries
    ├── antipatterns-checklist.md       # 12 antipatterns with detection and fixes
    └── test-review-checklist.md       # Structured review checklist
```

## Knowledge Base

Based on:
- **Vladimir Khorikov** — Unit Testing: Principles, Practices, and Patterns
- **Kent Beck** — Test-Driven Development: By Example
- **Kent C. Dodds** — Testing principles, "Testing Implementation Details", query priority, component testing philosophy
- **Martin Fowler** — Refactoring, TestDouble, TestPyramid
- **Gerard Meszaros** — xUnit Test Patterns
- **Google** — Testing Blog, Software Engineering at Google
- **Steve Freeman & Nat Pryce** — Growing Object-Oriented Software, Guided by Tests

## License

MIT
