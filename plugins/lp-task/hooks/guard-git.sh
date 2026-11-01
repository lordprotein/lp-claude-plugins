#!/bin/bash
# PreToolUse (Bash): backs the lp-task hard rules.
#  - git commit with AI attribution in the command → deny (any repository);
#  - git push on a task branch without <stateDir>/<key>.push-allowed (fresh, 15 min) → deny;
#  - git stash pop/apply in a task repository when the stash is not «lp-task <key>» → deny.
source "${CLAUDE_PLUGIN_ROOT}/hooks/lib.sh"

input=$(cat)
cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
cwd=$(jq -r '.cwd // empty' <<<"$input")
[[ "$cmd" == *git* ]] || exit 0

if [[ "$cmd" =~ git.*commit ]] && grep -qiE 'co-authored-by|generated with|noreply@anthropic\.com' <<<"$cmd"; then
  deny "lp-task: AI attribution (Co-Authored-By, «Generated with», noreply@anthropic.com) is not allowed in commit messages. Commit with the message from the template only."
fi

while IFS=$'\t' read -r dir args; do
  [ -n "$dir" ] || continue
  top=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null) || continue

  if [[ "$args" =~ ^push([[:space:]]|$) ]]; then
    task=$(task_for_repo "$top"); [ -n "$task" ] || continue
    key="${task%%$'\t'*}"; marker="$(state_dir "$top")/$key.push-allowed"
    if [ ! -f "$marker" ] || [ -n "$(find "$marker" -mmin +15 2>/dev/null)" ]; then
      deny "lp-task: push of task $key is allowed only through /lp-task:push (or the «Да» answer in /lp-task:commit, or /lp-task:sync-base). They create $marker right before pushing. Do not create it unless the user asked to push."
    fi
  fi

  if [[ "$args" =~ ^stash[[:space:]]+(pop|apply)([[:space:]]+(.*))?$ ]]; then
    task=$(task_for_repo "$top"); [ -n "$task" ] || continue
    key="${task%%$'\t'*}"; ref="${BASH_REMATCH[3]:-stash@\{0\}}"; ref="${ref%% *}"; ref="${ref//\'/}"; ref="${ref//\"/}"
    subject=$(git -C "$top" stash list --format='%gd%x09%gs' 2>/dev/null | awk -F'\t' -v r="$ref" '$1==r {print $2}')
    if [[ "$subject" != *"lp-task $key"* ]]; then
      deny "lp-task: $ref in $top is not the stash of task $key («${subject:-no stash}»). Do not pop or apply stashes that were not created by this task without the user's explicit permission."
    fi
  fi
done < <(git_segments "$cmd" "$cwd")
exit 0
