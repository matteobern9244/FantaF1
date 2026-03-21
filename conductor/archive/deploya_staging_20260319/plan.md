# Implementation Plan - Deploya-Staging and fantaf1_deploy_staging Skill

## Phase 1: Analysis & Infrastructure Adaptation
- [ ] Task: Identify existing `deploya` and `fantaf1-deploy` skill content.
    - [ ] Resolve and read the existing skill `.gemini/skills/fantaf1-deploy/SKILL.md` (if available).
    - [ ] Analyze the current `deploya` command logic in the repository.
- [ ] Task: Audit GitHub Actions for `staging` branch.
    - [ ] Check `.github/workflows/` for `on: push: branches: [staging]` and `on: pull_request: branches: [staging]`.
    - [ ] Update workflows as necessary to include `staging`.

## Phase 2: Skill Creation & Command Implementation
- [ ] Task: Create `fantaf1_deploy_staging` skill.
    - [ ] Create `.gemini/skills/fantaf1_deploy_staging/SKILL.md`.
    - [ ] Adapt the deployment procedure: source `develop`, target `staging`.
    - [ ] Include mandatory CI, test, build, and local smoke checks.
- [ ] Task: Register the `deploya-staging` command trigger.
    - [ ] Update `AGENTS.md` and `GEMINI.md` to document the new `deploya-staging` trigger.

## Phase 3: Documentation & Verification
- [ ] Task: Update `README.md` and `workflow.md`.
    - [ ] Document the staging deployment flow: `develop -> staging`.
- [ ] Task: Final validation.
    - [ ] Verify that the `deploya-staging` command correctly invokes the new skill.
    - [ ] Confirm that CI gates are active on the `staging` branch.

## Phase: Review Fixes
- [x] Task: Apply review suggestions 9069c05
