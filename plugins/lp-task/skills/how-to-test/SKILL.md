---
name: how-to-test
disable-model-invocation: true
description: Build a short message for the testers of a task (what changed, where and in which states to check, the test cases already checked) and copy it to the clipboard; «copy» copies the saved message again
argument-hint: "[task key] [copy]"
---

# /lp-task:how-to-test

Arguments: `$ARGUMENTS`

First read `${CLAUDE_PLUGIN_ROOT}/shared.md` and follow it (config, hard rules, state).

Read-only for the repositories: nothing is changed, committed or pushed. The message is for testers, not developers: places and behaviour in the words of the UI, no file paths except the short «Затронуто в коде» line. Short beats complete: it must fit on one screen.

## Which task

As in `shared.md` «Which task». Filter for step 4: state files with at least one project that has `commit`.

## Copy again

If the arguments have `copy`: take `<stateDir>/<key>/messages/how-to-test.html` and `.txt`. If they exist, copy them by `${CLAUDE_PLUGIN_ROOT}/references/clipboard.md` (step 2), print the plain text and stop. If not, say that there is no saved message yet and continue with «Collect» below.

## Collect

1. **Task.** Summary and description from the context, or by `${CLAUDE_PLUGIN_ROOT}/references/read-task.md`; acceptance criteria and the bug steps if the task has them.
2. **Impact map.** For every project of the task with changes: `${CLAUDE_PLUGIN_ROOT}/references/impact.md` (places, states, nearby places). Changes already in the context need not be read again.
3. **What was checked**, from the state:
   - `reproduction`: the bug scenario becomes the first case (expected result now required);
   - `checks`: P1 rows first, then P2; result `pass` → ✅, `fail` → ❌, `unchecked` → ⚠️ with the reason in 2-4 words; `mock: true` → «на моке»;
   - `criteria`: only those not already covered by a case above.
   Merge cases that check the same thing. Keep at most `howToTest.maxCases` (default 8): priority to the bug scenario, P1 rows and failed or unchecked rows; the rest becomes one line «Ещё N проверок пройдено».
   If there is nothing in the state, write 3 to 6 cases from the task and the impact map and mark the block «не прогонялись».
4. **Autotests.** Test files changed in the diff (`*.test.*`, `*.spec.*`, `__tests__/`): one line with counts (added, updated, removed). Omit if none.
5. **Code.** 3 to 6 names of the main changed modules (components, hooks, services, endpoints) for the testers who read code, as one line «Затронуто в коде». No paths.
6. **Conditions.** Only what is needed to reach the states: feature flags, roles, test data, a stand or a build the MR needs (for example a shared library MR that must be published first). Omit if none.

## Message

Plain text, empty blocks are not printed, the order is fixed:

```
{howToTest.header}
🧪 Как тестировать: {key} {title}
Задача: {issueUrl} · MR: {label} {url}, {label} {url}

Что изменилось: 1-2 sentences in the words of the UI.

Где проверить:
• {label}: places from the impact map
• {label}: ...

Состояния: the states, comma separated

Тест-кейсы:
1. action → expected ✅
2. ...

Рядом может сломаться: nearby places
Затронуто в коде: module names (N модулей)
Автотесты: ...
Условия: ...
```

- Russian, short phrases; a case is «действие → ожидаемый результат» plus the mark, at most one line.
- `Задача` without `issueUrl` keeps only the key; `MR` lists only projects with `mr`; with one project the label is omitted.
- Target: 25 lines or fewer. If it is longer, cut the cases first, then the places (merge them), never the header and the links.

HTML from the same lines, by the HTML rules of `${CLAUDE_PLUGIN_ROOT}/references/mr-message.md`, plus: `<meta charset="utf-8">`, a `<div>` per line, `<div><br></div>` for an empty line, the `•` lines of one block as one `<ul>` with `<li>`, the numbered cases as one `<ol>` with `<li>`, block titles («Где проверить:», «Тест-кейсы:» and the others) in `<b>`, every URL as a link, `&`, `<`, `>` escaped.

## Confirm and copy

Print the plain text in a code block, then ask (AskUserQuestion), header «Тестерам»: «Скопировать сообщение для тестеров?» — «Да» / «Поправить». On «Поправить», or own text via Other, apply the changes and ask again.

On «Да»: save and copy by `${CLAUDE_PLUGIN_ROOT}/references/clipboard.md` with `kind` = `how-to-test` (copy only if `howToTest.clipboard` is `true`). Say in one line that the message is in the clipboard and pastes into a Jira comment or the work chat with formatting, and that `/lp-task:how-to-test copy` copies it again.
