# Verification: Fix Multi Race Highlights

## Tests Added Or Updated

- `/Users/matteobernardini/code/FantaF1/backend-csharp/tests/FantaF1.Tests.Unit/ResultsInfrastructureTests.cs`
  - localized alias query fallback for a later finished race (`China` -> `Cina`)
  - private query builder fallback when all seeds are empty
  - private query builder alias inclusion and duplicate-seed suppression
- `/Users/matteobernardini/code/FantaF1/tests/ui-live-projection.test.tsx`
  - highlights CTA on a second finished race
  - unavailable CTA wording updated to `HIGHLIGHTS NON PRESENTI`

## Validation Commands

- `dotnet test backend-csharp/tests/FantaF1.Tests.Unit/FantaF1.Tests.Unit.csproj --filter "DisplayName~localized_alias_queries"`
- `npx vitest run tests/ui-live-projection.test.tsx --testNamePattern "highlights CTA for a second finished race|disabled highlights CTA when the finished race video is not available yet|falls back to the unavailable highlights CTA"`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:coverage`
- `npm run test:csharp-coverage`
- `npm run test:ui-responsive`

## Results

- `npm run lint`: passed
- `npm run test`: passed (`289/289`)
- `npm run build`: passed
- `npm run test:coverage`: passed with `100%` statements, branches, functions,
  and lines
- `npm run test:csharp-coverage`: passed with official backend coverage
  `2986/2986` lines, `1671/1671` branches, `494/494` methods (`100%`)
- `npm run test:ui-responsive`: passed on mobile, iphone-16-pro-max, tablet,
  laptop, desktop, and desktop-xl
