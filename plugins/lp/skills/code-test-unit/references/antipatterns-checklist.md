# Test Antipatterns Checklist

## The Liar

**What**: Test that passes but doesn't actually verify anything meaningful.

**Signs**:
- No assertions at all
- Only asserts that code "doesn't throw"
- Asserts on a mock's return value (you set it up yourself!)
- Asserts on always-true conditions

```
# BAD — The Liar: no real assertion
def test_process_order():
    order = Order(items=[Item(price=10)])
    result = process(order)
    assert result is not None  # This tells us nothing about correctness

# GOOD — meaningful assertion
def test_process_order_calculates_total():
    order = Order(items=[Item(price=10), Item(price=20)])
    result = process(order)
    assert result.total == 30
    assert result.status == "processed"
```

**Fix**: Every test must assert on a specific, meaningful expected outcome.

---

## The Giant

**What**: One massive test that verifies everything.

**Signs**:
- 50+ lines of setup
- Multiple Act steps
- 10+ assertions checking unrelated things
- Failures are hard to diagnose

```
# BAD — The Giant
def test_order_system():
    # 30 lines of setup...
    order = create_order(...)
    order.validate()
    assert order.is_valid
    order.calculate_total()
    assert order.total == 100
    order.apply_discount(coupon)
    assert order.total == 85
    order.submit()
    assert order.status == "submitted"
    assert email_sent()
    assert inventory_decremented()
    # ... 15 more assertions
```

**Fix**: Split into focused tests — one behavior per test.

---

## The Mockery (Over-Mocking)

**What**: Test is entirely mocks — no real behavior being tested.

**Signs**:
- Mock setup exceeds test logic
- Mocking the class under test
- Mocking value objects
- Deeply chained mock returns
- Test passes regardless of actual implementation

```
// BAD — The Mockery
test_order_service():
    mock_repo = mock(OrderRepository)
    mock_validator = mock(Validator)
    mock_calculator = mock(Calculator)
    mock_notifier = mock(Notifier)
    mock_repo.find.returns(stub(status="pending"))
    mock_calculator.calculate.returns(100)
    mock_validator.validate.returns(true)

    service = OrderService(mock_repo, mock_validator, mock_calculator, mock_notifier)
    service.process(order_id=1)

    verify(mock_calculator.calculate).called_once()  // So what?
    verify(mock_notifier.notify).called_once()        // Coupled to implementation
```

**Fix**: Use real objects for in-process dependencies. Mock only unmanaged out-of-process dependencies. If you need many mocks, the class has too many dependencies — refactor it.

---

## The Inspector (Testing Private Methods)

**What**: Test reaches into private/internal implementation to verify.

**Signs**:
- Accessing private fields (`obj._private_field`)
- Testing private/protected methods directly
- Using reflection to bypass access control
- Test name references internal methods

```
# BAD — testing implementation detail
def test_internal_cache_populated():
    service = UserService()
    service.get_user(1)
    assert service._cache[1] is not None  # Private field!
    assert service._cache_hits == 0        # Implementation detail!

# GOOD — test observable behavior
def test_second_call_returns_same_user():
    service = UserService()
    user1 = service.get_user(1)
    user2 = service.get_user(1)
    assert user1 == user2  # Behavior: same result
```

**Fix**: Test only through public API. If private logic is complex enough to need its own tests, extract it into a separate class.

---

## The Slow Poke

**What**: Tests that take seconds or minutes to run.

**Signs**:
- `sleep()` or `time.sleep()` in tests
- Real network calls or database queries
- File system I/O in unit tests
- Spinning up containers in unit test suite

```
// BAD — The Slow Poke
test_retry_logic():
    service = Service(retry_delay=5)  // Real 5-second delay
    service.call_external_api()       // → throws TimeoutError
    // Test takes 15+ seconds (3 retries × 5 seconds)

// GOOD — inject time control
test_retry_logic():
    clock = FakeClock()
    service = Service(retry_delay=5, clock=clock)
    service.call_external_api()
    assert clock.advanced_by == 15  // Verified timing without waiting
```

**Fix**: Inject clocks, use fakes for I/O, keep unit tests under 100ms each.

---

## Ice Cream Cone (Inverted Pyramid)

**What**: Mostly E2E/integration tests, few unit tests.

**Signs**:
- Test suite takes 20+ minutes
- Flaky tests everywhere
- Hard to pinpoint failures
- Developers skip tests locally
- CI is the bottleneck

**Fix**: Follow the test pyramid. Push logic into pure functions and domain objects. Test business rules with unit tests, boundaries with integration tests.

---

## Fragile Tests (Implementation Coupling)

