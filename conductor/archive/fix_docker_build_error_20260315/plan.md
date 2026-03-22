# Implementation Plan: Fix Docker Build Error (Missing /backend)

## Phase 1: Analysis & Verification

- [x] Task: Confirm no other references to `backend/` in the project (already
      checked via grep, but will re-verify in configuration).
- [x] Task: Verify local frontend build succeeds without the `backend/` folder
      by running `npm run build`.
- [x] Task: Conductor - User Manual Verification 'Analysis & Verification'
      (Protocol in workflow.md)

## Phase 2: Implementation

- [x] Task: Remove `COPY backend/ ./backend/` from `backend-csharp/Dockerfile`.
- [x] Task: Conductor - User Manual Verification 'Implementation' (Protocol in
      workflow.md)

## Phase 3: Final Validation

- [x] Task: Run full validation suite (`npm run lint`, `npm run test`,
      `npm run build`, `./start_fantaf1.command`).
- [x] Task: Verify backend-csharp coverage is still 80% using
      `npm run test:csharp-coverage`.
- [x] Task: Conductor - User Manual Verification 'Final Validation' (Protocol in
      workflow.md)

## Coverage 80% totale

- [x] Task: Ensure 80% statements, functions, branches, and lines coverage for
      the entire application scope.
- [x] Task: Verify backend coverage (80% line, branch, method).
