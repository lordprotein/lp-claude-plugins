# lp-task: shared rules

Communicate with the user in Russian.

## Config

Load the config before anything else:

1. Starting from the current working directory and going up to the filesystem root, find the first `.claude/lp-task.json`. If none is found — use `~/.claude/lp-task.json`.
2. Read `${CLAUDE_PLUGIN_ROOT}/config.default.json` and deep-merge the found config over it (objects are merged key by key, arrays and scalars from the found config replace the defaults).
3. Expand `~` in paths to the home directory. A relative `projects[].path` is resolved against the folder that contains the `.claude/` folder of the found config.
4. If no config was found — say so in one line and ask (AskUserQuestion), header «Конфиг»: «Конфиг lp-task не найден» — «Создать (/lp-task:init)» / «Продолжить с текущим репозиторием». On «Создать» — follow `${CLAUDE_PLUGIN_ROOT}/commands/init.md`, then continue. On «Продолжить» — use the defaults with one project: the git repository of the current working directory (`git rev-parse --show-toplevel`), `id` and `label` — its folder name.

Take all templates, paths and the project list only from the merged config.

- `tracker.type` — `jira` (read via Atlassian MCP, browser as a fallback) or `url` (always read in the browser).
- `tracker.issueUrl` — task URL template with `{key}`; used to open a task given only by its key.
- `tracker.keyRegex` — extracts the task key (`{key}`, e.g. `ACME-1296`) and number (`{num}`, e.g. `1296`) from a link or text: the whole match is `{key}`, the last group is `{num}`.
- `tracker.titleStripPrefixes` — `{title}` is the task summary without these prefixes and without extra spaces.
- `git.host` — `gitlab` (MR via push options) or `github` (PR via `gh`).
- `git.branch` — branch name, substitute `{num}` and `{key}`.
- `git.commit`, `git.mrTitle` — commit message and MR title, substitute `{key}` and `{title}`.
- `git.fixCommit` — fix commit message, substitute `{key}` and `{summary}`.
- `git.ignorePaths` — untracked/local paths that never count as changes and are never committed.
- `mrMessage.header` — the value of `{header}` in the team MR message (e.g. a team mention).
- `mrMessage.lines[]` — template of the team MR message, one element per line (see `references/mr-message.md`).
- `mrMessage.link` — template of one MR link line in `{links}`.
- `mrMessage.clipboard` — copy the MR message to the clipboard.
- `stateDir` — where the task state is stored: `<stateDir>/<key>.json`.
- `review.postToMr` — `ask` (default): after a review of a GitLab MR offer to publish the findings as MR comments; `never`: do not offer.
- `review.minSeverity` — lowest severity offered for publishing: `critical`, `high`, `medium` (default) or `low`.
- `review.gitlab.mcpServer` — name of the GitLab MCP server used to read the MR and post comments (default `gitlab`); `glab` is the fallback.
- `projects[]` — the repositories a task can span, in the order used everywhere (questions, tables, MR message):
  - `id`, `label`, `path` — identifier, display name, repository path;
  - `pm` — package manager (default `npm`);
  - `lint` — lint command that receives the changed files as arguments (default `npx eslint`; empty string — no lint);
  - `dev` — dev server command (default `<pm> run dev`);
  - `mobile: true` — check in the browser with a mobile viewport;
  - `autoDetectOnly: true` — the project is not offered in the project selection; it is included automatically only if the research/plan showed that changes are needed there (typically a shared library);
  - `notes[]` — project-specific rules: when the project is involved and how to work with it.
- `planNotes[]` — extra rules for the planning step (`do.md`, step 6).
- `browserTest.forbiddenActions[]` — actions never performed in the browser check.
- `browserTest.mobileViewport` — `WIDTHxHEIGHT` for `mobile` projects.

## Hard rules (always)

1. **Never push without an explicit user command** (`/lp-task:push`, «запушь», «push», or the answer «Да» to the question «Запушить изменения?» in `/lp-task:commit`). All commits are made only via `/lp-task:commit`; fixes — only as new commits, no amend.
2. **Never mention Claude / Claude Code** in commits and MRs: no `Co-Authored-By`, no «Generated with», no AI attribution of any kind. The commit message is only the line built from the template.
3. **Never run `git stash pop` / `git stash drop` / `git reset --hard` / `git checkout -- .` / `git restore`** on changes that were not made by you in this task without explicit permission. If a stash is needed — create it with the message `lp-task <key>` and before `pop` check with `git stash list` that `stash@{0}` is exactly yours. If `git stash` printed «No local changes to save» — the stash was NOT created, `pop` must not be run.
4. Run all git commands via `git -C <path>` with absolute paths.
5. Create branches only from `origin/<base>` after `git fetch`, never from local branches.
6. Force push — only `--force-with-lease=<branch>:<expected sha>` and only with the user's confirmation.
7. Accompany every step with a short summary: what was done and what is next.
8. In browser checks never perform anything from `browserTest.forbiddenActions` and never type credentials — ask the user to log in.

## State

The file `<stateDir>/<key>.json` (create the directory if needed), update it after every significant step:

```json
{
  "key": "ACME-1296",
  "title": "...",
  "branch": "ACME-1296",
  "projects": [
    { "id": "web", "path": "/abs/path", "base": "main", "commit": null, "fixCommits": [], "pushed": false, "mr": null }
  ]
}
```
