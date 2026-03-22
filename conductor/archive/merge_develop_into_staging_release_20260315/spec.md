# Track Specification: Merge `develop` Into `staging` Release

## Overview

This track promotes the current `develop` branch state into `staging`, cuts the
next release candidate version `1.6.0`, and aligns the canonical repository
documentation with the merged runtime state.

## Functional Requirements

- Merge `develop` into `staging` with an explicit merge commit.
- Preserve the current repository governance where `staging` remains the
  release-candidate branch.
- Promote the current `Unreleased` delta into a tagged `1.6.0` changelog section
  dated on the merge day.
- Update all required version surfaces consistently: `package.json`,
  `package-lock.json`, `README.md`, and `CHANGELOG.md`.
- Keep the Conductor workspace coherent after the merge, including the existing
  active track `fix_local_startup_20260315`.

## Non-Functional Requirements

- Strict compliance with `AGENTS.md`, including TDD, complete validation, and
  80% coverage preservation.
- Minimal-scope release integration with no unrelated refactors.
- No regressions across desktop, mobile, development, or production-like flows.

## Acceptance Criteria

- [x] `staging` contains the full runtime and documentation delta from
      `develop`.
- [x] The repository version is `1.6.0` everywhere required by repository
      policy.
- [x] `README.md` and `CHANGELOG.md` accurately describe the merged
      release-candidate state.
- [x] Conductor contains a dedicated closed track for this merge/release
      integration.
- [x] Full validation completes green with official frontend and backend
      coverage preserved at 80%.

## Out of Scope

- Deployment to `main`
- GitHub release/tag creation
- New product features beyond what already exists on `develop`
