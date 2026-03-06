# AGENTS.md

Mandatory engineering instructions for any coding agent working in this repository.

This file defines general implementation discipline.
Project-specific domain and architectural constraints are defined in `PROJECT.md`.
Repository-specific Gemini CLI behavior is defined in `GEMINI.md`.
All three files are mandatory and complementary.

---

## 1. Prime Directive

Every change must be:
- correct
- minimal in scope
- deterministic
- tested
- non-regressive
- production-safe in behavior

Never trade correctness or stability for speed.
Never optimize by skipping validation.

---

## 2. Mandatory Execution Workflow

For every task, execute this sequence:

1. Restate the requested goal in 1-2 lines.
2. Identify the impacted files, layers, and risk areas.
3. State the acceptance criteria.
4. Inspect existing logic before editing anything.
5. Apply strict TDD for any behavioral change.
6. Implement the smallest safe change required.
7. Run the relevant validations.
8. Provide a final summary with touched files, tests, and executed commands.

Do not skip steps.
Do not jump directly into editing without understanding the current implementation.

---

## 3. Clarification and Assumption Policy

- Never invent requirements, commands, hidden business rules, or architecture.
- Never assume missing behavior if the codebase does not support that assumption.
- If business logic, expected behavior, or data flow is unclear, stop and ask for clarification.
- If the repository already defines the behavior, follow the repository files instead of guessing.

---

## 4. Change Scope Policy

- Keep changes minimal and targeted.
- Do not refactor unrelated code.
- Do not rename or move files unless necessary.
- Do not introduce new frameworks, patterns, or dependencies without explicit need.
- Preserve naming conventions, folder structure, and coding style already used in the repository.

---

## 5. Code Quality Standards

- Prefer clarity over cleverness.
- Keep functions focused and single-purpose.
- Avoid deep nesting and hidden side effects.
- Preserve API contracts unless explicitly asked to change them.
- Validate external or unsafe input before use.
- Never swallow errors silently.
- Fail clearly when invariants are broken.

---

## 6. Determinism and Stability

- Avoid time-dependent behavior unless explicitly guarded.
- Avoid randomness unless explicitly required.
- Tests must be deterministic and repeatable.
- Avoid implicit global state mutations.
- Avoid introducing behavior that depends on execution order unless already part of the design.

---

## 7. Mandatory TDD Policy

Any behavioral change, fix, or implementation must follow strict TDD:

1. **RED**: add or update tests that reproduce the intended behavior or failing regression.
2. **GREEN**: implement the minimum code required to make the tests pass.
3. **REFACTOR**: clean the implementation while keeping all tests green.

Rules:
- A behavioral fix is not complete without tests.
- A regression fix is not complete without a regression test.
- New logic must be covered by automated tests.
- Related edge cases must be considered and covered when relevant.
- Never claim TDD was applied if tests were added only after coding without first reproducing the issue.

---

## 8. Validation Policy

Before declaring completion, run the relevant validation pipeline supported by the repository.
Where applicable this includes:
- lint
- unit/integration tests
- build
- local application startup

A task is not complete if:
- the project does not compile
- any relevant test fails
- the behavior was changed without automated test coverage

If a validation step cannot be executed, explicitly state:
- what was not executed
- why it was not executed
- what residual risk remains because of it

Never fabricate validation results.

---

## 9. Regression Prevention Policy

For every task:
- identify the flows that may be affected
- check adjacent logic, shared helpers, selectors, services, mappers, and API contracts
- verify that unchanged user flows still behave as before
- pay extra attention to high-risk areas declared in `PROJECT.md`

If the task touches scoring, projections, locking, historical recalculation, synchronization, or persistence, perform extra regression validation.

---

## 10. Git and Documentation Discipline

Never perform git operations unless explicitly authorized by the user.
This includes:
- commit
- push
- pull
- merge
- rebase
- tag creation
- branch creation/deletion

When the user explicitly authorizes commit-related operations:
- update `README.md` if the real implemented changes require documentation updates
- always update `CHANGELOG.md` before commit
- preserve the existing documentation structure and history
- never invent features, fixes, or release notes
- keep commit messages accurate and in English

No version/tag/release task is complete if `CHANGELOG.md` is out of sync with the real repository state.

---

## 11. Final Response Protocol

Before editing:
- provide a short plan

After editing:
- summarize what changed
- list touched files
- list tests added or updated
- list validation commands executed
- state residual risks, blockers, or skipped checks if any

If blocked:
- state the blocker clearly
- propose the best next action

---

## 12. Do Not

- do not refactor unrelated code
- do not silently change APIs
- do not skip tests for behavioral fixes
- do not claim validations that were not run
- do not introduce speculative changes
- do not weaken safety checks for convenience
