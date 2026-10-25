# Performance Checklist

## Algorithmic Complexity (Big O)

### Time Complexity Anti-patterns

- Nested loops over the same data → O(n²) instead of O(n)
- Linear search instead of hash-lookup → O(n) instead of O(1)
- Sorting inside a loop → O(n² log n)
- Recursion without memoization (fibonacci-style) → exponential complexity
- Repeated traversals of a collection when a single pass suffices
- `.includes()` / `.indexOf()` / `.find()` inside a loop → O(n²)

### Space Complexity

- Creating data copies on every iteration
- Accumulating intermediate results without necessity
- Recursion without tail-call → stack growth O(n)

### Questions to Ask

- "What is the time complexity? Space complexity?"
- "What happens at 10x / 100x / 1000x data?"
- "Can this be reduced to a single pass?"
- "Is there a more efficient data structure?"

---

## Memory Leaks & Resource Management

### Common Leak Patterns

- Subscriptions (event listeners, observers, subscriptions) without unsubscribe
- Timers (setInterval, setTimeout) without cleanup on destroy
- Closures capturing large objects
- Global collections (Map, Set, Array) growing without bounds
- Caches without TTL / without size limit / without eviction policy
- Circular references in objects preventing GC
- Retaining references to removed DOM elements (detached nodes)
- Unclosed resources: connections, file descriptors, streams

### Questions to Ask

- "Who and when releases this resource?"
- "What happens if the component/service is destroyed before the operation completes?"
- "Is the growth of this collection bounded?"
- "Is there cleanup/dispose/teardown for subscriptions and timers?"

---

## CPU & Hot Paths

- Expensive operations in hot paths (regex compile, JSON parse, crypto inside loops)
- Blocking event loop / main thread with synchronous operations
- Repeated computation of the same value without memoization
- Unnecessary deep clone / deep compare of large structures

---

## Database & I/O Performance

- N+1 queries (loop with a query per item instead of batch)
- SELECT * when only 2-3 fields are needed
- Missing indexes on frequently filtered columns
- Loading entire dataset without pagination
- Synchronous I/O in an asynchronous context

---

## Caching

- Expensive operation called repeatedly without caching
- Cache without TTL → stale data
- Cache without invalidation strategy
- Cache key collisions
- User-specific data in global cache (data leak)

---

## Rendering & UI Performance (if applicable)

- Unnecessary re-renders (recreating objects/functions on every render)
- Missing virtualization for long lists
- Heavy computations in render cycle
- Layout thrashing (alternating reads/writes of DOM properties)

---

## Profiling Mindset

### Red Flags (when to recommend profiling)

- Nested loops over data of unknown size
- Processing user input of arbitrary length
- Operations on hot path (every request, every event)
- Memory consumption growth disproportionate to input data
- Missing limits on batch size / page size / buffer size
