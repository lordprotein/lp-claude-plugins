# Test Design Patterns

## AAA Pattern (Arrange-Act-Assert)

Every test follows three distinct phases:

```
def test_discount_applied_for_loyal_customer():
    # Arrange — set up the test scenario
    customer = Customer(loyalty_years=3)
    order = Order(items=[Item(price=100)], customer=customer)

    # Act — execute the behavior under test (single action)
    result = order.calculate_total()

    # Assert — verify the expected outcome
    assert result == 85.0  # 15% loyalty discount
```

### AAA Rules

| Rule | Rationale |
|------|-----------|
| **One Act per test** | Multiple acts = multiple tests merged. Split them |
| **No conditional logic** | `if` in tests means you're testing two scenarios. Write two tests |
| **Arrange can be large** | Complex setup is OK if it models a real scenario. Use builders to reduce noise |
| **Assert should be focused** | Verify one logical concept (may need multiple asserts for one concept) |
| **No Act in Arrange** | If Arrange calls production code, that's testing two things |
| **Separate with blank lines** | Visual separation of the three phases improves readability |

### Multiple Asserts — When OK

Multiple asserts are fine when they verify **one logical concept**:

```
// OK — verifying one concept: "order is correctly created"
assert order.status == "pending"
assert order.total == 150.0
assert order.items_count == 3

// NOT OK — verifying unrelated concepts
assert order.status == "pending"
assert email_sent == True        # Different concern — separate test
```

---

## Given-When-Then (BDD Style)

```
def test_overdue_invoice_incurs_late_fee():
    # Given an invoice past its due date
    invoice = Invoice(due_date=days_ago(30), amount=1000)

    # When the system calculates fees
    invoice.apply_late_fees()

    # Then a 5% late fee is added
    assert invoice.total == 1050
    assert invoice.has_late_fee == True
```

Equivalent to AAA but emphasizes **business language**. Use when tests serve as documentation for stakeholders.

---

## Test Builder Pattern

Reduce test noise with fluent builders for complex objects:

```
// Without builder — noisy, hard to see what matters
def test_premium_discount():
    customer = Customer(
        name="John", email="j@test.com", phone="555-0100",
        address="123 St", city="NYC", zip="10001",
        loyalty_years=5, tier="premium", active=True
    )
    ...

// With builder — only relevant fields visible
def test_premium_discount():
    customer = CustomerBuilder().with_tier("premium").with_loyalty_years(5).build()
    ...
```

### Builder Guidelines
- Default to valid state — builder creates a valid object by default
- Only specify what matters for this test — everything else uses defaults
- Fluent API — chain methods for readability
- Reusable across test suite

---

## Object Mother Pattern

Factory methods for common test scenarios:

```
class TestCustomers:
    @staticmethod
    def loyal():
        return Customer(loyalty_years=5, tier="gold", active=True)

    @staticmethod
    def new():
        return Customer(loyalty_years=0, tier="standard", active=True)

    @staticmethod
    def inactive():
        return Customer(loyalty_years=2, tier="silver", active=False)
```

**Builder vs Object Mother**: Use Object Mother for common, well-known scenarios. Use Builder when tests need fine-grained control over individual fields.

---

## Parameterized Tests (Data-Driven)

When multiple inputs exercise the same behavior:

```
// Instead of 5 separate tests — parameterized:
// Each row: [amount, years, expected_discount]
test_loyalty_discount(amount, years, expected_discount):
    [100, 0, 0]        // New customer — no discount
    [100, 1, 5]        // 1 year — 5%
    [100, 3, 10]       // 3 years — 10%
    [100, 5, 15]       // 5+ years — 15%
    [100, 10, 15]      // Cap at 15%

    customer = CustomerBuilder().with_loyalty_years(years).build()
    order = Order(amount=amount, customer=customer)
    assert order.discount == expected_discount
```

### When to use parameterized tests
- Same behavior, different inputs → parameterize
- Different behaviors → separate tests with descriptive names
- Decision tables → parameterize with clear column headers

### When NOT to use
- When setup differs significantly between cases
- When failure message wouldn't identify which case failed (add IDs)
- When it obscures the test's intent

---

## Property-Based Testing

Instead of specific examples, define properties that must always hold:

```
// Property: sorting is idempotent
// for any random list of integers:
test_sort_idempotent(lst):
    assert sorted(sorted(lst)) == sorted(lst)

// Property: discount never exceeds item price
// for any random price in [0, 10000]:
test_discount_never_exceeds_price(price):
    item = Item(price=price)
    assert item.discounted_price() >= 0
    assert item.discounted_price() <= price
```

**Use for**: mathematical properties, invariants, serialization roundtrips, idempotency. Complements example-based tests, doesn't replace them.

---

## Test Naming Conventions

### Khorikov's approach: describe behavior in plain language
```
test_delivery_with_past_date_is_invalid
test_discount_is_calculated_for_loyal_customer
test_order_with_no_items_cannot_be_submitted
```

### Google's approach: methodName_condition_expectedResult
```
test_calculateDiscount_loyalCustomer_returns15Percent
test_submit_emptyOrder_throwsValidationError
```

### BDD style: should + behavior
```
test_should_apply_loyalty_discount_for_customers_with_3_plus_years
test_should_reject_order_when_inventory_insufficient
```

### Naming rules
| Rule | Example |
|------|---------|
| **No "test1", "test2"** | Name describes the scenario |
| **No implementation details in name** | `test_returns_cached_value` — not `test_calls_redis_get` |
| **Include condition and expected result** | `test_expired_coupon_is_rejected` |
| **Use domain language** | `test_premium_member_gets_free_shipping` — not `test_flag_42_enables_zero_cost` |
| **Readable as a sentence** | Cover the test name and read it as a spec |

---

## Test Organization

### Group by class/module under test
```
describe("OrderService")
  describe("calculateTotal")
    it("applies loyalty discount")
    it("applies coupon discount")
    it("caps total discount at 50%")

  describe("submit")
    it("rejects empty orders")
    it("decrements inventory")
```

### Group by behavior/feature
```
describe("Loyalty discounts")
  it("no discount for new customers")
  it("5% for 1-year customers")
  it("15% cap for 5+ year customers")

describe("Order submission")
  it("validates minimum order amount")
  it("checks inventory availability")
```

### File organization
- One test file per production file: `order_service.py` → `test_order_service.py`
- Mirror production directory structure in test directory
- Shared fixtures/builders in a `conftest.py` / `test_helpers` / `__fixtures__` directory

---

## Setup and Teardown

### Minimize shared setup
```
// BAD — shared setup hides what matters
beforeEach(() => {
    user = createUser({ name: "John", role: "admin", active: true })
    order = createOrder({ user, items: [item1, item2], status: "pending" })
    payment = createPayment({ order, method: "card" })
})

test("admin can cancel order", () => {
    order.cancel(user)  // Which fields matter? All? Some?
    expect(order.status).toBe("cancelled")
})
```

```
// GOOD — each test shows what matters
test("admin can cancel order", () => {
    const user = createUser({ role: "admin" })
    const order = createOrder({ status: "pending" })

    order.cancel(user)

    expect(order.status).toBe("cancelled")
})
```

### Rules for setup
| Guideline | Rationale |
|-----------|-----------|
| **beforeEach for truly shared, non-essential setup** | DB connection, temp directory, logger |
| **Inline for scenario-specific setup** | Makes the test self-contained and readable |
| **beforeAll only for expensive one-time init** | Test containers, server startup |
| **Always clean up in afterEach/afterAll** | Prevent test pollution |
| **Never put Act or Assert in setup** | Setup is only Arrange |
