# CLAUDE.md

This is NOT a Node.js/TypeScript application. No build, test, or lint commands exist. The project consists of markdown specs and a YAML config executed by Claude Code.

## Editing guidelines

- Workflow changes → edit `SKILL.md` (Workflow section)
- Adding/changing checks → edit the corresponding file in `references/`
- Keep content portable: examples and instructions must work in any project — use neutral placeholders (e.g. `acme`) instead of real project names, paths, domains or other identifying details
- `agents/agent.yaml` — interface metadata only, rarely changes
- Output format is defined in SKILL.md section "7) Output format" and must stay compact: do not add sections or fields
- Keep output concise to save tokens
