# test-browser: mocks

Read from `skills/test-browser/SKILL.md` step 5a.

Only in the «Проверка» mode. If some rows came back `⚠️` (no test data, a backend or third-party service is unavailable, the state cannot be reached, the action is forbidden, and so on), never mock without asking. For every project with such rows ask (AskUserQuestion), header «Моки»: «Не удалось проверить в <label>: <rows with reasons>. Замокать?» — exactly 2 options: «Да» / «Нет».

- «Нет» — the rows stay `⚠️`.
- «Да» — mock and check these rows again:
  - prefer browser-level mocks without code changes: substitute the responses of the needed requests (patch `fetch` / `XMLHttpRequest` via `javascript_tool` with Chrome, or `browser_evaluate` with Playwright; there is no request interception tool) and re-apply them after every reload or navigation. Delegate the re-run to `browser-tester` with these rows and the mock to install (which request, what response);
  - only if the data cannot be substituted in the browser (server rendering, data from the store at startup, a feature flag) — a temporary code mock in the working tree: before it remember `git -C <path> status --short` and `git -C <path> diff --stat`, mark every mock with the comment `lp-task mock`, check the rows yourself, then remove all the mocks and verify that `status` and `diff` are exactly as before. Mocks are never committed;
  - a mock replaces the real request completely: nothing from `forbiddenActions` is really performed;
  - in the report mark such rows «✅ (мок)» / «❌ (мок)» and say what was mocked.
