# UI Component Testing Guide

Universal, framework-agnostic guide to **unit testing** UI components. Tests one component in isolation — dependencies are mocked/stubbed. Focuses on principles, patterns, and what to test — not specific libraries or APIs.

---

## Unit Testing vs Other Levels for UI

UI components can be tested at different levels:

| Level | What it tests | Scope |
|-------|--------------|-------|
| **Unit** | One component in isolation, dependencies mocked/stubbed | This guide |
| **Integration** | Multiple real components working together, real services | Out of scope |
| **E2E** | Full application through a real browser | Out of scope |

**This guide focuses on unit-level testing.** One component, isolated from children and external dependencies.

### What unit tests cover for UI components

- **Component contract**: given inputs (props/state) → expected render output + callbacks fired
- **Complex rendering logic**: conditional branches, computed values, derived state
- **Multiple visual states**: loading, error, empty, success, disabled, expanded, etc.
- **User interactions on the component itself**: clicks, typing, toggling — and the resulting changes to output or callback invocations

### When unit tests are especially valuable

- Component has **complex conditional rendering** (many branches, edge cases)
- Component has **many distinct states** (loading/error/empty/success/disabled)
- Component contains **non-trivial logic** (calculations, transformations, validation)
- Component has **specific a11y requirements** (ARIA roles, keyboard navigation, focus management)
- You need **fast, reliable feedback** during development (no setup overhead)

---

## Core Principle

> **"The more your tests resemble the way your software is used, the more confidence they can give you."** — Kent C. Dodds

This principle applies equally to unit tests. Even when testing a component in isolation:
- Query elements the way a user or assistive technology would find them (by role, label, text)
- Trigger events the way a user would (click, type, submit) — not programmatic state changes
- Assert on what the user sees or experiences — not internal component state
- Test through the **public contract** (props/inputs → rendered output, events → callbacks) — not through internal state or methods

Isolation does NOT mean testing implementation details. Mocking dependencies is about controlling the environment, not about inspecting internals.

---

## What to Test in UI Components

### 1. Rendering based on input

The component displays correct content given its props/inputs.

```pseudo
TEST "displays user name and email"
  RENDER UserCard WITH { name: "Alice", email: "alice@example.com" }
  ASSERT screen CONTAINS text "Alice"
  ASSERT screen CONTAINS text "alice@example.com"
```

### 2. User interactions

Clicks, keyboard input, form fills lead to expected UI changes.

```pseudo
TEST "toggles menu on button click"
  RENDER Navigation
  ASSERT menu IS NOT visible
  CLICK button WITH label "Open menu"
  ASSERT menu IS visible
  CLICK button WITH label "Close menu"
  ASSERT menu IS NOT visible
```

### 3. Component states

Every rendering branch: loading, error, empty, success.

```pseudo
TEST "shows loading spinner while data is fetching"
  RENDER UserList WITH { loading: true }
  ASSERT screen CONTAINS element WITH role "progressbar"
  ASSERT screen DOES NOT CONTAIN text "No users found"

TEST "shows error message on failure"
  RENDER UserList WITH { error: "Network error" }
  ASSERT screen CONTAINS text "Network error"
  ASSERT screen CONTAINS button "Retry"

TEST "shows empty state when no data"
  RENDER UserList WITH { users: [] }
  ASSERT screen CONTAINS text "No users found"
```

### 4. Conditional rendering

Elements appear/disappear based on conditions.

```pseudo
TEST "shows admin badge only for admin users"
  RENDER UserCard WITH { role: "admin" }
  ASSERT screen CONTAINS text "Admin"

  RENDER UserCard WITH { role: "viewer" }
  ASSERT screen DOES NOT CONTAIN text "Admin"
```

### 5. Forms

Validation, submission, button states.

