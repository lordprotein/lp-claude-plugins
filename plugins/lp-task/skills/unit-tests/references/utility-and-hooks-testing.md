# Utility and Hooks Testing Guide

Universal, framework-agnostic guide to testing utility functions, helpers, pure functions, hooks/composables, and other shared code. Focuses on principles and patterns — not specific libraries.

---

## Utility Classification

| Category | Characteristics | Testing approach |
|----------|----------------|-----------------|
| **Pure functions** | No side effects, same input → same output | Output-based testing, parameterized tests |
| **Transformers** | Map data from one shape to another | Input/output pairs, edge cases |
| **Validators** | Return boolean or error for given input | Decision tables, boundary values |
| **Formatters** | Convert values to display strings | Locale-aware cases, edge values |
| **Parsers** | Extract structured data from raw input | Valid/invalid input, malformed data |
| **Hooks / Composables** | Stateful logic extracted from UI | Test via wrapper or dedicated utility |
| **Side-effect utilities** | Interact with storage, clipboard, cookies | Mock external APIs |
| **Async utilities** | Debounce, throttle, retry, polling | Fake timers, controlled promises |

---

## Pure Functions — The Ideal Test Subject

Pure functions are the **best candidates for unit testing**:
- Deterministic: same input always produces same output
- No dependencies to mock
- No side effects to verify
- Easy to write, fast to run

**Strategy**: output-based testing — provide input, assert output.

```pseudo
TEST "adds two numbers"
  ASSERT add(2, 3) EQUALS 5

TEST "concatenates strings with separator"
  ASSERT join(["a", "b", "c"], "-") EQUALS "a-b-c"
```

---

## Parameterized Tests

Parameterized (table-driven) tests are the **primary tool for utilities** — see `test-design-patterns.md` for the full pattern. For utilities, use tables to map input-output pairs:

```pseudo
TEST "validates email addresses"
  TABLE:
    | input              | valid |
    | "user@example.com" | true  |
    | "user@"            | false |
    | ""                 | false |
    | "no-at-sign"       | false |

  FOR EACH row IN TABLE:
    ASSERT isValidEmail(row.input) EQUALS row.valid
```

---

## Boundary Value Analysis

Apply boundary analysis from `business-logic-testing.md`. For utilities, pay special attention to: empty strings, `null`/`undefined`, `NaN`/`Infinity`, floating-point precision, unicode/special characters, and truthy/falsy coercion.

---

## Testing by Utility Category

### Formatters (dates, currency, strings)

```pseudo
TEST "formats currency"
  TABLE:
    | amount   | currency | locale  | expected      |
    | 1000     | "USD"    | "en-US" | "$1,000.00"   |
    | 1000     | "EUR"    | "de-DE" | "1.000,00 €"  |
    | 0        | "USD"    | "en-US" | "$0.00"        |
    | -50.5    | "USD"    | "en-US" | "-$50.50"      |
    | 0.1+0.2 | "USD"    | "en-US" | "$0.30"        | // floating point!

  FOR EACH row IN TABLE:
    ASSERT formatCurrency(row.amount, row.currency, row.locale) EQUALS row.expected
```

### Validators

```pseudo
TEST "validates password strength"
  TABLE:
    | password      | expected          | reason                    |
    | ""            | { valid: false }  | empty                     |
    | "short"       | { valid: false }  | too short                 |
    | "nouppercase1"| { valid: false }  | no uppercase              |
    | "NOLOWER1"    | { valid: false }  | no lowercase              |
    | "NoDigits"    | { valid: false }  | no digit                  |
    | "Valid1Pass"  | { valid: true }   | meets all criteria        |

  FOR EACH row IN TABLE:
    ASSERT validatePassword(row.password).valid EQUALS row.expected.valid
```

### Parsers

```pseudo
TEST "parses query string"
  TABLE:
    | input                    | expected                          |
    | ""                       | {}                                |
    | "?a=1"                   | { a: "1" }                       |
    | "?a=1&b=2"               | { a: "1", b: "2" }               |
    | "?a=1&a=2"               | { a: ["1", "2"] }                | // duplicate keys
    | "?key=hello%20world"     | { key: "hello world" }            | // encoded
    | "?empty="                | { empty: "" }                     | // empty value
    | "?novalue"               | { novalue: "" }                   | // no value

  FOR EACH row IN TABLE:
    ASSERT parseQueryString(row.input) DEEP EQUALS row.expected
```

### Data Transformers

