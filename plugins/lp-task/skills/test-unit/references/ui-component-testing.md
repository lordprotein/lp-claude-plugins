# UI Component Testing Guide

Framework-agnostic guide to unit testing one UI component in isolation.

Unit tests cover the component contract (inputs → render output + callbacks), complex conditional rendering, derived values, all visual states (loading, error, empty, success, disabled, expanded) and interactions on the component itself. They are most valuable for many branches or states, non-trivial logic, and specific a11y requirements (roles, keyboard, focus).

## Core Principle

Tests should resemble how the software is used, even in isolation:
- Query elements the way a user or assistive technology finds them (role, label, text)
- Trigger events the way a user would (click, type, submit), never programmatic state changes or calling handlers directly (`props.onChange(...)` skips validation and bubbling)
- Assert on what the user sees, not internal state
- Test through the public contract (props/inputs → output, events → callbacks)

Isolation means controlling the environment, not inspecting internals.

---

## What to Test

One example per category; cover every category that applies.

1. **Rendering from input**: correct content for given props.
2. **User interactions**: clicks, keyboard, form fills change the UI.
   ```pseudo
   TEST "toggles menu on button click"
     RENDER Navigation
     ASSERT menu IS NOT visible
     CLICK button WITH label "Open menu"
     ASSERT menu IS visible
   ```
3. **Component states**: every branch (loading, error, empty, success).
   ```pseudo
   TEST "shows error message on failure"
     RENDER UserList WITH { error: "Network error" }
     ASSERT screen CONTAINS text "Network error"
     ASSERT screen CONTAINS button "Retry"
   ```
4. **Conditional rendering**: elements appear/disappear by condition (e.g. admin badge only for admins, absent for viewers).
5. **Forms**: validation messages, submit disabled until valid, submit payload.
   ```pseudo
   TEST "calls onSubmit with form data"
     CREATE spy onSubmit
     RENDER LoginForm WITH { onSubmit: spy }
     TYPE "user@email.com" INTO field WITH label "Email"
     TYPE "password123" INTO field WITH label "Password"
     CLICK button "Submit"
     ASSERT onSubmit WAS CALLED WITH { email: "user@email.com", password: "password123" }
   ```
6. **Accessibility**: ARIA roles, labels (`aria-labelledby`), keyboard navigation, focus management.
   ```pseudo
   TEST "supports keyboard navigation"
     RENDER Dropdown WITH { options: ["A", "B", "C"] }
     CLICK button "Select option"
     PRESS key "ArrowDown"
     ASSERT option "A" IS focused
     PRESS key "Enter"
     ASSERT selected value IS "A"
   ```
7. **Callbacks and events**: handlers called with correct arguments and count (e.g. `onDelete` with item id, `onChange` once per keystroke with last value).

---

## What NOT to Test (Implementation Details)

These break on refactoring without catching bugs. Assert the visible outcome instead:

| Don't assert | Assert instead |
|--------------|----------------|
| Internal state (`state.isOpen`) | Content is visible after toggle |
| Internal methods called (`handleClick`) | Outcome of the click (success message) |
| CSS classes / inline styles (`btn-primary-active`) | Element visible / enabled / disabled |
| Lifecycle ran (`componentDidMount`, `useEffect`) | Its effect (`WAIT FOR text "Alice"`) |
| Exact DOM nesting (div > span > text) | `screen CONTAINS text "Hello"` |
| Child component types in tree (`contains <Header />`) | Visible output (heading, "3 users found") |
| Third-party library behavior or internals (date formatting, date picker grid) | YOUR usage: displayed formatted date, `onSave` called with picked date |

---

## Element Query Priority

1. **By role / semantics** (button, heading, dialog, checkbox WITH name): how users and screen readers navigate; if not findable by role, it may be an a11y problem.
2. **By label**: how users find form fields; also verifies label association.
3. **By visible text**: what the user reads.
4. **By test-id**: last resort, only when there is no role, label or meaningful text (containers, complex visualizations).

---

## Test Doubles for UI

**Child components**: mock/stub by default if they contain logic, side effects or heavy dependencies. Render real children only when they are simple presentational ones (button, icon, label, badge) with no logic.

```pseudo
MOCK ChartComponent AS simple div WITH test-id "chart-placeholder"
RENDER Dashboard WITH { revenue: 1000 }
ASSERT screen CONTAINS element WITH test-id "chart-placeholder"
ASSERT screen CONTAINS text "Revenue: $1,000"
```

**API calls**: preferred is module-level mocking of the service or HTTP client (isolated, fast, you control the returned data). Network interception (e.g. MSW) is acceptable but closer to integration style.

```pseudo
MOCK userService.getUsers() RETURNS [{ id: 1, name: "Alice" }]
RENDER UserList
WAIT FOR text "Alice" TO APPEAR
```

**Browser APIs** missing in the test environment (`localStorage`, `matchMedia`, etc.): mock them and assert the visible result (e.g. dark theme applied).

**Async**: never assert right after an async action; always wait for the expected outcome to appear, otherwise tests are flaky.

---

## Snapshot Testing

**Useful for**: small stable components (icons, badges, static layouts), regression detection on complex conditional rendering, serialized non-DOM data (generated CSS, config objects).

**Harmful for**: large trees (nobody reviews them, updates get blindly accepted), frequently changing components, dynamic content (dates, random IDs, animations).

**Rules**:
1. Keep snapshots small: a specific element, never the whole page or app
2. Review every snapshot update, blind acceptance gives zero value
3. Prefer inline snapshots where supported
4. Name snapshots by the captured state
5. Never snapshot implementation details (CSS classes, internal IDs)

```pseudo
TEST "renders badge for success status"
  RENDER Badge WITH { status: "success" }
  ASSERT snapshot MATCHES inline:
    <span role="status">Success</span>
```
