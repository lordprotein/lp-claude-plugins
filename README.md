# lp-tools

Personal Claude Code marketplace.

| Plugin | What's inside |
|--------|---------------|
| `lp-task` | `/lp-task:do`, `/lp-task:commit`, `/lp-task:push`, `/lp-task:test-browser`, `/lp-task:mr-copy`, `/lp-task:init` |
| `lp-task-loop` | `/lp-task-loop:run` |
| `lp-code-review` | `/lp-code-review:review` |
| `lp-code-test` | `/lp-code-test:unit`, `/lp-code-test:e2e` |
| `lp-explain-code` | `/lp-explain-code:explain` |

## Installation

```
/plugin marketplace add lordprotein/lp-claude-plugins
/plugin install lp-task@lp-tools
/plugin install lp-task-loop@lp-tools
/plugin install lp-code-review@lp-tools
/plugin install lp-code-test@lp-tools
/plugin install lp-explain-code@lp-tools
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
    "lp-explain-code@lp-tools": true
  }
}
```

## Updating

Each plugin has a semver `version` in its `plugin.json`, shown on install and in `/plugin`. Installed copies update only when the version changes. Updates arrive via auto-update or `/plugin marketplace update lp-tools`.

## Local development

```
claude --plugin-dir ./plugins/lp-task
claude --plugin-dir ./plugins/lp-task-loop
claude --plugin-dir ./plugins/lp-code-review
claude --plugin-dir ./plugins/lp-code-test
claude --plugin-dir ./plugins/lp-explain-code
```
