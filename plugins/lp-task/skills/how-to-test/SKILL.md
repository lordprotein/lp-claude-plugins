---
name: how-to-test
description: Build a short message for the testers (QA) of a task and copy it to the clipboard: what changed, where and in which states to check, the test cases already checked. Use when the user asks how to test the changes or what to give the testers («как тестировать», «для тестеров», «что отдать QA», «где проверить эти изменения», «how to test»); with «copy» or «скопируй ещё раз» copies the saved tester message again
argument-hint: "[task key] [copy]"
---

# /lp-task:how-to-test

Arguments: `$ARGUMENTS`

First read `${CLAUDE_PLUGIN_ROOT}/shared.md` and follow it (config, hard rules, state).

Read-only for the repositories: nothing is changed, committed or pushed. The message is for testers, not developers: places and behaviour in the words of the UI, no file paths and no module names. A tester must be able to act on every case without asking: where to go, what to do, what to see. What we did not check comes first.

## Which task

As in `shared.md` «Which task». Filter for step 4: state files with at least one project that has `commit`.

## Copy again

If the arguments have `copy`: take `<stateDir>/<key>/messages/how-to-test.html` and `.txt`. If they exist, copy them by `${CLAUDE_PLUGIN_ROOT}/references/clipboard.md` (step 2), print the plain text and stop. If not, say that there is no saved message yet and continue with «Collect» below.

## Collect

1. **Task.** Summary and description from the context, or by `${CLAUDE_PLUGIN_ROOT}/references/read-task.md`; acceptance criteria and the bug steps if the task has them.
2. **Impact map.** For every project of the task with changes: `${CLAUDE_PLUGIN_ROOT}/references/impact.md` (addresses of the places, states, nearby places). Changes already in the context need not be read again.
3. **Cases.** One case per scenario, from these sources in this order:
   - `reproduction`: the bug scenario (its expected result is now required);
   - `checks`: P1 rows first, then P2;
   - `criteria`: only those not already covered;
   - states from the impact map that no case covers yet become cases too;
   - if the state has nothing, write 3 to 6 cases from the task and the impact map: they count as not checked.

   Merge variants of one scenario into one case (several projects, tabs or versions of the page go into its «Где»), never «сценарий 1 в классике» as a separate case. Split the cases in two groups:
   - **to check:** result `fail` or `unchecked`, rows checked on a mock (even with `pass`: the real data was not seen), and cases written from the diff only;
   - **checked:** result `pass`.

   At most `howToTest.maxCases` (default 6) cases in total, the «to check» group first and never cut; the checked ones that do not fit become one line «Ещё N проверок пройдено: <2-4 words each>».
4. **Every case** has a title of 3 to 7 words (what is checked) and up to 4 sub-items, each one line:
   - `Где:` the address from the impact map: page or URL, the click path, what to look at; the variants of the scenario;
   - `Шаги:` what to do to reach the state, with a hint where to find such data (`любой товар со скидкой`); for a checked case only if not obvious from the title and «Где»;
   - `Ожидаемо:` the exact text or look in the interface; for a fix also «(раньше было …)»;
   - `Почему не проверили:` only in the «to check» group, 2 to 6 words (`не дождались конца события`, `ошибка: <what was seen>`);
   - `На моке:` for a case checked on a mock, instead of «Почему не проверили»: what was substituted and why, from `mock` of the row (`подменили ответ корзины: на стенде нет закрытых товаров`), and the result on the mock (`на моке ✅`). The tester must see that the real data was not checked.
5. **Autotests.** Test files changed in the diff (`*.test.*`, `*.spec.*`, `__tests__/`): one line with counts (added, updated, removed). Omit if none.
6. **Not affected.** Projects of the config without changes in this task that a tester could expect to be affected (the same feature on another platform, a mobile version): one line «Не затронуто: <labels>». Omit otherwise.
7. **Conditions.** Only what is needed to reach the states: feature flags, roles, test data, a shared library MR that must be published first. Omit if none.
8. **Stand.** `howToTest.environment` if it is set. Omit otherwise.

## Message

Plain text, empty blocks are not printed, the order is fixed:

```
{howToTest.header}
🧪 Для тестирования
Задача: {issueUrl} · MR: {label} {url}, {label} {url}
Стенд: {howToTest.environment}

Что изменилось: 1-2 sentences in the words of the UI, «было … → стало …» for a fix.

Нужно проверить:
1. {case title}
   • Где: …
   • Шаги: …
   • Ожидаемо: …
   • Почему не проверили: …
2. {case title}
   • Где: …
   • Ожидаемо: …
   • На моке: подменили <what>, потому что <why>; на моке ✅

Проверено разработкой:
3. {case title} ✅
   • Где: …
   • Ожидаемо: …
Ещё N проверок пройдено: …

Состояния:
• only states that no case covers

Рядом может сломаться:
• nearby places, one per line

Не затронуто: …
Автотесты: …
Условия: …
```

- Russian, short phrases. The case numbers run through both groups. A group with no cases is not printed.
- `Задача` without `issueUrl` keeps only the key; `MR` lists only projects with `mr`; with one project the label is omitted everywhere.
- Target: about 35 lines. If it is longer, cut the checked cases first (into the «Ещё N» line), then «Рядом может сломаться», never the «to check» group, the header or the links.

HTML from the same lines by the HTML rules of `${CLAUDE_PLUGIN_ROOT}/references/mr-message.md`, plus:
- block titles («Нужно проверить:», «Проверено разработкой:», «Состояния:», «Рядом может сломаться:» and the one-line labels «Стенд:», «Что изменилось:», «Не затронуто:», «Автотесты:», «Условия:») in `<b>`;
- the cases of both groups as `<ol>` (the second one with `start` continuing the numbering), every case an `<li>` with its title and a nested `<ul>` of its sub-items, the label of a sub-item (`Где:`, `Шаги:`, `На моке:`, …) in `<b>`;
- the `•` lines of «Состояния» and «Рядом может сломаться» as `<ul>`;
- every URL as a link, `&`, `<`, `>` escaped.

The plain text keeps the same structure: sub-items indented by three spaces and starting with `• `.

## Save and copy

Do not ask whether to copy (the `lp-copy-bar` mod shows a copy button for the saved message). Print the plain text in a code block, then save and copy by `${CLAUDE_PLUGIN_ROOT}/references/clipboard.md` with `kind` = `how-to-test` (copy only if `howToTest.clipboard` is `true`). Say in one line that the message is in the clipboard and pastes into a Jira comment or the work chat with formatting, that `/lp-task:how-to-test copy` copies it again, and that you will apply changes on request. If the user asks for changes, apply them, then print, save and copy again the same way.
