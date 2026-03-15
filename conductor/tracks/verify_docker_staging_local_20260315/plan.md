# Local Docker Verification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the Docker build and execution locally to ensure zero issues for Render staging.

**Architecture:** Build and run the container locally, simulating the Staging environment with isolated environment variables.

---

### Phase 1: Build Image
- [ ] Task: Check if Docker is running.
- [ ] Task: Execute `docker build -t fantaf1:verify .` from the project root.
- [ ] Task: Confirm the build completes successfully and the image `fantaf1:verify` exists.

### Phase 2: Run and Verify (Staging Simulation)
- [ ] Task: Resolve a safe `MONGODB_URI` for testing (e.g., `mongodb://localhost:27017/fantaf1_staging` if local DB is up, or a dummy string that matches the guardrail requirements).
- [ ] Task: Start the container:
    ```bash
    docker run -d --name fantaf1-test \
      -e ASPNETCORE_ENVIRONMENT=Staging \
      -e MONGODB_URI="mongodb://host.docker.internal:27017/fantaf1_staging" \
      -p 3001:3001 \
      fantaf1:verify
    ```
- [ ] Task: Wait for startup and check logs: `docker logs fantaf1-test`.
- [ ] Task: Verify health check: `curl -v http://localhost:3001/api/health`.
- [ ] Task: Verify frontend serving: `curl -v http://localhost:3001/index.html`.

### Phase 3: Cleanup
- [ ] Task: Stop and remove the test container: `docker rm -f fantaf1-test`.
- [ ] Task: (Optional) Remove the test image: `docker rmi fantaf1:verify`.

---

### Coverage 100% totale
- [ ] Task: This track is for infrastructure verification; ensure no regressions in application test coverage are introduced (not expected as no code is changed).
