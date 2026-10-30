# Business Logic Testing

## Decision Tables

For complex business rules with multiple conditions, map out all combinations:

### Example: Shipping cost calculation

| Customer tier | Order total | Free shipping eligible? | Shipping cost |
|--------------|-------------|------------------------|---------------|
| Standard | < $50 | No | $9.99 |
| Standard | >= $50 | Yes | $0.00 |
| Premium | < $25 | No | $4.99 |
| Premium | >= $25 | Yes | $0.00 |
| VIP | Any | Yes | $0.00 |

Each row becomes a parameterized test case:

```
// Parameterized — each row: [tier, total, expected_shipping]
test_shipping_cost(tier, total, expected_shipping):
    ["standard", 30, 9.99]
    ["standard", 50, 0.00]
    ["standard", 100, 0.00]
    ["premium", 20, 4.99]
    ["premium", 25, 0.00]
    ["vip", 1, 0.00]
    ["vip", 1000, 0.00]

    customer = Customer(tier=tier)
    order = Order(total=total, customer=customer)
    assert order.shipping_cost == expected_shipping
```

### How to build decision tables
1. Identify all input conditions
2. List possible values for each condition
3. Determine the expected output for each combination
4. Eliminate impossible or redundant combinations
5. Each row = one test case (or parameterized row)

---

## Boundary Value Analysis

Test at the edges of valid/invalid ranges:

```
Valid range: 1 to 100

Test points:
  0  → just below minimum (invalid)
  1  → minimum boundary (valid)
  2  → just above minimum (valid)
  50 → nominal / middle (valid)
  99 → just below maximum (valid)
  100 → maximum boundary (valid)
  101 → just above maximum (invalid)
```

### Common boundaries to test

| Type | Boundaries |
|------|-----------|
| **Numeric ranges** | min-1, min, min+1, max-1, max, max+1, 0, negative, NaN, Infinity, floating-point precision (0.1+0.2) |
| **Collections** | empty, one element, typical, at capacity, overflow, duplicates, nested |
| **Strings** | empty `""`, single char, typical, max length, max+1, whitespace-only, special characters, unicode, newlines |
| **Dates** | start of range, end of range, leap year, DST transitions, timezone edges, month boundaries, epoch |
| **Money** | zero, smallest unit (0.01), negative, max amount |
| **Pagination** | page 0, page 1, last page, beyond last page |
| **Null/undefined** | null, undefined, missing keys, optional parameters omitted |
| **Boolean** | both true and false, truthy/falsy coercion (0, "", null vs 1, "0", []) |

### Boundary test naming
```
test_age_validation_rejects_negative_one
test_age_validation_accepts_zero
test_age_validation_accepts_max_150
test_age_validation_rejects_151
```

---

## Testing Invariants

Invariants are conditions that must ALWAYS be true:

```
class Account:
    // Invariant: balance can never be negative

    withdraw(amount):
        if amount > self.balance:
            throw InsufficientFundsError
        self.balance -= amount

// Test the invariant holds in all scenarios
test_balance_never_negative_after_withdrawal():
    account = Account(balance=100)
    account.withdraw(101)  // → throws InsufficientFundsError
    assert account.balance == 100  // Unchanged

test_balance_never_negative_after_concurrent_withdrawals():
    account = Account(balance=100)
    account.withdraw(60)
    account.withdraw(60)  // → throws InsufficientFundsError
    assert account.balance == 40

test_balance_never_negative_on_zero_balance():
    account = Account(balance=0)
    account.withdraw(1)  // → throws InsufficientFundsError
    assert account.balance == 0
```

### Common invariants to test
- Collection size matches expected count after mutations
- Sum of parts equals the whole (financial transactions)
- State transitions follow valid paths only
- Referenced objects always exist (referential integrity)
- Timestamps always increase monotonically
- Unique constraints are maintained after operations

---

## Error Paths

### Test the system state AFTER an error

```
// Not just "it throws" — verify state is consistent after failure
test_failed_transfer_preserves_balances():
    source = Account(balance=100)
    target = Account(balance=50)

    transfer(source, target, amount=200)  // → throws InsufficientFundsError

    // Both accounts unchanged — no partial mutation
    assert source.balance == 100
    assert target.balance == 50
```

### Error path categories

| Category | What to test |
|----------|-------------|
| **Validation errors** | Invalid input rejected, clear error message, state unchanged |
| **Business rule violations** | Constraint enforced, appropriate exception, no side effects |
| **Resource failures** | Graceful degradation, retry/circuit breaker, cleanup |
| **Partial failures** | Transaction rolled back, no partial state, idempotency |
| **Concurrent errors** | Race condition handled, optimistic lock exception caught |

### Questions for error path tests
- "What state is the system in after this error?"
- "Were any partial side effects rolled back?"
- "Is the error message helpful for debugging?"
- "Can the operation be safely retried?"

---

## Equivalence Partitioning

Divide input space into classes where all values behave the same:

```
Input: user age (integer)
Partitions:
  Invalid: age < 0     → Test: -1
  Child:   0-12        → Test: 6
  Teen:    13-17       → Test: 15
  Adult:   18-64       → Test: 30
  Senior:  65+         → Test: 70
```

**One test per partition** + **boundary values between partitions**:
```
// Parameterized — each row: [age, expected_category]
test_age_category(age, expected_category):
    [-1, "invalid"]     // Invalid partition
    [6, "child"]        // Child partition
    [12, "child"]       // Child-Teen boundary
    [13, "teen"]        // Teen partition start
    [17, "teen"]        // Teen-Adult boundary
    [18, "adult"]       // Adult partition start
    [64, "adult"]       // Adult-Senior boundary
    [65, "senior"]      // Senior partition start
    [70, "senior"]      // Senior partition

    assert categorize_age(age) == expected_category
```
