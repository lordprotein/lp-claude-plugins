---
name: run
description: Autonomous loop for a coding task: implement → verify → skeptic → review → fix, repeated until there are no blocking findings, --max iterations (default 3) or the --budget of output tokens (default 150k). Edits code only, never commits
argument-hint: "<task text> [--max N] [--budget 150k] [--repo <path>]"
---

# /lp-task-loop:run (Codex)

Arguments: `$ARGUMENTS`

This is the Codex version of the skill. The Claude Code version (`skills/run/` with the workflow `loop.js`) is a separate file; keep the two in step (see `CLAUDE.md` of the repository). You orchestrate the loop yourself with subagents. You do not write or edit code yourself: the roles do the work. Keep your own context small: never paste file contents into prompts, pass paths and line ranges.

Differences from the Claude Code version: no resume, no hook that denies git writes (the rule below is held by this text and by what you tell every role), and the token budget is measured from the Codex session logs by `bin/lp-loop-tokens` of the plugin (see «Token budget»).

Run autonomously: do not ask the user anything after step 0 unless a role reports a blocker that only the user can resolve (missing credentials, an ambiguous requirement that changes the result) or the checkpoint applies. Never run `git commit`, `push`, `checkout`, `switch`, `stash`, `reset`, `rebase`, `add` or `restore` in the real repository, and tell every role the same. Snapshots below use their own index file and are allowed.

## Roles

Four roles, defined by the files `agents/implementer.md`, `verifier.md`, `skeptic.md`, `reviewer.md` in the plugin folder (two levels above this file). Spawn each as a subagent; if the client has a custom agent for the role (`implementer`, `verifier`, `skeptic`, `reviewer`, from `codex-agents/*.toml`), use it, otherwise spawn a general subagent and give it the body of the role file (without the frontmatter) as its instructions followed by the input described in the loop. Tell the verifier to use low reasoning effort where the client allows it.

## Step 0. Setup

1. Parse `--max N` (integer ≥ 1, default 3), `--budget N` (output tokens of the whole loop, `150000` or `150k`, default 150000) and `--repo <path>` (default: the current directory) and remove them from the arguments; the rest is the task. If the task is empty, ask for it as a regular message and wait.
2. The repo root `R` = `git -C <repo> rev-parse --show-toplevel`. If it is not a git repository, say that the loop needs git to track changes and stop. Run every git command of the loop as `git -C "$R" ...` and pass `R` to every role as the repo root.
3. Find the project commands, cheaply: `package.json` scripts (lint, typecheck/tsc, test, build), `Makefile` targets, the repo `AGENTS.md` or `CLAUDE.md`, and `lint` of the matching project in `.claude/lp-task.json` (searched upward from `R`) if it exists. Do not run them here.
<!-- sync:criteria -->
4. Write 3 to 8 acceptance criteria: concrete and checkable (behaviour, edge cases the task implies, commands that must pass). No criteria that nobody can verify.
   - If the task has an `Evidence:` block (real data observed when the bug was reproduced), at least one criterion is stated on exactly that data: «with <observed data> the code gives <expected result>». Criteria describe the observed input, not the input the plan assumes: the plan may be built on a wrong guess, and the loop must not confirm it.
   - If the task is a bug fix without `Evidence:` (or it says the root cause is a hypothesis), remember it for the final report.
<!-- /sync:criteria -->
5. Create a work dir: `W=$(mktemp -d "${TMPDIR:-/tmp}/lp-task-loop.XXXXXX")`. Take the baseline snapshot (see «Snapshots») as `base`.
6. Start the token counter: `bash "<plugin folder>/bin/lp-loop-tokens" start "$R" "$W/tokens"` (the plugin folder is two levels above this file). If it exits with a non-zero status, the budget cannot be measured: say so in one line, set `BUDGET_ON=false` and apply only `--max`.
7. Show the criteria, commands and the budget in one short block and continue without waiting.

## Token budget

`used` = the number printed by `bash "<plugin folder>/bin/lp-loop-tokens" spent "$R" "$W/tokens"`: the growth of output tokens of every Codex session in `R` since the start (you and the subagents). Read it at the points below; skip all of them when `BUDGET_ON=false`. If a call fails midway, treat it as `BUDGET_ON=false` from then on.

- Before iteration N ≥ 2: stop with status «лимит токенов» if `used >= budget`, or if `used + used / (N-1) > budget` (the next iteration would not fit by the average cost of the previous ones).
- Before the skeptic, the reviewer and the final skeptic pass: if the step is only needed to confirm «done» (there are no blocking findings yet) and `used >= budget`, stop with «лимит токенов».
- Checkpoint (see «Decide»): also stop to ask when `used * 2 >= budget`.
- Print `~used/budget` (in k) in the progress line of each iteration.

<!-- sync:snapshots -->
## Snapshots

A snapshot is a tree of the working copy that does not touch the real index or the files:

```
cp "$(git -C "$R" rev-parse --path-format=absolute --git-path index)" "$W/idx" && GIT_INDEX_FILE="$W/idx" git -C "$R" add -A && GIT_INDEX_FILE="$W/idx" git -C "$R" write-tree
```

If the copy fails because the repository has no index yet, skip the `cp`. Remember the printed hash per iteration (`base`, `s1`, `s2`, ...). Always compare two snapshots, never a snapshot with the working copy (that misses new untracked files): `git diff <base> <sN>` is the full change of the loop, `git diff <s(N-1)> <sN>` is the delta of iteration N; `--name-only` / `--stat` give the file lists.
<!-- /sync:snapshots -->

