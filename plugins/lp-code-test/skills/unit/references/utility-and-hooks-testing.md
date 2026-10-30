# Utility and Hooks Testing Guide

Framework-agnostic guide to testing utilities, helpers, pure functions, hooks/composables and other shared code.

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

Pure functions are the ideal subject: deterministic, nothing to mock, output-based (input → assert output).

Parameterized (table-driven) tests are the primary tool for utilities (pattern in `test-design-patterns.md`). Apply boundary analysis from `business-logic-testing.md`, with special attention to: empty strings, `null`/`undefined`, `NaN`/`Infinity`, floating-point precision, unicode/special characters, truthy/falsy coercion.

---

## Testing by Category

**Formatters**: table of value × locale/currency → expected string. Include zero, negatives, floating point (`0.1+0.2` → `"$0.30"`), different locales (`"$1,000.00"` vs `"1.000,00 €"`).

**Validators**: one row per rule, each row breaking exactly one criterion (empty, too short, no uppercase, no digit...) plus one row meeting all criteria.

**Parsers**: empty input, single and multiple values, duplicate keys, encoded values, empty value, missing value, malformed input.

```pseudo
TEST "parses query string"
  TABLE:
    | input                | expected               |
    | ""                   | {}                     |
    | "?a=1&b=2"           | { a: "1", b: "2" }     |
    | "?a=1&a=2"           | { a: ["1", "2"] }      | // duplicate keys
    | "?key=hello%20world" | { key: "hello world" } | // encoded
    | "?novalue"           | { novalue: "" }        | // no value
  ASSERT parseQueryString(row.input) DEEP EQUALS row.expected
```

**Transformers**: typical input → expected shape, plus empty input and items missing the key (e.g. `groupBy([], "key")` → `{}`).

**Debounce / throttle**: use fake timers, never real waits.

```pseudo
TEST "debounce delays execution until pause"
  USE fake timers
  CREATE spy callback
  SET debounced = debounce(callback, 300)
  debounced(); debounced(); debounced()
  ASSERT callback WAS NOT CALLED
  ADVANCE time BY 300ms
  ASSERT callback WAS CALLED 1 time
```

Throttle: first call executes immediately, calls inside the window are dropped, next call after the window executes.

**Deep clone / merge**: assert equality AND that mutating the result leaves the original unchanged.

---

## Hooks / Composables

Hooks (React), composables (Vue) and similar extract stateful logic from UI; they sit between pure functions and components.

- **Option A (preferred when available)**: dedicated hook-testing utility.
  ```pseudo
  TEST "useCounter increments"
    SET { result } = RENDER HOOK useCounter(initialValue: 0)
    ACT: result.current.increment()
    ASSERT result.current.count EQUALS 1
  ```
- **Option B**: minimal wrapper component that renders the hook's output, then interact as a user (click button, assert text).
- **Side effects** (e.g. `useLocalStorage`): mock the external API, assert both the returned value and the outgoing write (`setItem` called with key and value).
- **Async hooks** (e.g. `useFetch`): assert the initial state (`loading: true`, `data: null`), WAIT FOR loading to finish, then assert data and `error: null`. Separate test for the error response: `error` set, `data: null`.

---

## Utilities with Side Effects

Mock only the external API (clipboard, cookies, storage) and assert the observable result:

```pseudo
TEST "getCookie returns value for existing cookie"
  MOCK document.cookie = "theme=dark; lang=en"
  ASSERT getCookie("theme") EQUALS "dark"
  ASSERT getCookie("missing") EQUALS null
```

---

## Error Handling

Test every utility with invalid and unexpected input: `null`, `undefined`, wrong type, empty but valid value, unparseable strings. Split throwing and returning cases into separate tests or tables (no `if` in the test body).

```pseudo
TEST "safeParseInt handles edge cases"
  ASSERT safeParseInt("42") EQUALS 42
  ASSERT safeParseInt("abc") EQUALS null      // not NaN!
  ASSERT safeParseInt("") EQUALS null
  ASSERT safeParseInt(null) EQUALS null
```

---

## Utility Antipatterns

1. **Testing trivial wrappers**: a one-line delegation to a library (`dateLibrary.format(date, "YYYY-MM-DD")`) tests the library. Test only wrappers with real logic (e.g. branching on `isAllDay`).
2. **Duplicating function logic in the test**: never compute expected values with the same formula (`price - price * discount`). Use pre-calculated literals: `calculateDiscount(100, 0.15) EQUALS 85`.
3. **Testing the standard library**: not `[3, 1, 2].sort()`, but YOUR logic on top of it (`sortUsersByDate(users, "desc")`).
4. **Ignoring async**: always await async calls before asserting; fire-and-forget tests pass on stale state.
5. **Forgetting immutability**: besides the return value, assert the input is unchanged (compare against a deep clone taken before the call).

Summary: parameterized tests first, boundaries at every edge, output-based assertions, verify immutability, mock only external boundaries.
