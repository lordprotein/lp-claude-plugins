---
name: code-review
description: "Expert code review with a senior engineer lens. Reviews git changes or targeted code (files, folders, features). Detects SOLID violations, security risks, and proposes actionable improvements."
---

# Code Review Expert

## Overview

Perform a structured code review with focus on SOLID, architecture, removal candidates, and security risks. Default to review-only output unless the user asks to implement changes.

**Three modes of operation:**

- **Default mode** (no argument): Reviews current git changes via `git diff`.
- **Targeted review mode** (with argument): Reviews specific code — a file path, folder, feature name, function, or keyword. The argument is interpreted flexibly: it can be a path (`src/auth/`), an entity name (`PaymentService`), or a description (`логика корзины`).
- **MR mode** (argument is a merge request link, or `mr`): Reviews the diff of a GitLab merge request and can publish the findings as MR comments (step 9).

Config: the first `.claude/lp-task.json` found from the current directory upward (else `~/.claude/lp-task.json`), deep-merged over `${CLAUDE_PLUGIN_ROOT}/config.default.json` (objects key by key, arrays and scalars replace). Without a config use the defaults. Used keys: `stateDir` (task state is `<stateDir>/<key>.json`, `~` expands to home), `review.postToMr` (`ask` default: offer to publish findings to a GitLab MR; `never`: do not offer), `review.minSeverity` (`critical` | `high` | `medium` default | `low`: lowest severity offered for publishing), `review.gitlab.mcpServer` (GitLab MCP server name, default `gitlab`; `glab` is the fallback).

## Severity Levels

| Badge | Level | Description | Action |
|-------|-------|-------------|--------|
| 🔴 | **Critical** | Security vulnerability, data loss risk, correctness bug | Must block merge |
| 🟠 | **High** | Logic error, significant SOLID violation, performance regression | Should fix before merge |
| 🟡 | **Medium** | Code smell, maintainability concern, minor SOLID violation | Fix in this PR or create follow-up |
| 🟢 | **Low** | Style, naming, minor suggestion | Optional improvement |

## Workflow

### 0) Mode detection

If the argument is a merge request link (`.../-/merge_requests/<iid>`) or the word `mr` (take the MR from the current task state `<stateDir>/<key>.json` field `mr`, or from the open MR of the current branch), switch to **MR mode**:

1. Resolve the project and MR iid, load the MR diff by following `references/mr-comments.md` (section «Reading the MR»).
2. Review exactly the lines changed by the MR; skip step 1 (git diff) and continue from step 2. Remember `base_sha`, `start_sha`, `head_sha` and the changed files, they are needed for step 9.

Otherwise, if the user provides an argument (text after the skill command), switch to **targeted review mode**:

1. **Determine target type**:
   - If argument looks like a file/directory path → read those files directly
   - If argument is a name/keyword (e.g. "auth", "PaymentService", "роутинг") → use `rg`, `grep`, `find` to locate all related files, functions, classes, and modules
   - If argument is a description (e.g. "логика оплаты") → search for related code by keywords

2. **Scope the review**:
   - List all discovered files and ask the user to confirm the scope
   - If too many files found (>10), suggest narrowing down or review in batches

3. **Proceed to step 2** (skip git diff in step 1, review the discovered code instead)

If no argument is provided → proceed to step 1 (default git diff review).

### 1) Preflight context

> **Note**: In targeted review mode and MR mode (step 0), this step is skipped — the review scope is already established.

- Use `git status -sb`, `git diff --stat`, and `git diff` to scope changes.
- If needed, use `rg` or `grep` to find related modules, usages, and contracts.
- Identify entry points, ownership boundaries, and critical paths (auth, payments, data writes, network).

**Edge cases:**
- **No changes**: If `git diff` is empty, inform user and ask if they want to review staged changes or a specific commit range.
- **Large diff (>500 lines)**: Summarize by file first, then review in batches by module/feature area.
- **Mixed concerns**: Group findings by logical feature, not just file order.

### 2) SOLID + architecture smells

- Load `references/solid-checklist.md` for general SOLID prompts.
- **If the review scope contains `.tsx`/`.jsx` files or React hooks**: also load `references/solid-react-checklist.md` for React-specific patterns (god-hooks, wide hook interfaces, component anti-patterns).

**MANDATORY procedure** — do NOT skip this, do NOT merge SOLID findings into general findings:

1. **Inventory**: List all major code units in scope (hooks, components, utility modules). Write them down.
2. **SRP scan**: For each hook and component from the inventory, answer: *"What is the single reason this would change?"* If the answer contains "and" — flag it.
3. **ISP scan**: For each hook that returns an object with 3+ fields, list its consumers and check which fields each consumer uses. If no consumer uses >60% of fields — flag it.
4. **OCP scan**: Search for hardcoded type/category/status checks in generic components (`if (type ===`, `switch(status)`, magic numbers with conditional display).
5. **DIP scan**: Check if components import store slice internals directly vs. using abstraction hooks.
6. **LSP scan**: Check for `as Type` casts bypassing type safety, ignored props, conditional children rendering.
7. **Record findings** directly into the `## Findings` section with appropriate severity (Critical/High/Medium/Low). SOLID violations are NOT separated into their own section — they are regular findings alongside security, quality, and other issues. The list of checked code units goes into the `**Units checked**` line at the top of Findings.

- When you propose a refactor, explain *why* it improves cohesion/coupling and outline a minimal, safe split.
- If refactor is non-trivial, propose an incremental plan instead of a large rewrite.