```pseudo
TEST "disables submit until form is valid"
  RENDER LoginForm
  ASSERT button "Submit" IS disabled

  TYPE "user@email.com" INTO field WITH label "Email"
  TYPE "password123" INTO field WITH label "Password"
  ASSERT button "Submit" IS enabled

TEST "shows validation error for invalid email"
  RENDER LoginForm
  TYPE "not-an-email" INTO field WITH label "Email"
  CLICK button "Submit"
  ASSERT screen CONTAINS text "Please enter a valid email"

TEST "calls onSubmit with form data"
  CREATE spy onSubmit
  RENDER LoginForm WITH { onSubmit: spy }
  TYPE "user@email.com" INTO field WITH label "Email"
  TYPE "password123" INTO field WITH label "Password"
  CLICK button "Submit"
  ASSERT onSubmit WAS CALLED WITH { email: "user@email.com", password: "password123" }
```

### 6. Accessibility (a11y)

ARIA roles, labels, keyboard navigation, focus management.

```pseudo
TEST "dialog is accessible"
  RENDER ConfirmDialog WITH { open: true, title: "Delete item?" }
  ASSERT element WITH role "dialog" EXISTS
  ASSERT dialog HAS attribute "aria-labelledby" POINTING TO "Delete item?"
  ASSERT focus IS ON first focusable element inside dialog

TEST "supports keyboard navigation"
  RENDER Dropdown WITH { options: ["A", "B", "C"] }
  CLICK button "Select option"
  PRESS key "ArrowDown"
  ASSERT option "A" IS focused
  PRESS key "ArrowDown"
  ASSERT option "B" IS focused
  PRESS key "Enter"
  ASSERT selected value IS "B"
```

### 7. Callbacks and events

Event handlers are called with correct arguments.

```pseudo
TEST "calls onDelete with item id"
  CREATE spy onDelete
  RENDER ItemRow WITH { id: 42, name: "Widget", onDelete: spy }
  CLICK button "Delete"
  ASSERT onDelete WAS CALLED WITH 42

TEST "calls onChange on every keystroke"
  CREATE spy onChange
  RENDER SearchInput WITH { onChange: spy }
  TYPE "hello" INTO field WITH label "Search"
  ASSERT onChange WAS CALLED 5 times
  ASSERT onChange LAST CALLED WITH "hello"
```

---

## What NOT to Test (Implementation Details)

These are **implementation details** — they describe HOW a component works internally, not WHAT it does for the user. Testing them creates **fragile tests** that break on refactoring without catching real bugs.

### Internal state variables
```pseudo
// BAD — testing internal state
TEST "sets isOpen state to true"
  RENDER Dropdown
  CLICK button "Toggle"
  ASSERT component.state.isOpen IS true   // ← implementation detail!

// GOOD — testing visible behavior
TEST "shows dropdown content after toggle"
  RENDER Dropdown
  CLICK button "Toggle"
  ASSERT dropdown content IS visible
```

### Internal method names
```pseudo
// BAD — testing that a method exists or was called internally
ASSERT component.handleClick WAS CALLED   // ← implementation detail!

// GOOD — testing the outcome of the click
CLICK button "Save"
ASSERT success message IS visible
```

### CSS classes and inline styles
```pseudo
// BAD — testing CSS implementation
ASSERT element HAS class "btn-primary-active"   // ← implementation detail!

// GOOD — testing visible behavior
ASSERT button "Submit" IS visible
ASSERT button "Submit" IS enabled
```

### Lifecycle methods
```pseudo
// BAD — testing that componentDidMount or useEffect ran
ASSERT component.componentDidMount WAS CALLED   // ← implementation detail!

// GOOD — testing the outcome of the lifecycle
RENDER UserProfile WITH { userId: 1 }
WAIT FOR text "Alice" TO APPEAR   // ← the actual effect
```

### Third-party library behavior
```pseudo
// BAD — testing that a date library formats correctly
// That's the library's job, not yours

// GOOD — testing that YOUR component displays the formatted date
RENDER EventCard WITH { date: "2024-01-15" }
ASSERT screen CONTAINS text "January 15, 2024"
```

