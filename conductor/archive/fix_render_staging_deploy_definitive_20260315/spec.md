# Specification: Definitive Fix for Render Staging Deploy

## Overview

The Docker build on Render (staging) continues to fail with a
`COPY backend/: not found` error, despite the earlier fix in
`backend-csharp/Dockerfile`. This indicates a potential mismatch between the
local state and the build environment (Render) or a configuration issue where
Render is not using the updated Dockerfile. This track aims to provide a
definitive, non-regressive fix following `AGENTS.md`.

## Functional Requirements

- Ensure Render uses the correct, updated Dockerfile.
- Remove all obsolete `COPY backend/` references from any Dockerfile used by
  Render.
- Verify that the build process is stable and non-regressive.

## Non-Functional Requirements

- **80% Test Coverage:** Maintain full coverage for both Frontend and Backend.
- **Production-Safe:** No impact on production data or existing business rules.
- **Responsive-Ready:** Ensure no regressions in desktop or mobile views.
- **Local Execution:** Zero regressions for local execution using the canonical
  launcher.

## Acceptance Criteria

- Docker build on Render (staging) succeeds without errors.
- `Dockerfile` (wherever located) does not contain `COPY backend/`.
- `npm run build`, `npm run test`, and `npm run lint` all pass locally.
- 80% coverage verified for all files.
- Desktop and mobile views verified.

## Out of Scope

- Backend or frontend feature implementation.
- Database schema changes.