```pseudo
TEST "groups items by category"
  INPUT = [
    { name: "Apple", category: "Fruit" },
    { name: "Carrot", category: "Vegetable" },
    { name: "Banana", category: "Fruit" }
  ]

  EXPECTED = {
    "Fruit": [{ name: "Apple", ... }, { name: "Banana", ... }],
    "Vegetable": [{ name: "Carrot", ... }]
  }

  ASSERT groupBy(INPUT, "category") DEEP EQUALS EXPECTED

TEST "groupBy with empty array"
  ASSERT groupBy([], "key") DEEP EQUALS {}

TEST "groupBy with missing key"
  INPUT = [{ name: "Apple" }]   // no "category" key
  ASSERT groupBy(INPUT, "category") DEEP EQUALS { undefined: [{ name: "Apple" }] }
```

### Debounce / Throttle

```pseudo
TEST "debounce delays execution until pause"
  USE fake timers
  CREATE spy callback
  SET debounced = debounce(callback, 300)

  debounced()
  debounced()
  debounced()

  ASSERT callback WAS NOT CALLED

  ADVANCE time BY 300ms

  ASSERT callback WAS CALLED 1 time

TEST "throttle limits execution rate"
  USE fake timers
  CREATE spy callback
  SET throttled = throttle(callback, 100)

  throttled()   // executes immediately
  ASSERT callback WAS CALLED 1 time

  ADVANCE time BY 50ms
  throttled()   // throttled — no execution

  ADVANCE time BY 50ms   // 100ms total
  ASSERT callback WAS CALLED 2 times
```

### Deep Clone / Merge

```pseudo
TEST "deep clone produces independent copy"
  SET original = { a: 1, nested: { b: 2 } }
  SET clone = deepClone(original)
  ASSERT clone DEEP EQUALS original
  MUTATE clone.nested.b = 99
  ASSERT original.nested.b EQUALS 2   // original unchanged!
```

Key: always verify that mutations to the result don't affect the original (test immutability).

---

## Hooks / Composables

Hooks (React), composables (Vue), or similar patterns extract **stateful logic** from UI components. They sit between pure functions and UI components.

### Testing strategy

**Option A: Test via dedicated hook-testing utility** (preferred when available)

```pseudo
TEST "useCounter increments and decrements"
  SET { result } = RENDER HOOK useCounter(initialValue: 0)

  ASSERT result.current.count EQUALS 0

  ACT: result.current.increment()
  ASSERT result.current.count EQUALS 1

  ACT: result.current.decrement()
  ASSERT result.current.count EQUALS 0
```

**Option B: Test through a minimal wrapper component**

```pseudo
TEST "useCounter works through component"
  DEFINE TestComponent:
    SET { count, increment } = useCounter(0)
    RENDER button "{count}" ON CLICK increment

  RENDER TestComponent
  ASSERT screen CONTAINS text "0"
  CLICK button "0"
  ASSERT screen CONTAINS text "1"
```

### Hooks with side effects

```pseudo
TEST "useLocalStorage reads and writes"
  MOCK localStorage
  SET { result } = RENDER HOOK useLocalStorage("theme", "light")

  ASSERT result.current.value EQUALS "light"
  ASSERT localStorage.getItem WAS CALLED WITH "theme"

  ACT: result.current.setValue("dark")
  ASSERT localStorage.setItem WAS CALLED WITH "theme", "dark"
  ASSERT result.current.value EQUALS "dark"
```

### Async hooks

```pseudo
TEST "useFetch returns data after loading"
  INTERCEPT GET "/api/user" RESPOND WITH { name: "Alice" }

  SET { result } = RENDER HOOK useFetch("/api/user")

  // Initial state
  ASSERT result.current.loading EQUALS true
  ASSERT result.current.data EQUALS null

  // After fetch completes
  WAIT FOR result.current.loading EQUALS false
  ASSERT result.current.data DEEP EQUALS { name: "Alice" }
  ASSERT result.current.error EQUALS null

TEST "useFetch handles errors"
  INTERCEPT GET "/api/user" RESPOND WITH status 500

  SET { result } = RENDER HOOK useFetch("/api/user")

  WAIT FOR result.current.loading EQUALS false
  ASSERT result.current.error IS NOT null
  ASSERT result.current.data EQUALS null
```

---

## Utilities with Side Effects

Utilities that interact with **external APIs** (storage, clipboard, cookies, etc.) need their external dependencies mocked.

