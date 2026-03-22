# Specification: Post-Clean Verification Track (2026-03-14)

## Objective

Verify that the FantaF1 application builds successfully and all tests (including
coverage) pass after a full `git clean -fdx` command, which removes all
untracked and ignored files (including `node_modules` and build artifacts).

## Scope

- Node.js/Vite frontend and backend (REST API)
- C# Backend (.NET 10 solution)
- Build and test coverage verification

## Proposed Solution

A Conductor track to automate the verification process sequentially.

### 1. Restoration Phase

- **Action**: Restore all Node.js dependencies.
- **Command**: `npm install`
- **Reasoning**: All build and test scripts (including the C# coverage script)
  depend on the tools installed via `npm`.

### 2. Node.js Verification Phase

- **Action**: Build the frontend/backend and run all Vitest tests.
- **Commands**:
  - `npm run build` (tsc and vite build)
  - `npm run test:coverage` (Vitest with coverage collection)
- **Reasoning**: Ensures that TypeScript and Vite configurations are correct and
  that the application code is functional.

### 3. C# Verification Phase

- **Action**: Run all .NET tests and verify 80% coverage.
- **Command**: `npm run test:csharp-coverage` (executes
  `scripts/verify-csharp-coverage.mjs`)
- **Reasoning**: This script is already specialized to handle `dotnet test` with
  coverage for unit, integration, and contract tests, and it enforces a 80%
  coverage requirement.

## Success Criteria

- All commands exit with code 0.
- Node.js test coverage meets existing project thresholds.
- C# test coverage is exactly 80%.

## Verification Strategy

- Each step must pass before the next one starts.
- If a step fails, the track will stop and report the error.
