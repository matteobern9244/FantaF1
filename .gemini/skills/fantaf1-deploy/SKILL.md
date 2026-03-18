---
name: fantaf1-deploy
description:
  Use this skill to execute the full FantaF1 23-point deployment protocol
  whenever the 'deploya' command is invoked, using a coordinated sub-agent
  workflow.
---

# Instructions: FantaF1 23-Point Deployment Protocol

You are the **Release Orchestrator**, responsible for coordinating the full
FantaF1 23-point deployment protocol. You MUST delegate each phase to the
specialized **generalist** sub-agent as described below.

## Core Mandates

- **Authoritative Source:** The 23 points are defined verbatim in `AGENTS.md`
  (Section 10).
- **Strict Sequence:** Follow the points from 1 to 23 in exact order. Do not
  skip or reorder.
- **Sub-Agent Delegation:** Every phase MUST be executed via a specialized
  sub-agent task.

## The 23-Point Protocol (Verbatim from AGENTS.md)

1.  Before starting, run a full preflight on the repository state and release
    target. Verify there are no unstaged files, `main` is aligned with the stack
    intended for release, the current branch is exactly `staging`, the branch is
    synced with its remote, required `git` and `gh` authentication are
    available, the required runtime/toolchain versions are present, the minimum
    required environment variables and deploy secrets exist, and the release
    target is still valid. If any of these checks fail, stop immediately and do
    not proceed.
2.  Run a dry-run summary before any mutating action. Show the computed next
    version, the files expected to change, the validations that will run, the
    Pull Request target, and any tag/release names that would be created. Do not
    commit, push, tag, or release during the dry-run phase.
3.  Determine the correct next application version and bump it consistently
    across the repository wherever needed.
4.  Verify the version bump diff is coherent across `package.json`,
    `package-lock.json`, `README.md`, `CHANGELOG.md`, and every other repository
    file that must reflect the released version. If any required file is
    missing, stale, or inconsistent, stop immediately.
5.  Update `README.md` and `CHANGELOG.md` so they are coherent, accurate, and
    aligned with the latest changes, implementations, and fixes in the
    repository.
6.  Reject generic, incomplete, or diff-inconsistent release notes. If
    `CHANGELOG.md` does not accurately describe the real delivered changes, stop
    immediately.
7.  Run the full test suite, if a test suite exists.
8.  Run linting, build validation, and any other mandatory verification commands
    supported by the repository in addition to tests.
    - If the diff touches scoring, projections, locking, historical
      recalculation, synchronization, persistence, or other high-risk areas
      described in `PROJECT.md`, run the targeted validations needed for those
      areas in addition to the general suite.
    - If the diff touches `.github/workflows/`, validate the affected workflows
      locally before push using the closest available syntax and command-level
      checks.
    - If `npm run test:ui-responsive` is part of the validation set, ensure the
      command starts backend and frontend automatically before the check when
      they are not already reachable, and stop any temporary backend/frontend
      processes immediately after the check ends.
9.  If any test, lint, build, or mandatory validation fails, stop immediately.
    Fix issues only if they were caused by the recent work, rerun the relevant
    checks, and proceed only when the repository is deployable again.
10. Create an intelligent commit message that accurately summarizes the work
    performed.
11. Commit all required changes.
12. Push the current working branch to its remote branch.
13. Create or update a Pull Request from `staging` into `main`.
14. Verify that the Pull Request configuration is correct before enabling merge
    automation. Confirm the title, body, labels, base branch, head branch,
    reviewers, assignees, and release metadata are accurate and complete.
15. Enable auto-merge on that Pull Request using the repository's configured
    merge method, without bypassing branch protection on `main`.
16. Wait until the Pull Request is either merged by GitHub after all required
    checks pass or remains open because at least one required check failed or
    stayed pending.
17. If the Pull Request is not merged successfully into `main`, stop
    immediately, do not create tags or releases, and report the exact blocking
    state.
18. After GitHub has merged the Pull Request into `main`, verify that the merged
    commit on `main` is the expected release commit and that the repository
    state still matches the validated release candidate.
19. Create a tag on `main` that matches the new version.
20. Verify that the created tag points to the correct merged commit before
    proceeding.
21. Create a GitHub Release based on that tag, coherent with the version and
    delivered changes.
22. If tag creation, release creation, or any post-merge release step fails,
    stop immediately, do not continue with later release actions, and report the
    exact rollback or cleanup actions required to restore a coherent release
    state.
23. Return to the original branch from which the deployment workflow started.

## The Coordinated Deployment Workflow

### Phase A: Release Planner (Points 1-6)

- **Sub-agent:** `generalist` (Release Planner).
- **Task:**
  1. Perform preflight checks and dry-run summary (Points 1-2).
  2. Determine and bump version in all relevant files (Points 3-4).
  3. Delegate `CHANGELOG.md` and `README.md` updates to specialized skills
     (Points 5-6):
     - `activate_skill("fantaf1-changelog-manager")`
     - `activate_skill("fantaf1-readme-manager")`

### Phase B: Quality Gatekeeper (Points 7-9)

- **Sub-agent:** `generalist` (Quality Gatekeeper).
- **Task:** Execute full validation pipeline including targeted checks for
  high-risk areas or workflows (Points 7-9).

### Phase C: Integration Manager (Points 10-17)

- **Sub-agent:** `generalist` (Integration Manager).
- **Task:** Perform commit, push, PR creation, configuration verification, and
  auto-merge monitoring (Points 10-17).

### Phase D: Release Publisher (Points 18-23)

- **Sub-agent:** `generalist` (Release Publisher).
- **Task:** Create/verify Git Tag, create GitHub Release, perform cleanup, and
  restore branch (Points 18-23).

## Verification Commands

- **Full Test Suite:** `npm run test`
- **Linting:** `npm run lint`
- **Build:** `npm run build`
- **UI Validation:** `check viste`
- **Scoring/Persistence Check:** `npm run test:save-local`
- **CSharp Coverage Check:** `npm run test:csharp-coverage`
