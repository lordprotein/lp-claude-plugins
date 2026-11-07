---
name: commit
description: Commit the task changes in all of its projects (first commit "{key}: {title}" or a fix "{key}: fix (...)"), then offer to push. Use only when the user explicitly asks to commit («закоммить», «коммит», «commit»), never on your own initiative
argument-hint: "[short fix description] [--with-comments]"
---

# /lp-task:commit

Arguments: `$ARGUMENTS`

Run only on an explicit user request to commit (the command or words like «закоммить»); never start it on your own.

First read `${CLAUDE_PLUGIN_ROOT}/shared.md` and follow it (config, hard rules, state).

A **new** commit is always created. No amend and no force push.

Arguments: `--with-comments` (also `--withComments`, or a request in words such as «с описанием», «с комментарием») adds the description body to this commit even when `git.commitDescription` is `false`; remove the flag from the arguments, the rest is the fix description (`{summary}`).

## Which task

As in `shared.md` «Which task» (this command has no key argument, start from step 2). Filter for step 4: state files whose projects have uncommitted changes on the task branch. None — say there is nothing to commit.

## Collecting changes

For every project from the state:
1. `git -C <path> branch --show-current` must match the task branch. If not — skip the project and warn.
2. `git -C <path> status --short`, ignoring `git.ignorePaths`. Skip a project without changes.

If there are no changes in any project — say so and stop.

## Check

In every project with changes and a non-empty `lint`: `git -C <path> diff --name-only --diff-filter=d | (cd <path> && xargs <lint>)` (for new untracked files add them to the list). Errors — fix and retry; mark warnings that existed before the changes as pre-existing.

## Message

The template is chosen per project by its state:
- `commit` is `null` (the first commit of the task in this project) → `git.commit`, substitute `{key}` and `{title}`;
- otherwise (a fix) → `git.fixCommit`, substitute `{key}` and `{summary}`:
  - `{summary}` — from the argument, if passed;
  - otherwise — phrase it yourself from the diff and the conversation context: in Russian, 3–8 words, starting with a lowercase letter, one common message for all fix projects.

### Description

Only when `git.commitDescription` is `true` or `--with-comments` is set. A separate body for every project, from its diff and the session context (task, plan, discussion), in Russian:
- first what was done: 2–5 short items `- ...` about the behavior and the key changes, not a line-by-line retelling of the diff;
- then the line `Почему так:` and 1–3 items `- ...`: why this solution was chosen (the cause of the bug, the alternatives rejected, the constraints);
- lines up to ~72 characters, no AI attribution, no mentions of Claude or of the session.

Show a table «project → changed files → message» (with a body: the body under the message) and commit right away with these messages: do not ask whether the message is fine, choose it yourself. A different `{summary}` is passed as the argument.

## Commit

In every project with changes:
1. `git -C <path> add` only the changed/new/deleted files from the list above (not `-A`; do not add `git.ignorePaths`).
2. `git -C <path> commit -m "<message>"`; with a body `git -C <path> commit -m "<message>" -m "<body>"`.
3. If the pre-commit hook failed:
   - because of the environment (a module not found, «No valid configuration found», no `node_modules`) — explain the reason and ask: «Сделать `<pm> install` и повторить» / «Коммит с `--no-verify`» / «Сделаю сам»;
   - because of the code — fix and retry.
4. After the commit run `git -C <path> status --short`: if the hook changed unrelated files — show the list and ask whether to revert them (`git restore` only those files).

## Result

Update the state: for a first commit set the project's `commit` = sha, for a fix append the sha to `fixCommits`; set `pushed` = `false`.

Print a table «project → branch → sha → message».

## Push

If no commit was made in any project — skip this section.

If the user already asked to push in the same request («закоммить и запушь») — do not ask, act as on «Да». Otherwise ask AskUserQuestion, header «Push»: «Запушить изменения?» — exactly 2 options: «Да» / «Нет».
- «Да» — this is an explicit permission to push: call the skill `lp-task:push` via the Skill tool with the task key and follow it.
- «Нет» — push nothing, print the hint «Для push — `/lp-task:push`» and stop.
