#!/bin/bash
# PreToolUse (Bash): the loop edits code only. Denies git commands that change history, branches or the index
#  - in calls made by lp-task-loop agents (agent_type lp-task-loop:*), anywhere;
#  - in a repository that has a fresh loop marker (<plugin data>/loop-active/<repo path with / as _>, < 3 h).
# Snapshots with GIT_INDEX_FILE=... are allowed (they use a temporary index).
# Cleanup: `echo lp-task-loop:end "<repo root>" ["<work dir>"]` removes the loop marker of that repo and the
# work dir (only a <TMPDIR or /tmp>/lp-task-loop.XXXXXX directory). The hook does it because Claude Code
# permissions deny the model an `rm` outside the project (plugin data, system temp). The echo itself runs.
input=$(cat)
[[ "$input" == *git* || "$input" == *lp-task-loop:end* ]] || exit 0   # cheap exit before the first jq
cmd=$(jq -r '.tool_input.command // empty' <<<"$input")

q='("[^"]*"|'\''[^'\'']*'\''|[^[:space:]]+)'
if [[ "$cmd" =~ ^[[:space:]]*echo[[:space:]]+lp-task-loop:end[[:space:]]+$q([[:space:]]+$q)?[[:space:]]*$ ]]; then
  r="${BASH_REMATCH[1]}"; r="${r//\"/}"; r="${r//\'/}"
  w="${BASH_REMATCH[3]}"; w="${w//\"/}"; w="${w//\'/}"
  if [ -n "${CLAUDE_PLUGIN_DATA:-}" ] && [ "${r:0:1}" = "/" ]; then
    m="$CLAUDE_PLUGIN_DATA/loop-active/$(printf '%s' "$r" | tr '/' '_')"
    [ -f "$m" ] && rm -f "$m"
  fi
  if [ -n "$w" ] && [ -d "$w" ] && [[ "$(basename "$w")" =~ ^lp-task-loop\.[A-Za-z0-9]{6}$ ]]; then
    parent=$(cd "$(dirname "$w")" 2>/dev/null && pwd -P)
    for t in "${TMPDIR:-/tmp}" /tmp; do
      tp=$(cd "$t" 2>/dev/null && pwd -P) || continue
      if [ -n "$parent" ] && [ "$parent" = "$tp" ]; then rm -rf "$parent/$(basename "$w")"; break; fi
    done
  fi
  exit 0
fi

[[ "$cmd" == *git* ]] || exit 0
cwd=$(jq -r '.cwd // empty' <<<"$input")
agent=$(jq -r '.agent_type // empty' <<<"$input")
markers="${CLAUDE_PLUGIN_DATA:-}/loop-active"

deny() {
  jq -n --arg r "$1" '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $r}}'
  exit 0
}

dir="$cwd"
while IFS= read -r seg; do
  seg="${seg#"${seg%%[![:space:]]*}"}"
  if [[ "$seg" =~ ^cd[[:space:]]+(\"[^\"]+\"|\'[^\']+\'|[^[:space:]]+) ]]; then
    p="${BASH_REMATCH[1]}"; p="${p//\"/}"; p="${p//\'/}"; [ "${p:0:1}" = "~" ] && p="$HOME${p:1}"
    [ "${p:0:1}" != "/" ] && p="$dir/$p"; dir="$p"; continue
  fi
  temp_index=""
  while [[ "$seg" =~ ^([A-Za-z_][A-Za-z0-9_]*)=[^[:space:]]*[[:space:]]+(.*)$ ]]; do
    [ "${BASH_REMATCH[1]}" = "GIT_INDEX_FILE" ] && temp_index=1
    seg="${BASH_REMATCH[2]}"
  done
  [[ "$seg" =~ ^git[[:space:]]+(.*)$ ]] || continue
  rest="${BASH_REMATCH[1]}"; path="$dir"
  if [[ "$rest" =~ ^-C[[:space:]]+(\"[^\"]+\"|\'[^\']+\'|[^[:space:]]+)[[:space:]]+(.*)$ ]]; then
    path="${BASH_REMATCH[1]}"; rest="${BASH_REMATCH[2]}"; path="${path//\"/}"; path="${path//\'/}"
    [ "${path:0:1}" = "~" ] && path="$HOME${path:1}"; [ "${path:0:1}" != "/" ] && path="$dir/$path"
  fi
  [ -n "$temp_index" ] && continue
  sub="${rest%% *}"
  case "$sub" in commit|push|checkout|switch|stash|reset|rebase|add|restore|merge|cherry-pick|am|revert|tag) ;; *) continue;; esac

  if [[ "$agent" == lp-task-loop:* ]]; then
    deny "lp-task-loop: agents edit code only; git $sub is not allowed inside the loop."
  fi
  top=$(git -C "$path" rev-parse --show-toplevel 2>/dev/null) || continue
  m="$markers/$(printf '%s' "$top" | tr '/' '_')"
  if [ -n "${CLAUDE_PLUGIN_DATA:-}" ] && [ -f "$m" ] && [ -z "$(find "$m" -mmin +180 2>/dev/null)" ]; then
    deny "lp-task-loop: the loop is running in $top, git $sub is not allowed until it ends. If no loop is running, remove the stale marker $m."
  fi
done < <(printf '%s\n' "$cmd" | awk '{ gsub(/&&|\|\||;|\|/, "\n"); print }')
exit 0
