# Implementation Plan: Fix Menu Focus And Active Navigation

## Objective
Stabilize menu focus and active navigation state across desktop and mobile, especially for deep sections and empty-history navigation.

## Applied Principles
- **AGENTS.md Applied**: all repository engineering rules are active.
- **Strict TDD**: RED -> GREEN -> REFACTOR for the navigation bugfix.
- **Behavior Preservation First**: preserve the menu structure and existing UX flow.
- **Minimal Safe Change**: limit changes to navigation state, anchor targets, and related CSS.
- **Coverage 100% totale**: keep repository/application coverage at 100%.

## RED -> GREEN -> REFACTOR
- [x] **RED**: reproduced deep-section active-state loss and missing history target with automated tests in `tests/ui-mockup-roadmap.test.tsx`.
- [x] **GREEN**: implemented the smallest navigation-state, anchor, and scroll-offset fixes in the React shell and panel anchors.
- [x] **REFACTOR**: hardened focus-visible styling and kept observer logic deterministic with a short manual-navigation lock.

## Implementation Steps
- [x] Create the dedicated Conductor track for the menu navigation bug.
- [x] Add regression tests for:
  - active state staying on results after click
  - history target existing even when history is empty
  - mobile menu navigation preserving correct active section
- [x] Fix `activeSectionId` coordination between click navigation and `IntersectionObserver`.
- [x] Ensure all navigable sections share a consistent scroll anchor offset.
- [x] Re-run full validations and close the track with real review/verify notes.

## Outcome
- `Storico gare` now has a stable `#history-archive` target even when the archive is empty.
- Manual clicks on deep menu entries keep the correct active highlight instead of being overridden immediately by the observer.
- Desktop and mobile navigation share the same `nav-section` anchor offset strategy.
- Focus-visible states are explicit and coherent on both desktop and mobile menu items.
