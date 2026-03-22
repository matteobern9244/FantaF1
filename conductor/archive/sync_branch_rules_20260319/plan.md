# Implementation Plan - Synchronize Branch Protection Rules (main -> staging)

## Phase 1: Analysis & Discovery

- [ ] Task: Retrieve current `main` branch protection rules from GitHub.
  - [ ] Run `gh api repos/:owner/:repo/branches/main/protection` to extract the
        exact JSON configuration.
  - [ ] Document all active rules (Required Reviews, Status Checks,
        Restrictions, etc.).
- [ ] Task: Audit current `staging` branch protection rules.
  - [ ] Run `gh api repos/:owner/:repo/branches/staging/protection` to identify
        current settings.
  - [ ] Identify any rules on `staging` that need to be overwritten or added to
        match `main`.

## Phase 2: Implementation & Synchronization

- [ ] Task: Replicate `main` configuration to `staging`.
  - [ ] Prepare the `gh api` payload by sanitizing the `main` protection JSON
        (removing branch-specific identifiers if any).
  - [ ] Execute the rule update for the `staging` branch using
        `PUT /repos/:owner/:repo/branches/staging/protection`.
- [ ] Task: Verify synchronization success.
  - [ ] Retrieve rules for both `main` and `staging` and perform a diff
        comparison.
  - [ ] Confirm that `main` rules remain identical to the initial discovery
        state.

## Phase 3: Finalization & Documentation

- [ ] Task: Update repository documentation.
  - [ ] Document the synchronized state in `CHANGELOG.md`.
  - [ ] **Task: Update `README.md` to reflect the branch protection rules for
        both `main` and `staging`.**
- [ ] Task: Final validation report.
  - [ ] Provide a summary of the applied rules to the user.
  - [ ] Confirm that both branches are now governed by the same protection
        policy.
