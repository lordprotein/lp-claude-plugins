# MR message

Used by `/lp-task:push`. Config keys: `mrMessage.*` in `shared.md`.

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

## MR groups

When `push` split the task into MR groups (`skills/push/SKILL.md` «MR groups»), build one message per group from the same template: `{links}` holds only the projects of that group. Save it with `kind` = `mr-<group>` (the group id: latin letters, digits and `-`, e.g. `mr-kit`); the `lp-copy-bar` button reads «MR <group>». Build and save the message of every group that got a new MR in this run or has no saved `mr-<group>` message yet; a `mr-<group>` message saved by an earlier run stays as it is. The second case covers a task that was split into groups after some of its MRs already existed (e.g. a shared library joined the task later): those MRs got the single `mr` message then, and their group still needs its own `mr-<group>`. Without groups the `kind` is `mr`.

## Save

Save and copy the same way for every copyable message (`${CLAUDE_PLUGIN_ROOT}/references/clipboard.md`) with `kind` = `mr` (or `mr-<group>`): the files `<stateDir>/<key>/messages/<kind>.html` and `<kind>.txt`, both written with the Write tool (a shell write is denied by the plugin hook, and the `lp-copy-bar` button appears only for Write calls). Copy only if `mrMessage.clipboard` is `true`; then say in one line that the message is in the clipboard and will paste into the work chat with formatting. Otherwise only print and save it and say in one line that it is copied by the button above the prompt (`lp-copy-bar` mod).
