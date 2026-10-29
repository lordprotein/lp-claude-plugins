# Merge request comments (GitLab)

How to read a GitLab MR and publish review findings as MR comments. Used by MR mode (step 0) and step 9 of `SKILL.md`.

## Tools (in this order)

1. **GitLab MCP.** The server name is `review.gitlab.mcpServer` (default `gitlab`). If its tools are deferred, load them through ToolSearch (query by the server name and words like `merge request`, `discussion`, `note`). Use it only if it points to the same host as the project remote (`git remote get-url origin`); an MCP server for another GitLab instance is not usable here.
2. **`glab` CLI.** `glab api` against the host from the remote URL (`--hostname <host>` or `GITLAB_HOST`). Check access with `glab auth status`. Encode the project path for the API: `acme/web/app` → `acme%2Fweb%2Fapp`.
3. **Neither is available.** Say so in one line and offer to save the comments as a markdown file instead (`AskUserQuestion`: «Сохранить в файл» / «Отмена»). Never post through any other channel.

Below the operations are described as REST calls (`/projects/:id/merge_requests/:iid/...`); with MCP use the equivalent tool, with `glab` use `glab api`.

## Reading the MR

1. Resolve `:id` (project path or numeric id) and `:iid` from the MR link, or from the state file field `mr`, or from `glab mr view` / the open MR of the current branch.
2. `GET /projects/:id/merge_requests/:iid` → title, `source_branch`, `target_branch`, `diff_refs` (`base_sha`, `start_sha`, `head_sha`).
3. `GET /projects/:id/merge_requests/:iid/changes` (or `glab mr diff <iid>`) → changed files with unified diffs. Review only the changed lines and their direct context.
4. If the working copy is on the MR branch, read full files locally for context; otherwise rely on the diff and `git show origin/<source_branch>:<path>`.

## Placement

A finding becomes an **inline discussion** when it points to a line that is present in the MR diff on the new side (an added or changed line, or a context line inside a hunk). Otherwise it becomes a **general note** (a discussion without position) that starts with `file:line`.

Inline discussion:

```
POST /projects/:id/merge_requests/:iid/discussions
body (json):
  body: "<comment text>"
  position:
    position_type: "text"
    base_sha, start_sha, head_sha: from diff_refs
    old_path, new_path: file path
    new_line: line on the new side
```

If the API rejects the position (line not in the diff, file renamed), retry once as a general note with `file:line` in the text. Do not loop.

## Comment text

Short, one finding per discussion, no numbering. Template:

```
**<badge> <Severity>: <title>**

<description, 1-4 lines; a code block only if it shows the problem>

**Fix:** <suggested fix, 1-3 lines; a code block if it helps>

<!-- lp-review:<fingerprint> -->
```

- `<badge>` and severity from the severity table (🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low).
- `<fingerprint>` — a short stable id: first 8 hex chars of a hash of `<new_path>:<normalized title>`. The HTML comment is invisible in GitLab and used for dedup.
- Language of the text — the language of the review itself.

Summary note (one per run, a general note):

```
**Code review summary**

🔴 Critical: N · 🟠 High: N · 🟡 Medium: N · 🟢 Low: N
Verdict: <APPROVE | REQUEST_CHANGES | COMMENT>

<!-- lp-review:summary -->
```

## Deduplication

Before posting, `GET /projects/:id/merge_requests/:iid/discussions` (all pages) and collect `lp-review:<fingerprint>` markers from existing notes. Skip a finding whose fingerprint already exists. Report skipped findings in the final output («уже опубликовано: N»). Post the summary note only if no `lp-review:summary` note exists, otherwise skip it.

## Rules

- Post only the set the user confirmed in step 9.
- Never resolve, edit or delete any existing discussion or note, including your own earlier ones.
- Never approve, unapprove or merge the MR, never change its title, labels or assignees.
- Post sequentially, one request per finding; on an error show it, stop and ask how to continue — do not retry blindly.
- Do not include secrets, tokens or personal data from the code in comment texts; quote the minimum code needed.
