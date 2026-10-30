# lp-code-review

Плагин Claude Code для ревью кода с позиции senior-инженера: SOLID, архитектура, безопасность, производительность, обработка ошибок.

| Команда | Что делает |
|---|---|
| `/lp-code-review:review [путь \| ссылка на MR \| mr]` | Ревью изменений или кода; для MR GitLab может опубликовать замечания комментариями в MR |

Подробности в [`skills/review/README.md`](skills/review/README.md).

## Комментарии ревью в MR GitLab

После ревью MR (`/lp-code-review:review <ссылка на MR>` или `mr`) скилл показывает, что будет опубликовано, и публикует только после вашего подтверждения. Приоритет инструментов: GitLab MCP, затем `glab`. Подключение:

- `glab`: `glab auth login --hostname <host>`, проверка `glab auth status`;
- GitLab MCP для self-hosted: `claude mcp add --transport http gitlab https://<host>/api/v4/mcp` и авторизация (проверьте адрес и требования версии в документации вашего GitLab). Официальный плагин `gitlab` смотрит на gitlab.com и для self-hosted не подходит.

Подробности формата (inline-комментарии, дедупликация, итоговая сводка) в `skills/review/references/mr-comments.md`.

## Конфиг

Необязателен. Скилл читает тот же файл, что и плагин `lp-task`: первый `.claude/lp-task.json` от текущей папки вверх, иначе `~/.claude/lp-task.json`. Ключи и значения по умолчанию:

| Поле | По умолчанию | Назначение |
|---|---|---|
| `stateDir` | `~/.claude/lp-task/state` | Где искать состояние задачи для `mr` |
| `review.postToMr` | `ask` | `ask`: предлагать публикацию замечаний в MR; `never`: не предлагать |
| `review.minSeverity` | `medium` | Минимальная серьёзность для публикации: `critical`, `high`, `medium`, `low` |
| `review.gitlab.mcpServer` | `gitlab` | Имя GitLab MCP сервера; запасной вариант `glab` |

## Установка

```
/plugin marketplace add lordprotein/lp-claude-plugins
/plugin install lp-code-review@lp-tools
```
