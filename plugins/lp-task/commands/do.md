---
description: Tracker task → project selection → plan → branches → implementation (commit via /lp-task:commit, push via /lp-task:push, browser check via /lp-task:browser-test)
argument-hint: "[task link | key | status]"
---

# /lp-task:do

Arguments: `$ARGUMENTS`

First read `${CLAUDE_PLUGIN_ROOT}/shared.md` and follow it (config, hard rules, state).

## Routing by argument

- `status` → show the state from `<stateDir>/*.json` and `git -C <path> log --oneline -1` / `status --short` for every project of the task. Change nothing.
- task link or key → start from step 1 using it.
- empty → start from step 1 and ask for the link.

## Step 1. Task

1. If there is no link or key in the arguments — ask the user to send a task link (as a regular message, not AskUserQuestion) and wait for the answer.
2. Extract `{key}` and `{num}` using `tracker.keyRegex`. If that fails — ask for the key again. If only a key was given, the task URL is `tracker.issueUrl` with `{key}` substituted.
3. Read the task. You need summary, description, labels (images from the description are not visible — keep that in mind).
   - `tracker.type: jira` — via Atlassian MCP (`getJiraIssue`, cloudId — the host from the link or from `tracker.issueUrl`, `view: "evidence"`; if the tools are deferred — load them via ToolSearch).
   - If Atlassian MCP is unavailable or failed, or `tracker.type: url` — read it in the browser: load the Chrome MCP tools via ToolSearch (tabs context, create tab, navigate, get page text), open the task URL in a new tab and read the page text. If the page asks for a login — ask the user to log in in the opened Chrome window, wait and read again. Never type credentials yourself.
   - If there is no task URL (only a key and an empty `tracker.issueUrl`), or neither MCP nor the browser worked — say so and ask the user to paste the summary and description as text.
4. If the description refers to other tasks — read them the same way: they hint at where the code lives.
5. Briefly retell the task (1–3 lines) and compute the branch name from `git.branch`.

## Step 2. Project selection

If there is exactly one project without `autoDetectOnly` — take it without asking.

Otherwise always ask the user — never pick projects automatically and never mark any option as «Recommended».

One question (`multiSelect: true`), header «Проекты»: «В каких проектах нужны изменения?». Options — all projects without `autoDetectOnly` (their `label`). In the description of an option you may put a hint from the task (a label or a mention matching the project), if there is one; otherwise leave a neutral description. If nothing is selected — ask again.

## Step 3. Research (read-only)

Only in the selected projects and in the `autoDetectOnly` projects: determine the default branch (see step 4) and run `git -C <path> fetch origin <base> -q`.

Goal — find where the code of the task lives, not to choose projects:
- for the key entities of the task (component, text, style, id) — `git -C <path> grep -n <pattern> origin/<base>` (without checkout). For a broad search you may launch an Explore agent;
- use the task description, linked tasks and `projects[].notes` as hints.

If nothing was found in a selected project — say so in one line (the project stays selected). If the entity lives in an `autoDetectOnly` project — that project is added automatically; report it in one line with the reason.

## Step 4. Base branches

The task is always a regular one: the branch is created from the remote default branch. For every selected project:
- base = `git -C <path> symbolic-ref --short refs/remotes/origin/HEAD` without the `origin/` prefix; if it is not resolved — `git -C <path> remote set-head origin --auto` and retry; if still nothing — check `origin/main`, then `origin/master`.

Show a table: project → base → new branch.

## Step 5. Preflight

Only checks and decisions, nothing is changed in the repositories: no stash, no fetch, no checkout. The branch is created later, right before the implementation (step 6).

For every project:
1. `git -C <path> status --short` (untracked items from `git.ignorePaths` do not count as dirty). If there are changes in tracked files — show them and ask (AskUserQuestion): «Сохранить в stash `lp-task <key>`» / «Пропустить проект» / «Отменить». Do nothing without an answer.
2. Branch: `git -C <path> rev-parse --verify --quiet <branch>` and `git -C <path> ls-remote --heads origin <branch>`. If it exists — ask: «Переиспользовать существующую» / «Пересоздать от базы (локально; remote не трогаю)» / «Отменить».

Remember the answers and write the state (projects, base, branch).

## Step 6. Implementation

1. Enter plan mode (EnterPlanMode) and build a plan for all selected projects. If several projects implement the same feature — compare the same places between them (their structure may differ). Respect the CLAUDE.md of every repo, `planNotes` and the `notes` of every involved project. If the same logic exists or is needed in several projects and one of the task's projects is a shared library — propose extracting it there and ask the user (AskUserQuestion) before doing it; only logic that several projects really use goes to the library.
2. If while planning it turns out that changes are needed in a project that is not in the task — say so with the reason. A regular project is added only after the user confirms it (AskUserQuestion); an `autoDetectOnly` project is added right away. Add it to the plan and go through steps 4–5 for it.
3. If the task is about removing an entity — include in the plan the removal of artifacts that become unused (styles, images, imports), checking with `git grep` that no references remain. If you intentionally keep something — explicitly say why.
4. For a shared library project: follow its CLAUDE.md and `notes`; warn that the dependent projects will see the changes only after a new version is published, and that their MRs must state the dependency on the library MR. Never bump the library version in a dependent project until that version is published to the registry — otherwise installs break.
5. If the plan is rejected or the task is cancelled — the repositories stay untouched. After the plan is approved — create the branches, for every project of the task:
   - `git -C <path> status --short` again; if it differs from the preflight — show the changes and ask again as in step 5;
   - the stash `lp-task <key>`, if it was chosen in step 5 (see hard rule 3);
   - `git -C <path> fetch origin <base>`;
   - `git -C <path> checkout -b <branch> origin/<base>` (for «Пересоздать» — `checkout -B`, for «Переиспользовать» — `checkout <branch>`), verify `branch --show-current`.

   Update the state.
6. Implement the plan.
7. Check: in every project with a non-empty `lint` run `git -C <path> diff --name-only --diff-filter=d | (cd <path> && xargs <lint>)` (do not pass the file list through a variable — zsh will not split it into arguments). Mark warnings that existed before the changes as pre-existing.

## Step 7. Waiting

Do not commit. Show `git diff --stat` for every project, then ask (AskUserQuestion), header «Браузер»: «Проверить задачу в браузере через Chrome MCP?» — «Да» / «Нет».

- «Да» → follow the instructions from `${CLAUDE_PLUGIN_ROOT}/commands/browser-test.md`, then say the final message below.
- «Нет» → say the final message below.

Final message: «Изменения готовы. Для коммита — `/lp-task:commit` (или напишите „закоммить“). Проверка в браузере — `/lp-task:browser-test`» — and stop.

If the user asks «закоммить» in this session — follow the instructions from `${CLAUDE_PLUGIN_ROOT}/commands/commit.md`. Follow-up fixes (before or after push) are committed the same way: always a new `git.fixCommit` commit, no amend and no force push.

If the user writes «запушь» in this session — follow the instructions from `${CLAUDE_PLUGIN_ROOT}/commands/push.md`.

If the user asks to check in the browser in this session — follow the instructions from `${CLAUDE_PLUGIN_ROOT}/commands/browser-test.md`.
