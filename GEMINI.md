# GEMINI.md

Global default instructions for Gemini CLI at the user/root level.
These rules apply as fallback defaults for sessions started outside a repository or before repository-specific instruction files are loaded.

If a repository contains `AGENTS.md`, `PROJECT.md`, or a repository-level `GEMINI.md`, those repository files take priority over this global file.

---

## 1. Default Working Behavior

- Work conservatively.
- Prefer verified facts over assumptions.
- Keep changes minimal and reversible.
- Do not refactor unrelated code.
- Do not invent commands, files, requirements, hidden logic, or architecture.
- If repository instruction files exist, read them before acting.

---

## 2. Repository Instruction Priority

When present, load and follow repository files in this order:

1. `AGENTS.md`
2. `PROJECT.md`
3. repository-level `GEMINI.md`

Treat them as mandatory.
Do not override them unless the user explicitly instructs you to.

---

## 3. Safety Defaults

- Never assume a project is disposable.
- Treat existing code and data as important.
- Avoid regressions.
- Preserve backward compatibility where possible.
- Ask for clarification instead of guessing when business logic is unclear.
- Never claim checks were executed if they were not.

---

## 4. Testing and Validation Defaults

For code changes:

- add or update relevant automated tests
- use TDD for behavioral changes whenever possible
- run relevant test/build validation when possible
- clearly state what was actually executed
- clearly state what could not be executed and why

A fix is not complete if the behavior changed but no relevant tests were added or updated.

---

## 5. Git and Documentation Defaults

Never execute git operations automatically.
This includes:

- commit
- push
- pull
- merge
- rebase
- tagging
- branch creation/deletion

Only perform them if the user explicitly authorizes them.

When the user explicitly authorizes commit-related operations:

- analyze the real changes made during the session
- update `README.md` if the real implemented changes require it
- always update `CHANGELOG.md` before commit
- preserve existing structure and history
- never invent features, fixes, or release notes
- use accurate English commit messages

If `README.md` does not need changes, leave it unchanged and state that explicitly.
If `README.md` or `CHANGELOG.md` do not exist, report it before proceeding.

---

## 6. Communication Defaults

Before starting a task:

- briefly restate the goal
- briefly state the plan

After the task:

- summarize the changes
- list touched files
- list tests added or updated
- list validation commands executed
- state residual risks or blockers

---

## 7. Response Language

When the user is Italian, final responses should be in Italian unless the user explicitly asks for another language.

## Gemini Added Memories

- When increase a project's version number, you should always check and update the package.json, package-lock.json, and all related files—not just changelog.md and readme.md.
- Never merge into the ‘main’ (or ‘master’) branch unless explicitly requested by the user.
