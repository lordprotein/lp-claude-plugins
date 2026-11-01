# lp-tools

Personal Claude Code marketplace.

| Plugin | What's inside |
|--------|---------------|
| `lp-task` | `/lp-task:do`, `/lp-task:commit`, `/lp-task:push`, `/lp-task:sync-base`, `/lp-task:test-browser`, `/lp-task:how-to-test`, `/lp-task:init` |
| `lp-task-loop` | `/lp-task-loop:run` |
| `lp-code-review` | `/lp-code-review:review` |
| `lp-code-test` | `/lp-code-test:unit`, `/lp-code-test:e2e` |
| `lp-explain-code` | `/lp-explain-code:explain` |
| `lp-copy-bar` | Мод: кнопки повторного копирования сообщений `lp-task` над полем ввода, `/copy-last` |

## Installation

```
/plugin marketplace add lordprotein/lp-claude-plugins
/plugin install lp-task@lp-tools
/plugin install lp-task-loop@lp-tools
/plugin install lp-code-review@lp-tools
/plugin install lp-code-test@lp-tools
/plugin install lp-explain-code@lp-tools
/plugin install lp-copy-bar@lp-tools
```

To bootstrap a new machine automatically, add to the user `settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "lp-tools": {
      "source": { "source": "github", "repo": "lordprotein/lp-claude-plugins" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": {
    "lp-task@lp-tools": true,
    "lp-task-loop@lp-tools": true,
    "lp-code-review@lp-tools": true,
    "lp-code-test@lp-tools": true,
    "lp-explain-code@lp-tools": true,
    "lp-copy-bar@lp-tools": true
  }
}
```

## Updating

Each plugin has a semver `version` in its `plugin.json`, shown on install and in `/plugin`. Installed copies update only when the version changes. Updates arrive via auto-update or `/plugin marketplace update lp-tools`.

## Checks

`claude plugin validate --strict` runs before every push through the repository hook `.githooks/pre-push`. Enable it once per clone:

```
git config core.hooksPath .githooks
```

Behaviour checks live in `plugins/<plugin>/evals/` and run with `claude plugin eval plugins/<plugin>` (each case runs with and without the plugin, so it costs several sessions; use `--runs 1` locally).

## Local development

```
claude --plugin-dir ./plugins/lp-task
claude --plugin-dir ./plugins/lp-task-loop
claude --plugin-dir ./plugins/lp-code-review
claude --plugin-dir ./plugins/lp-code-test
claude --plugin-dir ./plugins/lp-explain-code
claude --plugin-dir ./plugins/lp-copy-bar
```
