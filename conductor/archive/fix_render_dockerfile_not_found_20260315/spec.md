# Specification: Fix Render Dockerfile Not Found Error

## Overview

Render deployment is failing with `open Dockerfile: no such file or directory`
despite the file being present in the repository root. The logs also show a
suspicious `transferring dockerfile: 2B done`, suggesting the file content is
not being correctly resolved or transferred by Docker during the build process.
This track will provide a clean rewrite and verification of the Docker
configuration to resolve this definitively.

## Functional Requirements

- Ensure Render can find and read the `Dockerfile`.
- Eliminate any ambiguity regarding Dockerfile location and content.
- Restore successful deployment on Render staging.

## Non-Functional Requirements

- **100% Test Coverage:** No impact on tests, but must pass before release.
- **Production-Safe:** No changes to application logic.
- **Clean Git State:** Ensure no hidden characters or weird filesystem
  attributes on the Dockerfile.

## Acceptance Criteria

- Render staging deploy succeeds.
- Root `Dockerfile` has correct content and size (> 2KB).
- Local execution continues to work.

## Out of Scope

- Backend or frontend feature work.
- Infrastructure changes outside of Docker configuration.
