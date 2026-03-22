# Implementation Plan: Investigate and Fix Local Database Connection

## Objective
Investigate and fix the issue where the local backend doesn't show data from the `fantaf1_dev` database when running `./start_fantaf1.command`, despite proper connection string and override settings.

## Key Files & Context
- **Backend Configuration:** `backend-csharp/src/FantaF1.Api/appsettings.json`, `appsettings.Development.json`, `Program.cs`.
- **Infrastructure:** `backend-csharp/src/FantaF1.Infrastructure/Persistence/MongoDbContext.cs`.
- **Environment:** `.env` file in the root.
- **Launcher:** `./start_fantaf1.command`.

## Implementation Steps

### Phase 1: Investigation & Diagnostic (Read-Only)
- [x] Task: Use `codebase_investigator` to map how the backend reads MongoDB configuration and environment variables.
- [x] Task: Inspect `backend-csharp/src/FantaF1.Api/Program.cs` and related startup files to identify where `MONGODB_DB_NAME_OVERRIDE` is used.
- [x] Task: Verify the content of `.env` and `appsettings.Development.json` for consistency.
- [x] Task: Run the backend in isolation with debug logs to see the actual connection string and database name being used.

### Phase 2: Reproduce and Fix (TDD)
- [x] Task: Create a unit or integration test in `backend-csharp/tests/FantaF1.Tests.Integration` that asserts the database name is correctly picked up from the override. (RED)
- [x] Task: Implement the fix in the backend configuration or context factory to respect the `MONGODB_DB_NAME_OVERRIDE`. (GREEN)
- [x] Task: Refactor the configuration loading if necessary to be more robust and idiomatic. (REFACTOR)
- [x] Task: Verify that `./start_fantaf1.command` correctly passes the required environment variables or that the backend reads them from the `.env` file correctly.

### Phase 3: Validation & Coverage
- [x] Task: Run `npm run test:csharp-coverage` and ensure 100% line/branch/method coverage for the affected backend files.
- [x] Task: Run `npm run test` (Frontend) and `check viste` (UI Responsive) to ensure no regressions.
- [x] Task: Execute a smoke test using `./start_fantaf1.command` to manually verify the data is now visible.

## Verification & Testing
- **Backend Tests:** `dotnet test backend-csharp/tests/FantaF1.Tests.Unit` and `Integration`.
- **Coverage:** `npm run test:csharp-coverage` (Must be 100%).
- **Manual Verification:** Launch the app and check if production-like data from `fantaf1_dev` is displayed.

## Coverage 100% totale
- [x] Task: Verify 100% coverage for all modified backend files.
- [x] Task: Verify 100% coverage for the entire repository scope as per `AGENTS.md`.

## Compliance
- This plan follows `AGENTS.md` (TDD, 100% coverage, Subagents).
- This plan follows `GEMINI.md` and `PROJECT.md`.
