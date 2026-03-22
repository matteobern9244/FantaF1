# Specification: Fix Docker Build Error (Missing /backend)

## Overview

The Docker build on Render (staging) is failing because the `Dockerfile`
attempts to copy a `backend/` directory that has been removed following the
migration to the C# backend. This track will remove the obsolete `COPY`
instruction and verify the build process.

## Functional Requirements

- Remove `COPY backend/ ./backend/` from `backend-csharp/Dockerfile`.
- Ensure `npm run build` completes successfully without the `backend/` folder.
- Verify the final Docker image contains all necessary files (Frontend dist and
  Backend binaries).

## Non-Functional Requirements

- Maintain 80% test coverage (no behavioral changes expected, but build must be
  solid).
- No regressions in the deployment flow.

## Acceptance Criteria

- `backend-csharp/Dockerfile` no longer contains references to the old
  `backend/` folder.
- Local `npm run build` passes.
- Docker build (simulated or verified via structure) succeeds locally (if Docker
  is available) or is verified by removing the failing instruction.
- Render deployment succeeds.

## Out of Scope

- Refactoring the backend or frontend logic.
- Changing the C# migration architecture.
