# Definitive Fix for Render Staging Deploy Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the persistent Docker build error on Render staging by ensuring the correct Dockerfile is used and all obsolete references are removed.

**Architecture:** 
- Centralize Docker build logic in a root `Dockerfile` to avoid Render configuration ambiguity.
- Use `backend-csharp/Dockerfile` as the base for the definitive root `Dockerfile`.
- Adhere to `AGENTS.md` principles (TDD, 100% coverage, production-safe).

**Tech Stack:** Docker, .NET 10, React, Vitest, xUnit.

---

### Task 1: Environment & State Verification

**Files:**
- Verify: `backend-csharp/Dockerfile`
- Check: `. (root directory)`

- [ ] **Step 1: Check git status and current branch to ensure we are on `develop` and synchronized.**
- [ ] **Step 2: Re-verify `backend-csharp/Dockerfile` content to confirm the fix is indeed present locally.**
- [ ] **Step 3: Search for ANY hidden or ignored `Dockerfile` in the root using `ls -la`.**

### Task 2: Implement Definitive Fix

**Files:**
- Create: `./Dockerfile` (root)
- Modify: `backend-csharp/Dockerfile` (if needed)

- [ ] **Step 1: Create a root `Dockerfile` by copying `backend-csharp/Dockerfile` content.**
    - Since `backend-csharp/Dockerfile` already uses paths relative to the root (e.g., `COPY backend-csharp/ ...`), it can be moved to the root without modification.
- [ ] **Step 2: Verify the new root `Dockerfile` does not contain `COPY backend/`.**
- [ ] **Step 3: Remove `backend-csharp/Dockerfile` to avoid duplication and ambiguity, or keep it as a symlink.**
    - Decision: Move it to the root as it's the standard for most CI/CD platforms including Render.
- [ ] **Step 4: Commit the change.**

### Task 3: Final Validation & Release

**Files:**
- Modify: `package.json`, `package-lock.json`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Run full validation suite.**
    - Run: `npm run lint && npm run test && npm run build`
    - Expected: ALL PASS.
- [ ] **Step 2: Verify 100% Backend Coverage.**
    - Run: `npm run test:csharp-coverage`
    - Expected: 100% coverage.
- [ ] **Step 3: Verify 100% Frontend Coverage.**
    - Run: `npm run test:coverage`
    - Expected: 100% coverage.
- [ ] **Step 4: Verify Responsive Vistas.**
    - Run: `npm run test:ui-responsive` (or check manually if local startup is possible).
- [ ] **Step 5: Bump version to 1.4.8 and update docs.**
- [ ] **Step 6: Push to `develop`.**

---

### Coverage 100% totale
- [ ] **Step 1: Ensure 100% statements, functions, branches, and lines coverage for the entire application scope.**
- [ ] **Step 2: Verify backend coverage (100% line, branch, method).**
