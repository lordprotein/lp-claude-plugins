---
name: test-browser
description: Browser run of the task via Chrome MCP — reproduce the bug before the fix («Обнаружение») or check the changes (acceptance + regression, «Проверка»)
argument-hint: "[reproduce | verify] [task key] [--screenshots yes|no]"
---

# /lp-task:test-browser

Arguments: `$ARGUMENTS`

## Modes

- **«Обнаружение»** — reproduce the bug of the task on the current code (usually before any fix) and record what really happens: the visible result, the data that drives it, the code path. Nothing in the repositories changes. Used before planning, so the plan starts from facts, not from a guess.
- **«Проверка»** — check the changes: acceptance scenarios, negative and edge cases, regression around the diff.

The mode is `reproduce` / `verify` from the arguments, or the one the caller (`do`) names. Otherwise it is decided in step 1.

## Step 0. Screenshots

If the arguments have `--screenshots yes|no` (the caller, e.g. `do`, already asked), take it as `screenshots` («Да» / «Нет») and do not ask. Otherwise, before anything else (before reading files or the task), ask (AskUserQuestion), header «Скриншоты»: «Делать скриншоты по ходу проверки?» — «Да» / «Нет». Remember the answer as `screenshots`.

With «Да» screenshots are saved as files in `<stateDir>/<key>/screenshots/` (create it once `{key}` is known): the key state of every checked row, named `<project>-<row number>-<short slug>.png`, and on re-runs after a fix `<project>-<row number>-<short slug>-after.png`, so the user can compare what changed. With «Нет» only the ❌ rows get a screenshot, as before.

Then read `${CLAUDE_PLUGIN_ROOT}/shared.md` and follow it (config, hard rules, state).

## Step 1. Task context

1. `{key}` — as in `shared.md` «Which task» (no filter for step 4). If there are no state files — ask for the key.
2. Read `<stateDir>/<key>.json`: projects, paths, bases. If there is no state — ask which projects to check (AskUserQuestion, `multiSelect: true`, projects from the config).
3. If the task was already read in this session (for example by `/lp-task:do`), use it from the context. Otherwise read it by `${CLAUDE_PLUGIN_ROOT}/references/read-task.md`: you need the scenarios and acceptance criteria. If neither works, rely on the summary from the state and the diff.
4. Mode, if it is not given: if no project has changes against `origin/<base>` (`git -C <path> diff --stat --merge-base origin/<base>` and `status --short` are empty) — «Обнаружение» without asking. Otherwise ask (AskUserQuestion), header «Цель»: «Что делаем в браузере?» — «Проверить изменения» / «Обнаружить баг задачи».

In the «Обнаружение» mode go to step 2R instead of step 2.

## Step 2R. Reproduction scenario («Обнаружение»)

Follow `${CLAUDE_PLUGIN_ROOT}/references/reproduce.md` «Scenario», then continue with steps 3 and 4, then step 5 with `mode: reproduce`.

## Step 2. Checklist («Проверка»)

If `<stateDir>/<key>.json` has `reproduction` — its scenario is the first row (`positive`, `P1`): the same steps, with the expected result now required, and the `observedData` given to the agent as the input to look for (the fix must handle exactly these values).


For every project collect the changes and find what they reach by `${CLAUDE_PLUGIN_ROOT}/references/impact.md`. Changes made in this session that are already in the context need not be read again. Build a checklist:

- **Acceptance** — every scenario the task requires (what must appear / disappear / behave differently), including the states mentioned in the task.
- **Regression** — the places and states from the impact map: pages and widgets that use the changed code, neighbouring states, places of removed entities, and no new console errors or 4xx/5xx caused by the changes.

Read `${CLAUDE_PLUGIN_ROOT}/references/browser-testing.md` and use it to design the checklist: besides the acceptance scenarios and regression, deliberately add **negative** scenarios (invalid or missing input, no permission, server/network failure) and **edge** cases (boundaries, empty/many, long text, other languages and viewports, double actions, reload/back) that are relevant to what the diff changes (the table «From change type to cases» there). Choose by risk and keep the list bounded: merge near-identical rows, tag every row with a kind (`positive` / `negative` / `edge` / `state` / `regression`) and a priority (`P1`-`P3`).

Show the checklist as one table (project → kind → priority → item → where to check → expected) and continue without waiting for confirmation.

## Step 3. Tools

Load the Chrome MCP tools via ToolSearch (Claude in Chrome: navigation, click, page reading, JavaScript, console, network; chrome-devtools for screenshots). If they are not available — say so and ask (AskUserQuestion): «Использовать Playwright MCP» / «Отменить». Remember the choice as `tool` (`chrome` or `playwright`) and give it to the agent in step 5.

