---
description: Commit the task changes in all of its projects (first commit "{key}: {title}" or a fix "{key}: fix (...)"), then offer to push
argument-hint: "[--review] [short fix description]"
---

# /lp-task:commit

Arguments: `$ARGUMENTS`

First read `${CLAUDE_PLUGIN_ROOT}/shared.md` and follow it (config, hard rules, state).

The flag `--review` in the arguments (remove it from the text before using the rest as the fix description) is an explicit «Да» to the review question in the `## Review` section.

A **new** commit is always created. No amend and no force push.

## Which task

1. The task from the current context.
2. Otherwise — `<stateDir>/*.json`: if there is one file — take it; if several — ask (AskUserQuestion), the default is the most recently modified one.

## Collecting changes

For every project from the state:
1. `git -C <path> branch --show-current` must match the task branch. If not — skip the project and warn.
2. `git -C <path> status --short`, ignoring `git.ignorePaths`. Skip a project without changes.

If there are no changes in any project — say so and stop.

## Check

In every project with changes and a non-empty `lint`: `git -C <path> diff --name-only --diff-filter=d | (cd <path> && xargs <lint>)` (for new untracked files add them to the list). Errors — fix and retry; mark warnings that existed before the changes as pre-existing.

## Review

The code review never starts by itself.

1. If `review.beforeCommit` is `never` and there is no `--review` flag — skip this section.
2. Without `--review`, ask (AskUserQuestion), header «Ревью»: «Запустить code-review перед коммитом?» — exactly 2 options: «Нет» / «Да». «Нет» — skip this section and go on to the message, nothing else changes.
3. «Да» (or `--review`): for every project with changes run the `code-review` skill (`${CLAUDE_PLUGIN_ROOT}/skills/code-review/SKILL.md`) on its uncommitted diff: only 🔴🟠🟡 findings, compact output, no «Next steps» question and no MR publishing (there is no MR yet). Run it through a subagent per project (in parallel when there are several), so the main context stays small.
4. Show the findings per project in one list. If there are 🔴/🟠 — ask (AskUserQuestion), header «Ревью»: «Найдены критичные замечания. Что делать?» — «Исправить» / «Закоммитить как есть» / «Отмена». «Исправить» — fix them following `do.md` step 6 (lint included), show the updated diff and go on with the commit flow (the review is not repeated unless the user asks). «Отмена» — commit nothing and stop. If there are only 🟡/🟢 or nothing — show the list and go on.

## Message

The template is chosen per project by its state:
- `commit` is `null` (the first commit of the task in this project) → `git.commit`, substitute `{key}` and `{title}`;
- otherwise (a fix) → `git.fixCommit`, substitute `{key}` and `{summary}`:
  - `{summary}` — from the argument, if passed;
  - otherwise — phrase it yourself from the diff and the conversation context: in Russian, 3–8 words, starting with a lowercase letter, one common message for all fix projects.

Show a table «project → changed files → message», then ask AskUserQuestion, header «Коммит»: «Закоммитить изменения?» — in the question text list the projects and files and quote the commit message(s); exactly 2 options: «Да» / «Нет». «Да» — commit with these messages; «Нет» — commit nothing, stop and wait for instructions; if the user entered their own text via Other — use it as the message (or as `{summary}` for a fix commit) and commit. Do not commit without the answer «Да» (or custom text).

## Commit

In every project with changes:
1. `git -C <path> add` only the changed/new/deleted files from the list above (not `-A`; do not add `git.ignorePaths`).
2. `git -C <path> commit -m "<message>"`.
3. If the pre-commit hook failed:
   - because of the environment (a module not found, «No valid configuration found», no `node_modules`) — explain the reason and ask: «Сделать `<pm> install` и повторить» / «Коммит с `--no-verify`» / «Сделаю сам»;
   - because of the code — fix and retry.
4. After the commit run `git -C <path> status --short`: if the hook changed unrelated files — show the list and ask whether to revert them (`git restore` only those files).

## Result

Update the state: for a first commit set the project's `commit` = sha, for a fix append the sha to `fixCommits`; set `pushed` = `false`.

Print a table «project → branch → sha → message».

## Push

If no commit was made in any project — skip this section.

Ask AskUserQuestion, header «Push»: «Запушить изменения?» — exactly 2 options: «Да» / «Нет».
- «Да» — this is an explicit permission to push: read `${CLAUDE_PLUGIN_ROOT}/commands/push.md` and follow it for this same task (`/lp-task:push`).
- «Нет» — push nothing, print the hint «Для push — `/lp-task:push`» and stop.
