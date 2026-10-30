# CLAUDE.md

Claude Code marketplace `lp-tools`. No build, test or lint — only markdown, JSON and YAML executed by Claude Code.

## Structure

- `.claude-plugin/marketplace.json` — marketplace manifest, lists every plugin in `plugins/`
- `plugins/<plugin>/skills/<name>/` — skills, invoked as `/<plugin>:<name>`
- `plugins/lp-task/` — task flow, invoked as `/lp-task:<name>`: `commands/`, `agents/` (`browser-tester`), no skills
- `plugins/lp-code-review/` — skill `review`
- `plugins/lp-code-test/` — skills `unit`, `e2e`
- `plugins/lp-explain-code/` — skill `explain`

## Editing guidelines

- Skill names in `SKILL.md` are short and have no plugin prefix — the plugin namespace adds it (`unit` → `/lp-code-test:unit`)
- New skill → new folder in `plugins/<plugin>/skills/`, add it to the tables in the root `README.md` and the plugin `README.md`, and to the description in its `plugin.json`
- New plugin → new folder in `plugins/` with `.claude-plugin/plugin.json`, `README.md`, an entry in `marketplace.json` and in the root `README.md`
- A plugin cannot read files of another plugin (`${CLAUDE_PLUGIN_ROOT}` is its own folder): call the other plugin's skill via the Skill tool and inline the config defaults it needs
- Keep content portable: examples, configs and instructions must work in any project — use neutral placeholders (e.g. `acme`) instead of real project names, paths, domains, ticket keys or other identifying details
- Every commit that changes a plugin bumps `version` in its `plugin.json` (semver: patch for fixes and wording, minor for new commands, skills or behavior, major for renames and removals). Without a bump installed copies do not update
- Skill-specific rules live in the skill's own `CLAUDE.md`
- Run `claude plugin validate .` before pushing
