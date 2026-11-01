# do: special cases

Read from `skills/do/SKILL.md` only when the case applies.

## Status

`/lp-task:do status`: for every `<stateDir>/*.json` (or only the task resolved by `shared.md` «Which task», if a key was given) show the key, title, projects with base, branch, commit, fix commits, `pushed`, `mr`, and for every project `git -C <path> log --oneline -1` and `git -C <path> status --short`. Change nothing.

## Shared code and a shared library

If the same logic exists or is needed in several projects and one of the task's projects is a shared library, propose extracting it there and ask the user (AskUserQuestion) before doing it. Only logic that several projects really use goes to the library.

For a shared library project: follow its CLAUDE.md and `notes`; warn that the dependent projects will see the changes only after a new version is published, and that their MRs must state the dependency on the library MR. Never bump the library version in a dependent project until that version is published to the registry, otherwise installs break.

## Removing an entity

If the task is about removing an entity, include in the plan the removal of artifacts that become unused (styles, images, imports), checking with `git grep` that no references remain. If you intentionally keep something, say why.