### Exact DOM structure
```pseudo
// BAD — testing DOM nesting
ASSERT container HAS child div WITH child span WITH text "Hello"   // ← brittle!

// GOOD — testing what the user sees
ASSERT screen CONTAINS text "Hello"
```

---

## Element Query Priority

When finding elements in tests, follow this priority order. The higher the priority, the more the query resembles how users and assistive technology interact with the page.

### Priority 1: By role / semantics (highest confidence)
```pseudo
FIND button WITH name "Submit"
FIND heading WITH name "Welcome"
FIND navigation
FIND dialog WITH name "Confirm deletion"
FIND checkbox WITH name "Remember me"
```

**Why**: Screen readers and users interact with the page through roles. If your component isn't accessible by role, it may have an accessibility problem.

### Priority 2: By label
```pseudo
FIND field WITH label "Email address"
FIND field WITH label "Password"
```

**Why**: This is how users find form fields — by reading labels. It also tests that your labels are properly associated.

### Priority 3: By visible text
```pseudo
FIND element WITH text "No results found"
FIND link WITH text "Learn more"
```

**Why**: Text is what the user reads. If the text is visible, querying by it is natural.

### Priority 4: By test-id (last resort)
```pseudo
FIND element WITH test-id "complex-chart-container"
```

**Why**: The user doesn't see test-ids. Use them only when the element has no accessible role, label, or meaningful text. Common for non-interactive container elements or complex visualizations.

---

## Test Doubles for UI

### Child components

In unit tests, **mock/stub child components by default** if they contain logic, side effects, or heavy dependencies. This keeps the test focused on the component under test.

**Render real children only when** they are simple presentational components (a button, an icon, a label) with no logic or side effects.

```pseudo
// Mocking a complex child — we're testing Dashboard, not Chart
MOCK ChartComponent AS simple div WITH test-id "chart-placeholder"
MOCK UserList AS simple div WITH text "users"

RENDER Dashboard WITH { revenue: 1000 }
ASSERT screen CONTAINS element WITH test-id "chart-placeholder"
ASSERT screen CONTAINS text "Revenue: $1,000"
```

```pseudo
// Simple presentational child — no need to mock
// Badge is a pure UI element with no logic or side effects
RENDER UserCard WITH { name: "Alice", role: "admin" }
ASSERT screen CONTAINS text "Alice"
ASSERT screen CONTAINS text "Admin"   // rendered by real Badge child
```

### API calls

**Preferred for unit tests: mock at module level** — stub/mock the service or HTTP client directly.

```pseudo
MOCK userService.getUsers() RETURNS [{ id: 1, name: "Alice" }]

RENDER UserList
WAIT FOR text "Alice" TO APPEAR
ASSERT screen CONTAINS text "Alice"
```

**Why module-level mocking fits unit tests:**
- Isolates the component from the real service layer
- Fast, no network setup required
- Clear dependency boundary — you control exactly what the service returns

**Alternative**: Network-level interception (e.g., MSW) is also acceptable but closer to integration testing style.

### Browser APIs

Mock APIs that don't exist in the test environment:

```pseudo
// localStorage
MOCK localStorage.getItem("theme") RETURNS "dark"
RENDER App
ASSERT app HAS dark theme applied

// matchMedia
MOCK matchMedia("(prefers-color-scheme: dark)") RETURNS { matches: true }
RENDER App
ASSERT app RENDERS in dark mode
```

---

## Snapshot Testing

### When snapshots are useful
- **Small, stable components** (icons, badges, static layouts) where the full output is meaningful
- **Regression detection** for components with complex conditional rendering
- **Serialized data structures** (not DOM) — e.g., generated CSS, config objects

### When snapshots are harmful
- **Large component trees** — huge snapshots that nobody reviews on change
- **Frequently changing components** — snapshot updates become routine and meaningless
- **Dynamic content** — dates, random IDs, animations → constant false failures