```pseudo
TEST "saveToClipboard writes text"
  MOCK navigator.clipboard.writeText RESOLVES undefined

  AWAIT saveToClipboard("Hello")
  ASSERT navigator.clipboard.writeText WAS CALLED WITH "Hello"

TEST "getCookie returns value for existing cookie"
  MOCK document.cookie = "theme=dark; lang=en"
  ASSERT getCookie("theme") EQUALS "dark"
  ASSERT getCookie("lang") EQUALS "en"
  ASSERT getCookie("missing") EQUALS null
```

---

## Error Handling in Utilities

Every utility should be tested for **invalid and unexpected input**.

```pseudo
TEST "handles invalid input gracefully"
  TABLE:
    | input     | expected            |
    | null      | throws TypeError    |
    | undefined | throws TypeError    |
    | 42        | throws TypeError    | // wrong type
    | ""        | returns ""          | // valid but empty

  FOR EACH row IN TABLE:
    IF row.expected STARTS WITH "throws":
      ASSERT formatName(row.input) THROWS expected error type
    ELSE:
      ASSERT formatName(row.input) EQUALS row.expected

TEST "parseInt wrapper handles edge cases"
  ASSERT safeParseInt("42") EQUALS 42
  ASSERT safeParseInt("3.14") EQUALS 3
  ASSERT safeParseInt("abc") EQUALS null      // not NaN!
  ASSERT safeParseInt("") EQUALS null
  ASSERT safeParseInt(null) EQUALS null
  ASSERT safeParseInt("0xFF") EQUALS 255      // or null, depending on spec
```

---

## Antipatterns

### 1. Don't test trivial wrappers (one-line delegation)

```pseudo
// The function:
FUNCTION formatDate(date):
  RETURN dateLibrary.format(date, "YYYY-MM-DD")

// BAD — testing that a library works
TEST "formatDate formats correctly"
  ASSERT formatDate(someDate) EQUALS "2024-01-15"
  // This tests the date library, not your code!

// GOOD — only test if there's meaningful logic (branching, conditionals)
// formatEventDate has if/else for isAllDay → worth testing
TEST "formatEventDate uses short format for all-day events"
  ASSERT formatEventDate({ date: someDate, isAllDay: true }) EQUALS "Jan 15"

TEST "formatEventDate includes time for timed events"
  ASSERT formatEventDate({ date: someDate, isAllDay: false }) EQUALS "Jan 15, 2:00 PM"
```

### 2. Don't duplicate function logic in the test

```pseudo
// BAD — the test reimplements the function
TEST "calculates discount"
  SET price = 100
  SET discount = 0.15
  SET expected = price - (price * discount)   // ← duplicating logic!
  ASSERT calculateDiscount(price, discount) EQUALS expected

// GOOD — use pre-calculated expected values
TEST "calculates discount"
  ASSERT calculateDiscount(100, 0.15) EQUALS 85
  ASSERT calculateDiscount(200, 0.10) EQUALS 180
  ASSERT calculateDiscount(50, 0) EQUALS 50
```

### 3. Don't test the standard library

```pseudo
// BAD — testing that Array.sort works
TEST "sorts numbers"
  ASSERT [3, 1, 2].sort() EQUALS [1, 2, 3]

// GOOD — test YOUR sorting logic that uses the standard library
TEST "sorts users by registration date, newest first"
  SET users = [
    { name: "Alice", registered: "2024-01-01" },
    { name: "Bob", registered: "2024-06-01" }
  ]
  SET sorted = sortUsersByDate(users, "desc")
  ASSERT sorted[0].name EQUALS "Bob"
```

### 4. Don't ignore async behavior

```pseudo
// BAD — no await, test always passes
TEST "fetches config"
  fetchConfig()   // fire and forget!
  ASSERT config IS loaded   // might check stale state

// GOOD — properly await async operations
TEST "fetches config"
  AWAIT fetchConfig()
  ASSERT config.apiUrl EQUALS "https://api.example.com"
```

### 5. Don't forget to test immutability

```pseudo
// BAD — only testing the return value
TEST "filters active users"
  SET users = [{ active: true }, { active: false }]
  SET result = filterActive(users)
  ASSERT result.length EQUALS 1
  // But did filterActive mutate the original array?

// GOOD — also verify the original is unchanged
TEST "filters active users without mutating input"
  SET users = [{ active: true }, { active: false }]
  SET original = deepClone(users)
  SET result = filterActive(users)
  ASSERT result.length EQUALS 1
  ASSERT users DEEP EQUALS original   // input unchanged!
```

---

## Key Principles

Parameterized tests first. Boundary analysis at every edge. Output-based assertions. Verify immutability. Mock only at external boundaries. Skip trivial wrappers and standard library tests.
