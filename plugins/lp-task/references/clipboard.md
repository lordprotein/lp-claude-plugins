# Clipboard

Used by every command that saves a message for copying (`mr-message.md`, `how-to-test`). Step 1 always runs; steps 2-3 only when the command copies.

1. Write the message to two files with the Write tool (never through `echo` or a shell argument): `<stateDir>/<key>/messages/<kind>.html` (the HTML, starting with `<meta charset="utf-8">`) and `<stateDir>/<key>/messages/<kind>.txt` (the plain text, lines from column 0, no trailing newline). `kind` is `mr` or `how-to-test`. The files stay: `/lp-task:how-to-test copy` and the `lp-copy-bar` mod (it shows a copy button once the files are written) copy them.
2. On macOS run exactly `osascript -l JavaScript "${CLAUDE_PLUGIN_ROOT}/scripts/copy-rich.js" "<html file>" "<text file>"` with absolute paths (the `lp-copy-bar` mod recognizes this call and shows a copy button for it). On another OS do not copy: print the plain text and give the file paths.
3. If the command failed, say so in one line and print the plain text in a code block so the user can copy it by hand.
