---
name: run
description: Autonomous loop for a coding task: implement → verify → skeptic → review → fix, repeated until there are no blocking findings, --max iterations (default 3) or the --budget of output tokens (default 150k). Edits code only, never commits
argument-hint: "<task text> [--max N] [--budget 150k] [--repo <path>]"
---

# /lp-task-loop:run

Arguments: `$ARGUMENTS`

You prepare the loop, start it as a workflow and report its result. You do not write or edit code yourself: the plugin agents do the work inside the workflow `${CLAUDE_SKILL_DIR}/loop.js`. Keep your own context small: never paste file contents into prompts, pass paths and line ranges.

Run autonomously: do not ask the user anything after step 0 unless an agent reports a blocker that only the user can resolve (missing credentials, an ambiguous requirement that changes the result) or the workflow returns `чекпоинт` (see «Checkpoint»). Never run `git commit`, `push`, `checkout`, `stash`, `reset`, `rebase` or anything else that changes git history, branches or the real index.

## Step 0. Setup

1. Parse `--max N` (integer ≥ 1, default 3), `--budget N` (output tokens of the whole loop, `150000` or `150k`, default 150000) and `--repo <path>` (default: the current directory) and remove them from the arguments; the rest is the task. If the task is empty, ask for it as a regular message and wait.
2. The repo root `R` = `git -C <repo> rev-parse --show-toplevel`. If it is not a git repository, say that the loop needs git to track changes and stop. Run every git command of the loop as `git -C "$R" ...` and pass `R` to every agent as the repo root.
3. Find the project commands, cheaply: `package.json` scripts (lint, typecheck/tsc, test, build), `Makefile` targets, the repo `CLAUDE.md`, and `lint` of the matching project in `.claude/lp-task.json` (searched upward from `R`) if it exists. Do not run them here.
4. Write 3 to 8 acceptance criteria: concrete and checkable (behaviour, edge cases the task implies, commands that must pass). No criteria that nobody can verify.
   - If the task has an `Evidence:` block (real data observed when the bug was reproduced), at least one criterion is stated on exactly that data: «with <observed data> the code gives <expected result>». Criteria describe the observed input, not the input the plan assumes: the plan may be built on a wrong guess, and the loop must not confirm it.
   - If the task is a bug fix without `Evidence:` (or it says the root cause is a hypothesis), remember it for the final report.
5. Create a work dir: `W=$(mktemp -d "${TMPDIR:-/tmp}/lp-task-loop.XXXXXX")`. Take the baseline snapshot (see «Snapshots») as `base`.
6. Create the loop marker: `mkdir -p "${CLAUDE_PLUGIN_DATA}/loop-active" && echo "$R" > "${CLAUDE_PLUGIN_DATA}/loop-active/$(printf '%s' "$R" | tr '/' '_')"`. While it exists (at most 3 hours), the plugin hook denies `git commit`, `push`, `checkout`, `switch`, `stash`, `reset`, `rebase`, `add` and `restore` in `R` (snapshots with `GIT_INDEX_FILE` are allowed). Remove it at the end, whatever the outcome.
7. Show the criteria and commands in one short block and continue without waiting.

## Snapshots

A snapshot is a tree of the working copy that does not touch the real index or the files:

```
cp "$(git -C "$R" rev-parse --path-format=absolute --git-path index)" "$W/idx" && GIT_INDEX_FILE="$W/idx" git -C "$R" add -A && GIT_INDEX_FILE="$W/idx" git -C "$R" write-tree
```

If the copy fails because the repository has no index yet, skip the `cp`. Remember the printed hash per iteration (`base`, `s1`, `s2`, ...). Always compare two snapshots, never a snapshot with the working copy (that misses new untracked files): `git diff <base> <sN>` is the full change of the loop, `git diff <s(N-1)> <sN>` is the delta of iteration N; `--name-only` / `--stat` give the file lists.

## The loop

Read `${CLAUDE_SKILL_DIR}/loop.js` with the Read tool and call the Workflow tool with its whole text, unchanged (without the line number prefixes of Read), as `script` (not `scriptPath`: the Workflow tool refuses a path in the plugin cache, outside the working directory) and `args` as a JSON object (not a string):

