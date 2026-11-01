# Impact map

What the changes of a task reach, for people who test it. Used by `test-browser` (step 2) and `how-to-test`.

## Changes

For every project of the task:
1. `git -C <path> diff --stat --merge-base origin/<base>` (committed and uncommitted together; add untracked new files from `git -C <path> status --short`).
2. The diff itself: `git -C <path> diff --merge-base origin/<base> -- . ':!*lock*' ':!*.snap'`, also skipping generated and built files seen in the stat.

## From changed code to places

For every changed module (component, hook, selector, store slice, API call, util, style, locale key):
1. Find who uses it: `git -C <path> grep -n` by its import path and exported names. Repeat upward until you reach an entry the user sees: a page, a route, a screen, a modal, a widget placed on several pages. Stop after 3 levels or when the users are many; then name the widget and say «на многих страницах».
2. Describe each place as an address a tester can follow without asking, not as a file path. Its parts, in this order; leave out a part you could not establish, never invent it:
   - **page:** the route from the router config (`git grep` by the page component and by the route path) and an example URL. A URL that was really used in a check (`checks[].where`, `reproduction.where` in the state) wins over a derived one;
   - **how to get there:** the click path with the visible names of menu items, tabs and buttons (`Каталог → Электроника → любой товар`). Take the names from the translations of the project's main language by the locale key the component uses, never the key itself;
   - **precondition:** what to do so the element appears, if it is not visible at once (add an item to the cart, log in, select 2 or more items, open a live event);
   - **what to look at:** the element, its visible text or look, and where it is on the screen (`справа в панели корзины, строка товара: серая цена и подпись «…»`).

   When several places share one widget (the same panel on several pages), give one address with the shortest path and add «то же на …» for the others.

Also note, when the diff has them:
- locales: which keys and languages changed, where the texts are shown;
- API: which requests or response fields are used differently;
- feature flags, config, permissions or roles that switch the behaviour;
- styles: shared styles, themes or breakpoints (mobile and desktop widths);
- removals: where the removed entity used to be.

## States

From the diff and the task, the states the changed code branches on: guest / authorized and roles, empty / loading / error / many items, flags on / off, mobile viewport for `mobile` projects, other languages when locales changed, reload and back navigation for routing or state changes.

## Result

A short map per project: places (where), states, nearby places that may break (users of the changed code outside the task's own scenario). Keep it bounded: merge places that share one widget.
