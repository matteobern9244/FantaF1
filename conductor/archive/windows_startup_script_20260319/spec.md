# Specification: Windows Startup Script (start_fantaf1.bat)

## Overview
Create a Windows Batch file (`start_fantaf1.bat`) that provides an identical startup experience to the macOS/Linux `start_fantaf1.command`. This enables developers on Windows to launch the full FantaF1 environment with appropriate preflight checks.

## Functional Requirements
- **Environment Initialization**: Set `NODE_ENV=development` and `FANTAF1_LOCAL_RUNTIME=csharp-dev`.
- **Dependency Validation**:
    - Check for existence of `.env` file.
    - Verify MongoDB reachability using a Node.js snippet (equivalent to the `.command` implementation).
- **Pre-launch Build**:
    - Execute `dotnet build` for the C# backend.
    - Execute `npm run build` for the frontend.
- **Application Launch**: Execute `node ./scripts/dev-launcher.mjs`.
- **Error Handling**: Use `ERRORLEVEL` checks after each step to halt execution and report failures to the console.

## Non-Functional Requirements
- **Parity**: The logic sequence must strictly follow `start_fantaf1.command`.
- **Portability**: Must run on standard Windows Command Prompt (CMD).

## Acceptance Criteria
- [ ] `start_fantaf1.bat` exists in the repository root.
- [ ] The script successfully validates `.env` and MongoDB.
- [ ] The script triggers backend and frontend builds.
- [ ] The script hands over control to `dev-launcher.mjs`.
- [ ] Failures in any preflight step result in an immediate halt with a descriptive error message.

## Out of Scope
- Graphical popup alerts (Console output only).
- Support for legacy Node.js backend.
- Automatic installation of missing runtimes (Node, .NET).
