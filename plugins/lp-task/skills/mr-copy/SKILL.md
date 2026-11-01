---
name: mr-copy
disable-model-invocation: true
description: Copy the team MR message of a task to the clipboard again and print it
argument-hint: "[task key]"
---

# /lp-task:mr-copy

Arguments: `$ARGUMENTS`

First read `${CLAUDE_PLUGIN_ROOT}/shared.md` and follow it (config, hard rules, state).

Read-only: do not push, do not change the state.

## Which task

As in `shared.md` «Which task», except step 4: take the most recently modified state file that has at least one project with `mr`, without asking, and name its key.

## Message

Take the placeholders of `mrMessage.lines` from the state: `{key}` from `key`, `{num}` via `tracker.keyRegex`, `{title}` from `title` (`tracker.titleStripPrefixes`), `{mrTitle}` via `git.mrTitle`, `{issueUrl}` via `tracker.issueUrl`; the links from `projects[].mr`, `{base}` from `projects[].base`.

If no project has `mr` — say that there are no MRs yet and suggest `/lp-task:push`; do not touch the clipboard.

Otherwise build, print and copy the MR message per `${CLAUDE_PLUGIN_ROOT}/references/mr-message.md`.
