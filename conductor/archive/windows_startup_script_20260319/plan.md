# Implementation Plan - Windows Startup Script (start_fantaf1.bat)

## Phase 1: Analysis & Scaffolding

- [ ] Task: Deconstruct `start_fantaf1.command`.
  - [ ] Extract the Node.js snippet for MongoDB verification.
  - [ ] Document the exact build commands and flags used.
- [ ] Task: Create a automated verification test.
  - [ ] Implement a Node.js test script (`tests/startup-script-parity.test.js`)
        that verifies the existence and basic content structure of the `.bat`
        file against the `.command` file.

## Phase 2: Implementation

- [ ] Task: Create `start_fantaf1.bat`.
  - [ ] Implement environment variable initialization (`@echo off`, `set`).
  - [ ] Implement `.env` existence check.
  - [ ] Port the MongoDB verification logic to Batch (calling `node -e`).
  - [ ] Add `dotnet build` and `npm run build` steps with `if %ERRORLEVEL%`
        checks.
  - [ ] Add the final handover to `dev-launcher.mjs`.

## Phase 3: Verification & Documentation

- [ ] Task: Run automated parity tests.
  - [ ] Ensure `npm run test` includes the new parity check.
- [ ] Task: Manual Verification Protocol.
  - [ ] Document the manual test steps for a Windows environment (even if
        executed via simulation).
- [ ] Task: Update `README.md`.
  - [ ] Add instructions for Windows users to use `start_fantaf1.bat`.

## Phase: Review Fixes

- [x] Task: Apply review suggestions 37c54fe
