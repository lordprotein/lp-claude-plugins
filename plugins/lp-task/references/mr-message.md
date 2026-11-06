# MR message

How to build the text and the HTML of the team MR message. Used by `/lp-task:mr-message` (which `/lp-task:push` calls); the HTML rules are also used by `how-to-test`. Config keys: `mrMessage.*` in `shared.md`.

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
3. Task link: if the task has a link (see `/lp-task:mr-message` «Task link»), replace the first occurrence of `{key}` in the lines outside the `{links}` block (usually inside `{mrTitle}`) with the markdown link `[<key>](<task url>)`. Skip an occurrence inside a URL; if the message already shows that task URL (e.g. through `{issueUrl}`), leave the key as text. No task link — the key stays as text.
4. Collapse several empty lines in a row into one, drop empty lines at the start and the end.
5. If the template has no `{links}` — the links are not printed (the project chose so).

Print the plain text in a code block.

Work chat apps usually turn `* ` / `- ` into a list only while typing, pasted plain text stays as is. So the clipboard gets HTML together with the plain text. Build the HTML from the same lines:
- start with `<meta charset="utf-8">`;
- every line → `<div>…</div>`, an empty line → `<div><br></div>`;
- the `{links}` block: if `link` starts with `* ` or `- ` — one `<ul>` with a `<li>` per link, without that marker; otherwise every link line is a separate `<div>`;
- escape `&`, `<`, `>` in the text, then turn the task link `[<key>](<task url>)` into `<a href="<task url>"><key></a>`, then wrap every other `http(s)://…` URL in `<a href="<url>"><url></a>` (never wrap a URL that is already inside an `<a>`).

Example of the default HTML with a task link: `<meta charset="utf-8"><div>@team</div><div><a href="https://acme.example.com/browse/ACME-1">ACME-1</a>: Title</div><div><br></div><ul><li>Web: <a href="https://…">https://…</a></li></ul>`.
