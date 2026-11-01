---
name: sync-base
description: Rebase the task branches onto the updated base branch in all of its projects, help with conflicts, then offer a force-with-lease push for branches that were already pushed
argument-hint: "[task key]"
---

# /lp-task:sync-base

Arguments: `$ARGUMENTS`

First read `${CLAUDE_PLUGIN_ROOT}/shared.md` and follow it (config, hard rules, state).

Rebase only, never merge the base into the branch. Nothing is pushed without the answer «Да» in the push step.

## Which task

As in `shared.md` «Which task». No filter for step 4.

## Check

For every project of the task:
1. `git -C <path> branch --show-current` must be the task branch. If not, skip the project and warn.
2. `git -C <path> status --short` (ignoring `git.ignorePaths`) must be empty. If not, stop and suggest `/lp-task:commit` first: a rebase with uncommitted changes is not done.
3. `git -C <path> fetch origin <base>` and, if the branch exists on the remote, `git -C <path> fetch origin <branch>`. Remember the remote sha `git -C <path> rev-parse origin/<branch>` (it is the lease for the push).
4. Behind / ahead: `git -C <path> rev-list --left-right --count origin/<base>...HEAD`.

Show a table «проект → base → отстаёт → впереди → на remote». Projects that are not behind are done, say so. If no project is behind, stop.

## Rebase

Ask (AskUserQuestion), header «Rebase»: «Сделать rebase на origin/<base>?» — in the question list the projects that are behind; options «Да» / «Нет». On «Нет» stop.

For every project that is behind, one at a time: remember `git -C <path> rev-parse HEAD`, then `git -C <path> rebase origin/<base>`.

On a conflict:
1. Show the conflicting files (`git -C <path> diff --name-only --diff-filter=U`) and, for each, what the base changed and what the task changed (`git -C <path> diff` of the file, short).
2. Propose a resolution per file that keeps both intents; explain it in 1-2 lines. Edit the files to that resolution and show the resolved hunks.
3. Ask (AskUserQuestion), header «Конфликт»: «Продолжить rebase с этим решением?» — «Да» / «Поправлю сам» / «Отменить rebase».
   - «Да» — `git -C <path> add <resolved files>`, then `GIT_EDITOR=true git -C <path> rebase --continue`; repeat for the next conflicting commit;
   - «Поправлю сам» — wait for the user, then check that no conflict markers remain (`git -C <path> grep -n '^<<<<<<< '`) and continue as on «Да»;
   - «Отменить rebase» — `git -C <path> rebase --abort` and verify that `HEAD` is the remembered sha.

After the rebase run the lint as in `commit` («Check») on `git -C <path> diff --name-only --diff-filter=d origin/<base>...HEAD`. Errors caused by the base changes: fix them only as a new fix commit through `/lp-task:commit` after this command, and say so.

## Push

Only for projects whose branch was already on the remote before the rebase. A project whose branch is not on the remote stays local: say that a regular `/lp-task:push` will push it.

Ask (AskUserQuestion), header «Push»: «Запушить с --force-with-lease?» — list the projects with the old and new sha; options «Да» / «Нет».
- «Да»: create the push marker (`shared.md` «Push marker»), then for every such project `git -C <path> push --force-with-lease=<branch>:<remembered remote sha> origin <branch>`, then remove the marker. If the lease is rejected (someone pushed to the branch), do not retry: show it and stop for that project.
- «Нет»: set `pushed` = `false` for these projects and say that the remote branch still has the old history.

## Result

Update the state (`pushed`). Print a table «проект → было sha → стало sha → push». The MR updates itself after the push; no new MR is created.
