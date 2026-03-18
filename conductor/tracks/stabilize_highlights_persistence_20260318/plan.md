# Implementation Plan: Persistenza Definitiva Highlights Per Gara

## Phase 1: RED - Reproduce and lock the regression

1. [x] Extend the authoritative calendar sync test suite in `SubphaseEightBootstrapTests`.
2. [x] Reproduce loss of a persisted `found` highlight when a fresh lookup returns `missing`.
3. [x] Reproduce preservation requirements when a fresh lookup throws.
4. [x] Reproduce the clock consistency requirement for highlight lookup gating.

## Phase 2: GREEN - Implement the minimal safe backend fix

1. [x] Load persisted `weekends` once at sync start and index them by stable race identity.
2. [x] Merge persisted highlight metadata back into fresh calendar entries before lookup fallback paths.
3. [x] Prevent downgrade from persisted `found` to fresh `missing`.
4. [x] Replace direct `DateTimeOffset.UtcNow` usage in calendar sync with injected `IClock`.

## Phase 3: REFACTOR and Validation

1. [x] Keep the merge policy isolated in explicit helper methods inside `OfficialCalendarSyncService`.
2. [x] Keep API/frontend contracts unchanged.
3. [x] Run repository validations: lint, tests, build, C# coverage, responsive/browser checks, production-like preview.
4. [x] Confirm official coverage remains at 100% and keep `AGENTS.md` unchanged because the verified baseline did not change.
5. [x] Finalize `review.md`, `verify.md`, `conductor/index.md`, and `conductor/tracks.md` with actual outcomes.
