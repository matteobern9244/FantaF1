# AGENTS.md

Mandatory engineering instructions for any coding agent working in this repository.

This file defines general implementation discipline.
Project-specific domain and architectural constraints are defined in `PROJECT.md`.
Repository-specific Gemini CLI behavior is defined in `GEMINI.md`.
Repository-specific Claude behavior is defined in `CLAUDE.md`.
All three files are mandatory and complementary.

---

## Repository Profile

### Project Overview

- Private full-stack Fanta Formula 1 application with an admin-managed predictions and results workflow.
- The application always manages exactly 3 participants and keeps live projections plus historical standings.
- The repository contains production-facing business logic and persistent data constraints that must remain safe.
- `PROJECT.md` remains the source of truth for business rules, critical flows, and domain invariants.
- `README.md` is the canonical operational document for runtime, deploy, environment matrix, local startup, and CI/CD.
- `CHANGELOG.md` is the canonical release and audit history.

### Main Technologies

- Frontend: React 18 + TypeScript + Vite
- Backend: ASP.NET Core 10 (C#)
- Persistence: MongoDB Atlas via MongoDB .NET Driver
- Testing: Vitest (Frontend), xUnit (Backend), React Testing Library
- Supporting libraries: Lucide React, jsdom, MongoDB.Driver

### Architecture

- `src/`: SPA frontend, UI shell, feature panels, and shared frontend utilities in `src/utils`.
- `backend-csharp/`: Official REST API (ASP.NET Core 10), Domain logic, Persistence (MongoDB), and Infrastructure.
- `tests/`: unit, integration, and UI regression coverage across frontend and supporting scripts.

### Building and Running

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run start:local`
- `./start_fantaf1.command` as the canonical monitored local app launcher when the user asks to `avvia l'app`

Optional helper commands already supported by the repository:

- `npm run test:csharp-coverage`
- `npm run test:save-local`
- `npm run test:ui-responsive`
- `npm run preview`

### Development Conventions

- **Separation Of Concerns:** Keep UI, application orchestration, domain rules, infrastructure, and migration glue clearly separated.
- **Abstraction Naming:** Name adapters, translators, facades, and compatibility seams for the boundary they protect, not as generic `Helper` or `Utils` buckets.
- **Configuration Discipline:** Put migration flags, environment-specific endpoints, file paths, routing toggles, and cutover settings in configuration or constants, not scattered literals.
- **Credential Secrecy:** Passwords and equivalent credentials must never appear in clear text in versioned files, including production code, tests, fixtures, documentation, and examples. Store only one-way hashes, salts, non-versioned secret references, or runtime-generated test inputs derived from non-secret seeds.
- **Localization:** New user-facing text must go through the existing centralized UI/config text system instead of ad-hoc literals.
- **Documentation:** Keep architecture notes, migration progress, known parity gaps, cutover conditions, and verified coverage baselines updated in repository docs.
- Prefer focused domain objects, explicit collaborators, and clear data flow over oversized orchestration blocks.
- Keep runtime wiring and environment/bootstrap concerns in entry points and bootstrap modules such as backend startup code.
- Avoid hidden dependencies and service-locator style access patterns; pass dependencies explicitly or keep them within the owning module boundary.
- Prefer object-oriented abstractions when they improve separation of responsibilities, state management, or external-source orchestration; keep classes small, explicit, and easy to test.
- Use pure helper modules to support those objects when stateful behavior is not needed, but avoid collapsing non-trivial domain workflows back into oversized procedural modules.
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
- `CLAUDE.md`
- `package.json`
- `README.md`
- `CHANGELOG.md`

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
10. Ensure versioning coordination: every version increment must be applied consistently across `package.json`, `package-lock.json`, `CHANGELOG.md`, and `README.md`.
11. Provide a final summary with touched files, tests, coverage verification, and executed commands.

Do not skip steps.
Do not jump directly into editing without understanding the current implementation.

---

## 3. Clarification and Assumption Policy

- Never invent requirements, commands, hidden business rules, or architecture.
- Never assume missing behavior if the codebase does not support that assumption.
- **Source Of Truth:** For every task, explicitly identify and follow the currently authoritative runtime path and document set. C# is authoritative.
- Read the affected legacy and target implementations before proposing structural changes.
- If business logic, expected behavior, or data flow is unclear, stop and ask for clarification.
- If the repository contains current migration notes or temporary cutover material, treat them only as supplemental context after checking `README.md`, `PROJECT.md`, and the actual runtime implementation.
- If the repository already defines the behavior, follow the repository files instead of guessing.

---

## 4. Change Scope Policy

- **Behavior Preservation First:** During migration or porting, preserve externally observable behavior unless the task explicitly includes a product change. If behavior must change, document the delta, update tests, and call it out explicitly.
- **Incremental Migration:** Prefer small, reversible migration steps. Avoid broad rewrites that mix structural migration, refactoring, behavior changes, and cleanup in one change set.
- **Strangler Mindset:** Add new migration code behind stable seams, adapters, or interfaces so legacy and target implementations can coexist safely during rollout.
- **Compatibility Layers Must Be Intentional:** Adapters, shims, translators, and facades are acceptable only when they reduce migration risk and remain focused, documented, and temporary unless there is a stable long-term reason to keep them.
- **Avoid Legacy Leakage:** Do not spread legacy Node/Express/Mongoose concepts deeper into the target C# architecture than necessary; translate at boundaries and keep target-side abstractions clean.
- Keep changes minimal and targeted.
- Do not collapse migration, refactor, and feature work into one edit unless explicitly requested.
- Do not refactor unrelated code.
- Do not rename or move files unless necessary.
- Do not introduce new frameworks, patterns, or dependencies without explicit need.
- Prefer edits that improve the seam between old and new systems.
- **Legacy Decommission Rule:** Do not remove legacy code until replacement behavior, migration validation, observability, and rollback expectations are verified.
- **Delete Dead Paths Promptly:** Once a migration step is verified and cutover is complete, remove obsolete flags, adapters, and duplicate paths instead of carrying permanent transitional complexity.
- Preserve naming conventions, folder structure, and coding style already used in the repository.

---

## 5. Code Quality Standards

- **Business Logic Isolation:** Move business rules into focused domain services, value objects, or pure collaborators that remain independent from transport and framework concerns whenever that improves the migration seam.
- **SOLID Principles:** Apply `SRP`, `OCP`, `LSP`, `ISP`, and `DIP` consistently, especially when extracting abstractions from the legacy backend into the target C# architecture.
- **Dependency Injection by Default:** Runtime collaborators must be injected. Bootstrap code, composition roots, and narrowly scoped factories may create concrete implementations when justified.
- **No Hidden Collaborator Graphs:** Controllers, services, handlers, repositories, parsers, and orchestrators must not instantiate runtime collaborators directly except for value types or framework-mandated primitives.
- **Static Logic Policy:** Avoid placing production behavior in static classes. Static-only use is limited to constants, pure extensions, and framework-mandated entry points.
- Prefer clarity over cleverness.
- Keep functions focused and single-purpose.
- Avoid deep nesting and hidden side effects.
- Preserve API contracts unless explicitly asked to change them.
- Validate external or unsafe input before use.
- Never swallow errors silently.
- **Error Handling:** Produce actionable errors with enough context to diagnose mapping failures, invalid input, unsupported migration states, or broken invariants.
- Fail clearly when invariants are broken.
- If code or tests appear brittle, inconsistent, or overengineered, surface that explicitly instead of silently working around it.

---

## 6. Determinism and Stability

- **Cross-Platform Discipline:** Use platform-safe file, path, encoding, locale, and environment handling. Never hardcode platform separators, shell assumptions, or machine-local paths unless the repository already requires them.
- Avoid time-dependent behavior unless explicitly guarded.
- Avoid randomness unless explicitly required.
- Tests must be deterministic and repeatable.
- Tests must not rely on uncontrolled system clock values, ambient locale differences, machine-specific paths, or uncontrolled network availability unless the scenario is explicitly guarded behind a controlled seam.
- **Time And Clock Access:** All production time access must go through injectable abstractions, especially in the C# port.
- Avoid implicit global state mutations.
- Avoid introducing behavior that depends on execution order unless already part of the design.

---

## 7. Mandatory TDD Policy

Any behavioral change, fix, or implementation must follow strict TDD:

1. **RED**: add or update tests that reproduce the intended behavior or failing regression.
2. **GREEN**: implement the minimum code required to make the tests pass.
3. **REFACTOR**: clean the implementation while keeping all tests green.

Rules:

- **TDD By Default:** Start with a failing test when adding or fixing behavior unless the task is strictly exploratory or mechanical and no behavior is being changed.
- **Deterministic Tests Only:** Keep tests independent from uncontrolled time, locale, machine-specific paths, network availability, or mutable external state unless those conditions are explicitly isolated as the scenario under test.
- **Parity Tests:** For migrated behavior, add tests that assert the target implementation matches the legacy implementation for representative and edge-case inputs.
- **Contract Tests:** For shared abstractions, adapters, and interfaces, define tests that every implementation or placeholder seam must satisfy.
- **Mock Narrowly:** Mock only collaborators outside the true scope under test; prefer focused fakes or real seams over broad incidental integration.
- **Migration Regression Coverage:** Every migration change must preserve or increase confidence in the migrated area through new or improved tests.
- **Test Data Management:** Keep fixtures minimal, explicit, canonical, and readable.
- A behavioral fix is not complete without tests.
- A regression fix is not complete without a regression test.
- New logic must be covered by automated tests.
- Related edge cases must be considered and covered when relevant.
- Never claim TDD was applied if tests were added only after coding without first reproducing the issue.
- Use the repository's established Vitest/React Testing Library patterns, and mock only collaborators outside the actual intent of the test.
- This TDD rule is mandatory for every fix, modification, and new implementation in this repository without exception.
- RED must also define the coverage work needed to preserve or restore 100% statements, functions, branches, and lines for the official repository/application scope.
- GREEN is not complete if the implementation passes behavior tests but leaves coverage below 100%.
- REFACTOR is not complete until all tests remain green and coverage remains at 100%.

---

## 8. Validation Policy

Before declaring completion, run the relevant validation pipeline supported by the repository.
Where applicable this includes:

- **Functional Parity First:** Reach functional parity first. Optimize architecture, performance, or style only after behavior is covered by tests unless the task is explicitly performance-driven.
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
  - `npm run test:csharp-coverage` for the official backend-csharp application coverage summary on `backend-csharp/src/`
  - `npm run test:save-local`
  - `npm run test:ui-responsive` for responsive/UI-impacting changes

### Mandatory launcher rule

- When the user asks to `avvia l'app`, always use `./start_fantaf1.command` instead of invoking `npm run start:local` directly.
- When the user writes exactly `check viste`, run `npm run test:ui-responsive`.
- That launcher must be treated as the repository's monitored startup entrypoint and must remain valid.
- `./start_fantaf1.command` must not execute `npm run test:ui-responsive` inside its monitored preflight flow; responsive browser validation remains a separate explicit check to run only when relevant to the task, not part of the launcher startup path.
- If the launcher or startup flow reports any error, stop the full execution immediately.
- On any startup failure, terminate all active application-related processes and any active Playwright or Playwright-MCP processes started for the flow before responding.
- Report the concrete error or errors observed to the user; never claim a successful startup when any monitored step failed.

### Mandatory CI/CD workflow rule

- GitHub Actions workflows under `.github/workflows/` must stay aligned with the repository's current and future real implementation, scripts, validation stack, branch strategy, and required secrets.
- If a workflow is no longer coherent with the repository state, adapt it as part of the same task with the smallest safe change.
- When workflows are changed, or when their coherence is explicitly questioned, validate them locally before completion using the closest available local checks for syntax and for the commands they execute.
- Never push directly to `main`. Do not use direct push-to-main as a delivery path for CI/CD changes or any other change.

### Test stack and coverage profile

- Main automated test stack: Vitest (Frontend), xUnit (Backend), and React Testing Library.
- Coverage provider: V8 (Frontend), coverlet (Backend).
- Current verified merged baseline for the configured official application-code scope is **100% statements (5176 / 5176)**, **100% functions (408 / 408)**, **100% branches (2096 / 2096)**, and **100% lines (5176 / 5176)**, aligned with the thresholds currently documented in `README.md`.
- Official backend-csharp application coverage on `backend-csharp/src/` is **100% line coverage (2932 / 2932)**, **100% branch coverage (1653 / 1653)**, and **100% method coverage (489 / 489)** across **70 included files**, as reported by `npm run test:csharp-coverage`.
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

- **Data Safety:** Schema changes, data reshaping, or migration utilities must be reversible when feasible or protected by backup/export strategy and explicit validation.
- **Contract Preservation:** Public APIs, file formats, CLI surfaces, collection names, session semantics, and integration contracts must remain stable unless the task explicitly includes a reviewed breaking change.
- **Feature Flags For Cutover:** Use explicit routing seams or feature toggles for staged rollout when both legacy and target paths may be exercised.
- **Observability During Migration:** Add or preserve logs, metrics, traces, or diagnostics when needed to compare legacy and target behavior during rollout.
- **No Silent Fallbacks:** If the target path cannot handle a case, fail explicitly or route through a documented compatibility path; never hide broken migration behavior behind silent fallback logic.
- identify the flows that may be affected
- check adjacent logic, shared helpers, selectors, services, mappers, and API contracts
- If a task risks breaking parity, state the risk explicitly and verify with targeted tests before finishing.
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

- PRIMA DI ESEGUIRE COMMIT E PUSH MODIFICARE SEMPRE FILE README.MD (SE NECESSARIO), CHANGELOG.MD CON TUTTE LE MODIFICHE/FIX/NUOVE IMPLEMENTAZIONI EFFETTUATE, IMPLEMENTATE E RICHIESTE.
- update `README.md` if the real implemented changes require documentation updates
- always update `CHANGELOG.md` before commit
- preserve the existing documentation structure and history
- never invent features, fixes, or release notes
- keep commit messages accurate and in English

No version/tag/release task is complete if `CHANGELOG.md` is out of sync with the real repository state.

### Persistent deploy trigger

If the user writes exactly `deploya`, treat that as explicit authorization to run the full deployment workflow below without asking for confirmation and without changing the sequence. Before starting, also verify that `main` is already the branch that represents the current releasable stack and that the current working branch is `staging`. If `main` intentionally still points to a legacy or cutover-pending structure, stop immediately and report that `deploya` is not currently activatable.

1. Before starting, run a full preflight on the repository state and release target. Verify there are no unstaged files, `main` is aligned with the stack intended for release, the current branch is exactly `staging`, the branch is synced with its remote, required `git` and `gh` authentication are available, the required runtime/toolchain versions are present, the minimum required environment variables and deploy secrets exist, and the release target is still valid. If any of these checks fail, stop immediately and do not proceed.
2. Run a dry-run summary before any mutating action. Show the computed next version, the files expected to change, the validations that will run, the Pull Request target, and any tag/release names that would be created. Do not commit, push, tag, or release during the dry-run phase.
3. Determine the correct next application version and bump it consistently across the repository wherever needed.
4. Verify the version bump diff is coherent across `package.json`, `package-lock.json`, `README.md`, `CHANGELOG.md`, and every other repository file that must reflect the released version. If any required file is missing, stale, or inconsistent, stop immediately.
5. Update `README.md` and `CHANGELOG.md` so they are coherent, accurate, and aligned with the latest changes, implementations, and fixes in the repository.
6. Reject generic, incomplete, or diff-inconsistent release notes. If `CHANGELOG.md` does not accurately describe the real delivered changes, stop immediately.
7. Run the full test suite, if a test suite exists.
8. Run linting, build validation, and any other mandatory verification commands supported by the repository in addition to tests.
   - If the diff touches scoring, projections, locking, historical recalculation, synchronization, persistence, or other high-risk areas described in `PROJECT.md`, run the targeted validations needed for those areas in addition to the general suite.
   - If the diff touches `.github/workflows/`, validate the affected workflows locally before push using the closest available syntax and command-level checks.
   - If `npm run test:ui-responsive` is part of the validation set, ensure the command starts backend and frontend automatically before the check when they are not already reachable, and stop any temporary backend/frontend processes immediately after the check ends.
9. If any test, lint, build, or mandatory validation fails, stop immediately. Fix issues only if they were caused by the recent work, rerun the relevant checks, and proceed only when the repository is deployable again.
10. Create an intelligent commit message that accurately summarizes the work performed.
11. Commit all required changes.
12. Push the current working branch to its remote branch.
13. Create or update a Pull Request from `staging` into `main`.
14. Verify that the Pull Request configuration is correct before enabling merge automation. Confirm the title, body, labels, base branch, head branch, reviewers, assignees, and release metadata are accurate and complete.
15. Enable auto-merge on that Pull Request using the repository's configured merge method, without bypassing branch protection on `main`.
16. Wait until the Pull Request is either merged by GitHub after all required checks pass or remains open because at least one required check failed or stayed pending.
17. If the Pull Request is not merged successfully into `main`, stop immediately, do not create tags or releases, and report the exact blocking state.
18. After GitHub has merged the Pull Request into `main`, verify that the merged commit on `main` is the expected release commit and that the repository state still matches the validated release candidate.
19. Create a tag on `main` that matches the new version.
20. Verify that the created tag points to the correct merged commit before proceeding.
21. Create a GitHub Release based on that tag, coherent with the version and delivered changes.
22. If tag creation, release creation, or any post-merge release step fails, stop immediately, do not continue with later release actions, and report the exact rollback or cleanup actions required to restore a coherent release state.
23. Return to the original branch from which the deployment workflow started.

Failure policy for `deploya`:

- stop immediately if any critical step fails
- do not proceed if the current branch is not `staging`
- do not proceed if preflight, dry-run, version-diff, changelog-quality, workflow-validation, or post-merge verification checks fail
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
