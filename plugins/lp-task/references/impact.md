# Impact map

What the changes of a task reach, for people who test it. Used by `test-browser` (step 2) and `how-to-test`.

## Changes

For every project of the task:
1. `git -C <path> diff --stat --merge-base origin/<base>` (committed and uncommitted together; add untracked new files from `git -C <path> status --short`).
2. The diff itself: `git -C <path> diff --merge-base origin/<base> -- . ':!*lock*' ':!*.snap'`, also skipping generated and built files seen in the stat.

## From changed code to places

For every changed module (component, hook, selector, store slice, API call, util, style, locale key):
1. Find who uses it: `git -C <path> grep -n` by its import path and exported names. Repeat upward until you reach an entry the user sees: a page, a route, a screen, a modal, a widget placed on several pages. Stop after 3 levels or when the users are many; then name the widget and say «на многих страницах».
2. Name each place the way a tester finds it: the page or screen and the visible part (`страница корзины, виджет в шапке`), with a route or URL if the router config gives one. Not file paths.

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
