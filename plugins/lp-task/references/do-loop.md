# do: autonomous loop

Read from `skills/do/SKILL.md` step 6 when the user chose «Автономный цикл».

- If the `lp-task-loop:run` skill is not available, say so, suggest `/plugin install lp-task-loop@lp-tools` and implement as usual («Обычно»).
- Otherwise invoke it via the Skill tool once per project, sequentially (first project first, see «One project first» in step 6), with the arguments `--repo <path>` and the task text:
  - the task summary and description retold in 2-5 lines;
  - the approved plan part for this project, with its «Проверка» lines: the loop builds its acceptance criteria from them;
  - the CLAUDE.md, `planNotes` and `notes` rules that apply;
  - an `Evidence:` block from `reproduction` (steps, observed data, expected result); if there was no reproduction, omit it and add «Root cause: hypothesis, not reproduced»;
  - the constraint «Do not write new unit tests and do not change existing ones: list the tests your change breaks or makes obsolete in Not done».

  Follow it to its final report, then continue in `do`.
- After all projects: fix or remove the tests the loop listed as broken or obsolete, only through the `lp-code-test:unit` skill, as the unit test paragraph of step 6 («Обычно») says. Then go to the lint check of step 6.
