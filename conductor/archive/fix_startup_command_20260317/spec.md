# Track Specification: Fix Startup Command and Test Cycles

## Overview

This track aims to restore the functionality of the `./start_fantaf1.command`
script, which is currently failing. Additionally, it will expand the script's
capabilities to include a comprehensive suite of test cycles for both the
frontend and backend, ensuring that all quality standards (80% TDD, 80%
coverage, and UI responsiveness) are met before the application starts.

## Objectives

1.  **Fix `start_fantaf1.command`**: Investigate the root cause of the failure
    and apply a minimal, safe fix.
2.  **Implement Comprehensive Test Cycles**: Update the script to run:
    - Frontend Unit Tests (`npm run test`)
    - Backend C# Tests (`dotnet test`)
    - UI Responsive Validation (`npm run test:ui-responsive`)
    - Local Persistence Smoke Tests (`npm run test:save-local`)
3.  **Strict Dependency Verification**: Add explicit checks for external
    dependencies, primarily MongoDB, before attempting to start the application.
4.  **Production-Safe Reliability**: Maintain the "Full Pre-flight Check"
    mindset to ensure that only fully validated code is executed.

## Functional Requirements

- The script MUST verify that MongoDB is running and accessible before
  proceeding.
- The script MUST execute all four test suites (Frontend, Backend, UI
  Responsive, Persistence) in sequence.
- The script MUST halt execution if ANY test suite, linting, or build step
  fails.
- The script MUST provide clear error messages and diagnostics upon failure.
- The script MUST maintain its existing functionality of setting
  `NODE_ENV=development` and launching the `dev-launcher.mjs`.

## Non-Functional Requirements

- **Minimal Changes**: Only modify what is strictly necessary to fix the script
  and add the required checks.
- **ZSH Compatibility**: The script MUST remain compatible with the `zsh` shell
  on macOS.
- **Deterministic Behavior**: The startup process must be reliable and
  reproducible.

## Acceptance Criteria

- `./start_fantaf1.command` executes successfully from start to finish.
- All test suites (Frontend, Backend, UI Responsive, Persistence) are executed
  correctly.
- If MongoDB is not running, the script displays a helpful error message and
  exits.
- If any pre-flight step (lint, test, build) fails, the script halts and
  provides diagnostics.
- The application starts as expected after all checks pass.

## Out of Scope

- Major refactoring of the `dev-launcher.mjs` script.
- Modification of the core application logic (unless required for testing).
- CI/CD pipeline updates (this track focuses on local development).
