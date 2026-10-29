# State and Concurrency Testing

Loaded in addition to `business-logic-testing.md` when the code has distinct states and transitions, or concurrency, idempotency or ordering concerns.

## State Machine Transitions

For code with distinct states and transitions:

```
Order States:
  [Draft] → submit → [Pending]
  [Pending] → approve → [Confirmed]
  [Pending] → reject → [Rejected]
  [Confirmed] → ship → [Shipped]
  [Confirmed] → cancel → [Cancelled]
  [Shipped] → deliver → [Delivered]
```

### What to test

**1. Valid transitions**
```
def test_pending_order_can_be_approved():
    order = Order(status="pending")
    order.approve()
    assert order.status == "confirmed"
```

**2. Invalid transitions**
```
test_shipped_order_cannot_be_cancelled():
    order = Order(status="shipped")
    order.cancel()  // → throws InvalidTransitionError
    assert order.status == "shipped"  // State unchanged
```

**3. Side effects of transitions**
```
def test_shipping_decrements_inventory():
    order = Order(status="confirmed", items=[Item(sku="A", qty=2)])
    order.ship(inventory)
    assert inventory.get_stock("A") == initial_stock - 2
```

**4. Guards / preconditions**
```
test_cannot_confirm_order_without_payment():
    order = Order(status="pending", payment=None)
    order.approve()  // → throws PreconditionError
```

---

## Testing Concurrent Scenarios

### Patterns to test

**1. Race conditions in business logic**
```
def test_double_booking_prevented():
    """Two simultaneous bookings for the same slot — only one succeeds"""
    slot = TimeSlot(capacity=1)
    booking1 = Booking(slot=slot, user=user_a)
    booking2 = Booking(slot=slot, user=user_b)

    result1 = slot.book(booking1)
    result2 = slot.book(booking2)

    assert result1.success == True
    assert result2.success == False
    assert slot.bookings_count == 1
```

**2. Idempotency**
```
def test_payment_processing_is_idempotent():
    """Same payment request processed twice has same result"""
    request = PaymentRequest(id="req_123", amount=100)

    result1 = process_payment(request)
    result2 = process_payment(request)

    assert result1.transaction_id == result2.transaction_id
    assert account.balance_deducted_once()
```

**3. Ordering guarantees**
```
def test_events_processed_in_order():
    """Later events don't overwrite earlier state"""
    processor = EventProcessor()
    processor.handle(Event(seq=1, data="first"))
    processor.handle(Event(seq=2, data="second"))
    processor.handle(Event(seq=1, data="first_duplicate"))  # Late duplicate

    assert processor.current_state.data == "second"
    assert processor.last_sequence == 2
```

### Concurrency testing guidelines
- Use deterministic tests where possible (sequential execution, controlled ordering)
- For true concurrency tests, use `threading`/`asyncio` with barriers/latches
- Test the business rules, not the threading primitives
- Flag code that needs but lacks concurrency protection
