---
name: mr-message
description: Build the team message with the MR/PR links of a task and save it for copying, also for branches pushed by hand. Use when the user asks for the MR message or links («сообщение для MR», «собери ссылки на MR», «пересобери сообщение MR»)
argument-hint: "[task key] [MR group] [MR links...]"
---

# /lp-task:mr-message

Arguments: `$ARGUMENTS`

First read `${CLAUDE_PLUGIN_ROOT}/shared.md` and follow it (config, hard rules, state).

Nothing is pushed, committed or changed in the repositories: the skill only reads them, the state and the MRs, and writes the state and the message files.

Arguments, in any order:
- a task key (by `tracker.keyRegex`) or a task link (a URL that matches `tracker.keyRegex` and is not an MR/PR link): the key is taken from it;
- an MR group id (one of the groups of the task, see «MR groups»): build only its message;
- MR/PR links (`…/-/merge_requests/<id>`, `…/pull/<id>`): they take priority over the state;
- `--after-push`: set by `/lp-task:push`, see «MR groups».

## Which task

As in `shared.md` «Which task». Filter for step 4: state files with at least one project that has `mr` or `commit`. If there is no state file at all (the branches were pushed by hand, without `/lp-task:do`): the key from the arguments, otherwise from the current branch (`git branch --show-current`) by `tracker.keyRegex`, otherwise ask the user for the key.

## Find the MRs

The projects: from the state; without a state, the projects of the config whose task branch (`git.branch` with `{key}` and `{num}` substituted) exists on the remote (`git -C <path> ls-remote --heads origin <branch>`). None — say so and stop.

For every project take the MR link from the first source that has it:
1. A link from the arguments: match it to the project by `git -C <path> remote get-url origin` (same host and repository path).
2. `mr` from the state.
3. A search by the branch:
   - `git.host: gitlab`: the GitLab MCP server `review.gitlab.mcpServer` (load its tools via ToolSearch if deferred), an open MR with source branch `<branch>`; fallback `cd <path> && glab mr list --source-branch <branch>`;
   - `git.host: github`: GitHub MCP `list_pull_requests` (owner and repo from the remote URL, `head` = `<owner>:<branch>`, state open); fallback `cd <path> && gh pr list --head <branch> --json url`.
4. The branch is on the remote but no MR was found (or the tools are unavailable) — ask (AskUserQuestion), header «MR»: «<label>: MR не найден» — «Пропустить»; the user gives the link in Other. A branch that is not on the remote — the project has no MR, skip it.

Never substitute a link to a filtered MR list for an MR link.

## Task link

The key in the message becomes a link to the task when there is one. Take the first that exists: the task link from the arguments; `url` from the state; a task link (with this key) the user gave earlier in this session; `tracker.issueUrl` with `{key}` substituted. None — the key stays as text.

## State

Write the found links to `mr` and set `pushed: true` for those projects; write the task link to `url` if it is not there yet. Without a state file create a minimal one by `shared.md` «State»: `key`, `title`, `url`, `branch`, `plan: null`, `projects` (`id`, `path`, `base` = the target branch of the MR or the default branch, `commit: null`, `fixCommits: []`, `pushed`, `mr`, `mrGroup: null`). `{title}`: from the state, otherwise by `${CLAUDE_PLUGIN_ROOT}/references/read-task.md`. `how-to-test`, `lp-code-review` and the next runs read this state.

## MR groups

If `pushNotes` are empty or do not apply to this task — one message, `kind` = `mr`.

Otherwise take `mrGroup` of every project from the state; a project without it gets its group by the rules of `pushNotes` (as in `${CLAUDE_PLUGIN_ROOT}/skills/push/SKILL.md` «MR groups» step 1), written to the state. One message per group: `{links}` holds only the projects of that group, `kind` = `mr-<group>` (the group id: latin letters, digits and `-`, e.g. `mr-kit`). A group with no MR yet gets no message.

Which messages to build:
- by hand (no `--after-push`): every group, or only the group from the arguments; a saved message is overwritten;
- with `--after-push`: every group that got a new MR in this push run or has no saved `mr-<group>` message yet; a `mr-<group>` message saved earlier stays as it is. The second case covers a task that was split into groups after some of its MRs already existed: those MRs got the single `mr` message then, their group still needs its own `mr-<group>`.

## Build

Build the plain text and the HTML of every message by `${CLAUDE_PLUGIN_ROOT}/references/mr-message.md` and print the plain text in a code block (with groups: the group id as a line above each block).

## Save and copy

For every message save and copy by `${CLAUDE_PLUGIN_ROOT}/references/clipboard.md` with its `kind`: the files `<stateDir>/<key>/messages/<kind>.html` and `<kind>.txt`, both written with the Write tool, never from the shell (the plugin hook denies a shell write, and the `lp-copy-bar` mod shows its copy button «MR» / «MR <group>» only for Write calls). Copy only if `mrMessage.clipboard` is `true`; then say in one line that the message is in the clipboard and will paste into the work chat with formatting. Otherwise say in one line that it is copied by the button above the prompt (`lp-copy-bar` mod). If the user asks for changes, apply them, then print and save again the same way.
