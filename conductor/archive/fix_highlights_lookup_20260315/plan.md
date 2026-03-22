# Implementation Plan: Fix Highlights Lookup Availability

## Objective

Fix the highlights lookup algorithm so completed races no longer remain stuck in
an unavailable state when the Sky Sport F1 source has valid content.

## Applied Principles

- **AGENTS.md Applied**: all repository instructions are active and enforced.
- **Strict TDD**: RED -> GREEN -> REFACTOR for the behavioral fix.
- **Minimal Safe Change**: only the search/query algorithm and its direct
  tests/documentation are adjusted.
- **Behavior Preservation First**: frontend contract, persistence shape, and
  runtime flow stay unchanged.
- **Coverage 80% totale**: keep repository/application coverage at 80%.

## RED -> GREEN -> REFACTOR

- [x] **RED**: add failing tests for stale publisher label and overly broad
      title seed in the query path.
- [x] **GREEN**: implement the minimal search-query fix in the C# lookup
      service.
- [x] **REFACTOR**: keep the lookup code compact and deterministic while all
      tests stay green.

## Implementation Steps

- [x] Create a dedicated Conductor track for the highlights lookup bug.
- [x] Identify the authoritative runtime path in
      `backend-csharp/src/FantaF1.Infrastructure/Results/RaceHighlightsLookupService.cs`.
- [x] Add regression tests for compact meeting-based query generation and live
      publisher naming.
- [x] Update the lookup query builder and publisher reference data.
- [x] Re-run full validations and confirm no desktop/mobile regression in dev
      and production-like checks.

## Acceptance Criteria

- [x] Query generation uses a compact, race-relevant seed and the current live
      publisher label.
- [x] Search requests hit the Sky Sport F1 channel with the corrected query.
- [x] Full validation stack passes with 80% total coverage maintained.
