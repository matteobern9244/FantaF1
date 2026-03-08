# AGENTS.md

Mandatory engineering instructions for any coding agent working in this repository.

This file defines general implementation discipline.
Project-specific domain and architectural constraints are defined in `PROJECT.md`.
Repository-specific Gemini CLI behavior is defined in `GEMINI.md`.
All three files are mandatory and complementary.

---

## Repository Profile

### Project Overview

- Private full-stack Fanta Formula 1 application with an admin-managed predictions and results workflow.
- The application always manages exactly 3 participants and keeps live projections plus historical standings.
- The repository contains production-facing business logic and persistent data constraints that must remain safe.
- `PROJECT.md` remains the source of truth for business rules, critical flows, and domain invariants.

### Main Technologies

- Frontend: React 18 + TypeScript + Vite
- Backend: Express 5 on Node.js
- Persistence: MongoDB Atlas via Mongoose
- Testing: Vitest, React Testing Library, Supertest
- Supporting libraries: Lucide React, jsdom, dotenv, cors

### Architecture

- `src/`: SPA frontend, UI shell, feature panels, and shared frontend utilities in `src/utils`.
- `backend/`: REST API, validation, persistence access, and external Formula 1 synchronization logic.
- `app.js` and `server.js`: Express composition, database bootstrap, and runtime startup.
- `tests/`: unit, integration, API, and UI regression coverage across frontend and backend flows.

