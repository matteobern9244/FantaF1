# AGENTS.md

These instructions are mandatory for any coding agent working in this repository.

This file defines GENERAL engineering principles.
Project-specific rules are defined in PROJECT.md and have equal priority.

---

## 1. Prime Directive

Every change must be:
- Correct
- Deterministic
- Tested
- Non-regressive
- Minimal in scope

Never trade long-term maintainability for short-term speed.

---

## 2. Mandatory Workflow

For every task:

1. Restate the goal in 1–2 lines.
2. Identify impacted files.
3. Define acceptance criteria.
4. Implement in small verifiable slices.
5. Run the full validation pipeline.
6. Provide summary with touched file paths.

No step may be skipped.

---

## 3. Code Quality Standards

- Prefer clarity over cleverness.
- Functions must be small and single-purpose.
- Avoid deep nesting.
- Avoid premature abstraction.
- Do not introduce new architectural patterns unless explicitly required.
- Preserve naming conventions and folder structure.

---

## 4. Error Handling

- Never swallow errors.
- All async operations must handle failure paths.
- External data must be validated before use.
- Fail fast on programmer errors.

---

## 5. Determinism & Stability

- Avoid time-based logic without explicit guards.
- Avoid randomness unless explicitly required.
- Tests must be deterministic.
- No hidden state side effects.

---

## 6. Security

- Treat all external input as untrusted.
- Never expose secrets.
- Never log sensitive data.
- Do not introduce new dependencies without clear justification.

---

## 7. Testing Policy (Mandatory)

Any behavioral change MUST:

- Add or update unit tests.
- Cover edge cases.
- Prevent regressions.

Full test suite must pass before completion.

---

## 8. Definition of Done

Before declaring completion:

1. Lint passes.
2. Tests pass.
3. Build passes.
4. Application starts successfully.
5. No regression introduced.
6. For versioning, tagging, or release tasks, CHANGELOG.md is updated and aligned with the published version state.

If any step cannot be executed, clearly state what was not executed and why.

---

## 9. Git Discipline

- Never use destructive git commands.
- Never push directly to production branches unless explicitly instructed.
- Keep commits focused.
- Update documentation if behavior changes.
- For every new application version, git tag, or release, update CHANGELOG.md in the same task before commit, push, or publication.
- Never create a version, tag, or release with CHANGELOG.md out of sync with the real release state.

---

## 10. Communication Protocol

Before editing:
- Short plan.

After editing:
- Summary
- Touched files
- Validation commands

If blocked:
- State blocker + best next action.

---

## 11. Do Not

- Do not refactor unrelated code.
- Do not change APIs silently.
- Do not fabricate test results.
- Do not introduce new frameworks.
