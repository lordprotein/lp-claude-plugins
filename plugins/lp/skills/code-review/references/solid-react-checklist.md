# SOLID in React — Smell Prompts & Patterns

React does not use classical OOP, but SOLID principles map directly to components, hooks, and module boundaries. This checklist helps catch violations specific to React codebases.

---

## SRP (Single Responsibility)

### God-hooks

A hook that does too many unrelated things. Typical signs:

- Returns an object with 5+ fields
- Consumers use only 1-2 fields from the returned object
- Hook name is vague (`useData`, `usePageLogic`, `useFetch`)
- Hook mixes fetching, filtering, side effects, and UI state

```tsx
// Bad: god-hook with 6 responsibilities
const useOrderManager = () => {
  // 1. fetch
  // 2. pagination
  // 3. toggle status
  // 4. reset filters
  // 5. reset search
  // 6. loading state
  return { isLoading, isLoadingNext, fetchOrders, fetchNextOrders, resetDate, toggleStatus, resetSearch }
}

// Good: split by responsibility
const useOrdersFetch = () => { /* fetch + pagination */ }
const useOrdersFilters = () => { /* toggle, reset date, reset search */ }
```

**Ask**: "If I list everything this hook returns, do they all change for the same reason?"

### God-components

A component that handles multiple visual/logical concerns:

- Component has 3+ conditional rendering branches for different states (loading, empty, error, cancelled, active, archived)
- Component reads from 3+ unrelated selectors
- Component file > 80 lines of JSX
- Multiple `useMemo`/`useCallback` for unrelated computations

**Ask**: "Can I describe this component's job in one sentence without 'and'?"

### Business logic in components

- Data transformation/filtering/sorting inside component body or render
- Direct Redux dispatch calls mixed with UI rendering
- Date formatting, data parsing, string manipulation in component

```tsx
// Bad: transformation in component
const MyComponent = ({ items }) => {
  const grouped = groupBy(items, 'category.id') // business logic in render
  const sorted = Object.values(grouped).sort(...)   // more logic
  return <>{sorted.map(...)}</>
}

// Good: move to hook or selector
const MyComponent = ({ items }) => {
  const grouped = useGroupedItems(items)
  return <>{grouped.map(...)}</>
}
```

---

## OCP (Open/Closed)

### Hardcoded conditional branches

- `if (type === 'premium')` or similar type/category checks inside generic components
- Magic values that map to display logic (e.g., `status === 3 ? 'VIP' : status`)
- Adding a new type or category requires editing existing component code

```tsx
// Bad: hardcoded type logic in a generic component
{item.status === 3 && isPremium ? 'VIP' : item.status}

// Good: delegate formatting to a strategy/map
const formatStatus = STATUS_FORMATTERS[type] ?? defaultFormatter
{formatStatus(item.status)}
```

**Ask**: "If a new type or category is added, do I have to edit this component?"

### Switch/if chains on enum values

- `switch(status)` that returns different JSX or strings
- Adding a new enum value requires touching the switch

**Ask**: "Can I add a new variant by only adding code, not changing existing code?"

---

## LSP (Liskov Substitution)

### Component contract violations

- A component accepts the same props as another but silently ignores some of them
- Wrapper components that break the contract of the wrapped component
- Components that accept `children` but conditionally don't render them

```tsx
// Bad: Wrapper sometimes ignores children
const Wrapper = ({ children }) => {
  if (href) {
    return <Link to={href}>{children}</Link>
  }
  return <div>{children}</div> // OK, but creating Wrapper via useCallback is the real issue
}
```

### Unsafe type narrowing

- `as Type` casts that bypass type checking instead of runtime guards
- Props typed as `string` but actually only accept specific enum values
- Optional chaining chains (`a?.b?.c?.d`) that hide structural problems

```tsx
// Bad: unsafe cast — selector can return undefined
const code = useAppSelector(state => selectCategory(state, id)?.type)
<CategoryIcon type={code as ECategoryType} />  // crash if undefined

// Good: guard + fallback
const code = useAppSelector(state => selectCategory(state, id)?.type)
if (!code) return null
<CategoryIcon type={code} />
```

**Ask**: "If I pass unexpected data conforming to the type, does the component still behave correctly?"

---

## ISP (Interface Segregation)

### Wide hook return interfaces

The React equivalent of a fat interface. A hook returns many fields but each consumer uses only a subset.

**Detection method**:
1. List all return fields of a hook
2. For each consumer, check which fields are destructured
3. If no consumer uses > 60% of the fields — the hook is too wide

```tsx
// Bad: 3 consumers, each uses different 2 of 6 fields
const { isLoading, toggleStatus } = useOrderManager()        // StatusTabs
const { isLoading, resetDate } = useOrderManager()            // DateFilter
const { resetSearch } = useOrderManager()                      // SearchInput

// Good: split into focused hooks
const { isLoading } = useLoadingState()
const { toggleStatus } = useStatusToggle()
const { resetDate } = useDateReset()
```

### Overly broad component props

- Props interface has 10+ fields
- Some props are only relevant in certain modes/states
- Props mix data, callbacks, and render props without grouping

**Ask**: "Does every consumer provide every prop, or are most props optional/unused?"

---

## DIP (Dependency Inversion)

### Direct store coupling in components

- Components import specific selectors and actions directly from store slices
- Widget-level components dispatch Redux actions directly instead of receiving callbacks
- Components know about specific API call shapes

```tsx
// Bad: widget knows about specific store actions and selectors
import { actions } from 'store/slices/ordersSlice'
import { selectOrdersFilterCategoryId } from 'store/slices/ordersSlice'

const Widget = () => {
  dispatch(actions.setFilters({ filters: { categoryIds: [id] } }))
}

// Better: abstract through a hook
const Widget = () => {
  const { setCategoryFilter } = useOrdersFilters()
  setCategoryFilter(id)
}
```

### Tightly coupled layers

- A feature imports directly from another feature's internals
- A widget imports from a widget's non-public path
- Entity layer components depend on feature-level hooks

**Ask**: "Can I replace the data source (Redux → React Query, REST → GraphQL) without changing this component?"

---

## React-Specific Anti-patterns (Related to SOLID)

### Component-as-hook-return

Creating components inside hooks or `useCallback`. React treats each new function reference as a new component type, causing unmount/remount:

```tsx
// Bad: component created inside useCallback — remounts on href change
const Wrapper = useCallback<FC<PropsWithChildren>>(
  ({ children }) => href ? <Link to={href}>{children}</Link> : <div>{children}</div>,
  [href]
)

// Good: separate component with props
const ConditionalLink: FC<{ href?: string; children: ReactNode }> = ({ href, children }) =>
  href ? <Link to={href}>{children}</Link> : <div>{children}</div>
```

### Unnecessary useMemo for primitives

`useMemo` for `===` comparison of primitives adds overhead without benefit:

```tsx
// Bad: useMemo overhead for a simple comparison
const isActive = useMemo(() => status === 'active', [status])

// Good: direct assignment
const isActive = status === 'active'
```

### Module-level side effects

Calling `dayjs.extend()`, mutating global objects, or registering plugins at module scope. Causes issues with SSR, testing, and tree-shaking:

```tsx
// Bad: side effect at import time
dayjs.extend(updateLocale)
dayjs.updateLocale('ru', { ... })

export const MyComponent = () => { ... }

// Good: initialize in app setup or lazy init
```

