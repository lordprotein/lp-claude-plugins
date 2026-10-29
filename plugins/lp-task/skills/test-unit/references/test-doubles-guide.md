# Test Doubles Guide

## Types

| Double | Purpose |
|--------|---------|
| **Dummy** | Fills a required parameter, never used (`NullLogger`) |
| **Stub** | Canned responses, provides input to the SUT (incoming) |
| **Spy** | Wraps a real or fake object, records calls for later verification |
| **Mock** | Verifies outgoing interactions, fails if expected calls don't happen |
| **Fake** | Working simplified implementation (in-memory DB, fake file system, fake HTTP server) |

Never assert on stubs, they are just setup. Assert on mocks or on the result.

## Default: Classical School

- Unit = a unit of behavior (may span classes); isolate tests from each other, not every class from its collaborators
- Prefer state/output verification over interaction verification (better resistance to refactoring)
- Mock only **unmanaged out-of-process dependencies**: external REST/GraphQL APIs, email/SMS services, payment gateways, external message brokers (when you publish)
- Don't mock **managed dependencies** (your own DB, file storage): use the real ones in integration tests
- Never mock **in-process dependencies** (your own classes), value objects, DTOs or the standard library (use real ones or fakes)

Why: mocking managed or in-process dependencies couples tests to implementation. Changing storage layout breaks mocked tests without a behavior change: a false positive, the worst kind of failure.

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

## Prefer Fakes over Mocks

Fakes exercise real (simplified) logic, catch more bugs, don't couple to call sequence and are reusable across the suite. Mocks only verify call patterns.

```
// Mock: verifies interaction
mock_email = mock(EmailService)
UserService(email_service=mock_email).create_user("john@test.com")
verify(mock_email.send).called_once_with("john@test.com", "Welcome!")

// Fake: verifies behavior
fake_email = FakeEmailService()  // in-memory, stores sent emails
UserService(email_service=fake_email).create_user("john@test.com")
assert fake_email.sent_emails == [Email(to="john@test.com", subject="Welcome!")]
```

---

## Don't Mock What You Don't Own

- Don't mock third-party libraries directly (`requests`, `axios`, `stripe`)
- Wrap them in your own adapter interface and mock/fake the adapter

```
interface PaymentGateway:
    charge(amount: Money, card: Card) -> PaymentResult

class StripeGateway implements PaymentGateway:       // real, wraps the library
class FakePaymentGateway implements PaymentGateway:  // test double
    charge(amount, card):
        return PaymentResult(id="fake_123", status="succeeded")
```

Why: library APIs change between versions; the adapter isolates tests from that.

---

## Fixing Over-Mocking

1. **Replace mocks with fakes** for complex dependencies
2. **Use real objects** for in-process dependencies
3. **Extract interfaces** at architectural boundaries only
4. **Test behavior, not interactions**: assert on output/state
5. **Push logic into pure functions**: they need no mocks
6. **Question the design**: needing 5 mocks means the class has too many dependencies; deeply chained mock returns (`mock.a.b.c`) signal a Law of Demeter violation
