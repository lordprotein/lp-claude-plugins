# lp-code-test

Плагин Claude Code для написания и ревью тестов.

| Команда | Что делает |
|---|---|
| `/lp-code-test:unit` | Пишет юнит-тесты или ревьюит существующие; путь "Fix existing tests" используется `/lp-task:do` |
| `/lp-code-test:e2e` | Пишет E2E-тесты (полные пользовательские сценарии в браузере) или ревьюит существующие |

Подробности в [`skills/unit/README.md`](skills/unit/README.md) и [`skills/e2e/README.md`](skills/e2e/README.md).

## Установка

```
/plugin marketplace add lordprotein/lp-claude-plugins
/plugin install lp-code-test@lp-tools
```
