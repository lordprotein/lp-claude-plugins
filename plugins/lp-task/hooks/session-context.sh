#!/bin/bash
# SessionStart (compact): put the active lp-task task back into the context after a compaction.
source "${CLAUDE_PLUGIN_ROOT}/hooks/lib.sh"

input=$(cat)
cwd=$(jq -r '.cwd // empty' <<<"$input")
[ -n "$cwd" ] || exit 0
sd=$(state_dir "$cwd")
[ -d "$sd" ] || exit 0

out=""
for f in $(ls -t "$sd"/*.json 2>/dev/null | head -20); do
  branch=$(jq -r '.branch // empty' "$f")
  [ -n "$branch" ] || continue
  match=""
  while IFS= read -r p; do
    p="${p%/}"
    case "$p/" in "$cwd"/*|"$cwd/") ;; *) case "$cwd/" in "$p"/*) ;; *) continue;; esac;; esac
    [ "$(git -C "$p" branch --show-current 2>/dev/null)" = "$branch" ] && { match=1; break; }
  done < <(jq -r '.projects[]?.path // empty' "$f")
  [ -n "$match" ] || continue
  out+=$(jq -r '
    "lp-task: active task \(.key) «\(.title // "")», branch \(.branch). State: \(input_filename)." +
    (if .plan then " Approved plan: \(.plan)." else "" end) +
    "\nProjects:\n" +
    ([.projects[]? | "- \(.id): \(.path), base \(.base // "?"), commit \(.commit // "none"), fix commits \((.fixCommits // []) | length), pushed \(.pushed // false), MR \(.mr // "none")"] | join("\n")) +
    (if (.reproduction // []) | length > 0 then "\nReproduction recorded: \([.reproduction[] | "\(.project) \(.reproduced)"] | join(", "))." else "" end)
  ' "$f")$'\n'
  [ $(grep -c '^lp-task: active task' <<<"$out") -ge 3 ] && break
done

[ -n "$out" ] || exit 0
out+="The lp-task hard rules of shared.md still apply (no push without an explicit command, commits only via /lp-task:commit)."
jq -n --arg c "$out" '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $c}}'
