# AGENTS.md

These instructions are mandatory for any coding agent working in this repository.

This file defines the **general engineering contract**.
Project-specific business and repository rules are defined in `PROJECT.md`.
Agent-specific operational behavior is defined in `GEMINI.md`.
If two rules seem to conflict, use this precedence order:
1. Explicit user instruction
2. PROJECT.md
3. AGENTS.md
4. GEMINI.md operational defaults

---

## 1. Prime Directive

Every change must be:
- correct
- deterministic
- minimal in scope
- tested
- non-regressive
- maintainable

Never trade long-term correctness for short-term speed.
Do not optimize prematurely.
Do not modify unrelated code.

---

## 2. Mandatory Execution Workflow

For every task, always:

1. Restate the goal briefly.
2. Identify the likely impacted files and flows.
3. Define the acceptance criteria.
4. Implement in the smallest safe slices possible.
5. Validate the change with the relevant checks.
6. Provide a final summary with touched files and executed validations.

No step may be silently skipped.
If a step cannot be executed, state exactly what was not executed and why.

---

## 3. Scope Control

- Keep changes tightly limited to the requested objective.
- Do not refactor unrelated code.
- Do not rename files, symbols, or folders unless required.
- Do not introduce architectural changes or new patterns unless explicitly requested.
- Preserve existing conventions, structure, and style.

When in doubt, choose the smaller and safer change.

---

## 4. Code Quality Standards

- Prefer clarity over cleverness.
- Keep functions focused and easy to reason about.
- Avoid deep nesting when a simpler structure exists.
- Avoid hidden side effects.
- Keep business rules explicit.
- Reuse existing project patterns before inventing new ones.

---

## 5. Error Handling and Reliability

- Never swallow errors silently.
- Handle failure paths explicitly.
- Validate external or untrusted input before use.
- Fail fast on programmer errors.
- Avoid fragile behavior based on implicit assumptions.
- Avoid time-sensitive logic without explicit safeguards.

---

## 6. Determinism and Test Stability

- Tests must be deterministic.
- Avoid randomness unless explicitly required.
- Avoid reliance on uncontrolled time/state/network behavior in tests.
- Mock or isolate unstable boundaries when appropriate.
- Never fabricate test outcomes or claim checks were run when they were not.

---

## 7. Security and Dependency Discipline

- Treat all external input as untrusted.
- Never expose secrets or credentials.
- Never log sensitive data.
- Do not hardcode environment secrets.
- Do not add new dependencies without clear justification.

---

## 8. Testing Policy

Any behavioral change MUST:
- add or update automated tests
- protect the requested behavior
- cover meaningful edge cases where relevant
- guard against regressions in adjacent logic

The relevant test suite must pass before the task is considered complete.
When coverage already exists, do not reduce it.

---

## 9. Definition of Done

Before declaring completion, verify as applicable:

1. formatting/lint checks pass
2. tests pass
3. build passes
4. the application can start when startup is part of the task
5. no regression has been introduced in touched flows
6. documentation is updated if behavior/configuration/versioning changed
7. release artifacts and changelog stay aligned for version/release tasks

If any validation could not be run, explain the gap clearly.

---

## 10. Git Discipline

- Never use destructive git commands.
- Never commit, merge, rebase, tag, or push unless explicitly authorized.
- Keep changes focused and reviewable.
- Keep documentation aligned with shipped behavior.
- For versioning/tag/release tasks, update `CHANGELOG.md` in the same task.
- Never leave `CHANGELOG.md`, version metadata, and release state out of sync.

---

## 11. Communication Protocol

Before editing:
- provide a short operational plan

After editing:
- summarize the outcome
- list touched files
- list validation commands actually executed
- state any risks, blockers, or unverified assumptions

If blocked:
- state the blocker
- state the safest next action

---

## 12. Hard Prohibitions

- Do not fabricate results.
- Do not claim success without validation.
- Do not change APIs silently.
- Do not introduce unrelated refactors.
- Do not introduce new frameworks without explicit approval.
- Do not override repository rules with personal preference.
