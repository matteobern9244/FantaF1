# Specification: Investigate and Fix Local Database Connection

## Overview
When running the application locally via `./start_fantaf1.command`, the application does not appear to show the data from the `fantaf1_dev` database, even though it has been imported from the production environment and the connection string is set up in `.env`.

## Context
- **Database Name Override:** `MONGODB_DB_NAME_OVERRIDE` is set in `.env` to `fantaf1_dev`.
- **Environment:** `Development` (`ASPNETCORE_ENVIRONMENT`).
- **Status:** Data is present in `fantaf1_dev` but not visible in the application.

## Goals
1.  Verify how the backend (C#) reads the connection string and database name in the `Development` environment.
2.  Ensure that `MONGODB_DB_NAME_OVERRIDE` is correctly used by the backend.
3.  Fix any misconfiguration or hardcoded values that might be pointing to a different database or failing to connect to `fantaf1_dev`.
4.  Ensure that `./start_fantaf1.command` correctly initializes the backend with the right settings.

## Functional Requirements
- The backend must connect to the database specified in the connection string or override.
- Data displayed in the UI must reflect the contents of the `fantaf1_dev` database when running in local development mode.

## Non-Functional Requirements
- Maintain existing architecture (Repository Pattern, Dependency Injection).
- No sensitive information (secrets) should be logged or committed (obfuscate in logs).

## Acceptance Criteria
- When running `./start_fantaf1.command`, the application starts and shows the data currently stored in the `fantaf1_dev` MongoDB database.
- Backend logs show connection to the intended database.
