# Test Doubles Guide

## Taxonomy (Meszaros)

| Double | Purpose | Behavior | Example |
|--------|---------|----------|---------|
| **Dummy** | Fill a required parameter; never actually used | No behavior | `new NullLogger()` passed to a constructor that requires a logger |
| **Stub** | Provide canned responses to calls | Returns predefined values | `when(repo.findById(1)).thenReturn(user)` |
| **Spy** | Record calls for later verification | Wraps real or fake object, tracks calls | `verify(spy).was_called_with(expected_args)` |
| **Mock** | Pre-programmed with expectations; verifies interactions | Fails if expected calls don't happen | `expect(emailService).to_receive(:send).once` |
| **Fake** | Working implementation with shortcuts | Real logic, simplified | In-memory database, fake file system, fake HTTP server |

### Key distinctions
- **Stubs** provide input to the system under test (incoming interactions)
- **Mocks** verify output from the system under test (outgoing interactions)
- **Fakes** are real implementations that are faster/simpler (in-memory DB vs real DB)
- Never assert on stubs — they're just setup. Assert on mocks or on the result.

---

## Classical (Detroit) vs London School

| Aspect | Classical (Detroit) | London (Mockist) |
|--------|--------------------|--------------------|
| **Unit** | A unit of behavior (may span classes) | A single class |
| **Isolation** | Isolate tests from each other | Isolate the class from all dependencies |
| **Doubles** | Only for shared/out-of-process dependencies | For all dependencies |
| **Style** | Prefers state/output verification | Prefers interaction verification |
| **Proponents** | Kent Beck, Martin Fowler | Steve Freeman, Nat Pryce |

### Khorikov's recommendation (pragmatic middle ground)
- Default to **Classical school** — it has better resistance to refactoring
- Mock only **unmanaged out-of-process dependencies** (external APIs, message buses, SMTP)
- Don't mock **managed dependencies** (your own database, file system in integration tests)
- Never mock **in-process dependencies** (other classes in your codebase)

---

## Decision Tree: When to Use What

```
Is the dependency out-of-process (DB, API, queue, email)?
├── YES: Is it managed (you own it) or unmanaged (external)?
│   ├── MANAGED (your DB, your file storage):
│   │   └── Use REAL implementation in integration tests
│   │       Don't mock. Don't stub. Test the real interaction.
│   └── UNMANAGED (3rd-party API, SMTP, payment gateway):
│       └── Use MOCK to verify outgoing interactions
│           Verify the message format/content sent to the dependency
├── NO: Is it a value object or simple data?
│   ├── YES: Use REAL object
│   │   └── Never mock value objects, DTOs, or data structures
│   └── NO: Is it a complex collaborator?
│       ├── Is setup trivial? → Use REAL object
│       └── Is setup complex but behavior irrelevant to this test?
│           └── Use STUB to provide canned responses
```

---

## Khorikov's Rule: Mock Only Unmanaged Out-of-Process Dependencies

### What to mock (unmanaged dependencies)
- External REST/GraphQL APIs you don't control
- Third-party email/SMS services
- Payment gateways
- External message brokers (when you're the publisher)

### What NOT to mock
- Your own database — use real DB in integration tests
- Other classes in your codebase — use real implementations
- Value objects and DTOs — always use real ones
- Standard library (file system, collections, dates) — use real or fakes

### Why?
Mocking managed dependencies couples tests to implementation details. If you change how data is stored (e.g., split a table), mocked tests break even though behavior is unchanged. That's a false positive — the worst kind of test failure.

---

## Google's Preference: Fakes > Mocks

Google Testing Blog advocates **fakes** over mocks because:

| Fakes | Mocks |
|-------|-------|
| Exercise real logic (simplified) | Only verify call patterns |
| Catch more bugs | Miss logic errors in the dependency |
| Don't couple to call sequence | Tightly coupled to implementation |
| Reusable across test suite | Usually test-specific setup |
| Maintained by dependency owner | Maintained by test author |

### Example: Fake vs Mock

```
// Mock approach — verifies interaction, not behavior
test("create user sends welcome email"):
    mock_email = mock(EmailService)
    service = UserService(email_service=mock_email)
    service.create_user("john@test.com")
    verify(mock_email.send).called_once_with("john@test.com", "Welcome!")

// Fake approach — verifies behavior through real (simplified) implementation
test("create user sends welcome email"):
    fake_email = FakeEmailService()  // In-memory, stores sent emails
    service = UserService(email_service=fake_email)
    service.create_user("john@test.com")
    assert fake_email.sent_emails == [Email(to="john@test.com", subject="Welcome!")]
```

---

## "Never Mock What You Don't Own"

Coined by Steve Freeman and Nat Pryce (Growing Object-Oriented Software, Guided by Tests):

- Don't mock third-party libraries directly (e.g., `requests`, `axios`, `stripe`)
- Create your own adapter/wrapper interface
- Mock your adapter, not the library

```
// BAD — mocking library you don't own
test_payment():
    mock(PaymentLibrary.create)    // Directly patching 3rd-party API
    mock.returns({"id": "pi_123", "status": "succeeded"})
    ...

// GOOD — mock your own interface
interface PaymentGateway:
    charge(amount: Money, card: Card) -> PaymentResult

class StripeGateway implements PaymentGateway:  // Real implementation
    charge(amount, card):
        return stripe_library.create(...)

class FakePaymentGateway implements PaymentGateway:  // Test double
    charge(amount, card):
        return PaymentResult(id="fake_123", status="succeeded")
```

**Why**: Library APIs change between versions. Your adapter isolates your tests from those changes.

---

## Over-Mocking Detection

### Signs of over-mocking
| Sign | Problem |
|------|---------|
| Mock setup is longer than the test | Test is hard to read and maintain |
| Test verifies call order | Coupled to implementation, fragile |
| Mocking value objects or DTOs | Unnecessary — use real ones |
| Mocking the class under test | You're not testing anything real |
| `verify` for every method call | Testing implementation, not behavior |
| Test breaks when refactoring without behavior change | False positive — mock couples to internals |
| Deeply nested mock returns (`mock.a.b.c.return_value`) | Law of Demeter violation in production code |

### How to fix over-mocking
1. **Replace mocks with fakes** for complex dependencies
2. **Use real objects** for in-process dependencies
3. **Extract interfaces** at architectural boundaries only
4. **Test behavior, not interactions** — prefer asserting on output/state
5. **Push logic into pure functions** — they need no mocks at all
6. **Question the design** — if you need 5 mocks, the class has too many dependencies

---

