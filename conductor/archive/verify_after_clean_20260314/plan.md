# Plan: Post-Clean Verification Track (2026-03-14)

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to
> implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify that the application builds and all tests (including coverage)
pass after a `git clean -fdx`.

**Architecture:** Sequential verification of dependencies, build artifacts, and
test suites for both Node.js and .NET stacks.

**Tech Stack:** Node.js, Vite, Vitest, .NET 10, Coverlet.

---

## Task 1: Environment Restoration

**Files:**

- Modify: `conductor/archive/verify_after_clean_20260314/metadata.json`

- [ ] **Step 1: Restore Node.js dependencies**
  - Run: `npm install`
  - Expected: `node_modules` created, no errors.

- [ ] **Step 2: Verify `package-lock.json` consistency**
  - Run: `git status package-lock.json`
  - Expected: No changes (should be identical to the committed version).

## Task 2: Node.js Stack Verification

**Files:**

- Test: `tests/` (all existing tests)

- [ ] **Step 1: Run TypeScript & Vite build**
  - Run: `npm run build`
  - Expected: `dist` folder created (or equivalent), no compilation errors.

- [ ] **Step 2: Run Vitest with coverage**
  - Run: `npm run test:coverage`
  - Expected: All tests PASS, coverage report generated in `coverage/`.

## Task 3: C# Backend Verification

**Files:**

- Test: `backend-csharp/tests/` (all existing tests)
- Script: `scripts/verify-csharp-coverage.mjs`

- [ ] **Step 1: Run C# coverage verification script**
  - Run: `npm run test:csharp-coverage`
  - Expected: `dotnet restore`, `dotnet build`, and `dotnet test` execute
    successfully. Coverage must be 100%.

## Task 4: Documentation & Metadata Update

**Files:**

- Modify: `conductor/archive/verify_after_clean_20260314/metadata.json`
- Modify: `conductor/tracks.md`

- [ ] **Step 1: Update track metadata to 'completed'**
  - Edit: `conductor/tracks/verify_after_clean_20260314/metadata.json`
  - Set: `"status": "completed"`

- [ ] **Step 2: Register track in the registry**
  - Edit: `conductor/tracks.md`
  - Add: Link to this track.
