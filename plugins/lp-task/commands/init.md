---
description: Create or update the lp-task config for the current project or a group of projects
argument-hint: "[path to save the config]"
---

# /lp-task:init

Arguments: `$ARGUMENTS`

Communicate with the user in Russian. Read `${CLAUDE_PLUGIN_ROOT}/shared.md`, section «Config» — it describes every field. Use `${CLAUDE_PLUGIN_ROOT}/config.example.json` as a reference.

## Step 1. Where to save

If the arguments contain a path — use it (a folder → `<folder>/.claude/lp-task.json`). Otherwise ask (AskUserQuestion), header «Конфиг»: «Где сохранить конфиг?»:
- «В текущем репозитории» — `<git toplevel>/.claude/lp-task.json`;
- «В родительской папке» — `<parent of the git toplevel>/.claude/lp-task.json`, for a group of repositories that live side by side;
- «Глобально» — `~/.claude/lp-task.json`.

If the file already exists — read it, show it and continue in update mode: ask only about what the user wants to change.

Warn in one line if the chosen file is inside a git repository and is not ignored: it may contain internal URLs and names — suggest adding it to `.gitignore` or `.git/info/exclude`.

## Step 2. Questions

Ask with AskUserQuestion (several questions per call, at most 4), suggest values detected from the environment:
1. Tracker: «Jira» (Atlassian MCP, browser as a fallback) / «Другой (ссылка в браузере)»; then the task URL template (`tracker.issueUrl`, e.g. `https://<site>/browse/{key}`) and the key prefix (to build `tracker.keyRegex`, e.g. `(ACME)-(\\d+)`; empty — any key).
2. Branch name: «`{key}`» / «`<PREFIX>-{num}`» / «`feature/{key}`»; commit and MR title templates — keep the defaults unless the user wants their own.
3. Git host: detect from `git remote get-url origin` (gitlab / github) and confirm.
4. MR message header (e.g. a team mention) — empty by default.
5. Projects: the current repository by default; offer the sibling git repositories of the chosen folder (for «В родительской папке»). For every project detect `pm` by the lock file (`yarn.lock` → yarn, `pnpm-lock.yaml` → pnpm, `package-lock.json` → npm, `bun.lockb` → bun) and ask only about `label`, `mobile` and `autoDetectOnly` when it is not obvious.

Do not ask about `planNotes`, `projects[].notes`, `browserTest` — say that they can be added to the file by hand (point to `config.example.json`).

## Step 3. Save

Write only the fields that differ from `${CLAUDE_PLUGIN_ROOT}/config.default.json`. Use project paths relative to the config folder when the projects are inside it. Show the final JSON and the path, then say: «Конфиг сохранён. Запуск задачи — `/lp-task:do <ссылка>`».