### 3) Removal candidates + iteration plan

- Identify code that is unused, redundant, or feature-flagged off.
- Classify each candidate into two categories:
  - **Safe to remove now**: no active consumers, evidence of non-usage (0 references, dead flag). List location, rationale, deletion steps, verification.
  - **Defer removal (plan required)**: has consumers or needs migration. Note preconditions, breaking changes, migration steps, timeline, rollback plan.
- **Checklist before any removal**:
  - [ ] Searched codebase for all references (`rg`, `grep`)
  - [ ] Checked for dynamic/reflection-based usage
  - [ ] Verified no external consumers (APIs, SDKs, docs)
  - [ ] Feature flag telemetry reviewed (if applicable)
  - [ ] Tests updated/removed

### 4) Security and reliability scan

- Load `references/security-checklist.md` and check every section of it.
- **New dependencies**: If new packages were added, check justification (could stdlib solve it?), maintenance status, and bundle size impact. Flag unjustified or unmaintained additions as 🟡 Medium.
- Call out both **exploitability** and **impact**.

### 5) Code quality scan

- Load `references/code-quality-checklist.md` and check every section of it (error handling, boundary conditions).
- **Test coverage gap**: If changed code lacks corresponding test updates, flag as 🟡 Medium. Note which behaviors are untested. Do NOT write tests — only flag the gap.
- **Breaking changes**: Check for renamed/removed public APIs, changed function signatures, altered response shapes, removed exports. If the change is in a shared library or API layer, flag breaking changes as 🟠 High with migration guidance.
- Flag issues that may cause silent failures or production incidents.

### 6) Performance scan

- Load `references/performance-checklist.md` and check every section of it.
- For each finding, estimate impact: note input size sensitivity and expected degradation pattern.
- All performance findings go into the `### ⚡ Performance` category within the `## Findings` section.

### 7) Output format

Structure your review as follows:

````markdown
## Code Review Summary

**Files reviewed**: X files, Y lines changed
**Overall assessment**: [APPROVE / REQUEST_CHANGES / COMMENT]

---

## Findings

**Units checked**: `useMyHook`, `MyComponent`, `utilFunction`, ...

### 🛡 Security & Reliability
(findings formatted per the finding template below)

### 🏗 Architecture & SOLID
(findings formatted per the finding template below)

### ⚡ Performance
(findings formatted per the finding template below)

### 🧹 Code Quality
(findings formatted per the finding template below)

### 🗑 Removal Candidates
(if applicable)

---

## Additional Suggestions
(only if there are any: optional improvements, not blocking)
````

**Finding template for 🔴 Critical and 🟠 High**:

````
N. Brief title

**Status:**
🔴 Critical

**Files:**
- `file.ts:42`
- `other.ts:15`

**Description:**
Explanation text.
```lang
problematicCode()
```

**Fix:**
Suggested fix text.
```lang
betterCode()
```

---

M. Next finding title
...
````

**Finding template for 🟡 Medium and 🟢 Low** (compact):

````
N. 🟡 Medium · `file.ts:42` · Brief title
Problem in 1-2 lines. **Fix:** suggested fix in one line.
````

Add a short code snippet to a Medium/Low finding only if the fix is not obvious from the text.

- Only the finding title is numbered (`1.`, `2.`, ...); numbering restarts at 1 in each category. Labels (**Status:**, **Files:**, **Description:**, **Fix:**) are plain bold text: never numbered, never indented.
- In the Critical/High template each label is on its own line; its value starts on the next line.
- Between findings: empty line, `---`, empty line. No `---` after the last finding in a category.
- Within a category sort by severity: 🔴, 🟠, 🟡, 🟢. Empty categories are not rendered.
- Critical/High: Description MUST include a code block with the problematic fragment; Fix MUST include a code block with the suggested change when applicable.
- The severity summary appears only in Next Steps (one line).

**Clean review**: If no issues found, explicitly state:
- What was checked
- Any areas not covered (e.g., "Did not verify database migrations")
- Residual risks or recommended follow-up tests

### 8) Next steps confirmation

After presenting findings, end with the severity summary and one question:

```markdown
---

🔴 _ · 🟠 _ · 🟡 _ · 🟢 _
Исправить: все / только 🔴🟠 / номера через запятую / ничего?
```

**Important**: Do NOT implement any changes until user explicitly confirms. This is a review-first workflow.

### 9) Publish findings to the merge request (optional)

Runs only when there is a GitLab MR for the reviewed code (MR mode, or the current task/branch has an open MR) and `review.postToMr` is not `never`. Otherwise skip silently.

Publishing is an outward-facing action: never post anything without an explicit answer.

1. Collect the findings with severity ≥ `review.minSeverity` (default `medium`; 🟢 only on request).
2. Show a preview table: `#`, severity, title, `file:line`, `inline` or `general note` (per `references/mr-comments.md`, section «Placement»).
3. Ask (AskUserQuestion), header «MR»: «Опубликовать комментарии в MR?» — «Опубликовать все» / «Только 🔴🟠» / «Не публиковать». «Не публиковать» ends the step.
4. Post exactly the confirmed set by following `references/mr-comments.md` (tools order: GitLab MCP, then `glab`; dedup; inline discussions with fallback to a general note; one summary note).
5. Print what was posted: counts, and links to the discussions if the tool returned them. Never resolve, edit or delete existing comments.

