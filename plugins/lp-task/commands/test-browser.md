---
description: Full browser check of the task via Chrome MCP — acceptance criteria + regression around the changes
argument-hint: "[task key]"
---

# /lp-task:test-browser

Arguments: `$ARGUMENTS`

First read `${CLAUDE_PLUGIN_ROOT}/shared.md` and follow it (config, hard rules, state).

## Step 1. Task context

1. `{key}` — from the arguments (via `tracker.keyRegex`); otherwise from the task of the current session; otherwise from the current branch of the working directory; otherwise the most recently modified `<stateDir>/*.json`. If it is still unknown — ask.
2. Read `<stateDir>/<key>.json`: projects, paths, bases. If there is no state — ask which projects to check (AskUserQuestion, `multiSelect: true`, projects from the config).
3. If the task was already read in this session (for example by `/lp-task:do`), use it from the context. Otherwise read it as in `do.md`, step 1 (Atlassian MCP, browser as a fallback): you need the scenarios and acceptance criteria. If neither works, rely on the summary from the state and the diff.

## Step 2. Checklist

For every project collect the changes: start with `git -C <path> diff --stat --merge-base origin/<base>` (committed and uncommitted together; add untracked new files from `status --short`), then read the diff `git -C <path> diff --merge-base origin/<base> -- . ':!*lock*' ':!*.snap'` (also skip generated and built files seen in the stat). Changes made in this session that are already in the context need not be read again. Build a checklist:

- **Acceptance** — every scenario the task requires (what must appear / disappear / behave differently), including the states mentioned in the task.
- **Regression** — everything that could break because of the changes:
  - pages and widgets that use the changed components, hooks, selectors, styles, locales — find them with `git -C <path> grep` by imports of the changed modules;
  - neighbouring states: empty / loading / error, guest / authorized, alternative variants of the UI that share the changed code, different languages if locales are changed;
  - for removals — the places where the removed entity used to be render correctly without it;
  - no new errors in the console, no 4xx/5xx in network requests caused by the changes.

Read `${CLAUDE_PLUGIN_ROOT}/references/browser-testing.md` and use it to design the checklist: besides the acceptance scenarios and regression, deliberately add **negative** scenarios (invalid or missing input, no permission, server/network failure) and **edge** cases (boundaries, empty/many, long text, other languages and viewports, double actions, reload/back) that are relevant to what the diff changes (the table «From change type to cases» there). Choose by risk and keep the list bounded: merge near-identical rows, tag every row with a kind (`positive` / `negative` / `edge` / `state` / `regression`) and a priority (`P1`-`P3`).

Show the checklist as one table (project → kind → priority → item → where to check → expected) and continue without waiting for confirmation.

## Step 3. Tools

Load the Chrome MCP tools via ToolSearch (Claude in Chrome / chrome-devtools: navigation, click, snapshot/screenshot, console, network). If they are not available — say so and ask (AskUserQuestion): «Использовать Playwright MCP» / «Отменить».

## Step 4. Environment

For every project of the task:
1. Ask (AskUserQuestion), header «Окружение»: «Где проверять <label>?» — «Локальный dev-сервер (Recommended)» / «Указать URL стенда».
2. Local: check whether the dev server of this project is already running (by the process / port). If not — start the project's `dev` command in `<path>` in the background (`run_in_background`), wait until the output reports that the server is ready and take the local URL from the output. Remember that you started it.
3. For projects with `mobile: true` use a mobile viewport (`browserTest.mobileViewport`, resize / device emulation).
4. If authorization is needed — ask the user to log in in the opened Chrome window and wait. Never type credentials yourself.

## Step 5. Run

Delegate the run to the `browser-tester` agent (`${CLAUDE_PLUGIN_ROOT}/agents/browser-tester.md`), one agent call per project, sequentially (projects share the browser login and tabs). Give it: the project label, the URL from step 4, the viewport (for `mobile` projects), the checklist rows of this project (with kind, priority and expected result), `browserTest.forbiddenActions` and the project working path. It runs P1 rows first and returns a compact table; screenshots stay out of this conversation.

- If the agent answers `login required` — ask the user to log in in the opened Chrome window, wait, call it again.
- If the agent answers `tools unavailable` (the subagent cannot reach the Chrome MCP) — do this step yourself in this session: go through the checklist for every project following `${CLAUDE_PLUGIN_ROOT}/references/browser-testing.md` (P1 first; positive, negative and edge rows): navigate, interact, take a snapshot/screenshot of the key states, check the console and network after each scenario.

Forbidden: everything from `browserTest.forbiddenActions`; committing. If an item requires such an action — mark it «⚠️ не проверено» with the reason.

## Step 5a. Mocks for what could not be checked

If some rows came back `⚠️` (no test data, a backend or third-party service is unavailable, the state cannot be reached, the action is forbidden, and so on) — never mock without asking. For every project with such rows ask (AskUserQuestion), header «Моки»: «Не удалось проверить в <label>: <rows with reasons>. Замокать?» — exactly 2 options: «Да» / «Нет».

- «Нет» — the rows stay `⚠️`.
- «Да» — mock and check these rows again:
  - prefer browser-level mocks without code changes: substitute the responses of the needed requests (patch `fetch` / `XMLHttpRequest` via `javascript_tool`, request interception of chrome-devtools) and re-apply them after every reload or navigation. Delegate the re-run to `browser-tester` with these rows and the mock to install (which request, what response);
  - only if the data cannot be substituted in the browser (server rendering, data from the store at startup, a feature flag) — a temporary code mock in the working tree: before it remember `git -C <path> status --short` and `git -C <path> diff --stat`, mark every mock with the comment `lp-task mock`, check the rows yourself, then remove all the mocks and verify that `status` and `diff` are exactly as before. Mocks are never committed;
  - a mock replaces the real request completely: nothing from `forbiddenActions` is really performed;
  - in the report mark such rows «✅ (мок)» / «❌ (мок)» and say what was mocked.

## Step 6. Report

A table: project → kind → item → ✅ / ❌ / ⚠️ → short comment. For every ❌ — steps, what was expected, what actually happens, environment (viewport, language, user state), a screenshot and the probable cause in the code (file:line); mark failures that also exist without the change as `pre-existing`.

Under the table add a coverage line (counts per kind: positive / negative / edge / state / regression, and what was deliberately not covered) and, if the agent reported any, the «Дополнительные наблюдения» found outside the checklist.

If there are ❌ — ask (AskUserQuestion): «Исправить» / «Оставить как есть». On «Исправить» — fix following the rules of `do.md` step 6 (lint included), then re-run only the failed items plus the regression around the fix and show the updated report.

## Step 7. Finish

Make sure no `lp-task mock` is left in the code (`git -C <path> grep -n "lp-task mock"`). Stop the dev servers you started (only yours). Say: «Проверка завершена. Для коммита — `/lp-task:commit`».
