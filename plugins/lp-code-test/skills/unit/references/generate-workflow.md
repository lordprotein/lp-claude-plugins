# Mode 1: Generate Tests

## 0) Determine test scope

Required, before preflight.

- Analyze the target code and determine which categories are present:
  - **Business logic / domain model** — core rules, algorithms, calculations, state machines
  - **UI components** — components that render UI, handle user interactions, manage visual state
  - **Utilities / helpers / hooks** — pure functions, transformers, validators, formatters, parsers, hooks/composables
- Ask the user via `AskUserQuestion` with `multiSelect: true`, header «Тесты», which types of tests to generate:
  - Unit tests for business logic
  - Unit tests for UI components
  - Unit tests for utilities / hooks
- If the code clearly belongs to only one category, still confirm with the user before proceeding (preselect it as the first option with «(Recommended)»).
- Generate only the selected categories — do NOT generate tests for unselected categories.

## 1) Preflight context

- Use `git status -sb` and `git diff --stat` to scope changes, then `git diff -- <files>` only for the files in scope. If user specifies files, analyze those instead.
- Identify the programming language, test framework, and assertion library used in the project.
- Search for existing tests (`rg -g "*test*" -g "*spec*" --files`) to discover:
  - Test directory structure and file naming conventions
  - Helper functions, builders, fixtures, or factories already defined
- Read 1-2 existing tests closest to the target code (same module or folder, otherwise the nearest one) to learn the framework, assertion patterns and test naming conventions. Read more only if they disagree with each other.
- If no existing tests found, ask user (`AskUserQuestion`) about preferred framework, with a standard one for the language as the recommended option.

**Edge cases:**
- **No changes**: If `git diff` is empty, ask user which files/modules to generate tests for.
- **Large diff (>500 lines)**: Summarize modules first, then ask user (`AskUserQuestion`, `multiSelect: true`) to prioritize which to test.
- **Test files in diff**: Also load `references/review-workflow.md` and use Mode 2 (Review) for the test files, Mode 1 for production files.

## 2) Classify code (Khorikov matrix)

Required: classify every unit before generating any test.

- Classification axes: complexity / domain significance vs number of collaborators. If a unit's category is ambiguous, load `references/testing-principles.md` for the matrix rationale and the Humble Object example.
- Categorize each unit of code:

| Category | Test strategy |
|----------|--------------|
| **Domain model / algorithms** | Unit test extensively — highest priority |
| **UI component** | Test rendering, interactions, states, a11y (if selected in step 0) |
| **Utility / pure function / hook** | Output-based testing, parameterized tests (if selected in step 0) |
| **Trivial code** (getters, DTOs, one-line delegations) | Skip — no tests needed |
| **Controllers / orchestrators** | Integration tests only — don't unit test |
| **Overcomplicated code** (high complexity + many dependencies) | Recommend refactoring first, then test |

- Report the classification only once, as the Code Classification table in the output (step 3).
- If code is overcomplicated, suggest the Humble Object pattern: push domain logic into objects with no infrastructure dependencies (unit test them), leave a thin orchestrator (integration test only).

## 3) Determine test scenarios and confirm

- **If business logic or utility / hooks tests selected in step 0** → required: load `references/business-logic-testing.md` (decision tables, boundaries, invariants, error paths, partitions). Do not rely on general knowledge alone.
- **If the code has distinct states and transitions, or concurrency, idempotency or ordering concerns** → also load `references/state-and-concurrency-testing.md`.
- For each domain logic unit, identify: happy paths, decision table scenarios, boundary conditions, error paths, invariants, state transitions (if applicable).
- Prioritize: business-critical paths first, edge cases second, defensive checks last.
- Output the plan (format below), then ask for confirmation.

```markdown
## Test Generation Plan

**Source**: X files analyzed, Y functions/methods identified
**Tests planned**: Z test cases

## Code Classification

| File / Function | Category | Test strategy |
|----------------|----------|---------------|
| (list each unit) | Domain model / UI / Utility / Trivial / Controller / Overcomplicated | Unit test / UI test / Output-based / Skip / Integration / Refactor first |

## Scenarios

| Test file | Test name | Type |
|-----------|-----------|------|
| order_test.ext | applies loyalty discount for 3+ years | happy |
| order_test.ext | shipping cost by tier and total (7 rows) | parameterized: decision table |
| order_test.ext | rejects withdrawal above balance, balance unchanged | error |

## Coverage Notes (optional, omit if none)

- [Gaps and deliberately untested scenarios not visible in the tables above; do not repeat the classification]
```

