# GEMINI.md

Operational instructions for Gemini CLI working in the **FantaF1** repository.

This file does **not** replace `AGENTS.md` or `PROJECT.md`.
It complements them with Gemini-specific operational behavior.
All three files must be read together.

Priority order when working in this repository:
1. explicit user instruction
2. `PROJECT.md`
3. `AGENTS.md`
4. this `GEMINI.md`

---

## 1. Repository Rule Loading

Before performing any task in this repository, always:
- read `AGENTS.md`
- read `PROJECT.md`
- read this `GEMINI.md`
- confirm the active constraints briefly

Do not begin implementation before those files are loaded.

---

## 2. Production-Safe Mindset

FantaF1 has real production data in the database.
Treat every task as production-safe work.

Mandatory behavior:
- protect persisted data
- avoid unintended side effects
- preserve backward compatibility unless explicitly waived
- minimize the scope of changes
- avoid broad refactors unless explicitly requested
- verify adjacent flows, not only the directly changed code

Never behave as if this repository were a disposable prototype.

---

## 3. No-Assumption Rule

If business logic, expected behavior, or task scope is unclear:
- stop
- state the ambiguity
- ask the user for clarification before changing code

Never continue based on invented assumptions.
Never silently reinterpret the requested behavior.

---

## 4. Mandatory TDD Workflow

For this repository, always apply strict TDD:

1. **RED**
   Write or update tests that describe the requested behavior.
   Show that the relevant test fails before the implementation.

2. **GREEN**
   Implement the minimum code required to make the test pass.

3. **REFACTOR**
   Clean the code while keeping tests green and behavior stable.

Rules:
- every fix or feature must be covered by automated tests
- regression tests must be added when adjacent behavior is at risk
- coverage must not decrease
- tests are mandatory, not optional

At the end of each task, report:
- tests created or updated
- commands executed
- final regression-safety summary

---

## 5. Mandatory Validation Before Completion

Before declaring a task complete, always run the relevant validations that actually exist in the repository.

Backend minimum:
```bash
dotnet build
dotnet test
```

Before any explicitly authorized commit:
```bash
dotnet format
```

Frontend validations must also be run when relevant and when the scripts exist, for example:
```bash
npm run lint
npm run test
npm run build
```

Rules:
- never invent commands that do not exist
- never declare success if build or tests fail
- never claim a check was executed if it was not

---

## 6. Cross-Platform Discipline

The repository is worked on in at least these environments:
- macOS (user)
- Windows (Pablo)

Do not introduce OS-specific regressions.

Mandatory rules:
- no hardcoded path separators
- watch case sensitivity differences
- avoid machine-specific assumptions
- keep commands and file behavior cross-platform when possible

---

## 7. Local App Control

When the user says **"avvia l'app"**:
1. stop existing backend/frontend processes that may conflict
2. run the relevant format/lint steps if available
3. run the relevant test steps if available
4. run the relevant build steps if available
5. start the app locally using the real repository command(s)
6. state clearly which database/environment the app is using

When the user says **"stoppa l'app"**:
- stop backend/frontend processes related to the app
- perform browser cleanup only if it is actually configured and applicable

When the user says **"riavvia l'app"**:
- perform stop
- rerun relevant validations
- start again locally
- restate the active environment/database

Never invent local control commands.
Use only what exists in the repository and current machine context.

---

## 8. Git Safety Reinforcement

Git operations are forbidden unless explicitly authorized by the user.
This includes:
- commit
- push
- pull
- merge
- rebase
- branch creation
- branch deletion
- tagging

Never merge into `main` without explicit authorization.
Work must remain on `develop` or feature branches unless the user says otherwise.

If commit is explicitly authorized:
- commit messages must be in English
- commit messages must accurately reflect the actual work performed
- update `README.md` when the latest changes materially affect setup, usage, features, UI, or behavior

---

## 9. Documentation Discipline

When editing `README.md`, `CHANGELOG.md`, or other project documentation:
- preserve the existing structure unless explicitly asked to redesign it
- preserve prior useful history
- append/update only the parts affected by real changes
- do not invent version history or release notes

For version/release/tag tasks, keep:
- `CHANGELOG.md`
- version metadata
- release/tag state

strictly aligned.

---

## 10. Final Response Format

Final responses must always be in Italian and must include:
- concise summary of what changed
- touched files
- tests created/updated
- commands executed
- regression checks performed
- any residual risk, limitation, or blocked validation

Do not hide uncertainty.
Be explicit and technically precise.
