# E2E Testing Principles

## The Four Pillars of a Good E2E Test

Every E2E test should maximize all four properties simultaneously:

| Pillar | Description | How to evaluate |
|--------|-------------|-----------------|
| **Protection against regressions** | Does the test catch real user-facing bugs? | More critical flows covered = better protection. Test complete user journeys, not individual functions |
| **Resistance to refactoring** | Does the test survive UI restructuring without false alarms? | Test user-visible behavior (text, outcomes, navigation), not DOM structure. Zero false positives is the goal |
| **Speed (relative)** | Is the test as fast as possible for an E2E test? | Parallel execution, programmatic auth, API-based setup. Individual test < 30s, full suite < 15min |
| **Determinism** | Does the test produce the same result every time? | Auto-waiting, proper data isolation, stable selectors, no time-dependency. Flaky test = no test |

**Key insight**: For E2E, determinism and resistance to refactoring are non-negotiable. You cannot trade them off. Trade off between protection (coverage breadth) and speed. A flaky test is worse than no test -- it erodes trust in the entire suite.

---

## Test Pyramid (Cohn) vs Testing Trophy (Rauch)

### Pyramid (Cohn / Fowler)

```
        /   E2E   \         5-10%  Few, slow, expensive, high confidence
       /------------\
      / Integration  \       15-20% Moderate count, test component interactions
     /----------------\
    /   Unit Tests     \     70-80% Many, fast, cheap, focused
   /--------------------\
```

### Trophy (Rauch)

```
         ___________
        /   E2E     \        5-10%  Critical journeys only
       /-------------\
      |               |
      | Integration   |      40-50% Biggest slice — real component interactions
      |               |
       \-------------/
        \   Unit    /        20-30% Pure logic, algorithms, utilities
         \_________/
          | Static |         Linting, type checking, formatting
          |________|
```

**Both agree**: E2E should be 5-10% of all tests. E2E tests the "critical few" journeys, not everything. If you find yourself writing more E2E than integration tests, you are overinvesting in the slowest, most expensive layer.

---

## E2E Flow Classification Matrix and Risk Tags

Defined in SKILL.md, Mode 1 step 2 (matrix, risk tags, decision rules, 5-10% budget).

---

## What E2E Should NOT Test

| Concern | Better alternative |
|---------|-------------------|
| Individual function logic | Unit tests |
| API contract compliance | Contract tests (Pact, etc.) |
| Visual pixel differences | Visual regression tools (screenshot diffing) |
| Performance / load | Performance testing tools (k6, Locust) |
| Every possible input combination | Unit tests with parameterization |
| Third-party service internal behavior | Mocks / service virtualization |
| CSS styling correctness | Visual regression or snapshot tests |
| Database query performance | Database-level benchmarks |

**Rule of thumb**: If a bug can be caught by a cheaper, faster test type -- use that type instead. E2E tests exist only for integration gaps that no other test type covers.

---

## FIRST Adapted for E2E

| Principle | E2E Adaptation | Practical rule |
|-----------|---------------|----------------|
| **Fast** (relative) | Parallel execution, programmatic auth, API-based data setup | Individual test < 30s. Full suite < 15min. No UI login except the one login test |
| **Isolated** | Each test manages its own data, no order dependency | Tests can run in parallel. No shared mutable state between tests. Each test creates and cleans its own data |
| **Repeatable** | Deterministic: no flakiness | Auto-waiting (never `sleep`). Stable selectors (role/label/testid, not CSS class). No time-dependency. Retry on network-level transient errors only |
| **Self-validating** | Clear assertions on visible outcomes | Assert text, navigation state, element visibility. Never "check the screenshot manually" |
| **Timely** | Written for critical journeys, maintained as features evolve | Update E2E when user flows change. Delete E2E for removed features. Don't let stale tests accumulate |

---

## The 5-10% Rule

E2E should be 5-10% of your total test count:

```
Total tests: 1000
  Unit:        700-800
  Integration: 150-200
  E2E:         50-100
```

### Signs of too many E2E tests
- Suite takes > 30 minutes
- Frequent flaky failures (> 1% flake rate)
- Maintenance burden dominates sprint work
- Tests duplicate coverage already in unit/integration
- Team avoids running the suite locally

### Signs of too few E2E tests
- Critical user flows have no automated coverage
- Bugs consistently reach production through integration gaps
- Manual regression testing takes hours before each release
- Team relies on "click through it manually" for confidence
- No coverage of cross-page state transitions

### Balancing

When the suite grows beyond budget:
1. Identify tests that duplicate unit/integration coverage -> delete
2. Merge overlapping journeys into single multi-step tests
3. Move validation-heavy tests down to unit level
4. Keep only risk-tagged and Critical x Medium flows
