# Implementation Plan: Fix Startup Command and Test Cycles

## Phase 1: Investigation & Initial Validation
- [x] Task: Identify root cause of `./start_fantaf1.command` failure.
    - [x] Run `./start_fantaf1.command` and capture exact error.
    - [x] Verify script permissions (`chmod +x`).
    - [x] Inspect `package.json` scripts referenced in the command.
- [x] Task: Execute manual test cycles to establish baseline.
    - [x] Run `npm run lint` and fix any issues.
    - [x] Run `npm run test` (Frontend) and ensure all pass.
    - [x] Run `dotnet test` (Backend) in `backend-csharp/` and ensure all pass.
    - [x] Run `npm run test:ui-responsive` and ensure all pass.
    - [x] Run `npm run test:save-local` and ensure all pass.
- [ ] Task: Conductor - User Manual Verification 'Investigation & Initial Validation' (Protocol in workflow.md)

## Phase 2: Dependency Verification & Robustness
- [x] Task: Implement strict dependency checks in `start_fantaf1.command`.
    - [x] Add check for `nc` (netcat) or similar to verify MongoDB port (27017) is open.
    - [x] Add explicit check for `.env` file and warn if missing (existing, but refine).
    - [x] Ensure `NODE_ENV` and `FANTAF1_LOCAL_RUNTIME` are correctly exported.
- [x] Task: Refine error handling and diagnostics.
    - [x] Ensure `trap` correctly captures failures and shows relevant log snippets.
    - [x] Improve readability of pre-flight step output.
- [x] Task: Update Race Reference Data (added per user request).
    - [x] Update `OfficialResultsReferenceData.cs` with the provided race list.
    - [x] Add `OfficialResultsReferenceDataTests.cs` to verify.
- [ ] Task: Conductor - User Manual Verification 'Dependency Verification & Robustness' (Protocol in workflow.md)

## Phase 3: Comprehensive Test Integration
- [x] Task: Expand `start_fantaf1.command` with all test suites.
    - [x] Add `dotnet test` execution for Backend C#.
    - [x] Add `npm run test:ui-responsive` execution.
    - [x] Ensure all tests must pass for the script to continue.
- [x] Task: Optimize test sequence.
    - [x] Order tests from fastest to slowest (Lint -> Frontend -> Backend -> UI -> Smoke).
- [x] Task: Conductor - User Manual Verification 'Comprehensive Test Integration' (Protocol in workflow.md)

## Phase 4: Final Validation & Cleanup
- [x] Task: End-to-end validation of the startup process.
    - [x] Run `./start_fantaf1.command` and confirm it launches `dev-launcher.mjs`.
    - [x] Verify that the application is accessible on `localhost:5173`.
- [x] Task: Document any new requirements or setup steps.
    - [x] Update `README.md` if necessary with information about the new pre-flight checks.
- [x] Task: Conductor - User Manual Verification 'Final Validation & Cleanup' (Protocol in workflow.md)
