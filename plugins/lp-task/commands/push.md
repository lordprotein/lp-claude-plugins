---
description: Push the task branches and create MRs/PRs in all of its projects, print the links
argument-hint: "[task key]"
---

# /lp-task:push

Arguments: `$ARGUMENTS`

First read `${CLAUDE_PLUGIN_ROOT}/shared.md` and follow it (config, hard rules, state).

Invoking this command is an explicit permission to push.

## Which task

1. The key from the argument (via `tracker.keyRegex`), otherwise — the task from the current context.
2. Otherwise — `<stateDir>/*.json` that has projects with `commit` and `pushed: false`. If there is exactly one — take it; if several — ask (AskUserQuestion); if none — say there is nothing to push.

## Push

For every project of the task that has commits:

1. Compare `git -C <path> branch --show-current` with the task branch. If they differ — show it and ask.
2. Uncommitted changes (`status --short`, ignoring `git.ignorePaths`) — warn and suggest `/lp-task:commit` first.
3. `git -C <path> ls-remote --heads origin <branch>`:
   - no branch — push (item 4);
   - the branch exists and matches the local one — skip (nothing to push), take the MR from the state;
   - the branch exists and the local one is ahead (`git -C <path> merge-base --is-ancestor origin/<branch> HEAD` after `fetch origin <branch>`) — a regular push without force, the MR updates itself, take the link from the state;
   - the branches diverged — do not push, show it and ask: «force-with-lease» / «Пропустить».
4. Push and create the MR:
   - `git.host: gitlab` — `git -C <path> push -u origin <branch> -o merge_request.create -o merge_request.target=<base> -o "merge_request.title=<mrTitle>"`;
   - `git.host: github` — `git -C <path> push -u origin <branch>`, then `cd <path> && gh pr create --base <base> --head <branch> --title "<mrTitle>" --body ""`. If `gh` is not installed or not authorized — say so and print the compare link from the push output instead.
5. Take the link from the output (or from the state for an existing MR): `.../-/merge_requests/<id>` for GitLab, `.../pull/<id>` for GitHub. Look for it in the whole output (`remote: ...` lines), do not truncate the output with `tail`/`head`. If the link cannot be found — say so and ask the user for the link; do not substitute a link to a filtered MR list.
6. If the branch existed on the remote before the first push of this task (the MR is not from the state) — warn: GitLab push options do not change the target of an existing MR, it has to be checked manually.

If the task includes a shared library project (`autoDetectOnly`) — remind that the MRs of the dependent projects depend on publishing a new library version.

## Result

Update the state (`pushed`, `mr`) and print a table:

| Проект | Target | MR |
|---|---|---|
| Web | main | https://… |

And separately all the links as a list, so they are easy to copy.

Then build, print and copy the MR message per `## MR message` in shared.md.
