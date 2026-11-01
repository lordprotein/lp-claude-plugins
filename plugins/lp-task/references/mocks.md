# test-browser: mocks

Read from `skills/test-browser/SKILL.md` step 5a. Only in the «Проверка» mode; never in «Обнаружение» (a mock would fake the very data being recorded).

Do not ask the user whether to mock. For every row that came back `⚠️`, decide:
- **a mock makes it checkable** (no test data on the stand, a backend or third-party service is unavailable, the state is rare or takes long to reach, a time-bound status): mock it and check the row again;
- **a mock does not help** (a login is needed, the action itself is forbidden and is what the row checks, the environment is broken): the row stays `⚠️` with the reason.

## Choosing the mock

Take the first one that works, smallest first:
1. **A response in the page:** patch `fetch` / `XMLHttpRequest` (`javascript_tool` with Chrome, `browser_evaluate` with Playwright; there is no request interception tool), when the data comes over the network after the page loads. Re-apply the patch after every reload or navigation. Delegate the re-run to `browser-tester` with these rows and the mock (which request, what response).
2. **Data in the page:** change the store, `localStorage` or a cookie through JavaScript in the page, when there is no separate request to substitute.
3. **A temporary code mock in the working tree**, only when the data cannot be substituted in the browser (server rendering, data read at startup, a feature flag): before it remember `git -C <path> status --short` and `git -C <path> diff --stat`, mark every mock with the comment `lp-task mock`, check the rows yourself, then remove all the mocks and verify that `status` and `diff` are exactly as before. Mocks are never committed.

Mock as little as possible: only the request, the field or the value that puts the page into the row's state; everything else stays real. A mock replaces the real request completely: nothing from `forbiddenActions` is really performed.

## Result

- A mocked row is `✅ мок: <what was substituted, 3 to 6 words>` or `❌ мок: <…>` in the report table (e.g. `✅ мок: ответ корзины, статус CLOSED`).
- Its `mock` in `checks` is `{ "what": "<what was substituted>", "why": "<why the real data could not be used: the reason the row came back ⚠️>" }`.
