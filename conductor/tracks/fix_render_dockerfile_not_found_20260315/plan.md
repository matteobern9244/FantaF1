# Fix Render Dockerfile Not Found Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the persistent `open Dockerfile: no such file or directory` error on Render by performing a clean rewrite and explicit verification of the Dockerfile.

**Architecture:** 
- Maintain Dockerfile in the project root for standard resolution.
- Perform a clean overwrite using `write_file` to strip any weird macOS metadata or hidden characters.
- Verify exact file size and presence in git.

**Tech Stack:** Docker, Git.

---

### Task 1: Clean Rewrite and Verification

**Files:**
- Modify: `./Dockerfile`

- [x] **Step 1: Read current Dockerfile content to memory.**
- [x] **Step 2: Delete the existing `Dockerfile` and `dockerfile` (if any) from the filesystem.**
- [x] **Step 3: Explicitly rewrite `./Dockerfile` using `write_file` with the verified content.**
- [x] **Step 4: Verify the file size is approximately 2.3KB and content is correct.**
- [x] **Step 5: Verify no other files named `dockerfile` (lowercase) exist.**

### Task 2: Validation and Commit

**Files:**
- Verify: `Dockerfile`
- Modify: `package.json`, `package-lock.json`, `README.md`, `CHANGELOG.md`

- [x] **Step 1: Verify local execution baseline.**
    - Run: `./start_fantaf1.command`
    - Expected: App starts and health check passes.
- [x] **Step 2: Run full test suite.**
    - Run: `npm run test && npm run test:csharp-coverage`
    - Expected: ALL PASS (100% coverage).
- [x] **Step 3: Bump version to 1.4.9 and update docs.**
- [x] **Step 4: Stage all changes, including the rewritten `Dockerfile`.**
- [x] **Step 5: Commit and push to `develop`.**

---

### Coverage 100% totale
- [x] **Step 1: Ensure 100% statements, functions, branches, and lines coverage for the entire application scope.**
- [x] **Step 2: Verify backend coverage (100% line, branch, method).**
