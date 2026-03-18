# Review: Fix Multi Race Highlights

## Summary
The bug was not in the CTA placement but in the highlights resolver assumptions: it searched and matched too narrowly around English race names, so the first race could work while later races with localized Sky Sport titles failed.

## Root Cause
- `RaceHighlightsLookupService` used a single search query seed per race, which was fragile for later weekends whose Sky Sport titles use localized naming.
- The title matcher did not cover enough localized aliases for races such as `China` -> `Cina`.
- The frontend fallback CTA copy still used the previous wording instead of the requested `HIGHLIGHTS NON PRESENTI`.

## Implemented Fix
- Added localized aliases for races and circuits that commonly differ between Formula 1 naming and Sky Sport naming.
- Expanded the highlights resolver to try multiple distinct search queries derived from the race plus its aliases.
- Preserved a deterministic search/query order and removed dead internal branch paths introduced by the alias refactor.
- Updated the centralized UI label in `config/app-config.json`.

## Files Reviewed
- `/Users/matteobernardini/code/FantaF1/backend-csharp/src/FantaF1.Infrastructure/Results/RaceHighlightsLookupService.cs`
- `/Users/matteobernardini/code/FantaF1/backend-csharp/src/FantaF1.Infrastructure/Results/OfficialResultsReferenceData.cs`
- `/Users/matteobernardini/code/FantaF1/backend-csharp/tests/FantaF1.Tests.Unit/ResultsInfrastructureTests.cs`
- `/Users/matteobernardini/code/FantaF1/tests/ui-live-projection.test.tsx`
- `/Users/matteobernardini/code/FantaF1/config/app-config.json`

## Residual Risk
Low. The change remains inside highlights lookup/query expansion and a centralized UI label. No public API shape changed.