**What**: Tests break when refactoring even though behavior is unchanged.

**Signs**:
- Verifying exact method call sequences
- Asserting on internal data structures
- Mocking internal collaborators
- Tests break when you rename a private method

```
// BAD — Fragile: coupled to implementation
test_user_creation():
    mock_repo = mock(UserRepository)
    service = UserService(mock_repo)
    service.create_user("john@test.com")

    // These break if you refactor internal flow
    verify(mock_repo.check_exists).called_once_with("john@test.com")
    verify(mock_repo.save).called_once()
    verify(mock_repo.save).called_with(ANY)

// GOOD — test behavior, not implementation
test_user_creation():
    repo = InMemoryUserRepo()
    service = UserService(repo)
    service.create_user("john@test.com")

    assert repo.find_by_email("john@test.com") is not null
```

**Fix**: Test observable outcomes (return values, state changes, external communications), not internal call sequences.

---

## Second Class Citizen

**What**: Test code treated as less important than production code.

**Signs**:
- Copy-pasted tests with minor variations
- Magic numbers without explanation
- No helper functions or builders
- Inconsistent naming
- Dead/commented-out tests
- No refactoring of test code

**Fix**: Apply the same quality standards to test code. Extract helpers, use builders, name clearly, refactor duplication.

---

## The 100% Coverage Trap / Testing Trivial Code

**What**: Pursuing coverage numbers by testing code with zero domain logic.

**Signs**:
- Tests for getters/setters/constructors
- Tests that exercise code without meaningful assertions
- Coverage is high but bugs still slip through

**What NOT to test**: simple getters/setters, DTOs, one-line delegations, configuration constants, auto-generated code.

**What TO test**: calculated properties with logic, validation rules, custom serialization, constructors with business rules.

```
# BAD — testing trivial code for coverage
def test_user_name_getter():
    user = User(name="John")
    assert user.name == "John"  # Tests the language, not your logic
```

**Fix**: Coverage is a metric, not a goal. 80% meaningful coverage > 100% checkbox coverage.

---

## Shared Mutable State

**What**: Tests share state and affect each other.

**Signs**:
- Tests pass individually but fail when run together
- Test order matters
- Class-level or module-level variables mutated in tests
- Global singletons modified without reset

```
# BAD — shared state
class TestOrderService:
    orders = []  # Shared between all tests!

    def test_add_order(self):
        self.orders.append(Order(id=1))
        assert len(self.orders) == 1

    def test_empty_orders(self):
        assert len(self.orders) == 0  # FAILS — previous test polluted state
```

**Fix**: Each test creates its own state. Use `setUp`/`beforeEach` to reset. Avoid class/module variables. Use fresh instances for every test.

---

## Conditional Logic in Tests

**What**: Tests contain `if/else`, loops, or try/catch.

**Signs**:
- `if` statements deciding what to assert
- Loops generating test data
- Try/catch hiding failures
- Complex helper logic in the test itself

```
# BAD — conditional logic in test
def test_discounts():
    for customer in get_all_customers():
        discount = calculate_discount(customer)
        if customer.is_premium:
            assert discount > 0
        else:
            if customer.orders_count > 10:
                assert discount > 0
            else:
                assert discount == 0

# GOOD — separate, explicit tests
def test_premium_customer_gets_discount():
    customer = Customer(is_premium=True)
    assert calculate_discount(customer) > 0

def test_loyal_customer_gets_discount():
    customer = Customer(is_premium=False, orders_count=15)
    assert calculate_discount(customer) > 0

def test_new_customer_no_discount():
    customer = Customer(is_premium=False, orders_count=2)
    assert calculate_discount(customer) == 0
```

**Fix**: Tests should be linear — Arrange, Act, Assert. No branching. If you need different paths, write different tests. Parameterized tests are the right way to handle variations.

---

## Quick Reference: Detection Table

| Antipattern | Key Signal | Severity |
|-------------|-----------|----------|
| The Liar | No meaningful assert | P0 |
| The Giant | Multiple acts + many asserts | P1 |
| The Mockery | Mock setup > test logic | P1 |
| The Inspector | Testing private methods | P1 |
| The Slow Poke | sleep() or real I/O in unit test | P2 |
| Ice Cream Cone | Mostly E2E, few unit tests | P1 |
| Fragile Tests | Tests break on refactor | P1 |
| Second Class Citizen | Copy-paste, magic values, no helpers | P2 |
| 100% Coverage Trap / Trivial Code | Tests for trivial code | P3 |
| Shared Mutable State | Tests affect each other | P0 |
| Conditional Logic | if/for in test body | P2 |
