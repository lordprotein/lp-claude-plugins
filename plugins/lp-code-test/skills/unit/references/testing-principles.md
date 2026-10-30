# Testing Principles

## The Four Pillars of a Good Unit Test (Khorikov)

Every unit test should maximize all four properties simultaneously:

| Pillar | Description | How to evaluate |
|--------|-------------|-----------------|
| **Protection against regressions** | Does the test catch bugs when code changes? | More code exercised = better protection. Test non-trivial logic, not getters/setters |
| **Resistance to refactoring** | Does the test survive implementation changes without false alarms? | Test observable behavior, not implementation details. Zero false positives is the goal |
| **Fast feedback** | Does the test run quickly? | Milliseconds, not seconds. No I/O, no network, no database in unit tests |
| **Maintainability** | Is the test easy to read and change? | Small size, clear intent, minimal setup. Test should be understandable in isolation |

**Key insight**: You can't maximize all four simultaneously — there's always a trade-off. But resistance to refactoring is non-negotiable; it's binary (either tests implementation or behavior). Trade off between protection and speed.

---

## FIRST Principles

| Principle | Meaning | Practical rule |
|-----------|---------|----------------|
| **Fast** | Tests run in milliseconds | No I/O, no sleep, no network calls |
| **Isolated** | Tests don't depend on each other | No shared mutable state, no execution order dependency |
| **Repeatable** | Same result every time | No randomness, no time-dependency, no external services |
| **Self-validating** | Pass or fail — no manual inspection | Clear assertions, no "check the log output" |
| **Timely** | Written close to the code they test | Ideally before or alongside production code |

---

## Test Pyramid (Cohn / Fowler)

```
        /  E2E  \         Few, slow, expensive, high confidence
       /----------\
      / Integration \     Moderate count, test component interactions
     /----------------\
    /    Unit Tests     \  Many, fast, cheap, focused
   /--------------------\
```

**Guidelines:**
- Unit tests: 70-80% — fast, isolated, test business logic
- Integration tests: 15-20% — test boundaries (DB, APIs, file system)
- E2E tests: 5-10% — critical user journeys only

**Anti-pattern: Ice Cream Cone** — inverted pyramid with mostly E2E/manual tests and few unit tests. Slow, flaky, expensive feedback.

---

## Code Classification for Testing (Khorikov Matrix)

Classify code by two dimensions: **complexity/domain significance** and **number of collaborators**.

|  | Few collaborators | Many collaborators |
|--|-------------------|--------------------|
| **High complexity / domain significance** | **Domain model / algorithms** — write many unit tests | **Overcomplicated code** — refactor first, then test |
| **Low complexity / domain significance** | **Trivial code** — don't test (getters, DTOs) | **Controllers / orchestrators** — integration tests |

**Testing strategy by quadrant:**
- **Domain model**: Unit test extensively — this is where bugs matter most
- **Trivial code**: Don't waste time testing constructors, getters, one-line delegations
- **Controllers**: Integration tests only — they coordinate but contain no logic
- **Overcomplicated**: Refactor to separate domain logic from orchestration before testing

---

## Testing Behavior vs Implementation

### Observable behavior (TEST THIS)
- Return values given specific inputs
- State changes visible to the caller
- Calls to out-of-process dependencies (only unmanaged ones)
- Side effects that affect the outside world

### Implementation details (DON'T TEST THIS)
- Private methods
- Internal state not visible to callers
- Specific sequence of internal calls
- Which internal collaborators are used
- Internal data structures

**Litmus test**: "Could I change the implementation without changing any test?" If no — you're testing implementation details.

---

## Three Styles of Unit Testing

### 1. Output-based (functional) testing
- Verify return value only
- No state changes, no side effects
- **Best style**: highest resistance to refactoring, easiest to maintain
- Works when code is pure / functional

```
// Input → Function → Output (verify this)
assertEqual(calculate_discount(order), 0.15)
```

### 2. State-based testing
- Verify the state of the system after an operation
- Check object properties, collection contents, database state
- Good when operations modify state

```
// Act → Check state
cart.add(item)
assertEqual(cart.items.length, 1)
assertEqual(cart.total, item.price)
```

### 3. Communication-based testing
- Verify interaction with dependencies using mocks
- **Use sparingly** — only for unmanaged out-of-process dependencies
- Highest coupling to implementation, most fragile

```
// Verify an email was sent (unmanaged dependency)
verify(emailService.send(expected_email))
```

**Preference order**: Output-based > State-based > Communication-based

---

## TDD / BDD Basics

### TDD Cycle (Red-Green-Refactor)
1. **Red**: Write a failing test that defines desired behavior
2. **Green**: Write the minimum code to make the test pass
3. **Refactor**: Clean up code while keeping tests green

### BDD (Behavior-Driven Development)
- Focus on behaviors from the user's perspective
- Use ubiquitous language from the domain
- Structure: Given (context) → When (action) → Then (outcome)
- Tests as living documentation

---

## Humble Object Pattern

Separate testable logic from hard-to-test infrastructure:

```
// Hard to test — depends on framework, I/O
class OrderController:
    def create_order(request):
        data = parse_request(request)          # Framework coupling
        order = OrderService.create(data)       # Business logic
        send_email(order.customer, order)       # I/O
        return json_response(order)             # Framework coupling

// Better — extract logic into testable unit
class OrderService:                             # Easy to unit test
    def create(data) -> Order:
        validate(data)
        apply_discount(data)
        return Order(data)

class OrderController:                          # Integration test only
    def create_order(request):
        data = parse_request(request)
        order = OrderService.create(data)
        send_email(order.customer, order)
        return json_response(order)
```

**Key**: Push logic down into objects with no infrastructure dependencies. Controllers become thin orchestrators that are only integration-tested.
