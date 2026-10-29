# CLAUDE.md

Claude Code marketplace `lp-tools`. No build, test or lint — only markdown, JSON and YAML executed by Claude Code.

## Structure

- `.claude-plugin/marketplace.json` — marketplace manifest, lists every plugin in `plugins/`
- `plugins/lp/skills/<name>/` — skills of the `lp` plugin, invoked as `/lp:<name>`
- `plugins/lp-task/` — standalone plugin, invoked as `/lp-task:<name>`: `commands/` (task flow), `skills/` (`code-review`, `test-unit`), `agents/` (`browser-tester`)

## Editing guidelines

- Skill names in `SKILL.md` have no `lp-` prefix — the plugin namespace adds it
- New skill → new folder in `plugins/lp/skills/`, add it to the table in `README.md` and to the `lp` description in `plugin.json`
- New plugin → new folder in `plugins/` with `.claude-plugin/plugin.json` and an entry in `marketplace.json`
- Keep content portable: examples, configs and instructions must work in any project — use neutral placeholders (e.g. `acme`) instead of real project names, paths, domains, ticket keys or other identifying details
- Every commit that changes a plugin bumps `version` in its `plugin.json` (semver: patch for fixes and wording, minor for new commands, skills or behavior, major for renames and removals). Without a bump installed copies do not update
- Skill-specific rules live in the skill's own `CLAUDE.md`
- Run `claude plugin validate .` before pushing
