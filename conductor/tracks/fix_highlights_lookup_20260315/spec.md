# Track Specification: Fix Highlights Lookup Availability

## Overview
Completed races are reporting highlights as unavailable even when the Sky Sport F1 source is reachable. This track fixes the authoritative C# lookup path used to discover and persist highlights video URLs.

## Functional Requirements
- Diagnose the lookup algorithm used by `RaceHighlightsLookupService`.
- Reproduce the failure with automated tests before changing behavior.
- Restore reliable lookup behavior for completed races using the live Sky Sport F1 publisher naming and a compact, search-friendly query seed.
- Preserve the existing frontend contract and persistence behavior.

## Non-Functional Requirements
- **AGENTS.md Compliance**: strict RED -> GREEN -> REFACTOR, minimal safe change, deterministic validation.
- **Coverage 100% totale**: frontend and backend coverage must remain at 100%.
- **No UI regressions**: desktop/mobile views must remain stable in development and production-like checks.

## Acceptance Criteria
- [ ] The lookup service builds a query that reflects the live Sky Sport F1 catalog naming.
- [ ] A regression test proves the search path no longer uses the stale publisher label.
- [ ] Highlights lookup remains deterministic and backward compatible for completed races.
- [ ] Lint, tests, build, backend coverage, and responsive checks all pass with 100% coverage maintained.

## Out of Scope
- Changing the highlights UI presentation.
- Introducing new providers beyond YouTube / Sky Sport F1.
