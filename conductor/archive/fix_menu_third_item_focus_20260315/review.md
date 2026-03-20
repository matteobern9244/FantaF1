# Review: Fix Menu Third Item Focus

## Delivered

- Replaced menu anchor navigation in
  [App.tsx](/Users/matteobernardini/code/FantaF1/src/App.tsx) with an
  offset-based `window.scrollTo` flow so clicked sections align with the active
  navigation anchor on both desktop and mobile.
- Kept active highlighting semantic in sync through `aria-current="page"` on
  [Sidebar.tsx](/Users/matteobernardini/code/FantaF1/src/components/Sidebar.tsx)
  and
  [MobileOverlay.tsx](/Users/matteobernardini/code/FantaF1/src/components/MobileOverlay.tsx).
- Reduced mobile menu label sizing in
  [App.css](/Users/matteobernardini/code/FantaF1/src/App.css) to improve
  readability while preserving the Formula 1 visual language.

## Root Cause

- The third menu item issue was not only a CSS/focus problem.
- `scrollIntoView` placed the selected third section too low in the viewport on
  this layout, especially in mobile, leaving the previous section still
  geometrically favored by the active-section observer.
- The result was a correct hash and scroll direction, but the wrong item
  remained illuminated after the observer recalculated visibility.

## Follow-up Fixes Included

- Mobile overlay state was verified and fixed so reopening the menu preserves
  the third item as active after navigation.
- Coverage baseline documents and the C# documentation consistency test were
  synchronized with the real backend coverage summary: `2986 / 2986` lines,
  `1671 / 1671` branches, `494 / 494` methods.
