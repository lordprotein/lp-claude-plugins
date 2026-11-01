# Reading the task

Used by `do` (step 1) and `test-browser` (step 1). Try in this order:

- `tracker.type: jira` — via Atlassian MCP (`getJiraIssue`, cloudId — the host from the link or from `tracker.issueUrl`, `view: "evidence"`; if the tools are deferred — load them via ToolSearch).
- If Atlassian MCP is unavailable or failed, or `tracker.type: url` — read it in the browser: load the Chrome MCP tools via ToolSearch (tabs context, create tab, navigate, get page text), open the task URL in a new tab and read the page text. If the page asks for a login — ask the user to log in in the opened Chrome window, wait and read again. Never type credentials yourself.
- If there is no task URL (only a key and an empty `tracker.issueUrl`), or neither MCP nor the browser worked — say so and ask the user to paste the summary and description as text.