## Step 4. Environment

For every project of the task:
1. Ask (AskUserQuestion), header «Окружение»: «Где проверять <label>?» — «Локальный dev-сервер (Recommended)» / «Указать URL стенда».
2. Local: check whether the dev server of this project is already running (by the process / port). If the port is taken by a server of another checkout or branch (`lsof -i tcp:<port>` shows a process whose working directory is not `<path>`), ask (AskUserQuestion): «Освободить порт <port>» / «Проверять на этом сервере» / «Отменить»; on «Освободить» run `lp-stop-port <port>` (a plugin command on the Bash PATH; never `kill`). If no server runs — start the project's `dev` command in `<path>` in the background (`run_in_background`), wait until the output reports that the server is ready and take the local URL from the output. Remember that you started it.
3. For projects with `mobile: true` use a mobile viewport (`browserTest.mobileViewport`, resize / device emulation).
4. If authorization is needed — ask the user to log in in the opened Chrome window and wait. Never type credentials yourself.

## Step 5. Run

Delegate the run to the `browser-tester` agent (`${CLAUDE_PLUGIN_ROOT}/agents/browser-tester.md`), one agent call per project, sequentially (projects share the browser login and tabs). Give it: `tool` from step 3, the project label, the URL from step 4, the viewport (for `mobile` projects), the checklist rows of this project (with kind, priority and expected result), `browserTest.forbiddenActions`, the project working path and, if `screenshots` is «Да», the screenshot directory (and the `-after` suffix on re-runs after a fix). It runs P1 rows first and returns a compact table; screenshots stay out of this conversation.

In the «Обнаружение» mode give it `mode: reproduce` and the scenario of step 2R instead of checklist rows. Never give it mocks in this mode: a mock would fake the very data being recorded. If local code of a project is not its base (another branch or uncommitted changes) — say so in one line before the run: the result describes that code, not the base.

- If the agent answers `login required` — ask the user to log in in the opened Chrome window, wait, call it again.
- If the agent answers `tools unavailable` (the subagent cannot reach the browser MCP) — do this step yourself in this session: go through the checklist for every project following `${CLAUDE_PLUGIN_ROOT}/references/browser-testing.md` (P1 first; positive, negative and edge rows): navigate, interact, take a snapshot/screenshot of the key states (with `screenshots` = «Да» save them to the screenshot directory as described in step 0), check the console and network after each scenario.

Forbidden: everything from `browserTest.forbiddenActions`; committing. If an item requires such an action — mark it «⚠️ не проверено» with the reason.

## Step 5a. Mocks for what could not be checked

Only in the «Проверка» mode, when some rows came back `⚠️`: follow `${CLAUDE_PLUGIN_ROOT}/references/mocks.md`.

## Step 6R. Reproduction report («Обнаружение»)

Follow `${CLAUDE_PLUGIN_ROOT}/references/reproduce.md` «Report», then go to step 7.

## Step 6. Report («Проверка»)

A table: project → kind → item → ✅ / ❌ / ⚠️ → short comment. For every ❌ — steps, what was expected, what actually happens, environment (viewport, language, user state), a screenshot and the probable cause in the code (file:line); mark failures that also exist without the change as `pre-existing`.

Write the rows to `checks` in `<stateDir>/<key>.json` (format in `shared.md`): the whole checklist of this run with `result` `pass` (✅), `fail` (❌) or `unchecked` (⚠️) and `mock`; a re-run after a fix updates only its rows.

Under the table add a coverage line (counts per kind: positive / negative / edge / state / regression, and what was deliberately not covered) and, if the agent reported any, the «Дополнительные наблюдения» found outside the checklist. With `screenshots` = «Да» add the screenshot directory path.

If there are ❌ — ask (AskUserQuestion): «Исправить» / «Оставить как есть». On «Исправить» — fix following the rules of `do` step 6 (lint included), then re-run only the failed items plus the regression around the fix and show the updated report. With `screenshots` = «Да» the re-run saves `-after` screenshots, and the updated report lists for every fixed row the pair of files (before → after).

## Step 7. Finish

Make sure no `lp-task mock` is left in the code (`git -C <path> grep -n "lp-task mock"`). Stop the dev servers you started (only yours), unless `do` called this step and will need them again for the check after the fix. In the «Проверка» mode say: «Проверка завершена. Для коммита — `/lp-task:commit`»; in the «Обнаружение» mode — the message of step 6R.
