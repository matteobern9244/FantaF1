# Implementation Plan: Fix Local Startup

## Objective

Restore a fully functional local development environment by identifying and
fixing the root cause of the startup failure in `./start_fantaf1.command`.

## Applied Principles

- **Strict TDD**: Every behavioral fix will follow the RED -> GREEN -> REFACTOR
  cycle.
- **100% Total Coverage**: Mandatory 100% coverage for Statements, Functions,
  Branches, and Lines for both Frontend and Backend.
- **AGENTS.md Compliance**: All instructions from `AGENTS.md` are applied,
  including the mandatory launcher rule and TDD policy.
- **Production-Safe**: Changes will be minimal and will not regress staging or
  production environments.

## Phase 1: Diagnosis & Analysis

Focus on identifying the bottleneck or failure point in the startup sequence.

- [x] Task: Execute `./start_fantaf1.command` to identify the failing step and
      capture error logs.
- [x] Task: Inspect Docker Desktop health and container status for MongoDB/Local
      containers.
- [x] Task: Verify MongoDB Atlas connectivity and connection strings in `.env`.
- [x] Task: Compare local `.env` with `.env.example` to ensure no missing
      variables.
- [x] Task: Identify if the failure is in the Backend (.NET 10 build), Frontend
      (Vite), or the startup script logic itself.
- [x] Task: Conductor - User Manual Verification 'Diagnosis & Analysis'
      (Protocol in workflow.md).

## Phase 2: Implementation & TDD

Apply the fix using the RED -> GREEN -> REFACTOR cycle.

- [x] Task: **RED**: Create a regression test or script check that captures the
      identified startup failure.
- [x] Task: **GREEN**: Implement the minimal safe change to fix the identified
      issue.
- [x] Task: **REFACTOR**: Clean up the implementation and ensure 100% coverage
      for the touched areas.
- [x] Task: Conductor - User Manual Verification 'Implementation & TDD'
      (Protocol in workflow.md).

## Phase 3: Coverage 100% totale

Ensure the entire application meets the 100% coverage threshold.

- [x] Task: Run frontend tests: `npm run test` and verify 100% coverage.
- [x] Task: Run backend tests: `npm run test:csharp-coverage` and verify 100%
      coverage on `backend-csharp/src/`.
- [x] Task: Achieve 100% total coverage across all files in the repository and
      application.
- [x] Task: Conductor - User Manual Verification 'Coverage 100% totale'
      (Protocol in workflow.md).

## Phase 4: Validation & UI Consistency

Final verification of the application health.

- [x] Task: Run `./start_fantaf1.command` and verify that both Backend and
      Frontend are operational.
- [x] Task: Run `check viste` (`npm run test:ui-responsive`) to verify Desktop
      and Mobile views.
- [x] Task: Run `npm run lint` and `npm run build` to ensure project health.
- [x] Task: Conductor - User Manual Verification 'Validation & UI Consistency'
      (Protocol in workflow.md).

## Phase 5: Documentation & Commit Preparation

- [x] Task: Update `CHANGELOG.md` and `README.md` with the fixes.
- [x] Task: Final verification of versioning consistency.
- [x] Task: Conductor - User Manual Verification 'Documentation & Commit
      Preparation' (Protocol in workflow.md).

## Acceptance Criteria

- [x] `./start_fantaf1.command` completes without errors and the app is
      reachable.
- [x] Frontend and Backend tests report 100% coverage.
- [x] No regressions in UI (Desktop/Mobile) via responsive checks.
- [x] All changes are documented in `CHANGELOG.md`.
