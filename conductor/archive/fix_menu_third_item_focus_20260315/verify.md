# Verification: Fix Menu Third Item Focus

## Browser Verification

- Real browser check on desktop: clicking the second item and then the third
  keeps `Deep-dive KPI dashboard` active with `aria-current="page"`.
- Real browser check on mobile: clicking the third item, closing the overlay,
  and reopening it keeps `Deep-dive KPI dashboard` active.
- Mobile menu label computed font size verified at `13.76px` on `390x844`.

## Automated Tests

- Updated
  [ui-mockup-roadmap.test.tsx](/Users/matteobernardini/code/FantaF1/tests/ui-mockup-roadmap.test.tsx)
  with:
  - regression for persistent third-item highlight
  - regression for mobile third-item highlight after reopening the overlay
  - assertions for deterministic anchor-offset scrolling
- Updated
  [ui-sidebar.test.tsx](/Users/matteobernardini/code/FantaF1/tests/ui-sidebar.test.tsx)
  and
  [ui-mobile-overlay.test.tsx](/Users/matteobernardini/code/FantaF1/tests/ui-mobile-overlay.test.tsx)
  to assert `aria-current`.
- Updated
  [PortingDocumentationConsistencyTests.cs](/Users/matteobernardini/code/FantaF1/backend-csharp/tests/FantaF1.Tests.Unit/PortingDocumentationConsistencyTests.cs)
  to match the verified backend coverage baseline.

## Validation Commands

- `npx vitest run tests/ui-mockup-roadmap.test.tsx tests/ui-sidebar.test.tsx tests/ui-mobile-overlay.test.tsx`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:coverage`
- `npm run test:csharp-coverage`
- `npm run test:ui-responsive`

## Coverage 100% totale

- Frontend/repository: `100%` statements, branches, functions, lines
- Backend C# official scope: `2986 / 2986` lines, `1671 / 1671` branches,
  `494 / 494` methods, all `100%`
