# MR message

Used by `/lp-task:push` and `/lp-task:mr-copy`. Config keys: `mrMessage.*` in `shared.md`.

A ready-made message for the team with the MR links, built from `mrMessage.lines` and `mrMessage.link`. Defaults:

```json
"lines": ["{header}", "{mrTitle}", "", "{links}"],
"link": "* {label}: {url}"
```

Placeholders in `lines`:
- `{header}` — `mrMessage.header`;
- `{key}`, `{num}`, `{title}` — as in the other templates (`{title}` without `tracker.titleStripPrefixes`);
- `{mrTitle}` — the MR title built from `git.mrTitle`;
- `{issueUrl}` — `tracker.issueUrl` with `{key}` substituted; empty if `tracker.issueUrl` is empty;
- `{links}` — only as the whole line: expands into one line per task project that has an MR, built from `link`; projects without an MR are not printed; order — by `projects[]` in the config.

Placeholders in `link`: `{label}` (project `label`), `{id}` (project `id`), `{url}` (MR/PR link), `{base}` (target branch).

Building the plain text:
1. Substitute the placeholders in every line; an unknown placeholder stays as is.
2. Drop a line that has placeholders and all of them are empty (an empty `header` or `issueUrl` leaves no empty line). A literally empty line `""` stays — it is a separator.
3. Collapse several empty lines in a row into one, drop empty lines at the start and the end.
4. If the template has no `{links}` — the links are not printed (the project chose so).

Print the plain text in a code block.

Work chat apps usually turn `* ` / `- ` into a list only while typing, pasted plain text stays as is. So the clipboard gets HTML together with the plain text. Build the HTML from the same lines:
- start with `<meta charset="utf-8">`;
- every line → `<div>…</div>`, an empty line → `<div><br></div>`;
- the `{links}` block: if `link` starts with `* ` or `- ` — one `<ul>` with a `<li>` per link, without that marker; otherwise every link line is a separate `<div>`;
- escape `&`, `<`, `>` in the text, then wrap every `http(s)://…` URL in `<a href="<url>"><url></a>`.

Example of the default HTML: `<meta charset="utf-8"><div>@team</div><div>ACME-1: Title</div><div><br></div><ul><li>Web: <a href="https://…">https://…</a></li></ul>`.

Copy only if `mrMessage.clipboard` is `true` and the OS is macOS: `osascript -l JavaScript "${CLAUDE_PLUGIN_ROOT}/scripts/copy-rich.js" "<html>" "<plain text>"` (plain text lines start at column 0, no leading spaces, no trailing newline). After that say in one line that the message is already in the clipboard and will paste into the work chat with formatting. Otherwise only print it.
