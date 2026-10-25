---
description: Copy the team MR message of a task to the clipboard again and print it
argument-hint: "[task key]"
---

# /lp-task:mr-copy

Arguments: `$ARGUMENTS`

First read `${CLAUDE_PLUGIN_ROOT}/shared.md` and follow it (config, hard rules, state).

Read-only: do not push, do not change the state.

## Which task

1. The key from the argument (via `tracker.keyRegex`), otherwise — the task from the current context.
2. Otherwise — the most recently modified `<stateDir>/*.json` that has at least one project with `mr`. Name its key in the answer.

## Message

Build `<mrTitle>` from the state `title` (`git.mrTitle`, `tracker.titleStripPrefixes`) and the links from `projects[].mr`.

If no project has `mr` — say that there are no MRs yet and suggest `/lp-task:push`; do not touch the clipboard.

Otherwise build, print and copy the MR message per `## MR message` in shared.md.
