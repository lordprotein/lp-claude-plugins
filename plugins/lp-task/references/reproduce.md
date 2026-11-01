# test-browser: «Обнаружение» mode

Read from `skills/test-browser/SKILL.md` steps 2R and 6R.

## Scenario

From the task take the steps, the expected result and the actual result (if the task has no steps, build the shortest path to the described state from the description). For every project where the task's screen exists — one scenario: steps → expected → actual as reported. No checklist, no regression rows. Show the scenario in one short block and continue.

If the reported state depends on live data (an event in progress, a timer, a payment status) — say so, and pick in the browser the data closest to that state so the wait stays short.

## Report

A table: project → reproduced (✅ / ❌ / ⚠️) → actual result → observed data → code path (`file:line`). Under it, one line per project with the reason for ❌ / ⚠️ (the state was not reached, the data differs from the task, login, and so on). With `screenshots` = «Да» add the screenshot directory path.

Write `reproduction` to `<stateDir>/<key>.json` (format in `shared.md`; create the state with the task key, title and projects if there is none yet). Then finish with the final message: «Баг воспроизведён в <projects>. Дальше — `/lp-task:do`» or «Баг не воспроизвёлся: <reason>. Причина в плане будет гипотезой». When called from `do`, skip the final message and return there.