## The loop (iteration N = 1..max)

The order is two-stage: the skeptic first (does the change do the task), the reviewer only when the skeptic has no FAIL.

### 1. Implement

- N = 1: spawn the implementer and give it: the task, the criteria, the commands, the repo root, the `Evidence:` block if there is one, and the git rule above.
- N ≥ 2: send the same implementer only the blocking findings of the previous iteration (and the skeptic's answers to its disputes, if any); it keeps its context, so do not repeat the task. If you cannot message it any more, spawn a new implementer with the task, the criteria and the findings.

Then take snapshot `sN`. If `git diff <s(N-1) or base> <sN>` is empty and the implementer did not dispute every finding, record «no changes» for the progress check.

### 2. Verify (cheap gate)

Spawn the verifier with: the commands, the repo root, the files of `git diff --name-only <base> <sN>`, and the range `<base> <sN>` (to tell new failures from pre-existing ones).

If it reports a new failure (not `pre-existing`), skip step 3: its failures are the blocking findings of this iteration, go to step 4.

### 3. Skeptic, then reviewer

- Skeptic: the task, the criteria, the repo root, the full range `<base> <sN>`, the implementer's report, and the `Evidence:` block if there is one. When N ≥ 2: only the criteria that were FAIL in the last skeptic run plus every criterion touched by the delta files (list them), and the implementer's disputes with their arguments.
- Then, only if the skeptic has no `FAIL` and no findings, the reviewer: the task, the repo root, the diff range to review: the first review gets `<base> <sN>`; later reviews get `<base> <sN>` only for the files the last fix touched (`git diff <base> <sN> -- $(git diff --name-only <s(N-1)> <sN>)`) with the fix `<s(N-1)> <sN>` as the focus and «do not re-read the other changed files»; plus the previous blocking findings to confirm they are fixed (one that is not fixed is reported again as a finding) and every other reviewer finding of earlier rounds as «already reported» (`file:line | problem`, one line each). On the first review of a large diff (`git diff --shortstat` over 8 files or 300 changed lines) run two reviewers in parallel with a lens each: «correctness, edge cases, callers of the changed code» and «security, error handling, concurrency and async; do not invoke the lp-code-review skill»; merge their findings, one per `file:line`. If the `lp-code-review:review` skill is available the reviewer may use it in targeted mode, review-only.

### 4. Decide

Blocking findings:
- verifier: every failure not marked `pre-existing`;
- reviewer: severity `critical` or `high`;
- skeptic: every `FAIL` and every finding with evidence.

Merge and deduplicate (same file and same problem → one item, keep the strongest evidence). `medium` / `low` from the reviewer are not blocking: collect them for the report.

- **No blocking findings**:
  - if the last skeptic run checked every criterion on `<base> <sN>` (always true for N = 1), the loop is **done**;
  - otherwise run the skeptic once more on all criteria and the full range (the final pass). If it finds nothing, **done**; if it does, those are the blocking findings and the loop continues (this run counts towards the same iteration).
- **N = max**: stop with status «лимит итераций».
- **No progress**: the blocking findings match those of iteration N-1 (same file and essence) or step 1 recorded «no changes» → stop with status «нет прогресса».
- **A dispute**: if the implementer argued that a finding is wrong, do not just resend it. Pass the argument to the skeptic in the next run; drop the finding if the skeptic accepts the argument.
- **Checkpoint** (at most once per loop): go on by yourself only on clear progress and less than half of the budget spent: only verifier failures; after iteration 1 the skeptic passes at least half of the criteria with at most 3 blocking findings; later, fewer blocking findings or fewer failed criteria than in iteration N-1. Otherwise show a 3 to 4 line summary (iteration, criteria passed/total, blocking findings with one line each, at most 3, the reason) and ask in a plain message with numbered options: «Продолжить», «Остановиться, оставить изменения». On a stop write the final report with status «остановлено на чекпоинте».
- Otherwise go to iteration N+1 with the blocking findings as a list: `severity | file:line | problem | evidence`.

Before each new iteration print one progress line: `Итерация N: <k> блокирующих (<sources>) → доработка · ~<used>k/<budget>k токенов`.

A role that reports a blocker only the user can resolve ends the loop with status «блокер»; a role that fails or returns nothing usable ends it with «ошибка агента».

## Final report

In Russian, short:

1. Status: `готово` / `лимит итераций` / `лимит токенов` / `нет прогресса` / `остановлено на чекпоинте` / `блокер` (with what the user has to resolve) / `ошибка агента`, the number of iterations and «Токены: ~X из Y (выходные)» (with `BUDGET_ON=false`: «Токены не измерялись: логи сессий Codex недоступны»). For a bug fix without `Evidence:` add the line «Причина не подтверждена воспроизведением: проверка шла по гипотезе плана» (not blocking).
2. Criteria table: criterion → ✅ / ❌ (from the last skeptic run) → comment.
3. Remaining blocking findings (if any), then non-blocking reviewer findings as one compact list, then what is not done (for example tests the change breaks; they are fixed through `lp-code-test:unit`).
4. Verifier summary: commands and their status, pre-existing failures noted as such.
5. `git -C "$R" diff --stat <base> <last snapshot>` (the loop's change, nothing is committed).
6. Next: commit with `/lp-task:commit` (or manually), browser check with `/lp-task:test-browser`.

## Cleanup

At the end, whatever the outcome, remove the work dir: `rm -rf "$W"` with the path written out literally (shell variables do not survive between commands). Do not mention it to the user.
