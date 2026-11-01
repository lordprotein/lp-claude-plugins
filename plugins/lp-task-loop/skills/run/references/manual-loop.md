# lp-task-loop: manual loop (fallback)

Used by `skills/run/SKILL.md` only when the Workflow tool is unavailable. You run the iterations yourself with the Agent tool; snapshots as in «Snapshots» of `SKILL.md`. The order is two-stage: the skeptic first (does the change do the task), the reviewer only when the skeptic has no FAIL.

## The loop (iteration N = 1..max)

### 1. Implement

- N = 1: launch `lp-task-loop:implementer` with a name (`name: "implementer-<folder name of R>"`) and give it: the task, the criteria, the commands, the repo root, and the `Evidence:` block if there is one.
- N ≥ 2: continue the same agent via SendMessage (load it via ToolSearch if deferred) and give it only the blocking findings of the previous iteration (and the skeptic's answers to its disputes, if any). It keeps its context, so do not repeat the task. If SendMessage is unavailable or the agent is gone, launch a new `lp-task-loop:implementer` with the task, the criteria and the findings.

Then take snapshot `sN`. If `git diff <s(N-1) or base> <sN>` is empty and the implementer did not dispute every finding, record «no changes» for the progress check.

### 2. Verify (cheap gate)

Launch `lp-task-loop:verifier` with `effort: "lower"`: the commands, the repo root, the files of `git diff --name-only <base> <sN>`, and the range `<base> <sN>` (to tell new failures from pre-existing ones).

If it reports a new failure (not `pre-existing`), skip step 3: its failures are the blocking findings of this iteration, go to step 4.

### 3. Skeptic, then reviewer

- `lp-task-loop:skeptic`: the task, the criteria, the repo root, the full range `<base> <sN>`, the implementer's report, and the `Evidence:` block if there is one. When N ≥ 2: only the criteria that were FAIL in the last skeptic run plus every criterion touched by the delta files (list them), and the implementer's disputes with their arguments.
- then, only if the skeptic has no `FAIL` and no findings: `lp-task-loop:reviewer`: the task, the repo root, the diff range to review: `<base> <sN>` when N = 1, otherwise only the delta `<s(N-1)> <sN>`, plus the previous blocking findings to confirm they are fixed.

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
- **Checkpoint** (at most once per loop): go on by yourself only on clear progress: only verifier failures; after iteration 1 the skeptic passes at least half of the criteria with at most 3 blocking findings; later, fewer blocking findings or fewer failed criteria than in iteration N-1. Otherwise show a 3 to 4 line summary and ask as in «Checkpoint» of `SKILL.md` (continue or stop). Tokens cannot be measured here, so the `--budget` limit does not apply in the manual loop: say so in the final report.
- Otherwise go to iteration N+1 with the blocking findings as a list: `severity | file:line | problem | evidence`.

Before each new iteration print one progress line: `Итерация N: <k> блокирующих (<sources>) → доработка`.