Then ask via `AskUserQuestion`, header «Тесты», single select:
- «Записать и запустить» — generate, self-check, write the files, run the tests
- «Показать код» — generate and self-check, print the code in chat (format in step 6), then ask again with the same options
- «Изменить сценарии» — add, remove or change scenarios (details via Other or a follow-up question), then show the updated plan and ask again
- «Вынести builders» — plan builders / factories for repeated setup, then show the updated plan and ask again

**Important**: Do NOT write test files to disk until the user explicitly chooses «Записать и запустить».

## 4) Generate tests

Required: load these before writing any test code.

- Load `references/test-design-patterns.md` for patterns.
- Load `references/test-doubles-guide.md` for double selection. Skip it only if every unit under test is a pure function with no dependencies at all (nothing to mock, stub or fake).
- **If UI component tests selected** → also load `references/ui-component-testing.md` for UI-specific principles, query priority, snapshot rules, and UI antipatterns.
- **If utility / hooks tests selected** → also load `references/utility-and-hooks-testing.md` for parameterized testing, boundary analysis, hooks testing strategies, and utility antipatterns.
- Generate exactly the confirmed scenarios. Apply these rules:

**Structure:**
- Follow AAA pattern (Arrange-Act-Assert) with clear visual separation
- One Act per test — never test multiple behaviors in one test
- No conditional logic in tests (no if/for/try-catch)
- Group tests logically (by behavior/feature, using describe/context if framework supports)
- Test observable behavior only (return values, visible state, calls to unmanaged out-of-process deps). Litmus: could the implementation change without changing any test?
- Verification style preference: output-based > state-based > communication-based (mocks)
- Deterministic and fast: no randomness, real time, sleep, network, DB or file I/O; inject clocks and fakes

**Naming:**
- Use project's existing naming convention if detected
- Otherwise use descriptive names: `test_[scenario]_[expected_result]` or `test_[behavior_description]`
- Name must describe WHAT is tested and WHAT the expected outcome is
- Use domain language, not implementation terms

**Test doubles:**
- Default to real objects for in-process dependencies
- Use stubs only when real setup is impractical and behavior is irrelevant to this test
- Mock ONLY unmanaged out-of-process dependencies (external APIs, SMTP, payment gateways)
- Create adapters/wrappers for third-party libraries — never mock what you don't own
- Prefer fakes over mocks when dependency has complex behavior

**Data setup:**
- Use builders/factories if they exist in the project
- Create new builders if the same object setup repeats 3+ times
- Use parameterized tests for decision tables and boundary value sets
- Every magic value in a test should have a clear purpose (via variable name or context)

**Typing (TypeScript / typed languages):**
- Always use real types from the project — import and reuse existing interfaces, types, enums
- If the real type is not found — use `unknown`, never `any`
- `any` is forbidden unless there is absolutely no other option

**Assertions:**
- Assert on specific expected values, not just `is not None` or `doesn't throw`
- For error paths, assert on system state AFTER the error (not just the exception)
- One logical concept per test (may be multiple assert statements)
- Use the project's assertion style (expect/assert/should)

## 5) Self-check against antipatterns

Required: run EVERY check of the Antipattern Detection Table in SKILL.md for EACH generated test before showing or writing it.

- If any check fails, fix the test before outputting or writing.

## 6) Output

**«Показать код»**: print the code, then ask again (step 3 options):

```markdown
## Generated Tests

### [filename_test.ext]

[Test code with comments explaining the scenario for non-obvious cases]
```

**«Записать и запустить»**: write the files with Write (do not print the code in chat), run only the new test files with the project's test command, then report:

```markdown
## Tests written

- path/to/order_test.ext — N tests
**Run**: X passed, Y failed
```

If any test fails, show the failure output briefly and ask via `AskUserQuestion`: «Исправить тесты» (the test is wrong) / «Оставить как есть» (the test found a bug in the code; never change production code here) / «Удалить упавшие».
