# lp-tools

Personal Claude Code marketplace.

| Plugin | What's inside |
|--------|---------------|
| `lp` | `/lp:code-test-e2e`, `/lp:explain-code` |
| `lp-task` | `/lp-task:do`, `/lp-task:commit`, `/lp-task:push`, `/lp-task:test-browser`, `/lp-task:mr-copy`, `/lp-task:init`, `/lp-task:code-review`, `/lp-task:test-unit` |

## Installation

```
/plugin marketplace add lordprotein/lp-claude-plugins
/plugin install lp@lp-tools
/plugin install lp-task@lp-tools
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
    "lp@lp-tools": true,
    "lp-task@lp-tools": true
  }
}
```

## Updating

Each plugin has a semver `version` in its `plugin.json`, shown on install and in `/plugin`. Installed copies update only when the version changes. Updates arrive via auto-update or `/plugin marketplace update lp-tools`.

## Local development

```
claude --plugin-dir ./plugins/lp
claude --plugin-dir ./plugins/lp-task
```
