# Implementation Plan: Fix Docker Build Error (Missing /backend)

## Phase 1: Analysis & Verification
- [ ] Task: Confirm no other references to `backend/` in the project (already checked via grep, but will re-verify in configuration).
- [ ] Task: Verify local frontend build succeeds without the `backend/` folder by running `npm run build`.
- [ ] Task: Conductor - User Manual Verification 'Analysis & Verification' (Protocol in workflow.md)

## Phase 2: Implementation
- [ ] Task: Remove `COPY backend/ ./backend/` from `backend-csharp/Dockerfile`.
- [ ] Task: Conductor - User Manual Verification 'Implementation' (Protocol in workflow.md)

## Phase 3: Final Validation
- [ ] Task: Run full validation suite (`npm run lint`, `npm run test`, `npm run build`, `./start_fantaf1.command`).
- [ ] Task: Verify backend-csharp coverage is still 100% using `npm run test:csharp-coverage`.
- [ ] Task: Conductor - User Manual Verification 'Final Validation' (Protocol in workflow.md)

## Coverage 100% totale
- [ ] Task: Ensure 100% statements, functions, branches, and lines coverage for the entire application scope.
- [ ] Task: Verify backend coverage (100% line, branch, method).
