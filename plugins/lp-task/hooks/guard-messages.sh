#!/bin/bash
# PreToolUse (Bash): the lp-task message files <stateDir>/<key>/messages/<kind>.html|.txt
# are written only with the Write tool. The lp-copy-bar mod shows its copy button only for
# Write calls (and for the osascript copy-rich.js call), so a shell write hides the button.
# Reading the files and the copy-rich.js call stay allowed.
source "${CLAUDE_PLUGIN_ROOT}/hooks/lib.sh"

input=$(cat)
[[ "$input" == *messages* ]] || exit 0   # cheap exit before the first jq
cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
cwd=$(jq -r '.cwd // empty' <<<"$input")
[[ "$cmd" == *messages* ]] || exit 0

sd=$(state_dir "${cwd:-$PWD}"); sd="${sd%/}"
rel="$sd"; [[ "$sd" == "$HOME"/* ]] && rel="${sd#"$HOME"}"

mentioned=0
for form in "$sd" "~$rel" "\$HOME$rel" "\${HOME}$rel"; do
  [[ "$cmd" == *"$form"* ]] && { mentioned=1; break; }
done
[ "$mentioned" = 1 ] || exit 0

write_re='(^|[^0-9&])>|\btee\b|\bcp\b|\bmv\b|sed[[:space:]]+-i|\bpython[0-9.]*\b|\bnode\b|\bperl\b|\bruby\b|open\(|write'
grep -qE "$write_re" <<<"$cmd" || exit 0

deny "lp-task: the message files <stateDir>/<key>/messages/<kind>.html|.txt are written only with the Write tool: the lp-copy-bar mod shows the copy button only for Write calls. Write both files with the Write tool instead of the shell."
