# lp-task: shared rules

Communicate with the user in Russian.

## Config

Load the config before anything else:

1. Starting from the current working directory and going up to the filesystem root, find the first `.claude/lp-task.json`. If none is found — use `~/.claude/lp-task.json`.
2. Read `${CLAUDE_PLUGIN_ROOT}/config.default.json` and deep-merge the found config over it (objects are merged key by key, arrays and scalars from the found config replace the defaults).
3. Expand `~` in paths to the home directory. A relative `projects[].path` is resolved against the folder that contains the `.claude/` folder of the found config.
4. If no config was found — say so in one line and ask (AskUserQuestion), header «Конфиг»: «Конфиг lp-task не найден» — «Создать (/lp-task:init)» / «Продолжить с текущим репозиторием». On «Создать» — follow `${CLAUDE_PLUGIN_ROOT}/skills/init/SKILL.md`, then continue. On «Продолжить» — use the defaults with one project: the git repository of the current working directory (`git rev-parse --show-toplevel`), `id` and `label` — its folder name.

Take all templates, paths and the project list only from the merged config.

- `tracker.type` — `jira` (read via Atlassian MCP, browser as a fallback) or `url` (always read in the browser).
- `tracker.issueUrl` — task URL template with `{key}`; used to open a task given only by its key.
- `tracker.keyRegex` — extracts the task key (`{key}`, e.g. `ACME-1296`) and number (`{num}`, e.g. `1296`) from a link or text: the whole match is `{key}`, the last group is `{num}`.
- `tracker.titleStripPrefixes` — `{title}` is the task summary without these prefixes and without extra spaces.
- `git.host` — `gitlab` (MR via push options) or `github` (PR via `gh`).
- `git.branch` — branch name, substitute `{num}` and `{key}`.
- `git.commit`, `git.mrTitle` — commit message and MR title, substitute `{key}` and `{title}`.
- `git.fixCommit` — fix commit message, substitute `{key}` and `{summary}`.
- `git.mrDescription[]` — PR description for `git.host: github`, one element per line; placeholders `{issueUrl}`, `{title}`, `{key}` and `{commits}` (the task commits as a list: `git -C <path> log origin/<base>..HEAD --format='- %s'`). GitLab MRs are created by push options and keep an empty description.
- `git.ignorePaths` — untracked/local paths that never count as changes and are never committed.
- `mrMessage.header` — the value of `{header}` in the team MR message (e.g. a team mention).
- `mrMessage.lines[]` — template of the team MR message, one element per line (see `references/mr-message.md`).
- `mrMessage.link` — template of one MR link line in `{links}`.
- `mrMessage.clipboard` — copy the MR message to the clipboard.
- `howToTest.header` — first line of the tester message before the title (e.g. a mention of the testers); empty by default.
- `howToTest.maxCases` — at most this many test cases in the tester message (default 8).
- `howToTest.clipboard` — copy the tester message to the clipboard (default `true`).
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
- `planNotes[]` — extra rules for the planning step (`do`, step 6).
- `browserTest.forbiddenActions[]` — actions never performed in the browser check.
- `browserTest.mobileViewport` — `WIDTHxHEIGHT` for `mobile` projects.

## Hard rules (always)

1. **Never push without an explicit user command** (`/lp-task:push`, «запушь», «push», or the answer «Да» to the question «Запушить изменения?» in `/lp-task:commit`). All commits are made only via `/lp-task:commit`; fixes — only as new commits, no amend. The plugin hook enforces it: on a task branch `git push` is denied unless the push marker exists (see «Push marker»).
2. **Never mention Claude / Claude Code** in commits and MRs: no `Co-Authored-By`, no «Generated with», no AI attribution of any kind. The commit message is only the line built from the template.
3. **Never run `git stash pop` / `git stash drop` / `git reset --hard` / `git checkout -- .` / `git restore`** on changes that were not made by you in this task without explicit permission. If a stash is needed — create it with the message `lp-task <key>` and before `pop` check with `git stash list` that `stash@{0}` is exactly yours. If `git stash` printed «No local changes to save» — the stash was NOT created, `pop` must not be run.
4. Run all git commands via `git -C <path>` with absolute paths.
5. Create branches only from `origin/<base>` after `git fetch`, where `<base>` is the default branch of the repository (main/master).
6. Force push — only `--force-with-lease=<branch>:<expected sha>` and only with the user's confirmation.
7. Accompany every step with a short summary: what was done and what is next.
8. In browser checks never perform anything from `browserTest.forbiddenActions` and never type credentials — ask the user to log in.

Plugin hooks (`hooks/hooks.json`) back rules 1–3: a commit message with AI attribution is denied, a push on a task branch without the push marker is denied, `git stash pop` in a task repository is denied when `stash@{0}` is not `lp-task <key>`. A denied command is not retried in another form: say what the hook reported.

## Push marker

Right before the first `git push` of a run (`push`, `sync-base`) create the marker file `<stateDir>/<key>.push-allowed` (`touch`), and remove it after the last push of the run, also when the push failed. The marker is valid for 15 minutes. Never create it for a push the user did not ask for.

## Which task

Every command resolves the task the same way, stopping at the first match:

1. The key from the arguments (via `tracker.keyRegex`).
2. The task of the current session (the one `/lp-task:do` or another command worked on in this conversation).
3. The current branch of the working directory (`git branch --show-current`) equal to `branch` of a `<stateDir>/*.json`.
4. The `<stateDir>/*.json` files that pass the command's filter: exactly one — take it; several — ask (AskUserQuestion), the most recently modified one first; none — say so and stop (the command says what to suggest).

Name the chosen key in one line when it came from step 3 or 4.

## State

The file `<stateDir>/<key>.json` (create the directory if needed), update it after every significant step:

```json
{
  "key": "ACME-1296",
  "title": "...",
  "branch": "ACME-1296",
  "plan": "/abs/path/to/the/approved/plan.md",
  "projects": [
    { "id": "web", "path": "/abs/path", "base": "main", "commit": null, "fixCommits": [], "pushed": false, "mr": null }
  ],
  "reproduction": [
    {
      "project": "web",
      "where": "http://localhost:3000",
      "reproduced": "yes",
      "steps": ["..."],
      "expected": "...",
      "actual": "...",
      "observedData": "the fields and values that drive the wrong result, e.g. GET /cart → item.status = CLOSED",
      "codePath": "src/entities/cart/lib/get-status.ts:42"
    }
  ],
  "checks": [
    { "project": "web", "kind": "positive", "priority": "P1", "item": "Add an item to the cart", "where": "/cart", "expected": "the header counter grows by 1", "result": "pass", "mock": false }
  ],
  "criteria": [
    { "criterion": "with item.status = CLOSED the cart shows «Недоступно»", "result": "pass" }
  ]
}
```

`plan` is the path of the plan file approved in `do` step 6 (null until then); the session context hook prints it after a compaction.

`checks` is the last «Проверка» run of `test-browser` (rows of the checklist with `result` `pass` / `fail` / `unchecked`; a re-run after a fix updates its rows). `criteria` are the acceptance criteria of the last `lp-task-loop` run, written by `do`. Both are read by `how-to-test`.

`reproduction` is written by `test-browser` in the «Обнаружение» mode (`reproduced`: `yes` / `no` / `unknown`) and read by `do` (plan, `Evidence:` for `lp-task-loop`) and by `test-browser` in the «Проверка» mode (the first checklist row).