### Building and Running

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run start:local`

Optional helper commands already supported by the repository:

- `npm run test:save-local`
- `npm run test:ui-responsive`
- `npm run preview`
- `npm run migrate:remove-weekend-boost`

### Development Conventions

- Prefer focused modules, pure helpers, and explicit data flow over oversized orchestration blocks.
- Keep runtime wiring and environment/bootstrap concerns in entry points and bootstrap modules such as `app.js`, `server.js`, and backend startup code.
- Avoid hidden dependencies and service-locator style access patterns; pass dependencies explicitly or keep them within the owning module boundary.
- Do not introduce class-based abstractions unless the repository clearly benefits from them; the current codebase is predominantly module-oriented.
- Centralize repeated rules, labels, and configuration in the existing config/constants layers instead of scattering literals.
- Never leave application or runtime-facing strings hard coded inside components, backend flows, helpers, or scripts when they can be centralized safely; place them in dedicated config/constants modules grouped by domain area.
- This rule is mandatory for fixes, modifications, and new implementations in this repository.
- Allowed exceptions are only technical strings that are structurally required inline, such as raw parser regexes, external HTML fixtures, environment variable names, protocol keys, API paths, MIME values, selectors, and `data-testid` values.
- Preserve the current visual language, full-width layout, and UI configuration/localization patterns already used by the project.
- Route persistent state through the defined persistence layer and keep synchronization/import flows explicit about whether they are read-only, idempotent, or mutating.
- Keep implementations and scripts portable across supported environments; avoid OS-specific assumptions unless the repository already requires them.

### Key Files

- `AGENTS.md`
- `PROJECT.md`
- `GEMINI.md`
- `package.json`
- `README.md`
- `app.js`
- `server.js`

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

1. Implement the fix - modification - new implementation ALWAYS respecting the principles of TDD programming and all other programming principles contained in this file.
2. Restate the requested goal in 1-2 lines.
3. Identify the impacted files, layers, and risk areas.
4. State the acceptance criteria.
5. Inspect existing logic before editing anything.
6. Apply strict TDD for any behavioral change.
7. Define and preserve the required 100% total coverage target for the task scope and repository/application.
8. Implement the smallest safe change required.
9. Run the relevant validations, including explicit coverage verification at 100%.
10. Provide a final summary with touched files, tests, coverage verification, and executed commands.

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
- If code or tests appear brittle, inconsistent, or overengineered, surface that explicitly instead of silently working around it.

---

## 6. Determinism and Stability

- Avoid time-dependent behavior unless explicitly guarded.
- Avoid randomness unless explicitly required.
- Tests must be deterministic and repeatable.
- Tests must not rely on uncontrolled system clock values, ambient locale differences, machine-specific paths, or uncontrolled network availability unless the scenario is explicitly guarded behind a controlled seam.
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
- Use the repository's established Vitest/React Testing Library/Supertest patterns, and mock only collaborators outside the actual intent of the test.
- This TDD rule is mandatory for every fix, modification, and new implementation in this repository without exception.
- RED must also define the coverage work needed to preserve or restore 100% statements, functions, branches, and lines for the official repository/application scope.
- GREEN is not complete if the implementation passes behavior tests but leaves coverage below 100%.
- REFACTOR is not complete until all tests remain green and coverage remains at 100%.

---

## 8. Validation Policy

Before declaring completion, run the relevant validation pipeline supported by the repository.
Where applicable this includes:
- lint
- unit/integration tests
- build
- local application startup

### Current verification stack

- Lint: `npm run lint`
- Tests: `npm run test`
- Build: `npm run build`
- Local smoke startup when relevant: `npm run start:local`
- Additional targeted checks when relevant:
  - `npm run test:save-local`
  - `npm run test:ui-responsive` for responsive/UI-impacting changes

### Test stack and coverage profile

- Main automated test stack: Vitest, React Testing Library, and Supertest.
- Coverage provider: V8.
- Current verified merged baseline for the configured official application-code scope is **100% statements (3095 / 3095)**, **100% functions (241 / 241)**, **100% branches (1392 / 1392)**, and **100% lines**, aligned with the thresholds currently documented in `README.md`.
- Whenever a task produces a new verified merged Release coverage result, update this baseline in `AGENTS.md` to the new numbers.
- If a task produces a new verified merged coverage result for the tracked scope, update the baseline in `AGENTS.md` and never accept a regression below that verified baseline.

A task is not complete if:
- the project does not compile
- any relevant test fails
- the behavior was changed without automated test coverage
- coverage for the official repository/application scope is below 100% statements, functions, branches, or lines

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

### Persistent deploy trigger

If the user writes exactly `deploya`, treat that as explicit authorization to run the full deployment workflow below without asking for confirmation and without changing the sequence:

1. Before starting, verify the repository state. If there are unstaged files, stop immediately and do not proceed. If there are staged files, proceed with the workflow.
2. Determine the correct next application version and bump it consistently across the repository wherever needed.
3. Update `README.md` and `CHANGELOG.md` so they are coherent, accurate, and aligned with the latest changes, implementations, and fixes in the repository.
4. Run the full test suite, if a test suite exists.
5. Run linting, build validation, and any other mandatory verification commands supported by the repository in addition to tests.
   - If `npm run test:ui-responsive` is part of the validation set, ensure the command starts backend and frontend automatically before the check when they are not already reachable, and stop any temporary backend/frontend processes immediately after the check ends.
6. If any test, lint, build, or mandatory validation fails, stop immediately. Fix issues only if they were caused by the recent work, rerun the relevant checks, and proceed only when the repository is deployable again.
7. Create an intelligent commit message that accurately summarizes the work performed.
8. Commit all required changes.
9. Push the current working branch to its remote branch.
10. Create or update a Pull Request from the current branch into `main`.
11. Enable auto-merge on that Pull Request using the repository's configured merge method, without bypassing branch protection on `main`.
12. Wait until the Pull Request is either merged by GitHub after all required checks pass or remains open because at least one required check failed or stayed pending.
13. If the Pull Request is not merged successfully into `main`, stop immediately and do not create tags or releases.
14. After GitHub has merged the Pull Request into `main`, create a tag on `main` that matches the new version.
15. Create a GitHub Release based on that tag, coherent with the version and delivered changes.
16. Return to the original branch from which the deployment workflow started.

Failure policy for `deploya`:
- stop immediately if any critical step fails
- do not bypass Pull Request requirements, required checks, or branch protection on `main`
- do not create tags unless GitHub completed the merge to `main` successfully through the protected Pull Request flow
- do not create a GitHub Release unless the tag was created successfully and all previous steps completed successfully

---

## 11. Final Response Protocol

Before editing:
- provide a comprehensive and detailed plan that always includes checks to ensure no regression on desktop browser view or mobile view for both environments: development and production
- in every plan, explicitly state which programming/design principles will be applied for the specific task
- in every plan, explicitly state that `AGENTS.md` instructions are being applied and will be followed
- in every plan for a fix, modification, or new implementation, explicitly show the TDD strategy as `RED -> GREEN -> REFACTOR`
- in every plan, explicitly include acceptance criteria, regression checks, and the validation commands intended to be run
- in every plan must always include a dedicated section named `Coverage 100% totale`
- in every plan must always include verification of 100% coverage for all files in the repository and application
- if coverage is not 100% at the end of plan implementation, coverage must be performed until 100% coverage is achieved for all files in the repository and application
- no plan is valid or complete if it omits the explicit 100% total coverage requirement

After editing:
- summarize what changed
- list touched files
- list tests added or updated
- list coverage verification executed and the resulting 100% status
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
