# CLAUDE.md

Claude Code marketplace `lp-tools`. No build, test or lint — only markdown, JSON and YAML executed by Claude Code.

## No project specifics

These plugins are used across unrelated projects, and none of them may know anything about a particular one.
- No project names, repository or folder names, paths, domains, hosts, ticket keys, team names, people, package scopes, branch or script names (e.g. a project's own `dev:*` command), stack choices or rules that come from one project.
- Everything project-specific lives in the project: its `CLAUDE.md`, its `.claude/lp-task.json` (`notes`, `planNotes`) or user settings, never in a plugin.
- Examples, configs, evals and docs use neutral placeholders (`acme`, `example.com`, `ACME-123`) and generic data.
- Before committing, search the diff for names from the projects you work on.

## Structure

- `.claude-plugin/marketplace.json` — marketplace manifest, lists every plugin in `plugins/`
- `plugins/<plugin>/skills/<name>/` — skills, invoked as `/<plugin>:<name>`
- `plugins/lp-task/` — task flow, invoked as `/lp-task:<name>`: `skills/` (do, commit, push, mr-message, sync-base, test-browser, how-to-test, init), `shared.md` (config, hard rules, state, «Which task»), `references/`, `agents/` (`browser-tester`), `hooks/` (git guards, context after compaction), `bin/lp-stop-port`
- `plugins/lp-task-loop/` — skill `run` (setup, then the workflow `skills/run/loop.js`: implement/verify/skeptic/review loop), `agents/` (`implementer`, `verifier`, `skeptic`, `reviewer`), `hooks/` (no git writes during the loop)
- `plugins/lp-code-review/` — skill `review`
- `plugins/lp-code-test/` — skills `unit`, `e2e`
- `plugins/lp-explain-code/` — skill `explain`
- `plugins/lp-copy-bar/` — mod (TypeScript hooks module `hooks/register.tsx`, state contract `types/index.d.ts`, tests `hooks/*.test.tsx`): copy buttons above the prompt for the messages lp-task saved in `<stateDir>/<key>/messages/`. Check with `claude plugin validate` and `claude plugin test`

## Editing guidelines

- Skill names in `SKILL.md` are short and have no plugin prefix — the plugin namespace adds it (`unit` → `/lp-code-test:unit`)
- New skill → new folder in `plugins/<plugin>/skills/`, add it to the tables in the root `README.md` and the plugin `README.md`, and to the description in its `plugin.json`
- New plugin → new folder in `plugins/` with `.claude-plugin/plugin.json`, `README.md`, an entry in `marketplace.json` and in the root `README.md`
- A plugin cannot read files of another plugin (`${CLAUDE_PLUGIN_ROOT}` is its own folder): call the other plugin's skill via the Skill tool and inline the config defaults it needs
- Every commit that changes a plugin bumps `version` in its `plugin.json` (semver: patch for fixes and wording, minor for new commands, skills or behavior, major for renames and removals). Without a bump installed copies do not update
- Skill-specific rules live in the skill's own `CLAUDE.md`
- Commands are skills (`skills/<name>/SKILL.md`); skills with side effects get `disable-model-invocation: true` only when the user never asks for them in words: such a skill cannot be called through the Skill tool at all (the harness also forbids following it by other means). A skill the user asks for in words («закоммить») stays model-invocable and is limited by its description («only when the user explicitly asks») and by hooks
- `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` and `${CLAUDE_SKILL_DIR}` are substituted only in a skill or agent body loaded by Claude Code, not in files read with Read (`shared.md`, references)
- Hooks are bash + jq (node may come from nvm and be missing in the hook environment); test them by piping a JSON input into the script
- Run `claude plugin validate .` before pushing; `.githooks/pre-push` runs `--strict` for the marketplace and every plugin (enable once: `git config core.hooksPath .githooks`)
- Evals live in `plugins/<plugin>/evals/`, run with `claude plugin eval plugins/<plugin>`
