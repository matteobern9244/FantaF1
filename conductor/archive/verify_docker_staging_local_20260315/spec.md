# Specification: Local Docker Verification (Staging Simulation)

## Overview

This track aims to verify that the root `Dockerfile` is fully functional and
ready for Render staging deployment. We will build the image locally and run a
container simulating the Staging environment to ensure no path resolution or
startup errors occur.

## Functional Requirements

- Successfully build the Docker image from the root `Dockerfile`.
- Run the container locally using Staging configuration.
- Verify that the backend is reachable and reports the correct status.
- Verify that the frontend static files are served correctly by the backend.

## Non-Functional Requirements

- **Safety:** Do NOT connect to the production MongoDB during this test.
- **Portability:** Ensure the image works as expected in a containerized
  environment.

## Acceptance Criteria

- `docker build` completes without errors.
- `docker run` starts the application in `Staging` mode.
- `curl http://localhost:3001/api/health` returns a 200 OK with
  `environment: staging`.
- Logs show no database connection mismatches (using a test URI).

## Out of Scope

- Actually deploying to Render (this is local verification only).
- Testing every single frontend feature (smoke test only).
