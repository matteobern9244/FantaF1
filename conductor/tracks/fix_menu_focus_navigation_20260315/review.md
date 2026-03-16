# Review: Fix Menu Focus And Active Navigation

## Summary
The bug was a combination of missing anchor stability, observer timing, and weak focus styling rather than a single menu rendering issue.

## Root Cause
- `Storico gare` pointed to `#history-archive`, but that id was rendered only when archived races existed.
- The `IntersectionObserver` in `/Users/matteobernardini/code/FantaF1/src/App.tsx` recalculated the active item immediately after a click and could switch the highlight back to `predictions-section` while the user had just selected `results-section`.
- Scroll anchor offsets were inconsistent because only `section[id$='section']` received `scroll-margin-top`, while deep ids such as `season-analysis`, `weekend-live`, `public-guide`, `public-standings`, and `history-archive` used different markup.
- Menu focus styling was not explicit enough to make keyboard and click focus states clearly visible.

## Implemented Fix
- Added regression tests that reproduce the missing-history anchor and deep-section highlight override.
- Added a short manual-navigation lock so click-driven active state is preserved until the intended section becomes observable.
- Moved the `history-archive` anchor to a stable wrapper section and normalized all navigable panels onto the shared `nav-section` class.
- Replaced the narrow scroll selector with a reusable `nav-section` offset rule and strengthened `:focus-visible` styles for desktop and mobile items.

## Files Reviewed
- `/Users/matteobernardini/code/FantaF1/src/App.tsx`
- `/Users/matteobernardini/code/FantaF1/src/App.css`
- `/Users/matteobernardini/code/FantaF1/src/components/HistoryArchivePanel.tsx`
- `/Users/matteobernardini/code/FantaF1/src/components/PublicGuidePanel.tsx`
- `/Users/matteobernardini/code/FantaF1/src/components/PublicStandingsPanel.tsx`
- `/Users/matteobernardini/code/FantaF1/src/components/SeasonAnalysisPanel.tsx`
- `/Users/matteobernardini/code/FantaF1/src/components/WeekendLivePanel.tsx`
- `/Users/matteobernardini/code/FantaF1/tests/ui-mockup-roadmap.test.tsx`

## Residual Risk
Low. The fix stays inside menu navigation state, anchor placement, and CSS focus treatment. No API contract or data flow changed.
