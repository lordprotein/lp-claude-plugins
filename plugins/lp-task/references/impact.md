# Impact map

What the changes of a task reach, for people who test it. Used by `test-browser` (step 2) and `how-to-test`.

## Cache

The map of every project is kept in the state as `impact.<project id>` (see `shared.md` «State»). Before building it run `git -C <path> rev-parse HEAD` and `git -C <path> status --short`: if `head` equals HEAD and the working copy has no changes, take the cached map and skip the rest of this file for that project. Otherwise build it for that project only and write it back with the new `head`. A map built in this session and still in the context is reused the same way.

## Changes

For every project, independent projects in parallel:
1. `git -C <path> diff --stat --merge-base origin/<base>` (committed and uncommitted together; add untracked new files from `git -C <path> status --short`). Test files (`*.test.*`, `*.spec.*`, `__tests__/`) are only counted from the stat (added, updated, removed) and never read.
2. The diff of the rest in one command: `git -C <path> diff --merge-base origin/<base> -- . ':!*lock*' ':!*.snap' ':!*.d.ts' ':!*.test.*' ':!*.spec.*' ':!**/__tests__/**'`, plus `':!<path>'` for generated, built files and assets (images, fonts) seen in the stat. A file with more than ~400 changed lines is read with `-U1`.

## From changed code to places

1. Collect the exported names and import paths of all changed modules (component, hook, selector, store slice, API call, util, style, locale key).
2. Find their users with one `git -C <path> grep -n -E '<name1>|<name2>|…'` per level for all modules together, never one grep per module. Go up at most 2 levels or until an entry the user sees (page, route, screen, modal, widget on several pages); if the users are still many, name the widget and say «на многих страницах».
3. Describe each place as an address a tester can follow without asking, never a file path. Leave out a part you could not establish, never invent it:
   - **area and block:** the area in the words of the UI and the block on the page by its visible title or position (`Корзина, блок «Итого» справа`, `шапка`, `модалка «Оплата»`);
   - **page:** the route path from the router config without domain and protocol, a sample value for parameters (`/product/123`); a path really used in a check (`checks[].where`, `reproduction.where`) wins over a derived one, its domain dropped;
   - **how to get there:** the click path with the visible names of menu items, tabs and buttons (`Каталог → Электроника → любой товар`). Take all needed names with one `git grep` by all locale keys in the translations of the main language, never print a key;
   - **precondition:** what to do so the element appears, if it is not visible at once;
   - **what to look at:** the element and its visible text or look.

   Several places sharing one widget: one address with the shortest path, the other pages listed after it.

Also note, when the diff has them:
- locales: which keys and languages changed, where the texts are shown;
- API: requests and request or response fields used differently, analytics events;
- feature flags, config, permissions or roles that switch the behaviour;
- styles: shared styles, themes or breakpoints;
- storage: localStorage, cookies, cache keys;
- removals: where the removed entity used to be.

## Severity

Every area and every risk gets the highest level that fits:
- 🟢 1: only the look or a text in one place (styles, texts, locales, markup without logic);
- 🟡 2: the behaviour of one feature changes (a new condition or state, validation, a new API field, a component on a few pages);
- 🔴 3: shared code on many pages (shared component, store, selectors, utils, hooks), routing, auth and roles, money (balance, payments, prices), the API contract, default values of flags, removals, storage.

## States

From the diff and the task, the states the changed code branches on: guest / authorized and roles, empty / loading / error / many items, flags on / off, enum values the code switches on (as in the code), mobile viewport for `mobile` projects, other languages when locales changed, reload and back navigation for routing or state changes.

## Result

A compact map per project, also what is written to the cache:
- `areas`: `{ severity, area, block, page, change }`, `change` in 2-6 words;
- `risks`: places outside the task's own scenario that use the changed code, same fields with `change` = why it may break;
- `api`, `states`, `conditions`: short strings;
- `tests`: `{ added, updated, removed }`.

Merge places that share one widget, keep it bounded.
