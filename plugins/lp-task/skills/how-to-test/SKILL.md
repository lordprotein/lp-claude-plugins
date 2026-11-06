---
name: how-to-test
description: Build a short message for the QA of a task and save it for copying: affected areas with severity, before / after, cases to check. Use when the user asks how to test the changes («как тестировать», «для тестеров», «что отдать QA», «how to test»)
argument-hint: "[task key]"
---

# /lp-task:how-to-test

Arguments: `$ARGUMENTS`

First read `${CLAUDE_PLUGIN_ROOT}/shared.md` and follow it (config, hard rules, state).

Read-only for the repositories: nothing is changed, committed or pushed. The cases tell testers what to check; what the developer already checked appears only in the block «Проверил разработчик», built only from `checks`. Places and behaviour in the words of the UI, no file paths, no component or module names. Technical values (enum values, statuses, fields of objects and API responses, variants, flag and role names, query parameters, error codes) are written exactly as in the code, in backticks, never translated. A tester must be able to act on every case without asking.

## Which task

As in `shared.md` «Which task». Filter for step 4: state files with at least one project that has `commit`.

## Collect

Run independent commands of different projects in parallel (one message, several calls).

1. **Task.** `title` and the `plan` file from the state. Only without a plan: the task by `${CLAUDE_PLUGIN_ROOT}/references/read-task.md` (Jira with `view: "compact"`).
2. **Impact map** per project with changes, by `${CLAUDE_PLUGIN_ROOT}/references/impact.md` (cache first). It gives the areas with severity, the risks, API changes, states and the test file counts.
3. **Extra changes («Доработки»).** What was added, fixed or extended beyond the original task: `git -C <path> log --format=%s <sha>` of every `fixCommits` sha, projects added after the plan, changes in the diff that neither the plan nor the task mention. Each one gets the severity of its area.
4. **Cases.** One case per scenario, sources in this order: `reproduction` (its expected result is now required), `checks` (P1 first), `criteria` not yet covered, every 🟡/🔴 extra change, every 🔴/🟡 area or risk no case covers yet. Results (`pass`, `fail`, mocks) are not shown in the cases (only in step 7): a `mock.why` becomes a neutral data hint in the steps (`нужен закрытый товар`). Without any state data, write 3 to 6 cases from the task and the map. Variants of one scenario (projects, tabs, states, enum values) are one case. Sort 🔴 → 🟢. At most `howToTest.maxCases` (default 6); 🔴 and 🟡 cases are never cut, the 🟢 ones that do not fit become one line «Также: <2-4 words each>».
5. **Not a bug.** What the task or the plan says stays unchanged on purpose, so testers do not file it. Omit if nothing.
6. **Data and conditions.** Only what is needed to reach the states: feature flags, roles, test data, how to get a needed status, a shared library MR to publish first, clearing the cache or logging in again when storage changed. Omit if none.
7. **Checked by the developer («Проверил разработчик»).** Only from `checks` in the state (the last «Проверка» run of `test-browser`). No `checks` or an empty list means the browser check did not run: the block is not printed, and nothing is made up from `criteria`, the diff or the task. Rows with `result: unchecked` are left out (they were not checked). One row per scenario, near-identical rows merged (variants in one row), P1 first, at most 8 rows. Result: `pass` → ✅, `fail` → ❌; a row with `mock` → `✅ мок: <mock.what>` / `❌ мок: <mock.what>`.

## Message

Plain text, Russian, short phrases, empty blocks are not printed, the order is fixed:

```
{howToTest.header}
🧪 Для тестирования
Стенд: {howToTest.environment}

Затронуто:
🔴 <area>, <block>: <what changed, 2-6 words> (<page>)

Что изменилось:
| До | После |
| <before> | <after> |

Доработки:
• 🟡 Добавили: <what> (<page>)

Проверить:
1. 🔴 <case title, 3-7 words>
   • Где:
     1) <area>, <block> → <element> (<page>)
   • Шаги:
     1) <one action>
   • ОР:
     ◦ <exact text or look> (раньше было …)
   • Варианты:
     ◦ `status: CLOSED`
Также: …

Проверил разработчик:
| Где | Что проверял | Результат |
| <area or variant>, <page> | <what was checked, a few words> | ✅ |

Потенциально может сломаться:
• 🔴 <area>, <block>: <why, a few words> (<page>)

API: `<METHOD> <path>`: <what changed in the request or response>
Данные и условия: …
Не баг: …
Автотесты: добавлено N, обновлено N, удалено N

🟢 косметика · 🟡 логика одной фичи · 🔴 общий код, деньги, доступы, API
```

- `<page>`: the route path without domain and protocol, a sample value for parameters (`/product/123`); several pages comma separated; a widget everywhere: `все страницы`. With several projects add the project label before the page (`Web: /cart`); with one project no labels.
- «Затронуто»: one line per area of the map, 🔴 first.
- «Что изменилось»: one row per change of behaviour, 1 to 4 rows; `нет` in «До» for something new.
- A case has «Где» (numbered, one place per item), «Шаги» (numbered, one action per item, 2 to 6; omit if obvious from «Где»), «ОР» (bulleted, one result per item, the exact UI text; «(раньше было …)» for a fix), «Варианты» (bulleted, omit if none).
- «Проверил разработчик»: «Где» is the place in the words of the UI (variant, tab, state) and the `<page>`, «Что проверял» is the `item` with its `expected` in a few words (what was seen, not how), technical values in backticks; printed only by step 7.
- «API» lists changed requests and fields, also analytics events if the diff changes them; one line per request when several.
- The legend line is printed only if the message has a severity mark.
- Target: about 35 lines without the nested items of cases. If longer: cut 🟢 cases into «Также», then the P3 rows of «Проверил разработчик», then 🟢 risks; never 🔴 or 🟡.

HTML from the same content (the HTML rules of `${CLAUDE_PLUGIN_ROOT}/references/mr-message.md`: `<meta charset="utf-8">`, `<div>` per line, escaping), plus:
- block titles and the labels of one-line blocks and case sub-items (`Где:`, `Шаги:`, `ОР:`, `Варианты:`) in `<b>`;
- backticked values as `<code>`;
- «Что изменилось» as `<table border="1">` with `<th>До</th><th>После</th>`, «Проверил разработчик» the same way with `<th>Где</th><th>Что проверял</th><th>Результат</th>`;
- «Затронуто», «Доработки», «Потенциально может сломаться» as `<ul>` (marker kept in the text);
- cases as one `<ol>`, each `<li>` the title and a `<ul>` of sub-items; inside them «Где» and «Шаги» as `<ol>`, «ОР» and «Варианты» as `<ul>`.

Plain text indentation: sub-items 3 spaces and `• `, their items 5 spaces and `1)` or `◦ `.

## Save and copy

Do not ask whether to copy (the `lp-copy-bar` mod shows a copy button for the saved message). Print the plain text once in a code block, then save by `${CLAUDE_PLUGIN_ROOT}/references/clipboard.md` with `kind` = `how-to-test` (both files with the Write tool: a shell write is denied by the plugin hook, and the `lp-copy-bar` button appears only for Write calls); copy only if `howToTest.clipboard` is `true`. Say in one line where to copy it with formatting for a Jira comment or the work chat (the button above the prompt from the `lp-copy-bar` mod, or that it is already in the clipboard), and that you will apply changes on request. If the user asks for changes, apply them, then print and save again the same way.