```json
{ "repo": "<R>", "workDir": "<W>", "task": "<the task text>", "criteria": ["..."], "commands": { "lint": "...", "typecheck": "...", "test": "...", "build": "..." }, "evidence": "<the Evidence: block or empty>", "base": "<base snapshot>", "max": 3, "budget": 150000 }
```

The workflow runs every iteration without you: a fresh `lp-task-loop:implementer` (with the previous blocking findings from iteration 2), `lp-task-loop:verifier` (takes the snapshot, then lint, typecheck, related tests), `lp-task-loop:skeptic` (does the change do the task, on the criteria and the evidence) and, only when the skeptic found nothing, `lp-task-loop:reviewer` (quality of the diff). It stops on «готово» (no blocking findings, the last skeptic pass covered all criteria), «лимит итераций», «лимит токенов», «нет прогресса», «чекпоинт», «блокер» (only the user can resolve it) or «ошибка агента». Blocking: verifier failures that are not pre-existing, skeptic FAIL and proven findings, reviewer `critical` / `high`.

Token limit: the workflow counts the output tokens of the loop and never starts an iteration that would not fit into `budget` by the average cost of the previous ones, and stops before an expensive agent once the budget is spent («лимит токенов»).

Wait for the workflow to finish, then write the final report from its result (`status`, `iterations`, `criteria`, `criteriaPassed`, `criteriaTotal`, `blocking`, `nonBlocking`, `verifier`, `notDone`, `lastSnapshot`, `blocker`, `tokens`, `budget`, `checkpointReason`). Remember the `runId` and the persisted `scriptPath` from the Workflow result: a checkpoint resumes with them.

## Checkpoint

After an iteration that is not done, the workflow decides whether to go on by itself. It continues without asking when progress is clear (only verifier failures; after iteration 1 the skeptic passes at least half of the criteria with at most 3 blocking findings; later, fewer blocking findings or fewer failed criteria than before) and less than half of the budget is spent. «Нет прогресса» stops as before. Otherwise it returns `чекпоинт` with `checkpointReason`. This happens at most once per loop.

On `чекпоинт`:
1. Show 3 to 4 short lines: iteration, criteria `criteriaPassed`/`criteriaTotal`, the blocking findings (count and one line each, at most 3), tokens `~tokens/budget`, the reason.
2. Ask with AskUserQuestion: «Продолжить» (mark it Recommended when the reason is the half of the budget, not unclear progress), «Остановиться, оставить изменения», «Продолжить и поднять лимит» (the new limit: double the current one unless the user names a number).
3. Continue: call Workflow with `scriptPath` (the persisted copy from the first run's result), `resumeFromRunId: <runId>` and the same `args` plus `"confirmed": true`, `"spentBefore": <tokens>`, `"resumeAt": <iterations>` (and the new `budget` if it was raised). The finished agents come from the cache, the live work starts at the next iteration, and the workflow does not ask again (the hard token limit, `--max` and «нет прогресса» still apply). If the resume is refused (another session, no runId), start a fresh run with `script` as in «The loop», the same `args` plus `"confirmed": true` and `"spentBefore": <tokens>` (no `resumeAt`), and add to `task` one line: «The working copy already has a partial implementation; first fix these findings: <the blocking findings>».
4. Stop: write the final report.

If the Workflow tool is not available in this session, run the iterations yourself by `${CLAUDE_SKILL_DIR}/references/manual-loop.md`.

## Final report

In Russian, short:

1. Status: `готово` / `лимит итераций` / `лимит токенов` / `нет прогресса` / `остановлено на чекпоинте` / `блокер` (with what the user has to resolve) / `ошибка агента`, the number of iterations and «Токены: ~X из Y (выходные)». For a bug fix without `Evidence:` add the line «Причина не подтверждена воспроизведением: проверка шла по гипотезе плана» (not blocking).
2. Criteria table: criterion → ✅ / ❌ (from the last skeptic run) → comment.
3. Remaining blocking findings (if any), then non-blocking reviewer findings as one compact list, then `notDone` (for example tests the change breaks; they are fixed through `lp-code-test:unit`).
4. Verifier summary: commands and their status, pre-existing failures noted as such.
5. `git diff --stat <base> <last snapshot>` (the loop's change, nothing is committed).
6. Next: commit with `/lp-task:commit` (or manually), browser check with `/lp-task:test-browser`.

Delete `$W` and the loop marker at the end.
