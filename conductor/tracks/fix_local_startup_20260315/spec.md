# Track Specification: Fix Local Startup

## Overview
The local application startup process is currently failing and hanging. This track aims to identify the root cause of the failure and restore a fully operational local environment using the canonical launcher `./start_fantaf1.command`.

## Functional Requirements
- **Root Cause Analysis**: Investigate logs and execution flow of `./start_fantaf1.command` to identify where it hangs/fails.
- **Local Environment Restoration**: Fix the startup sequence (Backend .NET 10, Frontend Vite/React, Docker, MongoDB).
- **Implementation Integrity**: Ensure that existing features and implementations remain intact.
- **Environment Parity**: Ensure that fixes do not introduce regressions in Staging or Production environments.

## Non-Functional Requirements
- **AGENTS.md Compliance**: Strict adherence to TDD, 100% total coverage, and minimal safe changes.
- **Safety**: No credentials in versioned files; deterministic and production-safe changes.
- **UI Consistency**: No regressions in Desktop or Mobile views.

## Acceptance Criteria
- [ ] `./start_fantaf1.command` starts the application successfully without errors.
- [ ] 100% Statement, Function, Branch, and Line coverage for both Frontend and Backend.
- [ ] `check viste` (npm run test:ui-responsive) passes for both Desktop and Mobile.
- [ ] Backend is reachable by Frontend and MongoDB connectivity is verified.

## Out of Scope
- Adding new application features.
- Refactoring unrelated code not involved in the startup failure.
