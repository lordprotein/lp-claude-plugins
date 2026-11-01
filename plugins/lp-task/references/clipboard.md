# Clipboard

Used by every command that copies a message (`mr-message.md`, `how-to-test`).

1. Write the message to two files with the Write tool (never through `echo` or a shell argument): `<stateDir>/<key>/messages/<kind>.html` (the HTML, starting with `<meta charset="utf-8">`) and `<stateDir>/<key>/messages/<kind>.txt` (the plain text, lines from column 0, no trailing newline). `kind` is `mr` or `how-to-test`. The files stay: `/lp-task:mr-copy`, `/lp-task:how-to-test copy` and the `lp-copy-bar` mod copy them again.
2. On macOS run exactly `osascript -l JavaScript "${CLAUDE_PLUGIN_ROOT}/scripts/copy-rich.js" "<html file>" "<text file>"` with absolute paths (the `lp-copy-bar` mod recognizes this call and shows a copy button for it). On another OS do not copy: print the plain text and give the file paths.
3. If the command failed, say so in one line and print the plain text in a code block so the user can copy it by hand.