### Snapshot rules
1. Keep snapshots **small and focused** — snapshot a specific element, not the whole page
2. **Review every snapshot update** — if you blindly accept updates, snapshots provide zero value
3. Use **inline snapshots** where the framework supports them — keeps expected output near the test
4. **Name snapshots meaningfully** — the snapshot description should explain what state is captured
5. Never snapshot implementation details (CSS classes, internal IDs)

```pseudo
TEST "renders badge correctly for each status"
  RENDER Badge WITH { status: "success" }
  ASSERT snapshot MATCHES inline:
    <span role="status">Success</span>

  RENDER Badge WITH { status: "error" }
  ASSERT snapshot MATCHES inline:
    <span role="status">Error</span>
```

---

## UI Testing Antipatterns

### 1. Testing implementation details
See "What NOT to Test" section above — test visible behavior, not internal state, methods, or CSS classes.

### 2. Testing component tree structure instead of behavior
```pseudo
// BAD — asserting that child components exist in the tree
RENDER Page
ASSERT contains <Header />
ASSERT contains <UserList />
ASSERT contains <Footer />
// This tells you NOTHING about what the user actually sees

// GOOD — assert on visible output, not tree structure
RENDER Page
ASSERT screen CONTAINS heading "Welcome"
ASSERT screen CONTAINS text "3 users found"
```

**Why it's bad**: Checking for the presence of child component types verifies the component's **structure**, not its **behavior**. The test passes even if `<Header />` renders nothing useful. Assert on what the user sees instead.

### 3. Programmatic events instead of realistic user actions
```pseudo
// BAD — directly calling the handler
component.props.onChange({ target: { value: "hello" } })

// GOOD — simulating real user action
TYPE "hello" INTO field WITH label "Search"
```

**Why it's bad**: Programmatic events skip validation, event bubbling, and other real browser behaviors. They test a code path that real users never take.

### 4. Giant snapshot tests
```pseudo
// BAD — full page snapshot (500+ lines)
RENDER EntireApplication
ASSERT snapshot MATCHES   // ← nobody will review this

// GOOD — focused snapshot of a small, meaningful part
RENDER StatusBadge WITH { status: "active" }
ASSERT snapshot MATCHES inline: <span class="badge">Active</span>
```

**Why it's bad**: Giant snapshots are never reviewed. Developers blindly update them. They provide zero confidence while adding maintenance cost.

### 5. Asserting on CSS classes instead of behavior
See "CSS classes and inline styles" in "What NOT to Test" above. Test actual disabled/visible/enabled state, not class names.

### 6. Not waiting for async operations
```pseudo
// BAD — asserting immediately after async action
RENDER UserList   // fetches data on mount
ASSERT screen CONTAINS text "Alice"   // ← may fail if data hasn't loaded yet

// GOOD — waiting for the async result
RENDER UserList
WAIT FOR text "Alice" TO APPEAR
ASSERT screen CONTAINS text "Alice"
```

**Why it's bad**: Creates flaky tests that pass or fail depending on timing. Always wait for the expected outcome to appear.

### 7. Testing third-party component internals
```pseudo
// BAD — testing how the date picker library works internally
RENDER DatePicker
ASSERT calendar grid HAS 42 cells
ASSERT month header shows "January"

// GOOD — testing YOUR integration with the date picker
RENDER EventForm
SELECT date "2024-01-15" IN date picker
CLICK button "Save"
ASSERT onSave WAS CALLED WITH { date: "2024-01-15" }
```

**Why it's bad**: The third-party library has its own tests. Test YOUR usage of it, not its internals.

---

## Summary

| Principle | Description |
|-----------|-------------|
| Test behavior, not implementation; query like a user | Assert on what user sees. Role → Label → Text → test-id |
| Isolate the component | Mock dependencies, test one component's contract |
| Mock at the boundary | Stub services/children, keep the component under test focused |
| Keep snapshots small; wait for async | Focused snapshots, always reviewed. Never assert on async results synchronously |
| Cover all states | Loading, error, empty, success |
| Test accessibility | Roles, labels, keyboard, focus management |
