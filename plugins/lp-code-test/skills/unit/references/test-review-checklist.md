# Test Review Checklist

## 1. Four Pillars Assessment

### Protection Against Regressions
- [ ] Tests cover critical business rules, not just happy paths
- [ ] Edge cases and boundary conditions are tested
- [ ] Error paths are tested (not just "it throws" but state after error)
- [ ] Non-trivial code is exercised (not just getters/setters)
- [ ] Tests would catch real bugs if code changes

**Questions to ask:**
- "If I introduce a bug in line X, will any test fail?"
- "Are the most important business rules covered?"

### Resistance to Refactoring
- [ ] Tests verify behavior, not implementation details
- [ ] No assertions on method call sequences (unless unmanaged dependency)
- [ ] No mocking of internal collaborators
- [ ] Private methods are not tested directly
- [ ] Tests would survive renaming/restructuring of internals

**Red flag**: If refactoring internal implementation (without changing behavior) would break tests → P1 finding.

### Fast Feedback
- [ ] Slow Poke checks (antipatterns-checklist.md), plus: full unit suite runs in under 30 seconds

### Maintainability
- [ ] Tests are readable and self-contained
- [ ] Setup is minimal and relevant to the scenario
- [ ] Assertions are clear and meaningful
- [ ] Test names describe the behavior, not the implementation
- [ ] No duplicated setup — extracted to helpers/builders where appropriate

---

## 2. Antipattern Detection

Apply every check from `antipatterns-checklist.md`, severity from its detection table.

---

## 3. Business Logic Coverage

### Coverage quality (not just code coverage)
- [ ] Critical business rules have dedicated tests
- [ ] Decision table scenarios are covered (all condition combinations)
- [ ] Boundary values tested at edges of valid ranges
- [ ] Domain invariants are verified
- [ ] State machine transitions tested (valid + invalid)
- [ ] Concurrent/race condition scenarios addressed if applicable

### Missing coverage detection
- [ ] Look for untested public methods with non-trivial logic
- [ ] Check if error/exception paths are tested
- [ ] Verify that validation rules have corresponding tests
- [ ] Check for complex conditionals (if/switch) without test coverage
- [ ] Look for domain events/side effects without verification

---

## 4. Test Doubles Usage

### Appropriate usage
- [ ] Mocks used only for unmanaged out-of-process dependencies
- [ ] Stubs return realistic values (not `null` / `undefined` everywhere)
- [ ] Fakes preferred over mocks for complex dependencies
- [ ] Real objects used for value objects, DTOs, in-process collaborators
- [ ] No mocking of standard library / language primitives

### Problematic patterns
- [ ] Mockery / Fragile signs (antipatterns-checklist.md): mocking the SUT, chained mock returns, call counts/order on internals, mock setup longer than the test
- [ ] Mocking what you don't own (third-party libraries directly)

---

## 5. Naming and Readability

### Test names
- [ ] Names describe behavior, not method names
- [ ] Names include the condition/scenario
- [ ] Names include the expected outcome
- [ ] Consistent naming convention throughout the suite
- [ ] Names are readable as specifications

### Test body
- [ ] Clear AAA (Arrange-Act-Assert) structure
- [ ] Single Act per test
- [ ] Assertions verify specific expected values, not just `is not None`
- [ ] Magic values have context (via variable names or comments)
- [ ] Setup relevance is clear (no hidden shared setup affecting the test)

---

## 6. Test Isolation

- [ ] Shared Mutable State checks (antipatterns-checklist.md), plus:
- [ ] Tests can run in parallel
- [ ] Cleanup happens in teardown, not in the next test's setup
- [ ] Time-dependent tests use injected clocks, not real time
