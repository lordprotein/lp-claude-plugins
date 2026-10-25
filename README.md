# lp-tools

Personal Claude Code marketplace.

| Plugin | What's inside |
|--------|---------------|
| `lp` | `/lp:code-review`, `/lp:code-test-unit`, `/lp:code-test-e2e`, `/lp:explain-code` |
| `lp-task` | `/lp-task:do`, `/lp-task:commit`, `/lp-task:push`, `/lp-task:browser-test`, `/lp-task:mr-copy`, `/lp-task:init` |

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

Plugins have no `version` field, so every pushed commit is a new version. Updates arrive via auto-update or `/plugin marketplace update lp-tools`.

## Local development

```
claude --plugin-dir ./plugins/lp
claude --plugin-dir ./plugins/lp-task
```
