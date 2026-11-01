#!/bin/bash
# Shared helpers for the lp-task hooks. Needs bash and jq.

# deny <reason>: deny the tool call with a reason Claude sees.
deny() {
  jq -n --arg r "$1" '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $r}}'
  exit 0
}

expand_home() { local p="$1"; [ "${p:0:1}" = "~" ] && p="$HOME${p:1}"; printf '%s' "$p"; }

# find_config <dir>: the first .claude/lp-task.json upward from dir, else ~/.claude/lp-task.json.
find_config() {
  local d="$1"
  while [ -n "$d" ] && [ "$d" != "/" ]; do
    [ -f "$d/.claude/lp-task.json" ] && { printf '%s' "$d/.claude/lp-task.json"; return; }
    d=$(dirname "$d")
  done
  [ -f "$HOME/.claude/lp-task.json" ] && printf '%s' "$HOME/.claude/lp-task.json"
}

# state_dir <dir>: stateDir from the config found for dir, or the plugin default.
state_dir() {
  local cfg sd=""
  cfg=$(find_config "$1")
  [ -n "$cfg" ] && sd=$(jq -r '.stateDir // empty' "$cfg" 2>/dev/null)
  [ -z "$sd" ] && sd=$(jq -r '.stateDir // empty' "${CLAUDE_PLUGIN_ROOT}/config.default.json" 2>/dev/null)
  [ -z "$sd" ] && sd="~/.claude/lp-task/state"
  expand_home "$sd"
}

# task_for_repo <repo top level>: prints "<key>\t<state file>" of the task whose project is this repo
# and whose branch is the current branch of the repo. Prints nothing otherwise.
task_for_repo() {
  local top="$1" branch sd f
  branch=$(git -C "$top" branch --show-current 2>/dev/null)
  [ -z "$branch" ] && return
  sd=$(state_dir "$top")
  [ -d "$sd" ] || return
  for f in "$sd"/*.json; do
    [ -f "$f" ] || continue
    jq -e --arg top "$top" --arg br "$branch" \
      '(.branch == $br) and ([.projects[]?.path] | map(sub("/+$"; "")) | index($top) != null)' "$f" >/dev/null 2>&1 \
      && { printf '%s\t%s' "$(jq -r '.key' "$f")" "$f"; return; }
  done
}

# git_segments <command> <cwd>: one line per git call: "<dir>\t<git arguments>".
# Follows `cd <dir>` and `git -C <dir>`; splits on && || ; and |.
git_segments() {
  local cmd="$1" dir="$2" seg rest path
  while IFS= read -r seg; do
    seg="${seg#"${seg%%[![:space:]]*}"}"
    if [[ "$seg" =~ ^cd[[:space:]]+(\"[^\"]+\"|\'[^\']+\'|[^[:space:]]+) ]]; then
      path="${BASH_REMATCH[1]}"; path="${path%\"}"; path="${path#\"}"; path="${path%\'}"; path="${path#\'}"
      path=$(expand_home "$path"); [ "${path:0:1}" != "/" ] && path="$dir/$path"
      dir="$path"; continue
    fi
    # strip leading VAR=value assignments
    while [[ "$seg" =~ ^[A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+(.*)$ ]]; do seg="${BASH_REMATCH[1]}"; done
    [[ "$seg" =~ ^git[[:space:]]+(.*)$ ]] || continue
    rest="${BASH_REMATCH[1]}"; path="$dir"
    if [[ "$rest" =~ ^-C[[:space:]]+(\"[^\"]+\"|\'[^\']+\'|[^[:space:]]+)[[:space:]]+(.*)$ ]]; then
      path="${BASH_REMATCH[1]}"; rest="${BASH_REMATCH[2]}"
      path="${path%\"}"; path="${path#\"}"; path="${path%\'}"; path="${path#\'}"
      path=$(expand_home "$path"); [ "${path:0:1}" != "/" ] && path="$dir/$path"
    fi
    printf '%s\t%s\n' "$path" "$rest"
  done < <(printf '%s\n' "$cmd" | awk '{ gsub(/&&|\|\||;|\|/, "\n"); print }')
}
