# Definitive Fix for Render Staging Deploy Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development
> (if subagents available) or superpowers:executing-plans to implement this
> plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the persistent Docker build error on Render staging by
ensuring the correct Dockerfile is used and all obsolete references are removed,
while ensuring zero regressions for local execution.

**Architecture:**

- Centralize Docker build logic in a root `Dockerfile` to avoid Render
  configuration ambiguity.
- Use `backend-csharp/Dockerfile` as the base for the definitive root
  `Dockerfile`.
- Adhere to `AGENTS.md` principles (TDD, 80% coverage, production-safe).

**Tech Stack:** Docker, .NET 10, React, Vitest, xUnit.

---

### Task 1: Environment & State Verification

**Files:**

- Verify: `backend-csharp/Dockerfile`
- Check: `. (root directory)`

- [x] **Step 1: Check git status and current branch to ensure we are on
      `develop` and synchronized.**
- [x] **Step 2: Re-verify `backend-csharp/Dockerfile` content to confirm the fix
      is indeed present locally.**
- [x] **Step 3: Search for ANY hidden or ignored `Dockerfile` in the root using
      `ls -la`.**
- [x] **Step 4: Establish Baseline - Verify current local execution.**
  - Run: `./start_fantaf1.command`
  - Check: Desktop and Mobile views are functional.
  - Expected: App starts and runs correctly.

### Task 2: Implement Definitive Fix

**Files:**

- Create: `./Dockerfile` (root)
- Modify: `backend-csharp/Dockerfile` (if needed)

- [x] **Step 1: Create a root `Dockerfile` by copying
      `backend-csharp/Dockerfile` content.**
  - Since `backend-csharp/Dockerfile` already uses paths relative to the root
    (e.g., `COPY backend-csharp/ ...`), it can be moved to the root without
    modification.
- [x] **Step 2: Verify the new root `Dockerfile` does not contain
      `COPY backend/`.**
- [x] **Step 3: Remove `backend-csharp/Dockerfile` to avoid duplication and
      ambiguity.**
- [x] **Step 4: Commit the change.**

### Task 3: Final Validation & Release

**Files:**

- Modify: `package.json`, `package-lock.json`, `README.md`, `CHANGELOG.md`

- [x] **Step 1: Run full validation suite.**
  - Run: `npm run lint && npm run test && npm run build`
  - Expected: ALL PASS.
- [x] **Step 2: Verify 80% Backend Coverage.**
  - Run: `npm run test:csharp-coverage`
  - Expected: 80% coverage.
- [x] **Step 3: Verify 80% Frontend Coverage.**
  - Run: `npm run test:coverage`
  - Expected: 80% coverage.
- [x] **Step 4: Verify NO REGRESSIONS in local execution.**
  - Run: `./start_fantaf1.command`
  - Check: Desktop and Mobile views are functional.
  - Expected: App starts and runs exactly as in the baseline.
- [x] **Step 5: Verify Responsive Vistas.**
  - Run: `npm run test:ui-responsive`
- [x] **Step 6: Bump version to 1.4.8 and update docs.**
- [x] **Step 7: Push to `develop`.**

---

### Coverage 80% totale

- [x] **Step 1: Ensure 80% statements, functions, branches, and lines coverage
      for the entire application scope.**
- [x] **Step 2: Verify backend coverage (80% line, branch, method).**
