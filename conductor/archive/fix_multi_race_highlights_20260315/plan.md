# Implementation Plan: Fix Multi Race Highlights

## Objective

Stabilize highlights lookup across multiple finished races and align the
unavailable CTA label with the requested wording.

## Applied Principles

- **AGENTS.md Applied**: all repository engineering rules are active.
- **Strict TDD**: RED -> GREEN -> REFACTOR for lookup and UI-copy behavior.
- **Behavior Preservation First**: preserve the current results contract and CTA
  placement.
- **Minimal Safe Change**: limit edits to matching/query logic, aliases, UI
  text, and regression coverage.
- **Coverage 100% totale**: keep repository/application coverage at 100%.

## RED -> GREEN -> REFACTOR

- [x] **RED**: reproduced a later finished race highlights match with localized
      naming and the unavailable CTA text requirement.
- [x] **GREEN**: implemented the smallest lookup and UI-text fix.
- [x] **REFACTOR**: kept alias/query logic explicit, removed dead branch paths,
      and preserved deterministic tests.

## Phases

### Phase 1: Reproduce

1. [x] Add backend regression coverage for a non-first race whose Sky Sport
       title uses localized naming.
2. [x] Add frontend regression coverage for the exact unavailable CTA wording.

### Phase 2: Fix

1. [x] Extend highlights race aliases and query seeding to match localized race
       naming across finished weekends.
2. [x] Update centralized UI copy to `HIGHLIGHTS NON PRESENTI`.

### Phase 3: Verify

1. [x] Run lint, tests, build, coverage, and responsive verification.
2. [x] Update Conductor review/verify artifacts with real results.

## Outcome

- The highlights resolver now retries localized alias queries for later races
  instead of relying on a single English seed.
- The matcher accepts localized race titles such as `GP della Cina` while
  preserving the existing first-race behavior.
- The unavailable CTA copy is now exactly `HIGHLIGHTS NON PRESENTI`.
