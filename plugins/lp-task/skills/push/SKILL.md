---
name: push
description: Push the task branches and create MRs/PRs in all of its projects, print the links. Use only when the user explicitly asks to push («запушь», «пуш», «push») or answered «Да» to «Запушить изменения?», never on your own initiative
argument-hint: "[task key]"
---

# /lp-task:push

Arguments: `$ARGUMENTS`

Run only on an explicit user request to push (the command, words like «запушь», or «Да» to «Запушить изменения?»); never start it on your own.

First read `${CLAUDE_PLUGIN_ROOT}/shared.md` and follow it (config, hard rules, state).

Invoking this command is an explicit permission to push.

## Which task

As in `shared.md` «Which task». Filter for step 4: state files that have projects with `commit` and `pushed: false`. None — say there is nothing to push.

## Push marker

Before the first push create `<stateDir>/<key>.push-allowed`, after the last push (or a failure) remove it (`shared.md` «Push marker»). Without it the plugin hook denies the push.

## MR groups

Read `pushNotes` from the config. If they are empty or do not apply to this task — there is one group, nothing changes, the message `kind` is `mr`.

Otherwise follow them:
1. Split the task projects into the groups the rules name; write the group id (latin letters, digits and `-`) to `mrGroup` of every project in the state. A project already pushed keeps its group.
2. For every group whose rule has a condition (e.g. «after the new library version is published and set in the apps»), check the condition in the repositories (package.json, lock file, registry, the state of the earlier group's MR). A group whose condition does not hold waits: its projects are not pushed in this run. If the condition cannot be checked — ask (AskUserQuestion), header «Группа MR»: «Группа <group> ждёт: <condition>» — «Подождать» / «Пушить».
3. Push the groups in the order of the rules.

## Push

For every project of the task that has commits (and whose MR group does not wait):

1. Compare `git -C <path> branch --show-current` with the task branch. If they differ — show it and ask.
2. Uncommitted changes (`status --short`, ignoring `git.ignorePaths`) — warn and suggest `/lp-task:commit` first.
3. `git -C <path> ls-remote --heads origin <branch>`:
   - no branch — push (item 4);
   - the branch exists and matches the local one — skip (nothing to push), take the MR from the state;
   - the branch exists and the local one is ahead (`git -C <path> merge-base --is-ancestor origin/<branch> HEAD` after `fetch origin <branch>`) — a regular push without force, the MR updates itself, take the link from the state;
   - the branches diverged — do not push, show it and ask: «force-with-lease» / «Пропустить».
4. Push and create the MR:
   - `git.host: gitlab` — `git -C <path> push -u origin <branch> -o merge_request.create -o merge_request.target=<base> -o "merge_request.title=<mrTitle>"`;
   - `git.host: github` — `git -C <path> push -u origin <branch>`, then create the PR with the description built from `git.mrDescription` (lines joined with newlines):
     - GitHub MCP `create_pull_request` (load it via ToolSearch if deferred): owner and repo from `git remote get-url origin`, `base`, `head` = `<branch>`, `title` = `<mrTitle>`, `body` = the description;
     - if the MCP is unavailable — write the description to a temp file and run `cd <path> && gh pr create --base <base> --head <branch> --title "<mrTitle>" --body-file <file>`;
     - if neither works — say so and print the compare link from the push output instead.
5. Take the link from the output (or from the state for an existing MR): `.../-/merge_requests/<id>` for GitLab, `.../pull/<id>` for GitHub. Look for it in the whole output (`remote: ...` lines), do not truncate the output with `tail`/`head`. If the link cannot be found — say so and ask the user for the link; do not substitute a link to a filtered MR list.
6. If the branch existed on the remote before the first push of this task (the MR is not from the state) — warn: GitLab push options do not change the target of an existing MR, it has to be checked manually.

If `pushNotes` are empty and the task includes a shared library project (`autoDetectOnly`) — remind that the MRs of the dependent projects depend on publishing a new library version.

## Result

Update the state (`pushed`, `mr`, `mrGroup`) and print a table (the «Группа» column only when there are MR groups; a waiting project has «ждёт: <condition>» instead of the link):

| Проект | Группа | Target | MR |
|---|---|---|---|
| UI kit | kit | main | https://… |
| Web | apps | main | ждёт: версия ui-kit не опубликована |

And separately all the links as a list, so they are easy to copy.

Then build, print and save the MR message and the testers message at the same time: in one response call two Skill tools, do not wait for one before the other:
- `lp-task:mr-message` with the arguments `<key> --after-push` (one message per MR group that got a new MR or has no saved `mr-<group>` message yet, see «MR groups» there);
- `lp-task:how-to-test` with the argument `<key>`; skip it when nothing was pushed in this run (every group waits).

Both write the state file: before every write of the state read it again and change only that skill's own fields, so one does not overwrite the other. If a group waits — say in one line what unblocks it and that the next step is a commit with the change (`/lp-task:commit`), then `/lp-task:push` again.
